import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function SeverityBadge({ level, flagged }) {
  const s = SEVERITY_CONFIG[level] || SEVERITY_CONFIG.low;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>
        {s.label}{flagged ? ' • Flagged' : ''}
      </Text>
    </View>
  );
}

function DoctorNoteCard({ note, onReload }) {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function sendReply() {
    if (!replyText.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await api.replyToNote(note.id, { reply: replyText.trim() });
      setReplyText('');
      setShowReply(false);
      await onReload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.doctorNoteCard}>
      <View style={styles.doctorNoteHeader}>
        <Text style={styles.doctorNoteIcon}>🩺</Text>
        <Text style={styles.doctorNoteTitle}>Doctor's Response</Text>
        <Text style={styles.doctorNoteDate}>{formatDate(note.created_at)}</Text>
      </View>

      {note.diagnosis ? (
        <View style={styles.noteField}>
          <Text style={styles.noteFieldLabel}>Diagnosis</Text>
          <Text style={styles.noteFieldValue}>{note.diagnosis}</Text>
        </View>
      ) : null}

      <View style={styles.noteField}>
        <Text style={styles.noteFieldLabel}>Clinical Notes</Text>
        <Text style={styles.noteFieldValue}>{note.notes}</Text>
      </View>

      {note.recommendation ? (
        <View style={styles.noteField}>
          <Text style={styles.noteFieldLabel}>Recommendation</Text>
          <Text style={styles.noteFieldValue}>{note.recommendation}</Text>
        </View>
      ) : null}

      {note.message_to_patient ? (
        <View style={styles.msgToPatientBox}>
          <Text style={styles.msgToPatientLabel}>💬 Message from your doctor</Text>
          <Text style={styles.msgToPatientText}>{note.message_to_patient}</Text>
        </View>
      ) : null}

      {/* Patient's existing reply */}
      {note.patient_reply ? (
        <View style={styles.patientReplyBox}>
          <Text style={styles.patientReplyLabel}>You replied · {formatDate(note.patient_reply_at)}</Text>
          <Text style={styles.patientReplyText}>{note.patient_reply}</Text>
          <TouchableOpacity onPress={() => setShowReply(true)} style={styles.editReplyBtn}>
            <Text style={styles.editReplyBtnText}>Edit reply</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Reply button — only if doctor sent a message */}
      {note.message_to_patient && !note.patient_reply && !showReply ? (
        <TouchableOpacity style={styles.replyTriggerBtn} onPress={() => setShowReply(true)}>
          <Text style={styles.replyTriggerText}>↩ Reply to doctor</Text>
        </TouchableOpacity>
      ) : null}

      {/* Reply input */}
      {showReply ? (
        <View style={styles.replyInputBox}>
          {err ? <Text style={styles.replyErr}>{err}</Text> : null}
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Type your reply to the doctor…"
            placeholderTextColor={colors.muted}
            multiline
            autoFocus
          />
          <View style={styles.replyActions}>
            <TouchableOpacity style={styles.cancelReplyBtn} onPress={() => { setShowReply(false); setReplyText(''); setErr(''); }}>
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendReplyBtn, (!replyText.trim() || busy) && { opacity: 0.5 }]}
              onPress={sendReply}
              disabled={!replyText.trim() || busy}
            >
              {busy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sendReplyText}>Send Reply</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ChatCard({ item, onReload }) {
  const sc = SEVERITY_CONFIG[item.severity_level] || SEVERITY_CONFIG.low;
  const hasDoctorNotes = item.doctor_notes?.length > 0;

  return (
    <View style={[styles.chatCard, { borderLeftColor: sc.text }]}>
      {/* Header row */}
      <View style={styles.chatCardHeader}>
        <SeverityBadge level={item.severity_level} flagged={item.is_flagged} />
        <Text style={styles.chatTimestamp}>{formatDate(item.created_at)}</Text>
      </View>

      {/* Reviewed tag */}
      {item.is_reviewed && (
        <View style={styles.reviewedTag}>
          <Text style={styles.reviewedTagText}>✓ Reviewed by doctor {item.reviewed_at ? `· ${formatDate(item.reviewed_at)}` : ''}</Text>
        </View>
      )}

      {/* Patient message */}
      <View style={styles.patientMsgBox}>
        <Text style={styles.patientMsgLabel}>You asked</Text>
        <Text style={styles.patientMsgText}>{item.message}</Text>
        {item.symptoms ? (
          <Text style={styles.symptomsText}>Symptoms: {item.symptoms}</Text>
        ) : null}
      </View>

      {/* AI response */}
      <View style={styles.aiMsgBox}>
        <Text style={styles.aiMsgLabel}>AI Assistant</Text>
        {item.response === null
          ? <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>Thinking…</Text>
            </View>
          : <Text style={styles.aiMsgText}>{item.response}</Text>}
      </View>

      {/* Risk reason — only show if flagged */}
      {item.is_flagged && item.risk_reason ? (
        <View style={[styles.riskBox, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.riskText, { color: sc.text }]}>⚑ {item.risk_reason}</Text>
        </View>
      ) : null}

      {/* Doctor notes */}
      {hasDoctorNotes && (
        <View style={styles.doctorNotesSection}>
          {item.doctor_notes.map((note) => (
            <DoctorNoteCard key={note.id} note={note} onReload={onReload} />
          ))}
        </View>
      )}
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
  const scrollRef = useRef(null);

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

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleChat() {
    if (!message.trim()) return;
    const userMsg = message.trim();
    const userSymptoms = symptoms.trim();

    // Optimistic: show message immediately as a pending card
    const tempId = `pending-${Date.now()}`;
    setChatHistory((prev) => [
      {
        id: tempId,
        message: userMsg,
        symptoms: userSymptoms || null,
        response: null, // null = still loading
        severity_level: 'low',
        is_flagged: false,
        is_reviewed: false,
        reviewed_at: null,
        risk_reason: null,
        doctor_notes: [],
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setMessage('');
    setSymptoms('');
    setChatBusy(true);
    setAlert({ message: '' });

    try {
      await api.sendChat({ message: userMsg, symptoms: userSymptoms || null });
      await loadData();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e) {
      // Remove the temp card and restore the input on error
      setChatHistory((prev) => prev.filter((c) => c.id !== tempId));
      setMessage(userMsg);
      setSymptoms(userSymptoms);
      setAlert({ message: e.message, type: 'error' });
    } finally {
      setChatBusy(false);
    }
  }

  // Count unread doctor messages
  const unreadDoctorMessages = chatHistory.reduce((count, item) => {
    return count + (item.doctor_notes?.filter(n => n.message_to_patient).length || 0);
  }, 0);

  return (
    <View style={shared.screen}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topGreeting}>Hello,</Text>
          <Text style={styles.topName}>{user.name}</Text>
        </View>
        {unreadDoctorMessages > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifText}>💬 {unreadDoctorMessages} doctor message{unreadDoctorMessages > 1 ? 's' : ''}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Alert message={alert.message} type={alert.type} />

          {/* ── Chat Tab ── */}
          {tab === 'chat' && (
            <>
              {/* Input card */}
              <View style={styles.inputCard}>
                <Text style={styles.inputCardTitle}>Ask the AI Assistant</Text>
                <Text style={shared.label}>Symptoms <Text style={styles.optionalTag}>(optional)</Text></Text>
                <TextInput
                  style={shared.input}
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="fever, cough, chest pain…"
                  placeholderTextColor={colors.muted}
                />
                <Text style={shared.label}>Describe what you're feeling</Text>
                <TextInput
                  style={[shared.textarea, { height: 100 }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="I've had a headache for 3 days and feel dizzy…"
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!message.trim() || chatBusy) && styles.sendBtnDisabled]}
                  onPress={handleChat}
                  disabled={!message.trim() || chatBusy}
                >
                  {chatBusy
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.sendBtnText}>Send Message →</Text>}
                </TouchableOpacity>
              </View>

              {/* Chat history */}
              {chatHistory.length > 0 && (
                <Text style={styles.sectionLabel}>Conversation History ({chatHistory.length})</Text>
              )}
              {chatHistory.length === 0 && !chatBusy && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptyDesc}>Describe your symptoms above and the AI will respond.</Text>
                </View>
              )}
              {chatHistory.map((item) => (
                <ChatCard key={item.id} item={item} onReload={loadData} />
              ))}
            </>
          )}

          {/* ── History Tab ── */}
          {tab === 'history' && (
            <>
              <Text style={styles.sectionLabel}>Medical History</Text>
              {medicalHistory.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No records yet</Text>
                  <Text style={styles.emptyDesc}>Medical history added by your doctor will appear here.</Text>
                </View>
              )}
              {medicalHistory.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardLeft} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyCondition}>{item.condition}</Text>
                    {item.notes ? <Text style={styles.historyNotes}>{item.notes}</Text> : null}
                    <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <>
              <Text style={styles.sectionLabel}>Your Profile</Text>
              {!profile ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
              ) : (
                <>
                  {/* Avatar card */}
                  <View style={styles.avatarCard}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(profile.user?.name || user.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.avatarName}>{profile.user?.name || user.name}</Text>
                    <Text style={styles.avatarEmail}>{profile.user?.email || user.email}</Text>
                  </View>

                  {/* Info grid */}
                  <View style={styles.infoGrid}>
                    {[
                      { label: 'Age', value: profile.age ? `${profile.age} yrs` : null, icon: '🎂' },
                      { label: 'Gender', value: profile.gender, icon: '👤' },
                      { label: 'Blood Group', value: profile.blood_group, icon: '🩸' },
                      { label: 'Weight', value: profile.weight ? `${profile.weight} ${profile.weight_unit || ''}` : null, icon: '⚖️' },
                      { label: 'Phone', value: profile.phone_number, icon: '📞' },
                      { label: 'Allergies', value: profile.allergies, icon: '⚠️' },
                    ].map(({ label, value, icon }) =>
                      value ? (
                        <View key={label} style={styles.infoTile}>
                          <Text style={styles.infoTileIcon}>{icon}</Text>
                          <Text style={styles.infoTileValue}>{value}</Text>
                          <Text style={styles.infoTileLabel}>{label}</Text>
                        </View>
                      ) : null
                    )}
                  </View>

                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNum}>{chatHistory.length}</Text>
                      <Text style={styles.statLbl}>Chats</Text>
                    </View>
                    <View style={[styles.statBox, styles.statBoxMiddle]}>
                      <Text style={[styles.statNum, { color: '#c2410c' }]}>
                        {chatHistory.filter(c => c.is_flagged).length}
                      </Text>
                      <Text style={styles.statLbl}>Flagged</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statNum, { color: colors.success }]}>
                        {medicalHistory.length}
                      </Text>
                      <Text style={styles.statLbl}>Records</Text>
                    </View>
                  </View>
                </>
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
  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 10,
  },
  topGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  topName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  notifBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notifText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 4 },

  // Input card
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  inputCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  optionalTag: { fontSize: 12, color: colors.muted, fontWeight: '400' },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Severity badge
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Chat card
  chatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  chatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chatTimestamp: { fontSize: 11, color: colors.muted },

  reviewedTag: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  reviewedTagText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },

  patientMsgBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  patientMsgLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  patientMsgText: { fontSize: 14, color: colors.text, fontWeight: '500', lineHeight: 20 },
  symptomsText: { fontSize: 12, color: colors.muted, marginTop: 4 },

  aiMsgBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  aiMsgLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aiMsgText: { fontSize: 13, color: colors.label, lineHeight: 19 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  typingText: { fontSize: 13, color: colors.primary, fontStyle: 'italic' },

  riskBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
  },
  riskText: { fontSize: 12, fontWeight: '600' },

  // Doctor notes section
  doctorNotesSection: { marginTop: 4 },
  doctorNoteCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  doctorNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  doctorNoteIcon: { fontSize: 16 },
  doctorNoteTitle: { fontSize: 13, fontWeight: '700', color: '#15803d', flex: 1 },
  doctorNoteDate: { fontSize: 11, color: colors.muted },
  noteField: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  noteFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  noteFieldValue: { fontSize: 13, color: colors.text, lineHeight: 18 },

  msgToPatientBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  msgToPatientLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  msgToPatientText: { fontSize: 14, color: colors.text, lineHeight: 20, fontWeight: '500' },

  // Patient reply
  replyTriggerBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  replyTriggerText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  patientReplyBox: {
    marginTop: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  patientReplyLabel: { fontSize: 10, fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 },
  patientReplyText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  editReplyBtn: { marginTop: 6, alignSelf: 'flex-start' },
  editReplyBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  replyInputBox: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  replyActions: { flexDirection: 'row', gap: 8 },
  cancelReplyBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelReplyText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  sendReplyBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sendReplyText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  replyErr: { fontSize: 12, color: colors.danger, marginBottom: 6 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },

  // History tab
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyCardLeft: { width: 4, backgroundColor: colors.primary },
  historyCondition: { fontSize: 14, fontWeight: '700', color: colors.text, padding: 12, paddingBottom: 4 },
  historyNotes: { fontSize: 13, color: colors.label, paddingHorizontal: 12, lineHeight: 18 },
  historyDate: { fontSize: 11, color: colors.muted, padding: 12, paddingTop: 6 },

  // Profile tab
  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  avatarEmail: { fontSize: 13, color: colors.muted },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  infoTile: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTileIcon: { fontSize: 20, marginBottom: 6 },
  infoTileValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  infoTileLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLbl: { fontSize: 11, color: colors.muted, marginTop: 2, textTransform: 'uppercase' },
});
