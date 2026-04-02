import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Alert from '../components/Alert';
import { api } from '../api';
import { saveSession } from '../storage';
import { colors, shared } from '../theme';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const WEIGHT_UNITS = ['kg', 'lbs'];

const COUNTRIES = [
  { name: 'Afghanistan', code: '93' }, { name: 'Albania', code: '355' },
  { name: 'Algeria', code: '213' }, { name: 'Argentina', code: '54' },
  { name: 'Australia', code: '61' }, { name: 'Austria', code: '43' },
  { name: 'Bangladesh', code: '880' }, { name: 'Belgium', code: '32' },
  { name: 'Brazil', code: '55' }, { name: 'Canada', code: '1' },
  { name: 'Chile', code: '56' }, { name: 'China', code: '86' },
  { name: 'Colombia', code: '57' }, { name: 'Denmark', code: '45' },
  { name: 'Egypt', code: '20' }, { name: 'Ethiopia', code: '251' },
  { name: 'Finland', code: '358' }, { name: 'France', code: '33' },
  { name: 'Germany', code: '49' }, { name: 'Ghana', code: '233' },
  { name: 'Greece', code: '30' }, { name: 'India', code: '91' },
  { name: 'Indonesia', code: '62' }, { name: 'Iran', code: '98' },
  { name: 'Iraq', code: '964' }, { name: 'Ireland', code: '353' },
  { name: 'Israel', code: '972' }, { name: 'Italy', code: '39' },
  { name: 'Japan', code: '81' }, { name: 'Jordan', code: '962' },
  { name: 'Kenya', code: '254' }, { name: 'Malaysia', code: '60' },
  { name: 'Mexico', code: '52' }, { name: 'Morocco', code: '212' },
  { name: 'Netherlands', code: '31' }, { name: 'New Zealand', code: '64' },
  { name: 'Nigeria', code: '234' }, { name: 'Norway', code: '47' },
  { name: 'Pakistan', code: '92' }, { name: 'Philippines', code: '63' },
  { name: 'Poland', code: '48' }, { name: 'Portugal', code: '351' },
  { name: 'Romania', code: '40' }, { name: 'Russia', code: '7' },
  { name: 'Saudi Arabia', code: '966' }, { name: 'Singapore', code: '65' },
  { name: 'South Africa', code: '27' }, { name: 'South Korea', code: '82' },
  { name: 'Spain', code: '34' }, { name: 'Sri Lanka', code: '94' },
  { name: 'Sweden', code: '46' }, { name: 'Switzerland', code: '41' },
  { name: 'Thailand', code: '66' }, { name: 'Turkey', code: '90' },
  { name: 'UAE', code: '971' }, { name: 'Uganda', code: '256' },
  { name: 'UK', code: '44' }, { name: 'Ukraine', code: '380' },
  { name: 'USA', code: '1' }, { name: 'Vietnam', code: '84' },
];

const loginDefaults = { email: '', password: '' };
const registerDefaults = {
  name: '', email: '', password: '', role: 'patient',
  age: '', gender: '', blood_group: '',
  countryCode: '91', phoneNumber: '',
  allergies: '', weight: '', weight_unit: 'kg',
};

function Dropdown({ label, options, value, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Text style={shared.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value || `Select ${label}`}
        </Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.modalOption, value === opt && styles.modalOptionActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[styles.modalOptionText, value === opt && styles.modalOptionTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function CountryCodePicker({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    search.trim()
      ? COUNTRIES.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search)
        )
      : COUNTRIES,
    [search]
  );

  const selected = COUNTRIES.find((c) => c.code === value);

  return (
    <>
      <TouchableOpacity style={styles.countryPickerBtn} onPress={() => setOpen(true)}>
        <Text style={styles.countryPickerText}>+{value}</Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.countryModal}>
          <View style={styles.countryModalHeader}>
            <Text style={styles.countryModalTitle}>Select Country Code</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
              <Text style={styles.countryModalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.countrySearch}
            value={search}
            onChangeText={setSearch}
            placeholder="Search country or code…"
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `${item.code}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, item.code === value && styles.countryItemActive]}
                onPress={() => { onSelect(item.code); setOpen(false); setSearch(''); }}
              >
                <Text style={styles.countryItemName}>{item.name}</Text>
                <Text style={[styles.countryItemCode, item.code === value && { color: '#fff' }]}>+{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

export default function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState(loginDefaults);
  const [registerForm, setRegisterForm] = useState(registerDefaults);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [busy, setBusy] = useState(false);

  function setLogin(key, val) { setLoginForm((f) => ({ ...f, [key]: val })); }
  function setReg(key, val) { setRegisterForm((f) => ({ ...f, [key]: val })); }

  function handleNameChange(val) {
    setReg('name', val);
    if (val && /[0-9]/.test(val)) {
      setNameError('Name cannot contain numbers.');
    } else {
      setNameError('');
    }
  }

  function handlePhoneChange(val) {
    const digits = val.replace(/\D/g, '');
    if (digits.length > 10) return;
    setReg('phoneNumber', digits);
    if (digits.length > 0 && digits.length < 10) {
      setPhoneError('Phone number must be exactly 10 digits.');
    } else {
      setPhoneError('');
    }
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
    if (/[0-9]/.test(registerForm.name)) {
      setAlert({ message: 'Name cannot contain numbers.', type: 'error' });
      return;
    }
    if (registerForm.role === 'patient' && registerForm.phoneNumber && registerForm.phoneNumber.length !== 10) {
      setAlert({ message: 'Phone number must be exactly 10 digits.', type: 'error' });
      return;
    }

    setBusy(true);
    setAlert({ message: '' });

    const payload = {
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      role: registerForm.role,
    };

    if (registerForm.role === 'patient') {
      payload.age = registerForm.age ? Number(registerForm.age) : undefined;
      payload.gender = registerForm.gender || undefined;
      payload.blood_group = registerForm.blood_group || null;
      payload.phone_number = registerForm.phoneNumber
        ? `+${registerForm.countryCode}${registerForm.phoneNumber}`
        : null;
      payload.allergies = registerForm.allergies || null;
      payload.weight = registerForm.weight ? parseFloat(registerForm.weight) : null;
      payload.weight_unit = registerForm.weight ? registerForm.weight_unit : null;
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
    <KeyboardAvoidingView style={shared.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>MedAssist</Text>
          <Text style={styles.tagline}>AI-powered symptom guidance, reviewed by doctors.</Text>
        </View>

        <View style={styles.tabRow}>
          {['login', 'register'].map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
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
              <TextInput style={shared.input} value={loginForm.email} onChangeText={(v) => setLogin('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Text style={shared.label}>Password</Text>
              <TextInput style={shared.input} value={loginForm.password} onChangeText={(v) => setLogin('password', v)} secureTextEntry placeholder="••••••••" />
              <TouchableOpacity style={[shared.primaryBtn, busy && { opacity: 0.6 }]} onPress={handleLogin} disabled={busy}>
                <Text style={shared.primaryBtnText}>{busy ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={shared.label}>Full Name (letters only)</Text>
              <TextInput
                style={[shared.input, nameError ? styles.inputError : null]}
                value={registerForm.name}
                onChangeText={handleNameChange}
                placeholder="Jane Doe"
                autoCapitalize="words"
              />
              {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

              <Text style={shared.label}>Role</Text>
              <View style={styles.roleRow}>
                {['patient', 'doctor'].map((r) => (
                  <TouchableOpacity key={r} style={[styles.roleBtn, registerForm.role === r && styles.roleBtnActive]} onPress={() => setReg('role', r)}>
                    <Text style={[styles.roleBtnText, registerForm.role === r && styles.roleBtnTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={shared.label}>Email</Text>
              <TextInput style={shared.input} value={registerForm.email} onChangeText={(v) => setReg('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />

              <Text style={shared.label}>Password</Text>
              <TextInput style={shared.input} value={registerForm.password} onChangeText={(v) => setReg('password', v)} secureTextEntry placeholder="Min. 8 characters" />

              {registerForm.role === 'patient' && (
                <>
                  <Text style={styles.sectionLabel}>Patient Details</Text>

                  <Text style={shared.label}>Age</Text>
                  <TextInput style={shared.input} value={registerForm.age} onChangeText={(v) => setReg('age', v)} keyboardType="numeric" placeholder="25" />

                  <Dropdown label="Gender" options={GENDERS} value={registerForm.gender} onSelect={(v) => setReg('gender', v)} />
                  <Dropdown label="Blood Group" options={BLOOD_GROUPS} value={registerForm.blood_group} onSelect={(v) => setReg('blood_group', v)} />

                  <Text style={shared.label}>Phone Number</Text>
                  <View style={styles.phoneRow}>
                    <CountryCodePicker value={registerForm.countryCode} onSelect={(v) => setReg('countryCode', v)} />
                    <TextInput
                      style={[styles.phoneInput, phoneError ? styles.inputError : null]}
                      value={registerForm.phoneNumber}
                      onChangeText={handlePhoneChange}
                      keyboardType="numeric"
                      placeholder="10-digit number"
                      maxLength={10}
                    />
                  </View>
                  {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}

                  <Text style={shared.label}>Allergies</Text>
                  <TextInput style={shared.input} value={registerForm.allergies} onChangeText={(v) => setReg('allergies', v)} placeholder="Penicillin, peanuts…" />

                  <Text style={shared.label}>Weight</Text>
                  <View style={styles.weightRow}>
                    <TextInput
                      style={[shared.input, { flex: 1, marginRight: 10, marginBottom: 0 }]}
                      value={registerForm.weight}
                      onChangeText={(v) => setReg('weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="70"
                    />
                    <View style={styles.unitRow}>
                      {WEIGHT_UNITS.map((u) => (
                        <TouchableOpacity key={u} style={[styles.unitBtn, registerForm.weight_unit === u && styles.unitBtnActive]} onPress={() => setReg('weight_unit', u)}>
                          <Text style={[styles.unitBtnText, registerForm.weight_unit === u && styles.unitBtnTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity style={[shared.primaryBtn, { marginTop: 16 }, busy && { opacity: 0.6 }]} onPress={handleRegister} disabled={busy}>
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
  tabRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 10, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.card },
  tabBtnText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  tabBtnTextActive: { color: colors.primary },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { color: colors.muted, fontWeight: '600' },
  roleBtnTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 10, marginTop: 8 },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', marginBottom: 12 },
  dropdownValue: { fontSize: 15, color: colors.text },
  dropdownPlaceholder: { fontSize: 15, color: '#aaa' },
  dropdownArrow: { fontSize: 14, color: colors.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  modalOptionActive: { backgroundColor: colors.primary },
  modalOptionText: { fontSize: 15, color: colors.text },
  modalOptionTextActive: { color: '#fff', fontWeight: '600' },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  countryPickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', minWidth: 80 },
  countryPickerText: { fontSize: 15, color: colors.text, marginRight: 4 },
  phoneInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: '#fff' },
  countryModal: { flex: 1, backgroundColor: '#fff', marginTop: 60, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  countryModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  countryModalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  countryModalClose: { fontSize: 18, color: colors.muted },
  countrySearch: { margin: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  countryItemActive: { backgroundColor: colors.primary },
  countryItemName: { fontSize: 15, color: colors.text },
  countryItemCode: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 12, color: colors.danger, marginTop: -8, marginBottom: 10 },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  unitBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitBtnText: { color: colors.muted, fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  disclaimer: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 16, marginBottom: 32 },
});
