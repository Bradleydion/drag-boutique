// lib/venmo.ts
import { Alert, Linking, Platform } from 'react-native';

export async function openVenmoPay(toHandle: string, amount?: number, note?: string) {
  const base = 'venmo://paycharge';
  const params = new URLSearchParams();
  params.set('txn', 'pay');
  if (toHandle) params.set('user', toHandle.replace('@', ''));
  if (amount != null) params.set('amount', String(amount));
  if (note) params.set('note', note);

  const url = `${base}?${params.toString()}`;

  // Web and iOS Simulator usually can't open Venmo; show a friendly fallback.
  if (Platform.OS === 'web') {
    Alert.alert(
      'Open Venmo on your phone',
      `We can't open Venmo from the web preview. On your phone, use @${toHandle} and include this note:\n\n${note ?? ''}`
    );
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert(
      'Venmo not available',
      `We couldn't open Venmo on this device. You can tip/pay @${toHandle} manually and include this note:\n\n${note ?? ''}`
    );
    return;
  }

  return Linking.openURL(url);
}