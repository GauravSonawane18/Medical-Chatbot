import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Alert from '../components/Alert';
import TabBar from '../components/TabBar';
import { api } from '../api';
import { colors, shared } from '../theme';

const TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'history', label: 'History' },
  { key: 'profile', label: 'Profile' },
];

function formatDate(v) {
  if (!v) return 'Unknown';
  return new Date(v).toLocaleString();
}

function SeverityBadge({ level, flagged }) {
  const palette = {
    critical: { bg: '#fef2f2', text: colors.danger },
    high: { bg: '#fff7ed', text: '#c2410c' },
    medium: { bg: '#fefce8', text: '#a16207' },
    low: { bg: '#f0fdf4', text: colors.success },
  };
  const s = palette[level] || palette.low;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>
        {level?.toUpperCase()}{flagged ? ' • Flagged' : ''}
      </Text>
    </View>
  );
}

export default function PatientScreen({ user, onLogout }) {
  const [tab, setTab] = useState('chat');
  const [profile, setProfile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [refreshing, setRefreshing] = useState(false);

  const [symptoms, setSymptoms] = useState('');
  const [message, setMessage] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, h, m] = await Promise.all([
        api.getMe(),
        api.getChatHistory(),
        api.getMedicalHistory(),
      ]);
      setProfile(p);
      setChatHistory(h);
      setMedicalHistory(m);
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleChat() {
    if (!message.trim()) return;
    setChatBusy(true);
    setAlert({ message: '' });
    try {
      await api.sendChat({ message, symptoms: symptoms || null });
      setMessage('');
      setSymptoms('');
      await loadData();
      setAlert({ message: 'Response received.', type: 'success' });
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <View style={shared.screen}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topName}>{user.name}</Text>
          <Text style={styles.topRole}>Patient</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Alert message={alert.message} type={alert.type} />

          {tab === 'chat' && (
            <>
              <Text style={shared.sectionHeader}>Ask the assistant</Text>
              <View style={shared.card}>
                <Text style={shared.label}>Symptoms (optional)</Text>
                <TextInput
                  style={shared.input}
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="fever, cough, fatigue…"
                />
                <Text style={shared.label}>Describe what you're feeling</Text>
                <TextInput
                  style={[shared.textarea, { height: 100 }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="I've had a headache for 3 days…"
                  multiline
                />
                <TouchableOpacity
                  style={[shared.primaryBtn, chatBusy && { opacity: 0.6 }]}
                  onPress={handleChat}
                  disabled={chatBusy}
                >
                  {chatBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={shared.primaryBtnText}>Send Message</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionSubheader}>Recent conversations</Text>
              {chatHistory.length === 0 && (
                <Text style={shared.muted}>No chats yet. Ask the assistant about your symptoms.</Text>
              )}
              {chatHistory.map((item) => (
                <View key={item.id} style={shared.card}>
                  <SeverityBadge level={item.severity_level} flagged={item.is_flagged} />
                  <Text style={styles.chatMessage}>{item.message}</Text>
                  {item.symptoms ? (
                    <Text style={shared.muted}>Symptoms: {item.symptoms}</Text>
                  ) : null}
                  <View style={shared.divider} />
                  <Text style={styles.chatResponse}>{item.response}</Text>
                  <Text style={[shared.muted, { marginTop: 6 }]}>{formatDate(item.created_at)}</Text>
                </View>
              ))}
            </>
          )}

          {tab === 'history' && (
            <>
              <Text style={shared.sectionHeader}>Medical History</Text>
              {medicalHistory.length === 0 && (
                <Text style={shared.muted}>No medical history entries yet.</Text>
              )}
              {medicalHistory.map((item) => (
                <View key={item.id} style={shared.card}>
                  <Text style={shared.cardTitle}>{item.condition}</Text>
                  <Text style={shared.muted}>{item.notes || 'No notes provided.'}</Text>
                  <Text style={[shared.muted, { marginTop: 6 }]}>{formatDate(item.created_at)}</Text>
                </View>
              ))}
            </>
          )}

          {tab === 'profile' && (
            <>
              <Text style={shared.sectionHeader}>Your Profile</Text>
              {profile ? (
                <View style={shared.card}>
                  {[
                    ['Name', profile.user?.name],
                    ['Email', profile.user?.email],
                    ['Age', profile.age],
                    ['Gender', profile.gender],
                    ['Blood Group', profile.blood_group],
                    ['Phone', profile.phone_number],
                    ['Allergies', profile.allergies],
                  ].map(([label, val]) => (
                    <View key={label} style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{label}</Text>
                      <Text style={styles.metaValue}>{val || 'Not provided'}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  topName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  topRole: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionSubheader: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chatMessage: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  chatResponse: { fontSize: 14, color: colors.label, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  metaLabel: { fontSize: 13, color: colors.muted, flex: 1 },
  metaValue: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 2, textAlign: 'right' },
});
