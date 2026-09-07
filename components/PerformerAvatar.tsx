// components/PerformerAvatar.tsx
import { Image, Pressable, View } from 'react-native';
import { Link } from 'expo-router';

const GOLD = '#F59E0B';

interface PerformerAvatarProps {
  id: string;
  photoUrl: string;
  size?: number;
  isPromoted?: boolean;
}

export function PerformerAvatar({ id, photoUrl, size = 48, isPromoted = false }: PerformerAvatarProps) {
  const radius = size / 2;

  return (
    <Link href={`/performer/${id}`} asChild>
      <Pressable style={{ marginRight: 12 }}>
        {isPromoted ? (
          // Gold ring: outer View acts as the border
          <View style={{
            width: size + 4,
            height: size + 4,
            borderRadius: radius + 2,
            borderWidth: 2,
            borderColor: GOLD,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: GOLD,
            shadowOpacity: 0.5,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}>
            <Image
              source={{ uri: photoUrl }}
              style={{ width: size, height: size, borderRadius: radius }}
            />
          </View>
        ) : (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: size, height: size, borderRadius: radius }}
          />
        )}
      </Pressable>
    </Link>
  );
}
