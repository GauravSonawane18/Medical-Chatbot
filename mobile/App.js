import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { clearSession, loadSession } from './src/storage';
import AuthScreen from './src/screens/AuthScreen';
import PatientScreen from './src/screens/PatientScreen';
import DoctorScreen from './src/screens/DoctorScreen';
import { colors } from './src/theme';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession().then(({ token: t, user: u }) => {
      if (t && u) {
        setToken(t);
        setUser(u);
      }
      setLoading(false);
    });
  }, []);

  function handleLogin(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
  }

  async function handleLogout() {
    await clearSession();
    setToken(null);
    setUser(null);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isDoctor = user && ['doctor', 'admin'].includes(user.role);

  return (
    <>
      <StatusBar style="light" />
      {!token || !user ? (
        <AuthScreen onLogin={handleLogin} />
      ) : isDoctor ? (
        <DoctorScreen user={user} onLogout={handleLogout} />
      ) : (
        <PatientScreen user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
});
