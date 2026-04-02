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
  { key: 'patients', label: 'Patients' },
  { key: 'flagged', label: 'Flagged' },
];

function formatDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleString();
}

function SeverityBadge({ level }) {
  const palette = {
    critical: { bg: '#fef2f2', text: colors.danger },
    high: { bg: '#fff7ed', text: '#c2410c' },
    medium: { bg: '#fefce8', text: '#a16207' },
    low: { bg: '#f0fdf4', text: colors.success },
  };
  const s = palette[level] || palette.low;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{level?.toUpperCase()}</Text>
    </View>
  );
}

function PatientDetail({ patient, onBack, onSaved }) {
  const [noteForm, setNoteForm] = useState({ notes: '', diagnosis: '' });
  const [historyForm, setHistoryForm] = useState({ condition: '', notes: '' });
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [busy, setBusy] = useState(false);

  async function saveNote() {
    if (!noteForm.notes.trim()) return;
    setBusy(true);
    setAlert({ message: '' });
    try {
      await api.addDoctorNote({
        patient_id: patient.id,
        notes: noteForm.notes,
        diagnosis: noteForm.diagnosis || null,
      });
      setNoteForm({ notes: '', diagnosis: '' });
      setAlert({ message: 'Note saved.', type: 'success' });
      onSaved();
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function saveHistory() {
    if (!historyForm.condition.trim()) return;
    setBusy(true);
    setAlert({ message: '' });
    try {
      await api.addMedicalHistory({
        patient_id: patient.id,
        condition: historyForm.condition,
        notes: historyForm.notes || null,
      });
      setHistoryForm({ condition: '', notes: '' });
      setAlert({ message: 'Medical history updated.', type: 'success' });
      onSaved();
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={shared.screen}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle}>{patient.user?.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Alert message={alert.message} type={alert.type} />

        <View style={shared.card}>
          <Text style={shared.kicker}>Patient info</Text>
          {[
            ['Name', patient.user?.name],
            ['Email', patient.user?.email],
            ['Age', patient.age],
            ['Gender', patient.gender],
            ['Blood Group', patient.blood_group],
            ['Allergies', patient.allergies],
          ].map(([label, val]) => (
            <View key={label} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{val || '—'}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Medical History</Text>
        {patient.medical_history?.length ? (
          patient.medical_history.map((item) => (
            <View key={item.id} style={shared.card}>
              <Text style={shared.cardTitle}>{item.condition}</Text>
              <Text style={shared.muted}>{item.notes || 'No notes.'}</Text>
            </View>
          ))
        ) : (
          <Text style={[shared.muted, { marginBottom: 12 }]}>No history entries yet.</Text>
        )}

        <Text style={styles.sectionTitle}>Doctor Notes</Text>
        {patient.doctor_notes?.length ? (
          patient.doctor_notes.map((item) => (
            <View key={item.id} style={shared.card}>
              <Text style={shared.cardTitle}>{item.diagnosis || 'Doctor note'}</Text>
              <Text style={shared.muted}>{item.notes}</Text>
            </View>
          ))
        ) : (
          <Text style={[shared.muted, { marginBottom: 12 }]}>No notes yet.</Text>
        )}

        <Text style={styles.sectionTitle}>Recent Chats</Text>
        {patient.chats?.length ? (
          patient.chats.map((item) => (
            <View key={item.id} style={shared.card}>
              <SeverityBadge level={item.severity_level} />
              <Text style={styles.chatMsg}>{item.message}</Text>
              <Text style={shared.muted}>{item.response}</Text>
            </View>
          ))
        ) : (
          <Text style={[shared.muted, { marginBottom: 12 }]}>No chats recorded.</Text>
        )}

        <View style={shared.divider} />
        <Text style={styles.sectionTitle}>Add Doctor Note</Text>
        <View style={shared.card}>
          <Text style={shared.label}>Notes</Text>
          <TextInput
            style={[shared.textarea, { height: 90 }]}
            value={noteForm.notes}
            onChangeText={(v) => setNoteForm((f) => ({ ...f, notes: v }))}
            placeholder="Follow-up observation…"
            multiline
          />
          <Text style={shared.label}>Diagnosis (optional)</Text>
          <TextInput
            style={shared.input}
            value={noteForm.diagnosis}
            onChangeText={(v) => setNoteForm((f) => ({ ...f, diagnosis: v }))}
            placeholder="Stage 1 hypertension"
          />
          <TouchableOpacity style={[shared.primaryBtn, busy && { opacity: 0.6 }]} onPress={saveNote} disabled={busy}>
            <Text style={shared.primaryBtnText}>{busy ? 'Saving…' : 'Save Note'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Add Medical History</Text>
        <View style={shared.card}>
          <Text style={shared.label}>Condition</Text>
          <TextInput
            style={shared.input}
            value={historyForm.condition}
            onChangeText={(v) => setHistoryForm((f) => ({ ...f, condition: v }))}
            placeholder="Type 2 diabetes"
          />
          <Text style={shared.label}>Notes (optional)</Text>
          <TextInput
            style={[shared.textarea, { height: 80 }]}
            value={historyForm.notes}
            onChangeText={(v) => setHistoryForm((f) => ({ ...f, notes: v }))}
            placeholder="Medication, monitoring…"
            multiline
          />
          <TouchableOpacity style={[shared.secondaryBtn, busy && { opacity: 0.6 }]} onPress={saveHistory} disabled={busy}>
            <Text style={shared.secondaryBtnText}>{busy ? 'Updating…' : 'Add Medical History'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default function DoctorScreen({ user, onLogout }) {
  const [tab, setTab] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [flaggedChats, setFlaggedChats] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const loadDoctorData = useCallback(async () => {
    try {
      const [pList, flagged] = await Promise.all([api.getPatients(), api.getFlaggedChats()]);
      setPatients(pList);
      setFlaggedChats(flagged);
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    }
  }, []);

  useEffect(() => {
    loadDoctorData();
  }, [loadDoctorData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadDoctorData();
    setRefreshing(false);
  }

  async function openPatient(id) {
    setLoadingPatient(true);
    try {
      const p = await api.getPatient(id);
      setSelectedPatient(p);
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setLoadingPatient(false);
    }
  }

  async function onNoteSaved() {
    if (selectedPatient) await openPatient(selectedPatient.id);
    await loadDoctorData();
  }

  if (selectedPatient) {
    return (
      <PatientDetail
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
        onSaved={onNoteSaved}
      />
    );
  }

  return (
    <View style={shared.screen}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topName}>{user.name}</Text>
          <Text style={styles.topRole}>Doctor</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Alert message={alert.message} type={alert.type} />

          {loadingPatient && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {tab === 'patients' && (
            <>
              <Text style={shared.sectionHeader}>Registered Patients</Text>
              {patients.length === 0 && (
                <Text style={shared.muted}>No patients registered yet.</Text>
              )}
              {patients.map((p) => (
                <TouchableOpacity key={p.id} style={shared.card} onPress={() => openPatient(p.id)}>
                  <Text style={shared.cardTitle}>{p.user?.name}</Text>
                  <Text style={shared.muted}>{p.user?.email}</Text>
                  <View style={shared.metaRow}>
                    <Text style={shared.metaTag}>{p.gender || 'Unknown'}</Text>
                    <Text style={shared.metaTag}>Age {p.age || 'N/A'}</Text>
                    {p.blood_group ? <Text style={shared.metaTag}>{p.blood_group}</Text> : null}
                  </View>
                  <Text style={styles.tapHint}>Tap to view details →</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {tab === 'flagged' && (
            <>
              <Text style={shared.sectionHeader}>Flagged Conversations</Text>
              {flaggedChats.length === 0 && (
                <Text style={shared.muted}>No flagged conversations right now.</Text>
              )}
              {flaggedChats.map((item) => (
                <View key={item.id} style={[shared.card, styles.flaggedCard]}>
                  <View style={styles.flaggedTop}>
                    <Text style={shared.cardTitle}>{item.patient_name}</Text>
                    <SeverityBadge level={item.severity_level} />
                  </View>
                  {item.risk_reason ? (
                    <Text style={[shared.muted, { marginBottom: 6 }]}>{item.risk_reason}</Text>
                  ) : null}
                  <Text style={styles.chatMsg}>{item.message}</Text>
                  <Text style={shared.muted}>{item.response}</Text>
                  <Text style={[shared.muted, { marginTop: 6 }]}>{formatDate(item.created_at)}</Text>
                </View>
              ))}
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
    backgroundColor: '#0f766e',
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
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  tapHint: { fontSize: 12, color: colors.primary, marginTop: 8, fontWeight: '500' },
  flaggedCard: { borderLeftWidth: 4, borderLeftColor: colors.danger },
  flaggedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatMsg: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  loadingOverlay: { alignItems: 'center', paddingVertical: 20 },
  detailHeader: {
    backgroundColor: '#0f766e',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
  detailTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  metaLabel: { fontSize: 13, color: colors.muted },
  metaValue: { fontSize: 13, color: colors.text, fontWeight: '600' },
});
