// components/DismissKeyboard.tsx
// Wraps any screen/layout so that tapping outside a TextInput dismisses the keyboard.
// Uses onStartShouldSetResponder returning false — it dismisses the keyboard as a side
// effect but never claims the touch responder, so child Pressables/buttons still fire normally.
import { Keyboard, View } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: object;
}

export function DismissKeyboard({ children, style }: Props) {
  return (
    <View
      style={[{ flex: 1 }, style]}
      onStartShouldSetResponder={() => {
        Keyboard.dismiss();
        return false; // don't claim the responder — children still handle their own touches
      }}
    >
      {children}
    </View>
  );
}
