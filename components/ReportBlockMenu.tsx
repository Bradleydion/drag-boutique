// components/ReportBlockMenu.tsx
// The "•••" button on performer profiles, events and Shop listings:
// Report this… / Block <name>. App Store Guideline 1.2.

import { useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { getSession, isGuest } from '../lib/authStore';
import {
  REPORT_REASONS, blockUser, reportContent,
  type ReportReason, type ReportTargetType,
} from '../lib/moderationStore';
import { colors } from '../src/theme/colors';

const NOUN: Record<ReportTargetType, string> = {
  performer: 'profile',
  event: 'show',
  listing: 'listing',
  user: 'account',
};

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  /** Account that posted it. When missing (e.g. an unclaimed listing), only Report is offered. */
  ownerId?: string | null;
  /** Name to show in "Block <name>". */
  ownerName?: string;
  /** Called after a report or block hides this content, usually to go back. */
  onHidden?: () => void;
  /** Icon color; defaults to the header tint. */
  color?: string;
};

export function ReportBlockMenu({ targetType, targetId, targetLabel, ownerId, ownerName, onHidden, color }: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const myId = getSession()?.user?.id;
  if (ownerId && myId && ownerId === myId) return null; // your own content
  const noun = NOUN[targetType];
  const blockName = ownerName?.trim() || 'this account';
  // Seed/demo content uses placeholder owner ids; only real accounts can be blocked.
  const canBlock = !!ownerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId);

  function requireSignIn(): boolean {
    if (!getSession() || isGuest()) {
      Alert.alert('Sign in first', 'Create a free account or sign in to report or block.');
      return false;
    }
    return true;
  }

  function confirmBlock(id: string) {
    Alert.alert(
      `Block ${blockName}?`,
      `You won't see their profiles, shows or Shop listings anymore. They aren't told you blocked them. You can unblock from Profile → Blocked accounts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(id);
              Alert.alert('Blocked', `You won't see ${blockName} on Sequins anymore.`, [{ text: 'OK', onPress: onHidden }]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not block. Please try again.');
            }
          },
        },
      ],
    );
  }

  function openMenu() {
    if (!requireSignIn()) return;
    const options = [`Report this ${noun}`, ...(canBlock ? [`Block ${blockName}`] : []), 'Cancel'];
    const cancelIndex = options.length - 1;
    const onPick = (i: number) => {
      if (i === 0) { setReason(null); setDetails(''); setReportOpen(true); }
      else if (canBlock && i === 1) confirmBlock(ownerId!);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: canBlock ? [0, 1] : [0] },
        onPick,
      );
    } else {
      Alert.alert(targetLabel, undefined, [
        { text: options[0], onPress: () => onPick(0) },
        ...(canBlock ? [{ text: options[1], style: 'destructive' as const, onPress: () => onPick(1) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  async function sendReport() {
    if (!reason) return;
    setSending(true);
    try {
      const { ownerId: serverOwner } = await reportContent({
        targetType, targetId, targetLabel, reason, details: details.trim() || undefined,
      });
      setReportOpen(false);
      const blockId = serverOwner ?? ownerId ?? null;
      Alert.alert(
        'Thanks for reporting',
        `We review every report within 24 hours. This ${noun} is now hidden for you.` +
          (blockId ? `\n\nDo you also want to block ${blockName}?` : ''),
        blockId
          ? [
              { text: 'Not now', style: 'cancel', onPress: onHidden },
              { text: 'Block', style: 'destructive', onPress: () => confirmBlock(blockId) },
            ]
          : [{ text: 'OK', onPress: onHidden }],
      );
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={openMenu}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`More options: report${canBlock ? ' or block' : ''}`}
        style={{ paddingHorizontal: 6, paddingVertical: 2 }}
      >
        <Text style={{ color: color ?? colors.teal, fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>•••</Text>
      </Pressable>

      <Modal visible={reportOpen} animationType="slide" transparent onRequestClose={() => setReportOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: '#0009' }} onPress={() => !sending && setReportOpen(false)} />
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: 4 }}>
                Report this {noun}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }} numberOfLines={2}>
                {targetLabel} · What's wrong with it?
              </Text>

              {REPORT_REASONS.map((r) => {
                const on = reason === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => setReason(r.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6,
                      backgroundColor: on ? colors.danger + '22' : 'transparent',
                      borderWidth: 1, borderColor: on ? colors.danger : colors.border,
                    }}
                  >
                    <View style={{
                      width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                      borderColor: on ? colors.danger : colors.textMuted,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />}
                    </View>
                    <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{r.label}</Text>
                  </Pressable>
                );
              })}

              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Anything else we should know? (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                style={{
                  marginTop: 10, minHeight: 80, borderRadius: 12, padding: 12,
                  backgroundColor: colors.navy, color: colors.textPrimary, fontSize: 15,
                  borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top',
                }}
              />

              <Pressable
                onPress={sendReport}
                disabled={!reason || sending}
                style={{
                  marginTop: 16, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                  backgroundColor: colors.danger, opacity: !reason || sending ? 0.5 : 1,
                }}
              >
                {sending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Send report</Text>}
              </Pressable>
              <Pressable onPress={() => setReportOpen(false)} disabled={sending} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
