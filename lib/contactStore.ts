// lib/contactStore.ts
// Contact relay: send someone a note by email without exposing their address.
// The contact-relay edge function finds the recipient server-side and emails
// them with Reply-To set to the sender, so replies go inbox to inbox.

import { supabase } from './supabase';
import { getSession, isGuest } from './authStore';

export type ContactTargetType = 'listing' | 'listing_buyer' | 'event_host' | 'event_talent';

export async function sendContactMessage(targetType: ContactTargetType, targetId: string, message: string): Promise<void> {
  if (!getSession() || isGuest()) throw new Error('Sign in to send a message.');
  const { data, error } = await supabase.functions.invoke('contact-relay', {
    body: { targetType, targetId, message },
  });
  if (error) throw new Error(error.message || 'Could not send. Please try again.');
  if (data?.error) throw new Error(data.error);
}
