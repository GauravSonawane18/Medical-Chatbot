import React, { Component, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { clearSession, loadSession } from './src/storage';
import { api, setUnauthorizedHandler } from './src/api';
import AuthScreen from './src/screens/AuthScreen';
import PatientScreen from './src/screens/PatientScreen';
import DoctorScreen from './src/screens/DoctorScreen';
import { colors } from './src/theme';

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errTitle}>Something went wrong</Text>
          <Text style={styles.errMsg}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function useServerReachable() {
  const [status, setStatus] = useState('checking'); // checking | ok | unreachable

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await api.healthCheck();
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('unreachable');
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return [status, () => setStatus('checking')];
}

function ServerGate({ children }) {
  const [status, retry] = useServerReachable();

  if (status === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.checkingText}>Connecting to server…</Text>
      </View>
    );
  }

  if (status === 'unreachable') {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Server unreachable</Text>
        <Text style={styles.errMsg}>
          Make sure FastAPI is running and the IP in src/api.js is correct.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

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

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isDoctor = user && ['doctor', 'admin'].includes(user.role);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <ServerGate>
        {!token || !user ? (
          <AuthScreen onLogin={handleLogin} />
        ) : isDoctor ? (
          <DoctorScreen user={user} onLogout={handleLogout} />
        ) : (
          <PatientScreen user={user} onLogout={handleLogout} />
        )}
      </ServerGate>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 24 },
  checkingText: { marginTop: 12, color: colors.muted, fontSize: 14 },
  errTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  errMsg: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
