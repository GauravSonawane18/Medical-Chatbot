import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN_KEY = 'medical_chatbot_token'
const USER_KEY = 'medical_chatbot_user'

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
}

const loginDefaults = {
  email: '',
  password: '',
}

const chatDefaults = {
  symptoms: '',
  message: '',
}

const noteDefaults = {
  notes: '',
  diagnosis: '',
}

const historyDefaults = {
  condition: '',
  notes: '',
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

function formatDate(value) {
  if (!value) {
    return 'Unknown'
  }

  return new Date(value).toLocaleString()
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>
}

function MetricGrid({ items }) {
  return (
    <div className="key-value-grid">
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <p className="metric-label">{item.label}</p>
          <p className="metric-value">{item.value || 'Not provided'}</p>
        </div>
      ))}
    </div>
  )
}

function Timeline({ items, emptyText, renderItem }) {
  if (!items.length) {
    return <EmptyState>{emptyText}</EmptyState>
  }

  return <div className="timeline">{items.map(renderItem)}</div>
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [alert, setAlert] = useState({ message: '', type: 'error' })

  const [loginForm, setLoginForm] = useState(loginDefaults)
  const [registerForm, setRegisterForm] = useState(registerDefaults)
  const [chatForm, setChatForm] = useState(chatDefaults)
  const [noteForm, setNoteForm] = useState(noteDefaults)
  const [historyForm, setHistoryForm] = useState(historyDefaults)

  const [patientProfile, setPatientProfile] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [medicalHistory, setMedicalHistory] = useState([])

  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [flaggedChats, setFlaggedChats] = useState([])

  const [authBusy, setAuthBusy] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [doctorBusy, setDoctorBusy] = useState(false)

  const isAuthenticated = Boolean(token && user)
  const isPatient = user?.role === 'patient'
  const isDoctor = useMemo(() => ['doctor', 'admin'].includes(user?.role || ''), [user])

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    if (token && !options.skipAuth) {
      headers.Authorization = `Bearer ${token}`
    }

    let response
    try {
      response = await fetch(apiUrl(path), {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
    } catch (error) {
      throw new Error('Unable to reach the backend. Make sure FastAPI is running on port 8000.')
    }

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const message = typeof data === 'object' && data !== null ? data.detail || JSON.stringify(data) : data
      throw new Error(message || 'Request failed.')
    }

    return data
  }

  function showAlert(message, type = 'error') {
    setAlert({ message, type })
  }

  function persistSession(nextToken, nextUser) {
    setToken(nextToken)
    setUser(nextUser)

    if (nextToken && nextUser) {
      localStorage.setItem(TOKEN_KEY, nextToken)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      return
    }

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function logout() {
    persistSession('', null)
    setSelectedPatientId(null)
    setSelectedPatient(null)
    setPatientProfile(null)
    setChatHistory([])
    setMedicalHistory([])
    setPatients([])
    setFlaggedChats([])
    setLoginForm(loginDefaults)
    setRegisterForm(registerDefaults)
    setChatForm(chatDefaults)
    setNoteForm(noteDefaults)
    setHistoryForm(historyDefaults)
    showAlert('Signed out.', 'info')
  }

  async function loadPatientWorkspace() {
    const [profile, history, records] = await Promise.all([
      request('/me'),
      request('/chat/history'),
      request('/medical-history'),
    ])

    setPatientProfile(profile)
    setChatHistory(history)
    setMedicalHistory(records)
  }

  async function loadDoctorWorkspace() {
    const [patientList, flagged] = await Promise.all([
      request('/patients'),
      request('/doctor/flagged-chats'),
    ])

    setPatients(patientList)
    setFlaggedChats(flagged)

    if (!selectedPatientId && patientList.length) {
      setSelectedPatientId(patientList[0].id)
    }
  }

  async function loadSelectedPatient(patientId) {
    if (!patientId) {
      setSelectedPatient(null)
      return
    }

    const details = await request(`/patients/${patientId}`)
    setSelectedPatient(details)
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    if (isPatient) {
      loadPatientWorkspace().catch((error) => showAlert(error.message))
    }

    if (isDoctor) {
      loadDoctorWorkspace().catch((error) => showAlert(error.message))
    }
  }, [isAuthenticated, isPatient, isDoctor])

  useEffect(() => {
    if (isDoctor && selectedPatientId) {
      loadSelectedPatient(selectedPatientId).catch((error) => showAlert(error.message))
    }
  }, [isDoctor, selectedPatientId])

  async function handleLogin(event) {
    event.preventDefault()
    setAuthBusy(true)
    showAlert('')

    try {
      const data = await request('/login', {
        method: 'POST',
        body: loginForm,
        skipAuth: true,
      })
      persistSession(data.access_token, data.user)
      setLoginForm(loginDefaults)
      showAlert('Login successful.', 'info')
    } catch (error) {
      showAlert(error.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    setAuthBusy(true)
    showAlert('')

    const payload = {
      ...registerForm,
      age: registerForm.role === 'patient' && registerForm.age ? Number(registerForm.age) : undefined,
      blood_group: registerForm.blood_group || null,
      phone_number: registerForm.phone_number || null,
      allergies: registerForm.allergies || null,
    }

    if (registerForm.role !== 'patient') {
      delete payload.age
      delete payload.gender
      delete payload.blood_group
      delete payload.phone_number
      delete payload.allergies
    }

    try {
      const data = await request('/register', {
        method: 'POST',
        body: payload,
        skipAuth: true,
      })
      persistSession(data.access_token, data.user)
      setRegisterForm(registerDefaults)
      showAlert('Account created and signed in.', 'info')
    } catch (error) {
      showAlert(error.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleChat(event) {
    event.preventDefault()
    setChatBusy(true)
    showAlert('')

    try {
      await request('/chat', {
        method: 'POST',
        body: {
          ...chatForm,
          symptoms: chatForm.symptoms || null,
        },
      })
      setChatForm(chatDefaults)
      await loadPatientWorkspace()
      showAlert('Message sent successfully.', 'info')
    } catch (error) {
      showAlert(error.message)
    } finally {
      setChatBusy(false)
    }
  }

  async function handleDoctorNote(event) {
    event.preventDefault()
    if (!selectedPatientId) {
      showAlert('Select a patient first.')
      return
    }

    setDoctorBusy(true)
    showAlert('')

    try {
      await request('/doctor/notes', {
        method: 'POST',
        body: {
          patient_id: selectedPatientId,
          notes: noteForm.notes,
          diagnosis: noteForm.diagnosis || null,
        },
      })
      setNoteForm(noteDefaults)
      await Promise.all([loadSelectedPatient(selectedPatientId), loadDoctorWorkspace()])
      showAlert('Doctor note saved.', 'info')
    } catch (error) {
      showAlert(error.message)
    } finally {
      setDoctorBusy(false)
    }
  }

  async function handleMedicalHistory(event) {
    event.preventDefault()
    if (!selectedPatientId) {
      showAlert('Select a patient first.')
      return
    }

    setDoctorBusy(true)
    showAlert('')

    try {
      await request('/doctor/medical-history', {
        method: 'POST',
        body: {
          patient_id: selectedPatientId,
          condition: historyForm.condition,
          notes: historyForm.notes || null,
        },
      })
      setHistoryForm(historyDefaults)
      await loadSelectedPatient(selectedPatientId)
      showAlert('Medical history updated.', 'info')
    } catch (error) {
      showAlert(error.message)
    } finally {
      setDoctorBusy(false)
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">React Frontend</p>
          <h1>MedAssist Console</h1>
          <p className="hero__text">
            A React workspace for patients and doctors to review symptoms, inspect history,
            and coordinate safer triage decisions.
          </p>
          <div className="hero__meta">
            <span>React + Vite</span>
            <span>FastAPI API</span>
            <span>JWT Session</span>
          </div>
        </div>
        <div className="hero__panel">
          <p className="panel-label">Safety first</p>
          <p className="panel-copy">
            The assistant is informational only. High-risk symptoms are flagged so a doctor can review them quickly.
          </p>
          <a className="panel-link" href={`${API_BASE_URL || 'http://127.0.0.1:8000'}/docs`} target="_blank" rel="noreferrer">
            Open API Docs
          </a>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-card">
            <p className="sidebar-title">Session</p>
            <p className="sidebar-emphasis">{isAuthenticated ? `${user.name} (${user.role})` : 'Signed out'}</p>
            <p className="sidebar-muted">{isAuthenticated ? user.email : 'Authenticate to load your workspace.'}</p>
            {isAuthenticated ? (
              <button className="ghost-button" type="button" onClick={logout}>
                Log Out
              </button>
            ) : null}
          </div>

          <div className="sidebar-card">
            <p className="sidebar-title">Care Guardrails</p>
            <ul className="guardrails">
              <li>Patients receive guidance, not diagnosis.</li>
              <li>Doctors can review flagged chats and add notes.</li>
              <li>Medical history is included in AI context.</li>
            </ul>
          </div>
        </aside>

        <section className="content">
          {alert.message ? <div className={`alert alert--${alert.type}`}>{alert.message}</div> : null}

          {!isAuthenticated ? (
            <section className="auth-grid">
              <article className="card auth-card">
                <div className="card-heading">
                  <p className="section-kicker">Welcome back</p>
                  <h2>Login</h2>
                </div>
                <form className="stack" onSubmit={handleLogin}>
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      required
                    />
                  </label>
                  <button className="primary-button" type="submit" disabled={authBusy}>
                    {authBusy ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </article>

              <article className="card auth-card">
                <div className="card-heading">
                  <p className="section-kicker">New account</p>
                  <h2>Register</h2>
                </div>
                <form className="stack" onSubmit={handleRegister}>
                  <div className="two-column">
                    <label>
                      <span>Full name</span>
                      <input
                        type="text"
                        value={registerForm.name}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      <span>Role</span>
                      <select
                        value={registerForm.role}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                      >
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      required
                    />
                  </label>

                  {registerForm.role === 'patient' ? (
                    <div className="stack stack--compact">
                      <div className="two-column">
                        <label>
                          <span>Age</span>
                          <input
                            type="number"
                            value={registerForm.age}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, age: event.target.value }))}
                            required
                          />
                        </label>
                        <label>
                          <span>Gender</span>
                          <input
                            type="text"
                            value={registerForm.gender}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, gender: event.target.value }))}
                            required
                          />
                        </label>
                      </div>
                      <div className="two-column">
                        <label>
                          <span>Blood group</span>
                          <input
                            type="text"
                            value={registerForm.blood_group}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, blood_group: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>Phone number</span>
                          <input
                            type="text"
                            value={registerForm.phone_number}
                            onChange={(event) => setRegisterForm((current) => ({ ...current, phone_number: event.target.value }))}
                          />
                        </label>
                      </div>
                      <label>
                        <span>Allergies</span>
                        <input
                          type="text"
                          value={registerForm.allergies}
                          onChange={(event) => setRegisterForm((current) => ({ ...current, allergies: event.target.value }))}
                        />
                      </label>
                    </div>
                  ) : null}

                  <button className="primary-button" type="submit" disabled={authBusy}>
                    {authBusy ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              </article>
            </section>
          ) : null}

          {isPatient ? (
            <section className="dashboard">
              <div className="dashboard-header">
                <div>
                  <p className="section-kicker">Patient Workspace</p>
                  <h2>Your care timeline</h2>
                </div>
                <p className="dashboard-note">Chat responses are informational only and should not replace licensed medical care.</p>
              </div>

              <div className="dashboard-grid">
                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Profile</p>
                    <h3>Patient summary</h3>
                  </div>
                  <MetricGrid
                    items={[
                      { label: 'Name', value: patientProfile?.user?.name },
                      { label: 'Email', value: patientProfile?.user?.email },
                      { label: 'Age', value: patientProfile?.age },
                      { label: 'Gender', value: patientProfile?.gender },
                      { label: 'Blood Group', value: patientProfile?.blood_group },
                      { label: 'Allergies', value: patientProfile?.allergies },
                    ]}
                  />
                </article>

                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Ask the assistant</p>
                    <h3>Symptom chat</h3>
                  </div>
                  <form className="stack" onSubmit={handleChat}>
                    <label>
                      <span>Symptoms</span>
                      <input
                        type="text"
                        value={chatForm.symptoms}
                        onChange={(event) => setChatForm((current) => ({ ...current, symptoms: event.target.value }))}
                        placeholder="fever, cough, fatigue"
                      />
                    </label>
                    <label>
                      <span>Message</span>
                      <textarea
                        rows="5"
                        value={chatForm.message}
                        onChange={(event) => setChatForm((current) => ({ ...current, message: event.target.value }))}
                        placeholder="Describe what you're feeling."
                        required
                      />
                    </label>
                    <button className="primary-button" type="submit" disabled={chatBusy}>
                      {chatBusy ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </article>
              </div>

              <div className="dashboard-grid dashboard-grid--wide">
                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Conversation history</p>
                    <h3>Previous chats</h3>
                  </div>
                  <Timeline
                    items={chatHistory}
                    emptyText="No chats yet. Ask the assistant about your symptoms to begin."
                    renderItem={(item) => (
                      <article className="timeline-item" key={item.id}>
                        <h4>{item.message}</h4>
                        <p className="timeline-meta">
                          Severity: {item.severity_level}
                          {item.is_flagged ? ' • Flagged for review' : ''}
                        </p>
                        {item.symptoms ? <p className="timeline-meta">Symptoms: {item.symptoms}</p> : null}
                        <p className="timeline-response">{item.response}</p>
                      </article>
                    )}
                  />
                </article>

                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Medical record</p>
                    <h3>Known conditions</h3>
                  </div>
                  <Timeline
                    items={medicalHistory}
                    emptyText="No medical history entries yet."
                    renderItem={(item) => (
                      <article className="timeline-item" key={item.id}>
                        <h4>{item.condition}</h4>
                        <p>{item.notes || 'No notes provided.'}</p>
                        <p className="timeline-meta">{formatDate(item.created_at)}</p>
                      </article>
                    )}
                  />
                </article>
              </div>
            </section>
          ) : null}

          {isDoctor ? (
            <section className="dashboard">
              <div className="dashboard-header">
                <div>
                  <p className="section-kicker">Doctor Workspace</p>
                  <h2>Patient review desk</h2>
                </div>
                <p className="dashboard-note">Review flagged chats, update records, and document follow-up actions.</p>
              </div>

              <div className="dashboard-grid">
                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Patients</p>
                    <h3>Registered patient list</h3>
                  </div>
                  {patients.length ? (
                    <div className="select-list">
                      {patients.map((patient) => (
                        <button
                          className={`patient-chip ${selectedPatientId === patient.id ? 'active' : ''}`}
                          key={patient.id}
                          type="button"
                          onClick={() => setSelectedPatientId(patient.id)}
                        >
                          <strong>{patient.user.name}</strong>
                          <p>{patient.user.email}</p>
                          <p className="timeline-meta">{patient.gender || 'Unknown'} • Age {patient.age || 'N/A'}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState>No patients registered yet.</EmptyState>
                  )}
                </article>

                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Attention needed</p>
                    <h3>Flagged conversations</h3>
                  </div>
                  <Timeline
                    items={flaggedChats}
                    emptyText="No flagged conversations right now."
                    renderItem={(item) => (
                      <article className="timeline-item" key={item.id}>
                        <h4>{item.patient_name}</h4>
                        <p className="timeline-meta">{item.severity_level.toUpperCase()} • {item.risk_reason || 'Flagged'}</p>
                        <p>{item.message}</p>
                        <p className="timeline-response">{item.response}</p>
                      </article>
                    )}
                  />
                </article>
              </div>

              <div className="dashboard-grid dashboard-grid--wide">
                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Selected patient</p>
                    <h3>Clinical overview</h3>
                  </div>
                  {selectedPatient ? (
                    <div className="stack">
                      <MetricGrid
                        items={[
                          { label: 'Patient', value: selectedPatient.user?.name },
                          { label: 'Email', value: selectedPatient.user?.email },
                          { label: 'Age', value: selectedPatient.age },
                          { label: 'Gender', value: selectedPatient.gender },
                        ]}
                      />

                      <div>
                        <p className="section-kicker">Medical history</p>
                        <Timeline
                          items={selectedPatient.medical_history}
                          emptyText="No history entries yet."
                          renderItem={(item) => (
                            <article className="timeline-item" key={item.id}>
                              <h4>{item.condition}</h4>
                              <p>{item.notes || 'No notes provided.'}</p>
                            </article>
                          )}
                        />
                      </div>

                      <div>
                        <p className="section-kicker">Doctor notes</p>
                        <Timeline
                          items={selectedPatient.doctor_notes}
                          emptyText="No doctor notes yet."
                          renderItem={(item) => (
                            <article className="timeline-item" key={item.id}>
                              <h4>{item.diagnosis || 'Doctor note'}</h4>
                              <p>{item.notes}</p>
                            </article>
                          )}
                        />
                      </div>

                      <div>
                        <p className="section-kicker">Recent chats</p>
                        <Timeline
                          items={selectedPatient.chats}
                          emptyText="No chats recorded yet."
                          renderItem={(item) => (
                            <article className="timeline-item" key={item.id}>
                              <h4>{item.message}</h4>
                              <p className="timeline-meta">
                                Severity: {item.severity_level}
                                {item.is_flagged ? ' • Flagged' : ''}
                              </p>
                              <p className="timeline-response">{item.response}</p>
                            </article>
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <EmptyState>Select a patient to view their history, notes, and chats.</EmptyState>
                  )}
                </article>

                <article className="card">
                  <div className="card-heading">
                    <p className="section-kicker">Update records</p>
                    <h3>Add diagnosis or history</h3>
                  </div>
                  <form className="stack" onSubmit={handleDoctorNote}>
                    <label>
                      <span>Doctor note</span>
                      <textarea
                        rows="4"
                        value={noteForm.notes}
                        onChange={(event) => setNoteForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Add follow-up notes for this patient."
                        required
                      />
                    </label>
                    <label>
                      <span>Diagnosis</span>
                      <input
                        type="text"
                        value={noteForm.diagnosis}
                        onChange={(event) => setNoteForm((current) => ({ ...current, diagnosis: event.target.value }))}
                        placeholder="Stage 1 hypertension"
                      />
                    </label>
                    <button className="primary-button" type="submit" disabled={doctorBusy}>
                      {doctorBusy ? 'Saving...' : 'Save Note'}
                    </button>
                  </form>

                  <form className="stack separated-form" onSubmit={handleMedicalHistory}>
                    <label>
                      <span>Condition</span>
                      <input
                        type="text"
                        value={historyForm.condition}
                        onChange={(event) => setHistoryForm((current) => ({ ...current, condition: event.target.value }))}
                        placeholder="Type 2 diabetes"
                        required
                      />
                    </label>
                    <label>
                      <span>Record notes</span>
                      <textarea
                        rows="3"
                        value={historyForm.notes}
                        onChange={(event) => setHistoryForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Medication, monitoring, or context"
                      />
                    </label>
                    <button className="secondary-button" type="submit" disabled={doctorBusy}>
                      {doctorBusy ? 'Updating...' : 'Add Medical History'}
                    </button>
                  </form>
                </article>
              </div>
            </section>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default App
