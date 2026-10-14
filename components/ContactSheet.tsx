// components/ContactSheet.tsx
// Bottom sheet for the contact relay: write a note, Sequins emails it to the
// other person, and their reply comes straight to your email.

import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { getEmail, getSession, isGuest } from '../lib/authStore';
import { sendContactMessage, type ContactTargetType } from '../lib/contactStore';
import { colors } from '../src/theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: ContactTargetType;
  targetId: string;
  /** Who it's going to, e.g. "Aurora Borealis" or "the host". */
  recipientName: string;
  /** What it's about, shown under the title. */
  about?: string;
  title?: string;
  placeholder?: string;
};

const MAX = 1000;

export function ContactSheet({ visible, onClose, targetType, targetId, recipientName, about, title, placeholder }: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { if (visible) setMessage(''); }, [visible]);

  // Guests can't send; offer sign-up instead of an empty sheet.
  useEffect(() => {
    if (visible && (!getSession() || isGuest())) {
      onClose();
      Alert.alert('Create an Account', 'You need a free account to send messages on Sequins.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', onPress: () => router.push('/auth') },
      ]);
    }
  }, [visible]);

  async function send() {
    if (message.trim().length < 2) return;
    setSending(true);
    try {
      await sendContactMessage(targetType, targetId, message.trim());
      onClose();
      Alert.alert('Sent ✨', `We emailed your message to ${recipientName}. Their reply will come to your email.`);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  const email = getEmail();
  const canSend = message.trim().length >= 2 && !sending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => !sending && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: '#0009' }} onPress={() => !sending && onClose()} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: 4 }}>
              {title ?? `Message ${recipientName}`}
            </Text>
            {about ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 14 }} numberOfLines={2}>{about}</Text>
            ) : null}

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={placeholder ?? 'Write your message…'}
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              maxLength={MAX}
              style={{
                minHeight: 120, borderRadius: 12, padding: 12,
                backgroundColor: colors.navy, color: colors.textPrimary, fontSize: 15,
                borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top',
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 }}>
              {message.length}/{MAX}
            </Text>

            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
              Sequins emails this to {recipientName}. When they reply, it goes to {email ? <Text style={{ fontWeight: '700' }}>{email}</Text> : 'your email'}, so they'll see your email address.
            </Text>

            <Pressable
              onPress={send}
              disabled={!canSend}
              style={{
                marginTop: 16, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                backgroundColor: colors.teal, opacity: canSend ? 1 : 0.5,
              }}
            >
              {sending
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Send message</Text>}
            </Pressable>
            <Pressable onPress={onClose} disabled={sending} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
