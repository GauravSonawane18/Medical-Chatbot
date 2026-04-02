import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Alert from '../components/Alert';
import { api } from '../api';
import { saveSession } from '../storage';
import { colors, shared } from '../theme';
import { TextInput } from 'react-native';

const loginDefaults = { email: '', password: '' };
const registerDefaults = {
  name: '',
  email: '',
  password: '',
  role: 'patient',
  age: '',
  gender: '',
  blood_group: '',
  phone_number: '',
  allergies: '',
};

export default function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState(loginDefaults);
  const [registerForm, setRegisterForm] = useState(registerDefaults);
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [busy, setBusy] = useState(false);

  function setLogin(key, val) {
    setLoginForm((f) => ({ ...f, [key]: val }));
  }
  function setReg(key, val) {
    setRegisterForm((f) => ({ ...f, [key]: val }));
  }

  async function handleLogin() {
    setBusy(true);
    setAlert({ message: '' });
    try {
      const data = await api.login(loginForm);
      await saveSession(data.access_token, data.user);
      onLogin(data.access_token, data.user);
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    setBusy(true);
    setAlert({ message: '' });
    const payload = {
      ...registerForm,
      age: registerForm.role === 'patient' && registerForm.age ? Number(registerForm.age) : undefined,
      blood_group: registerForm.blood_group || null,
      phone_number: registerForm.phone_number || null,
      allergies: registerForm.allergies || null,
    };
    if (registerForm.role !== 'patient') {
      delete payload.age;
      delete payload.gender;
      delete payload.blood_group;
      delete payload.phone_number;
      delete payload.allergies;
    }
    try {
      const data = await api.register(payload);
      await saveSession(data.access_token, data.user);
      onLogin(data.access_token, data.user);
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={shared.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>MedAssist</Text>
          <Text style={styles.tagline}>AI-powered symptom guidance, reviewed by doctors.</Text>
        </View>

        <View style={styles.tabRow}>
          {['login', 'register'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={shared.card}>
          <Alert message={alert.message} type={alert.type} />

          {tab === 'login' ? (
            <>
              <Text style={shared.label}>Email</Text>
              <TextInput
                style={shared.input}
                value={loginForm.email}
                onChangeText={(v) => setLogin('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
              />
              <Text style={shared.label}>Password</Text>
              <TextInput
                style={shared.input}
                value={loginForm.password}
                onChangeText={(v) => setLogin('password', v)}
                secureTextEntry
                placeholder="••••••••"
              />
              <TouchableOpacity style={shared.primaryBtn} onPress={handleLogin} disabled={busy}>
                <Text style={shared.primaryBtnText}>{busy ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={shared.label}>Full name</Text>
              <TextInput
                style={shared.input}
                value={registerForm.name}
                onChangeText={(v) => setReg('name', v)}
                placeholder="Jane Doe"
              />

              <Text style={shared.label}>Role</Text>
              <View style={styles.roleRow}>
                {['patient', 'doctor'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleBtn, registerForm.role === r && styles.roleBtnActive]}
                    onPress={() => setReg('role', r)}
                  >
                    <Text style={[styles.roleBtnText, registerForm.role === r && styles.roleBtnTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={shared.label}>Email</Text>
              <TextInput
                style={shared.input}
                value={registerForm.email}
                onChangeText={(v) => setReg('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
              />
              <Text style={shared.label}>Password</Text>
              <TextInput
                style={shared.input}
                value={registerForm.password}
                onChangeText={(v) => setReg('password', v)}
                secureTextEntry
                placeholder="••••••••"
              />

              {registerForm.role === 'patient' && (
                <>
                  <Text style={styles.sectionLabel}>Patient details</Text>
                  <Text style={shared.label}>Age</Text>
                  <TextInput
                    style={shared.input}
                    value={registerForm.age}
                    onChangeText={(v) => setReg('age', v)}
                    keyboardType="numeric"
                    placeholder="25"
                  />
                  <Text style={shared.label}>Gender</Text>
                  <TextInput
                    style={shared.input}
                    value={registerForm.gender}
                    onChangeText={(v) => setReg('gender', v)}
                    placeholder="Male / Female / Other"
                  />
                  <Text style={shared.label}>Blood Group</Text>
                  <TextInput
                    style={shared.input}
                    value={registerForm.blood_group}
                    onChangeText={(v) => setReg('blood_group', v)}
                    placeholder="A+"
                  />
                  <Text style={shared.label}>Phone</Text>
                  <TextInput
                    style={shared.input}
                    value={registerForm.phone_number}
                    onChangeText={(v) => setReg('phone_number', v)}
                    keyboardType="phone-pad"
                    placeholder="+1 555 0000"
                  />
                  <Text style={shared.label}>Allergies</Text>
                  <TextInput
                    style={shared.input}
                    value={registerForm.allergies}
                    onChangeText={(v) => setReg('allergies', v)}
                    placeholder="Penicillin, peanuts…"
                  />
                </>
              )}

              <TouchableOpacity style={shared.primaryBtn} onPress={handleRegister} disabled={busy}>
                <Text style={shared.primaryBtnText}>{busy ? 'Creating account…' : 'Create Account'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Responses are informational only and do not replace licensed medical advice.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 32, fontWeight: '800', color: colors.primary },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 6, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.card },
  tabBtnText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  tabBtnTextActive: { color: colors.primary },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { color: colors.muted, fontWeight: '600' },
  roleBtnTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 10, marginTop: 4 },
  disclaimer: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 16, marginBottom: 32 },
});
