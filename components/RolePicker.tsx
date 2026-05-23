// components/RolePicker.tsx
// Multi-select role chips for talent profiles.
// Lets talent choose which roles they're confident filling.
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ROLE_TYPES, type RoleKey } from '../lib/eventRolesStore';
import { colors as C } from '../src/theme/colors';

export type SelectedRole = {
  roleName: RoleKey;
  customName?: string;
  isPrimary?: boolean;
};

interface Props {
  selected: SelectedRole[];
  onChange: (roles: SelectedRole[]) => void;
}

export function RolePicker({ selected, onChange }: Props) {
  const [customName, setCustomName] = useState('');

  const selectedKeys = selected.map(r => r.roleName);

  function toggle(key: RoleKey) {
    if (selectedKeys.includes(key)) {
      // Remove
      onChange(selected.filter(r => r.roleName !== key));
    } else {
      // Add — if it's the first, mark as primary
      const isFirst = selected.length === 0;
      onChange([...selected, { roleName: key, isPrimary: isFirst }]);
    }
  }

  function setPrimary(key: RoleKey) {
    onChange(selected.map(r => ({ ...r, isPrimary: r.roleName === key })));
  }

  // Handle 'other' custom name
  const hasOther = selectedKeys.includes('other');
  const otherRole = selected.find(r => r.roleName === 'other');

  function updateCustomName(name: string) {
    setCustomName(name);
    onChange(selected.map(r =>
      r.roleName === 'other' ? { ...r, customName: name } : r,
    ));
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ROLE_TYPES.map(role => {
          const isSelected = selectedKeys.includes(role.key);
          const isPrimary = selected.find(r => r.roleName === role.key)?.isPrimary;
          return (
            <Pressable
              key={role.key}
              onPress={() => toggle(role.key)}
              onLongPress={() => isSelected && setPrimary(role.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: isSelected ? (isPrimary ? '#F59E0B' : C.teal) : C.border,
                backgroundColor: isSelected ? (isPrimary ? '#F59E0B22' : C.teal + '22') : C.surface,
              }}
            >
              <Text style={{ fontSize: 14 }}>{role.emoji}</Text>
              <Text style={{
                color: isSelected ? (isPrimary ? '#F59E0B' : C.teal) : C.textMuted,
                fontWeight: isSelected ? '800' : '600',
                fontSize: 13,
              }}>
                {role.label}
              </Text>
              {isPrimary && (
                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '900' }}>✦</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {hasOther && (
        <TextInput
          value={customName}
          onChangeText={updateCustomName}
          placeholder="Describe your other role"
          placeholderTextColor={C.textMuted}
          style={{
            backgroundColor: C.surface,
            borderRadius: 10,
            padding: 12,
            color: C.textPrimary,
            marginTop: 10,
            fontSize: 15,
          }}
        />
      )}

      {selected.length > 1 && (
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
          Long-press a role to mark it as your primary ✦
        </Text>
      )}
    </View>
  );
}
