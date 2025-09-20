// app/performer/[id]/book.tsx
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

export default function BookingForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ color:'#FFD700', fontSize:20, fontWeight:'800', marginBottom:12 }}>Request Booking</Text>
      <TextInput placeholder="Your name" value={name} onChangeText={setName} style={{ backgroundColor:'#222', color:'#fff', padding:12, borderRadius:8, marginBottom:8 }} />
      <TextInput placeholder="Your email" value={email} onChangeText={setEmail} keyboardType="email-address" style={{ backgroundColor:'#222', color:'#fff', padding:12, borderRadius:8, marginBottom:8 }} />
      <TextInput placeholder="Message" value={message} onChangeText={setMessage} multiline style={{ backgroundColor:'#222', color:'#fff', padding:12, borderRadius:8, height:120 }} />
      <Button
        title="Send"
        onPress={() => {
          console.log('BookingRequest', { performerId:id, name, email, message });
          Alert.alert('Sent', 'Your booking request has been sent (demo).');
        }}
      />
    </View>
  );
}