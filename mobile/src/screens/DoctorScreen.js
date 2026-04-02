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
import { useWebSocket } from '../useWebSocket';
import { colors, shared } from '../theme';

function buildTabs(unreviewedCount) {
  return [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'patients', label: 'Patients' },
    { key: 'flagged', label: unreviewedCount > 0 ? `Priority (${unreviewedCount})` : 'Priority' },
  ];
}

function formatDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SEVERITY_CONFIG = {
  critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'CRITICAL' },
  high:     { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: 'HIGH' },
  medium:   { bg: '#fefce8', text: '#a16207', border: '#fde68a', label: 'MEDIUM' },
  low:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'LOW' },
};

function SeverityBadge({ level }) {
  const s = SEVERITY_CONFIG[level] || SEVERITY_CONFIG.low;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function ReviewedTag({ isReviewed, reviewedAt }) {
  if (!isReviewed) return null;
  return (
    <View style={styles.reviewedTag}>
      <Text style={styles.reviewedTagText}>✓ Reviewed {reviewedAt ? formatDate(reviewedAt) : ''}</Text>
    </View>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Patient Detail ────────────────────────────────────────────────────────────
function PatientDetail({ patient, onBack, onSaved, doctorId }) {
  const [noteForm, setNoteForm] = useState({
    selectedChatId: null,
    notes: '',
    diagnosis: '',
    recommendation: '',
    message_to_patient: '',
  });
  const [historyForm, setHistoryForm] = useState({ condition: '', notes: '' });
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [busy, setBusy] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  function resetNoteForm() {
    setNoteForm({ selectedChatId: null, notes: '', diagnosis: '', recommendation: '', message_to_patient: '' });
  }

  async function saveNote() {
    if (!noteForm.selectedChatId) return;
    const hasContent = noteForm.notes.trim() || noteForm.diagnosis.trim() || noteForm.recommendation.trim() || noteForm.message_to_patient.trim();
    if (!hasContent) return;
    setBusy(true);
    setAlert({ message: '' });
    try {
      await api.addDoctorNote({
        chat_id: noteForm.selectedChatId,
        notes: noteForm.notes,
        diagnosis: noteForm.diagnosis || null,
        recommendation: noteForm.recommendation || null,
        message_to_patient: noteForm.message_to_patient || null,
      });
      resetNoteForm();
      setAlert({ message: 'Note saved and patient notified.', type: 'success' });
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
      await api.addMedicalHistory({ patient_id: patient.id, condition: historyForm.condition, notes: historyForm.notes || null });
      setHistoryForm({ condition: '', notes: '' });
      setAlert({ message: 'Medical history updated.', type: 'success' });
      onSaved();
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function markReviewed(chatId) {
    setReviewingId(chatId);
    try {
      await api.reviewChat(chatId);
      onSaved();
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setReviewingId(null);
    }
  }

  const sortedChats = [...(patient.chats || [])].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity_level] ?? 3) - (order[b.severity_level] ?? 3);
  });

  const criticalCount = sortedChats.filter(c => c.severity_level === 'critical' && !c.is_reviewed).length;
  const highCount = sortedChats.filter(c => c.severity_level === 'high' && !c.is_reviewed).length;

  return (
    <View style={shared.screen}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{patient.user?.name}</Text>
          <Text style={styles.detailSub}>{patient.user?.email}</Text>
        </View>
        {(criticalCount > 0 || highCount > 0) && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>⚠ Urgent</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Alert message={alert.message} type={alert.type} />

        {/* Patient Info */}
        <View style={shared.card}>
          <Text style={shared.kicker}>Patient Profile</Text>
          <View style={styles.infoGrid}>
            {[
              ['Age', patient.age], ['Gender', patient.gender],
              ['Blood Group', patient.blood_group],
              ['Weight', patient.weight ? `${patient.weight} ${patient.weight_unit || ''}` : null],
              ['Allergies', patient.allergies], ['Phone', patient.phone_number],
            ].map(([label, val]) => val ? (
              <View key={label} style={styles.infoItem}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{val}</Text>
              </View>
            ) : null)}
          </View>
        </View>

        {/* Stats */}
        {(criticalCount > 0 || highCount > 0) && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>
              ⚠ {criticalCount > 0 ? `${criticalCount} critical` : ''}{criticalCount > 0 && highCount > 0 ? ', ' : ''}{highCount > 0 ? `${highCount} high-risk` : ''} chat{criticalCount + highCount > 1 ? 's' : ''} awaiting review
            </Text>
          </View>
        )}

        {/* Medical History */}
        <Text style={styles.sectionTitle}>Medical History</Text>
        {patient.medical_history?.length ? (
          patient.medical_history.map((item) => (
            <View key={item.id} style={shared.card}>
              <Text style={shared.cardTitle}>{item.condition}</Text>
              {item.notes ? <Text style={shared.muted}>{item.notes}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={[shared.muted, { marginBottom: 12 }]}>No history entries.</Text>
        )}

        {/* Add Medical History */}
        <View style={[shared.card, { borderStyle: 'dashed', borderColor: colors.primary }]}>
          <Text style={shared.kicker}>Update Medical Record</Text>
          <Text style={shared.label}>Condition</Text>
          <TextInput style={shared.input} value={historyForm.condition} onChangeText={(v) => setHistoryForm((f) => ({ ...f, condition: v }))} placeholder="e.g. Type 2 Diabetes" />
          <Text style={shared.label}>Notes (optional)</Text>
          <TextInput style={[shared.textarea, { height: 70 }]} value={historyForm.notes} onChangeText={(v) => setHistoryForm((f) => ({ ...f, notes: v }))} placeholder="Medication, monitoring details…" multiline />
          <TouchableOpacity style={[shared.secondaryBtn, busy && { opacity: 0.6 }]} onPress={saveHistory} disabled={busy}>
            <Text style={shared.secondaryBtnText}>{busy ? 'Saving…' : 'Add to Medical Record'}</Text>
          </TouchableOpacity>
        </View>

        {/* Chat History */}
        <Text style={styles.sectionTitle}>Chat History (sorted by priority)</Text>
        {sortedChats.length === 0 && <Text style={[shared.muted, { marginBottom: 12 }]}>No chats yet.</Text>}
        {sortedChats.map((chat) => {
          const sc = SEVERITY_CONFIG[chat.severity_level] || SEVERITY_CONFIG.low;
          const isSelected = noteForm.selectedChatId === chat.id;
          return (
            <View key={chat.id} style={[shared.card, { borderLeftWidth: 4, borderLeftColor: sc.text }]}>
              {/* Header */}
              <View style={styles.chatCardHeader}>
                <SeverityBadge level={chat.severity_level} />
                <Text style={shared.muted}>{formatDate(chat.created_at)}</Text>
              </View>

              <ReviewedTag isReviewed={chat.is_reviewed} reviewedAt={chat.reviewed_at} />

              {/* Patient Message */}
              <View style={styles.messageBox}>
                <Text style={styles.messageLabel}>Patient</Text>
                <Text style={styles.messageText}>{chat.message}</Text>
                {chat.symptoms ? <Text style={shared.muted}>Symptoms: {chat.symptoms}</Text> : null}
              </View>

              {/* AI Response */}
              <View style={styles.aiBox}>
                <Text style={styles.aiLabel}>AI Response</Text>
                <Text style={styles.aiText}>{chat.response}</Text>
              </View>

              {/* Risk reason */}
              {chat.risk_reason && (
                <View style={[styles.riskBox, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.riskText, { color: sc.text }]}>⚑ {chat.risk_reason}</Text>
                </View>
              )}

              {/* Existing Doctor Notes */}
              {chat.doctor_notes?.length > 0 && (
                <View style={styles.existingNotes}>
                  <Text style={styles.existingNotesLabel}>Doctor Notes</Text>
                  {chat.doctor_notes.map((n) => (
                    <View key={n.id} style={styles.existingNote}>
                      {n.diagnosis && <Text style={styles.noteFieldLabel}>Diagnosis: <Text style={styles.noteFieldValue}>{n.diagnosis}</Text></Text>}
                      <Text style={styles.noteFieldLabel}>Note: <Text style={styles.noteFieldValue}>{n.notes}</Text></Text>
                      {n.recommendation && <Text style={styles.noteFieldLabel}>Recommendation: <Text style={styles.noteFieldValue}>{n.recommendation}</Text></Text>}
                      {n.message_to_patient && (
                        <View style={styles.msgToPatient}>
                          <Text style={styles.msgToPatientLabel}>💬 Message sent to patient:</Text>
                          <Text style={styles.msgToPatientText}>{n.message_to_patient}</Text>
                        </View>
                      )}
                      {n.patient_reply && (
                        <View style={styles.patientReplyBox}>
                          <Text style={styles.patientReplyLabel}>↩ Patient replied · {n.patient_reply_at ? formatDate(n.patient_reply_at) : ''}</Text>
                          <Text style={styles.patientReplyText}>{n.patient_reply}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              {chat.is_flagged && (
                <View style={styles.actionRow}>
                  {!chat.is_reviewed && (
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => markReviewed(chat.id)}
                      disabled={reviewingId === chat.id}
                    >
                      {reviewingId === chat.id
                        ? <ActivityIndicator size="small" color={colors.success} />
                        : <Text style={styles.reviewBtnText}>✓ Mark Reviewed</Text>}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.replyBtn, isSelected && styles.replyBtnActive]}
                    onPress={() => setNoteForm((f) => ({ ...f, selectedChatId: isSelected ? null : chat.id, notes: '', diagnosis: '', recommendation: '', message_to_patient: '' }))}
                  >
                    <Text style={[styles.replyBtnText, isSelected && { color: '#fff' }]}>
                      {isSelected ? '✕ Cancel' : '✏ Add Note / Message'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reply Form */}
              {isSelected && (
                <View style={styles.replyForm}>
                  <Text style={styles.replyFormTitle}>Doctor's Response to this Chat</Text>

                  <Text style={shared.label}>Clinical Notes</Text>
                  <TextInput style={[shared.textarea, { height: 80 }]} value={noteForm.notes} onChangeText={(v) => setNoteForm((f) => ({ ...f, notes: v }))} placeholder="Observations, concerns, follow-up actions…" multiline />

                  <Text style={shared.label}>Diagnosis</Text>
                  <TextInput style={shared.input} value={noteForm.diagnosis} onChangeText={(v) => setNoteForm((f) => ({ ...f, diagnosis: v }))} placeholder="e.g. Viral fever, Stage 1 hypertension" />

                  <Text style={shared.label}>Recommendation</Text>
                  <TextInput style={[shared.textarea, { height: 70 }]} value={noteForm.recommendation} onChangeText={(v) => setNoteForm((f) => ({ ...f, recommendation: v }))} placeholder="Prescribed medications, lifestyle changes…" multiline />

                  <Text style={[shared.label, styles.msgLabel]}>💬 Message to Patient</Text>
                  <TextInput style={[shared.textarea, { height: 80, borderColor: colors.primary }]} value={noteForm.message_to_patient} onChangeText={(v) => setNoteForm((f) => ({ ...f, message_to_patient: v }))} placeholder="Write a direct message the patient will see in their chat…" multiline />

                  <TouchableOpacity style={[shared.primaryBtn, busy && { opacity: 0.6 }]} onPress={saveNote} disabled={busy}>
                    <Text style={shared.primaryBtnText}>{busy ? 'Sending…' : 'Save & Send to Patient'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Main Doctor Screen ────────────────────────────────────────────────────────
export default function DoctorScreen({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [flaggedChats, setFlaggedChats] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: 'error' });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const unreviewedCount = flaggedChats.filter((c) => !c.is_reviewed).length;
  const criticalCount = flaggedChats.filter((c) => c.severity_level === 'critical' && !c.is_reviewed).length;
  const highCount = flaggedChats.filter((c) => c.severity_level === 'high' && !c.is_reviewed).length;

  const loadData = useCallback(async () => {
    try {
      const [pList, flagged] = await Promise.all([api.getPatients(), api.getFlaggedChats()]);
      setPatients(pList);
      setFlaggedChats(flagged);
    } catch (e) {
      setAlert({ message: e.message, type: 'error' });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time: patient replies to a doctor note → update in-place
  useWebSocket((event) => {
    if (event.type === 'patient_reply') {
      setSelectedPatient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chats: prev.chats?.map((chat) => ({
            ...chat,
            doctor_notes: chat.doctor_notes?.map((n) =>
              n.id === event.note_id
                ? { ...n, patient_reply: event.patient_reply, patient_reply_at: event.patient_reply_at }
                : n
            ),
          })),
        };
      });
      loadData();
    }
  });

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
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

  async function onSaved() {
    if (selectedPatient) {
      const p = await api.getPatient(selectedPatient.id);
      setSelectedPatient(p);
    }
    await loadData();
  }

  if (selectedPatient) {
    return <PatientDetail patient={selectedPatient} onBack={() => setSelectedPatient(null)} onSaved={onSaved} doctorId={user.id} />;
  }

  const priorityPatients = patients.filter((p) =>
    flaggedChats.some((c) => c.patient_id === p.id && !c.is_reviewed)
  );

  return (
    <View style={shared.screen}>
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topName}>Dr. {user.name}</Text>
          <Text style={styles.topRole}>Secure Doctor Portal</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Alert message={alert.message} type={alert.type} />
          {loadingPatient && <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />}

          {/* ── Dashboard Tab ── */}
          {tab === 'dashboard' && (
            <>
              <Text style={shared.sectionHeader}>Overview</Text>

              {/* Stats */}
              <View style={styles.statsRow}>
                <StatCard label="Patients" value={patients.length} color={colors.primary} />
                <StatCard label="Flagged" value={flaggedChats.length} color="#c2410c" />
                <StatCard label="Critical" value={criticalCount} color={colors.danger} />
                <StatCard label="Unreviewed" value={unreviewedCount} color="#a16207" />
              </View>

              {/* Priority Queue */}
              {unreviewedCount > 0 && (
                <>
                  <View style={styles.priorityHeader}>
                    <Text style={styles.priorityTitle}>⚠ Needs Immediate Attention</Text>
                    <Text style={shared.muted}>{unreviewedCount} unreviewed</Text>
                  </View>
                  {flaggedChats
                    .filter((c) => !c.is_reviewed)
                    .sort((a, b) => {
                      const o = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (o[a.severity_level] ?? 3) - (o[b.severity_level] ?? 3);
                    })
                    .map((chat) => {
                      const sc = SEVERITY_CONFIG[chat.severity_level] || SEVERITY_CONFIG.low;
                      return (
                        <TouchableOpacity
                          key={chat.id}
                          style={[shared.card, { borderLeftWidth: 4, borderLeftColor: sc.text }]}
                          onPress={() => openPatient(chat.patient_id)}
                        >
                          <View style={styles.chatCardHeader}>
                            <SeverityBadge level={chat.severity_level} />
                            <Text style={shared.muted}>{formatDate(chat.created_at)}</Text>
                          </View>
                          <Text style={styles.patientName}>{chat.patient_name}</Text>
                          <Text style={styles.chatPreview} numberOfLines={2}>{chat.message}</Text>
                          {chat.risk_reason && (
                            <Text style={[styles.riskText, { color: sc.text, marginTop: 4 }]}>⚑ {chat.risk_reason}</Text>
                          )}
                          <Text style={styles.tapHint}>Tap to open patient →</Text>
                        </TouchableOpacity>
                      );
                    })}
                </>
              )}

              {unreviewedCount === 0 && (
                <View style={styles.allClearBox}>
                  <Text style={styles.allClearIcon}>✓</Text>
                  <Text style={styles.allClearText}>All flagged cases reviewed</Text>
                </View>
              )}
            </>
          )}

          {/* ── Patients Tab ── */}
          {tab === 'patients' && (
            <>
              <Text style={shared.sectionHeader}>All Patients ({patients.length})</Text>
              {patients.length === 0 && <Text style={shared.muted}>No patients registered yet.</Text>}
              {patients.map((p) => {
                const hasUnreviewed = flaggedChats.some((c) => c.patient_id === p.id && !c.is_reviewed);
                const hasCritical = flaggedChats.some((c) => c.patient_id === p.id && c.severity_level === 'critical' && !c.is_reviewed);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[shared.card, hasUnreviewed && { borderLeftWidth: 4, borderLeftColor: hasCritical ? colors.danger : '#c2410c' }]}
                    onPress={() => openPatient(p.id)}
                  >
                    <View style={styles.patientRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={shared.cardTitle}>{p.user?.name}</Text>
                        <Text style={shared.muted}>{p.user?.email}</Text>
                        <View style={shared.metaRow}>
                          {p.gender ? <Text style={shared.metaTag}>{p.gender}</Text> : null}
                          {p.age ? <Text style={shared.metaTag}>Age {p.age}</Text> : null}
                          {p.blood_group ? <Text style={shared.metaTag}>{p.blood_group}</Text> : null}
                        </View>
                      </View>
                      {hasUnreviewed && (
                        <View style={[styles.urgentDot, { backgroundColor: hasCritical ? colors.danger : '#c2410c' }]}>
                          <Text style={styles.urgentDotText}>!</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tapHint}>Tap to view full history →</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ── Priority / Flagged Tab ── */}
          {tab === 'flagged' && (
            <>
              <Text style={shared.sectionHeader}>All Flagged Chats</Text>
              {flaggedChats.length === 0 && <Text style={shared.muted}>No flagged conversations.</Text>}
              {[...flaggedChats]
                .sort((a, b) => {
                  if (a.is_reviewed !== b.is_reviewed) return a.is_reviewed ? 1 : -1;
                  const o = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (o[a.severity_level] ?? 3) - (o[b.severity_level] ?? 3);
                })
                .map((chat) => {
                  const sc = SEVERITY_CONFIG[chat.severity_level] || SEVERITY_CONFIG.low;
                  return (
                    <TouchableOpacity
                      key={chat.id}
                      style={[shared.card, { borderLeftWidth: 4, borderLeftColor: sc.text }, chat.is_reviewed && { opacity: 0.65 }]}
                      onPress={() => openPatient(chat.patient_id)}
                    >
                      <View style={styles.chatCardHeader}>
                        <SeverityBadge level={chat.severity_level} />
                        {chat.is_reviewed
                          ? <Text style={styles.reviewedMini}>✓ Reviewed</Text>
                          : <Text style={styles.unreviewedMini}>Pending</Text>}
                      </View>
                      <Text style={styles.patientName}>{chat.patient_name}</Text>
                      <Text style={styles.chatPreview} numberOfLines={2}>{chat.message}</Text>
                      {chat.risk_reason && <Text style={[styles.riskText, { color: sc.text }]}>⚑ {chat.risk_reason}</Text>}
                      <Text style={shared.muted}>{formatDate(chat.created_at)}</Text>
                      <Text style={styles.tapHint}>Tap to open →</Text>
                    </TouchableOpacity>
                  );
                })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <TabBar tabs={buildTabs(unreviewedCount)} active={tab} onSelect={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f766e', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  topName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  topRole: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' },
  priorityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priorityTitle: { fontSize: 15, fontWeight: '700', color: colors.danger },
  badge: { alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chatCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  chatPreview: { fontSize: 13, color: colors.label, lineHeight: 18, marginBottom: 4 },
  riskBox: { borderRadius: 6, padding: 8, marginTop: 6 },
  riskText: { fontSize: 12, fontWeight: '600' },
  tapHint: { fontSize: 12, color: colors.primary, marginTop: 8, fontWeight: '500' },
  allClearBox: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12 },
  allClearIcon: { fontSize: 32, color: colors.success, marginBottom: 8 },
  allClearText: { fontSize: 15, fontWeight: '600', color: colors.success },
  patientRow: { flexDirection: 'row', alignItems: 'center' },
  urgentDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  urgentDotText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  reviewedMini: { fontSize: 12, color: colors.success, fontWeight: '600' },
  unreviewedMini: { fontSize: 12, color: '#c2410c', fontWeight: '600' },
  // Detail screen
  detailHeader: { backgroundColor: '#0f766e', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  detailTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  detailSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  urgentBadge: { backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  urgentBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  infoItem: { minWidth: '45%' },
  infoLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  alertBanner: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' },
  alertBannerText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 6 },
  messageBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8 },
  messageLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: 4 },
  messageText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  aiBox: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 8 },
  aiLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  aiText: { fontSize: 13, color: colors.label, lineHeight: 18 },
  existingNotes: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10, marginTop: 6 },
  existingNotesLabel: { fontSize: 11, fontWeight: '700', color: colors.success, textTransform: 'uppercase', marginBottom: 8 },
  existingNote: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#bbf7d0' },
  noteFieldLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  noteFieldValue: { fontWeight: '400', color: colors.text },
  msgToPatient: { backgroundColor: '#dbeafe', borderRadius: 6, padding: 8, marginTop: 6 },
  msgToPatientLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  msgToPatientText: { fontSize: 13, color: colors.text },
  reviewedTag: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  reviewedTagText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reviewBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.success, paddingVertical: 10, alignItems: 'center' },
  reviewBtnText: { color: colors.success, fontWeight: '700', fontSize: 13 },
  replyBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, paddingVertical: 10, alignItems: 'center' },
  replyBtnActive: { backgroundColor: colors.primary },
  replyBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  replyForm: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
  replyFormTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  msgLabel: { color: colors.primary },
  patientReplyBox: { marginTop: 8, backgroundColor: '#f0f9ff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#bae6fd' },
  patientReplyLabel: { fontSize: 10, fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 },
  patientReplyText: { fontSize: 13, color: colors.text, lineHeight: 18 },
});
