import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const savePassword = async () => {
    if (password.trim().length < 6) {
      setMessage('Heslo musí mať aspoň 6 znakov.');
      return;
    }

    const token = params.token;

    if (!token || typeof token !== 'string') {
      setMessage('Resetovací odkaz neobsahuje token.');
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError) {
      setMessage(verifyError.message);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('✅ Heslo bolo zmenené.');

    setTimeout(() => {
      router.replace('/');
    }, 1500);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>
        🔑 Nové heslo
      </Text>

      <TextInput
        placeholder="Nové heslo"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      />

      <Pressable
        onPress={savePassword}
        style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
          Uložiť nové heslo
        </Text>
      </Pressable>

      {message !== '' && (
        <Text style={{ marginTop: 16, textAlign: 'center' }}>
          {message}
        </Text>
      )}
    </View>
  );
}