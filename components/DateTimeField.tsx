// components/DateTimeField.tsx
// Tap-to-pick date/time field. Replaces the old free-text ISO inputs, which
// made hosts type things like "2026-10-23T20:00:00-07:00" and silently saved
// the wrong time when the offset was left off.
//
// value/onChange use full ISO strings (UTC instants), so the stored time is
// always correct; the field displays it in the phone's local timezone.

import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { colors as C } from '../src/theme/colors';

type Props = {
  label: string;
  value?: string;                 // ISO string or '' / undefined
  onChange: (iso: string) => void;
  mode?: 'datetime' | 'date';
  placeholder?: string;
  minimumDate?: Date;
  /** Used as the starting point when the field is empty. */
  defaultDate?: Date;
  onClear?: () => void;
};

function formatValue(iso: string | undefined, mode: 'datetime' | 'date'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  if (mode === 'date') return date;
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

/** 8:00 PM on the next Friday — a sensible starting point for a drag night. */
function nextFridayEvening(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  d.setHours(20, 0, 0, 0);
  return d;
}

export function DateTimeField({
  label, value, onChange, mode = 'datetime', placeholder, minimumDate, defaultDate, onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const current = value && !Number.isNaN(Date.parse(value)) ? new Date(value) : (defaultDate ?? nextFridayEvening());
  const [pending, setPending] = useState<Date>(current);
  const shown = formatValue(value, mode);

  function openPicker() {
    if (Platform.OS === 'android') {
      // Android shows separate date and time dialogs.
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        onChange: (e: DateTimePickerEvent, date?: Date) => {
          if (e.type !== 'set' || !date) return;
          if (mode === 'date') { onChange(date.toISOString()); return; }
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onChange: (e2: DateTimePickerEvent, time?: Date) => {
              if (e2.type !== 'set' || !time) return;
              const merged = new Date(date);
              merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
              onChange(merged.toISOString());
            },
          });
        },
      });
      return;
    }
    setPending(current);
    setOpen(true);
  }

  return (
    <View>
      <Text style={{ color: C.textPrimary, fontWeight: '800' }}>{label}</Text>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown ?? 'not set'}`}
        style={{
          backgroundColor: C.surface, borderRadius: 10, padding: 12, marginTop: 6,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: shown ? C.textPrimary : C.textMuted, fontSize: 15 }}>
          {shown ?? placeholder ?? 'Tap to choose'}
        </Text>
        <Text style={{ color: C.teal, fontWeight: '700' }}>{shown ? 'Change' : 'Choose'}</Text>
      </Pressable>
      {shown && onClear && (
        <Pressable onPress={onClear} style={{ alignSelf: 'flex-end', marginTop: 4 }} hitSlop={8}>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Clear</Text>
        </Pressable>
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: C.surface, paddingBottom: 32, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={{ color: C.textMuted, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 16 }}>{label}</Text>
              <Pressable onPress={() => { onChange(pending.toISOString()); setOpen(false); }} hitSlop={10}>
                <Text style={{ color: C.teal, fontWeight: '800', fontSize: 16 }}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pending}
              mode={mode}
              display="inline"
              themeVariant="dark"
              accentColor={C.teal}
              minimumDate={minimumDate}
              onChange={(_e, d) => { if (d) setPending(d); }}
              style={{ alignSelf: 'center' }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}
