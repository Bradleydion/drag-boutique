import { View, Image, Pressable } from 'react-native';
import * as Linking from 'expo-linking';

export function AdSlot({ imageUrl, targetUrl, slot }: { imageUrl?: string; targetUrl?: string; slot: 'discover'|'event'|'performer' }) {
  if (!imageUrl) {
    return <View style={{ height: 80, margin: 12, borderRadius: 8, backgroundColor: '#222' }} />;
  }
  return (
    <Pressable onPress={() => targetUrl && Linking.openURL(targetUrl)} style={{ margin: 12 }}>
      <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 80, borderRadius: 8 }} />
    </Pressable>
  );
}