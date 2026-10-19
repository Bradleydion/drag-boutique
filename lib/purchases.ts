// lib/purchases.ts
// Sequins Pro and 7-day boosts bought through Apple / Google in-app purchase,
// via RevenueCat (Apple guideline 3.1.1: digital features bought inside the
// app must use in-app purchase). Tickets, tips, staff pay and the Shop stay on
// Stripe because they're real-world goods and services or go 100% to a person.
//
// The RevenueCat customer id is the Supabase user id, so the server
// (revenuecat-sync / confirm-promotion) can look up a user's purchases
// directly. The server always re-checks purchases with RevenueCat before
// granting Pro or applying a boost.
//
// Public SDK keys are meant to ship inside the app (they can only read the
// signed-in customer and start purchases), so they live here. A platform with
// no key falls back to the old Stripe checkout.

import { Linking, Platform } from 'react-native';
import Purchases, { PRODUCT_CATEGORY, type PurchasesStoreProduct } from 'react-native-purchases';
import { supabase } from './supabase';

const RC_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || 'appl_JFfQHkMpznkstCjhcewZiCXALah';
const RC_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_uapjKZENKjbkBcuSgyNexwAWHXD';

export const PRO_PRODUCT_ID = 'sequins_pro_monthly';
export const BOOST_PRODUCT_ID = 'boost_7_days';

function platformKey(): string {
  if (Platform.OS === 'ios') return RC_APPLE_KEY;
  if (Platform.OS === 'android') return RC_GOOGLE_KEY;
  return '';
}

/** True when Pro and boosts should be bought through Apple / Google on this device. */
export function iapAvailable(): boolean {
  return !!platformKey();
}

let _configured = false;
let _currentUser: string | null = null;

/** Call on sign-in / app start with the Supabase user id, and with null on sign-out. */
export async function setPurchasesUser(userId: string | null): Promise<void> {
  if (!iapAvailable()) return;
  try {
    if (!_configured) {
      if (!userId) return; // configure lazily once someone is signed in
      Purchases.configure({ apiKey: platformKey(), appUserID: userId });
      _configured = true;
      _currentUser = userId;
      return;
    }
    if (userId && userId !== _currentUser) {
      await Purchases.logIn(userId);
      _currentUser = userId;
    } else if (!userId && _currentUser) {
      await Purchases.logOut().catch(() => {});
      _currentUser = null;
    }
  } catch (e) {
    console.warn('[purchases] setPurchasesUser failed', e);
  }
}

async function ensureReady(userId: string) {
  if (!iapAvailable()) throw new Error('In-app purchases aren’t available on this device.');
  await setPurchasesUser(userId);
  if (!_configured) throw new Error('Purchases aren’t ready yet. Please try again.');
}

const productCache: Record<string, PurchasesStoreProduct> = {};
async function getProduct(id: string, category: PRODUCT_CATEGORY): Promise<PurchasesStoreProduct> {
  if (productCache[id]) return productCache[id];
  const [p] = await Purchases.getProducts([id], category);
  if (!p) throw new Error('This purchase isn’t available right now. Please try again later.');
  productCache[id] = p;
  return p;
}

/** The store's localized price (e.g. "$12.99"), or null if it can't be loaded. */
export async function getStorePrice(kind: 'pro' | 'boost', userId: string): Promise<string | null> {
  try {
    await ensureReady(userId);
    const p = await getProduct(
      kind === 'pro' ? PRO_PRODUCT_ID : BOOST_PRODUCT_ID,
      kind === 'pro' ? PRODUCT_CATEGORY.SUBSCRIPTION : PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    return p.priceString ?? null;
  } catch {
    return null;
  }
}

export type PurchaseOutcome = { status: 'done' } | { status: 'cancelled' };

function isCancel(e: any): boolean {
  return !!(e?.userCancelled || e?.code === '1' || e?.code === 1);
}

/** Tells the server to re-read this user's Pro status from RevenueCat. */
async function syncProWithServer(): Promise<{ pro: boolean }> {
  const { data, error } = await supabase.functions.invoke('revenuecat-sync', { body: {} });
  if (error) throw new Error(error.message);
  return { pro: !!data?.pro };
}

/** Buy Sequins Pro through Apple / Google. */
export async function buyProInApp(userId: string): Promise<PurchaseOutcome> {
  await ensureReady(userId);
  const product = await getProduct(PRO_PRODUCT_ID, PRODUCT_CATEGORY.SUBSCRIPTION);
  try {
    await Purchases.purchaseStoreProduct(product);
  } catch (e: any) {
    if (isCancel(e)) return { status: 'cancelled' };
    throw new Error(e?.message ?? 'The purchase didn’t go through.');
  }
  // Give the store a beat, then let the server grant Pro (it retries once).
  try {
    await syncProWithServer();
  } catch {
    await new Promise(r => setTimeout(r, 2000));
    await syncProWithServer();
  }
  return { status: 'done' };
}

/** "Restore Purchases" (required by Apple for subscriptions). Returns whether Pro is now active. */
export async function restorePurchasesInApp(userId: string): Promise<boolean> {
  await ensureReady(userId);
  await Purchases.restorePurchases();
  const { pro } = await syncProWithServer();
  return pro;
}

/** Opens the App Store / Play Store subscription settings. */
export async function manageStoreSubscription(userId: string): Promise<void> {
  await ensureReady(userId);
  const info = await Purchases.getCustomerInfo();
  if (info.managementURL) {
    await Linking.openURL(info.managementURL);
    return;
  }
  await Linking.openURL(
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions',
  );
}

/** Buy a 7-day boost for an event or performer profile through Apple / Google. */
export async function buyBoostInApp(
  userId: string,
  targetType: 'event' | 'performer',
  targetId: string,
): Promise<PurchaseOutcome> {
  await ensureReady(userId);
  const product = await getProduct(BOOST_PRODUCT_ID, PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  let storeTransactionId: string;
  try {
    const result = await Purchases.purchaseStoreProduct(product);
    storeTransactionId = result.transaction?.transactionIdentifier;
  } catch (e: any) {
    if (isCancel(e)) return { status: 'cancelled' };
    throw new Error(e?.message ?? 'The purchase didn’t go through.');
  }
  if (!storeTransactionId) throw new Error('The store didn’t return a receipt. If you were charged, contact support.');

  const apply = () =>
    supabase.functions.invoke('confirm-promotion', { body: { storeTransactionId, targetType, targetId } });
  let { data, error } = await apply();
  if (error) {
    // RevenueCat can take a moment to see a brand-new purchase.
    await new Promise(r => setTimeout(r, 2500));
    ({ data, error } = await apply());
  }
  if (error || data?.error) {
    throw new Error(
      (data?.error ?? error?.message ?? 'Could not apply the boost.') +
        ' Your purchase is saved. Contact support and we’ll apply it.',
    );
  }
  return { status: 'done' };
}
