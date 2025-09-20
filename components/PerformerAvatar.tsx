import { Image, Pressable } from 'react-native';
import { Link } from 'expo-router';

export function PerformerAvatar({ id, photoUrl }: { id: string; photoUrl: string }) {
  return (
    <Link href={`/performer/${id}`} asChild>
      <Pressable style={{ marginRight: 12 }}>
        <Image source={{ uri: photoUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
      </Pressable>
    </Link>
  );
}