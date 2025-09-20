// components/InstagramGrid.tsx
import { View, Image, Pressable, Text } from 'react-native';
import * as Linking from 'expo-linking';

export function InstagramGrid({
  photos,
  profileUrl,
}: {
  photos?: string[];
  profileUrl?: string;
}) {
  const hasPhotos = Array.isArray(photos) && photos.length > 0;
  const onOpen = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={{ marginTop: 16 }}>
      {!hasPhotos ? (
        <Text style={{ color: '#555' }}>(No Instagram photos yet)</Text>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -4,
          }}
        >
          {photos!.slice(0, 9).map((uri, idx) => (
            <Pressable
              key={idx}
              onPress={() => onOpen(profileUrl || uri)}
              style={{ width: '33.3333%', padding: 4 }}
            >
              <Image
                source={{ uri }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}