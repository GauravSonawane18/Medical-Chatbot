const state = {
  token: localStorage.getItem("medical_chatbot_token") || "",
  user: JSON.parse(localStorage.getItem("medical_chatbot_user") || "null"),
  selectedPatientId: null,
};

const elements = {
  alertBox: document.getElementById("alertBox"),
  authSection: document.getElementById("authSection"),
  patientDashboard: document.getElementById("patientDashboard"),
  doctorDashboard: document.getElementById("doctorDashboard"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  registerRole: document.getElementById("registerRole"),
  patientFields: document.getElementById("patientFields"),
  logoutBtn: document.getElementById("logoutBtn"),
  sessionState: document.getElementById("sessionState"),
  sessionDetail: document.getElementById("sessionDetail"),
  patientProfile: document.getElementById("patientProfile"),
  medicalHistory: document.getElementById("medicalHistory"),
  chatHistory: document.getElementById("chatHistory"),
  chatForm: document.getElementById("chatForm"),
  patientsList: document.getElementById("patientsList"),
  doctorPatientDetails: document.getElementById("doctorPatientDetails"),
  doctorNoteForm: document.getElementById("doctorNoteForm"),
  medicalHistoryForm: document.getElementById("medicalHistoryForm"),
  flaggedChats: document.getElementById("flaggedChats"),
};

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token && !options.skipAuth) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error("Unable to reach the server. Please refresh the page or restart the backend.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? data.detail || JSON.stringify(data)
        : data || "Request failed.";
    throw new Error(detail);
  }

  return data;
}

function setAlert(message, type = "error") {
  if (!message) {
    elements.alertBox.classList.add("hidden");
    elements.alertBox.textContent = "";
    elements.alertBox.dataset.type = "";
    return;
  }

  elements.alertBox.textContent = message;
  elements.alertBox.dataset.type = type;
  elements.alertBox.classList.remove("hidden");
}

function persistSession() {
  if (state.token && state.user) {
    localStorage.setItem("medical_chatbot_token", state.token);
    localStorage.setItem("medical_chatbot_user", JSON.stringify(state.user));
  } else {
    localStorage.removeItem("medical_chatbot_token");
    localStorage.removeItem("medical_chatbot_user");
  }
}

function logout() {
  state.token = "";
  state.user = null;
  state.selectedPatientId = null;
  persistSession();
  updateShell();
  setAlert("Signed out.", "info");
}

function updateShell() {
  const authenticated = Boolean(state.token && state.user);
  elements.authSection.classList.toggle("hidden", authenticated);
  elements.patientDashboard.classList.toggle("hidden", !authenticated || state.user?.role !== "patient");
  elements.doctorDashboard.classList.toggle(
    "hidden",
    !authenticated || !["doctor", "admin"].includes(state.user?.role || ""),
  );
  elements.logoutBtn.classList.toggle("hidden", !authenticated);

  if (!authenticated) {
    elements.sessionState.textContent = "Signed out";
    elements.sessionDetail.textContent = "Authenticate to load your workspace.";
    return;
  }

  elements.sessionState.textContent = `${state.user.name} (${state.user.role})`;
  elements.sessionDetail.textContent = state.user.email;
}

function renderMetrics(container, items) {
  container.innerHTML = items
    .map(
      (item) => `
        <div class="metric">
          <p class="metric-label">${item.label}</p>
          <p class="metric-value">${item.value || "Not provided"}</p>
        </div>
      `,
    )
    .join("");
}

function renderTimeline(container, items, emptyText, mapper) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items.map(mapper).join("");
}

async function handleLogin(event) {
  event.preventDefault();
  setAlert("");
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const data = await api("/login", { method: "POST", body: payload, skipAuth: true });
    state.token = data.access_token;
    state.user = data.user;
    persistSession();
    await bootstrapDashboard();
    setAlert("Login successful.", "info");
    form.reset();
  } catch (error) {
    setAlert(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setAlert("");
  const form = event.currentTarget;
  const formData = new FormData(form);
  const role = formData.get("role");
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role,
  };

  if (role === "patient") {
    payload.age = Number(formData.get("age"));
    payload.gender = formData.get("gender");
    payload.phone_number = formData.get("phone_number") || null;
    payload.blood_group = formData.get("blood_group") || null;
    payload.allergies = formData.get("allergies") || null;
  }

  try {
    const data = await api("/register", { method: "POST", body: payload, skipAuth: true });
    state.token = data.access_token;
    state.user = data.user;
    persistSession();
    await bootstrapDashboard();
    setAlert("Account created and signed in.", "info");
    form.reset();
    syncRegisterFields();
  } catch (error) {
    setAlert(error.message);
  }
}

function syncRegisterFields() {
  const isPatient = elements.registerRole.value === "patient";
  elements.patientFields.classList.toggle("hidden", !isPatient);

  for (const input of elements.patientFields.querySelectorAll("input")) {
    input.required = isPatient && (input.name === "age" || input.name === "gender");
  }
}

async function loadPatientDashboard() {
  const [profile, history, medicalHistory] = await Promise.all([
    api("/me"),
    api("/chat/history"),
    api("/medical-history"),
  ]);

  renderMetrics(elements.patientProfile, [
    { label: "Name", value: profile.user?.name },
    { label: "Email", value: profile.user?.email },
    { label: "Age", value: profile.age },
    { label: "Gender", value: profile.gender },
    { label: "Blood Group", value: profile.blood_group },
    { label: "Allergies", value: profile.allergies },
  ]);

  renderTimeline(
    elements.chatHistory,
    history,
    "No chats yet. Ask the assistant about your symptoms to begin.",
    (item) => `
      <article class="timeline-item">
        <h4>${item.message}</h4>
        <p class="timeline-meta">
          Severity: ${item.severity_level}${item.is_flagged ? " • Flagged for review" : ""}
        </p>
        ${item.symptoms ? `<p class="timeline-meta">Symptoms: ${item.symptoms}</p>` : ""}
        <p class="timeline-response">${item.response}</p>
      </article>
    `,
  );

  renderTimeline(
    elements.medicalHistory,
    medicalHistory,
    "No medical history entries yet.",
    (item) => `
      <article class="timeline-item">
        <h4>${item.condition}</h4>
        <p>${item.notes || "No notes provided."}</p>
        <p class="timeline-meta">${new Date(item.created_at).toLocaleString()}</p>
      </article>
    `,
  );
}

async function loadPatients() {
  const patients = await api("/patients");
  renderTimeline(
    elements.patientsList,
    patients,
    "No patients registered yet.",
    (patient) => `
      <button class="patient-chip ${state.selectedPatientId === patient.id ? "active" : ""}" data-patient-id="${patient.id}" type="button">
        <strong>${patient.user.name}</strong>
        <p>${patient.user.email}</p>
        <p class="timeline-meta">${patient.gender || "Unknown"} • Age ${patient.age || "N/A"}</p>
      </button>
    `,
  );

  elements.patientsList.querySelectorAll("[data-patient-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedPatientId = Number(button.dataset.patientId);
      syncDoctorForms();
      await Promise.all([loadPatients(), loadSelectedPatient()]);
    });
  });

  if (!state.selectedPatientId && patients.length) {
    state.selectedPatientId = patients[0].id;
    syncDoctorForms();
  }
}

function syncDoctorForms() {
  const patientId = state.selectedPatientId ? String(state.selectedPatientId) : "";
  elements.doctorNoteForm.elements.patient_id.value = patientId;
  elements.medicalHistoryForm.elements.patient_id.value = patientId;
}

async function loadSelectedPatient() {
  if (!state.selectedPatientId) {
    elements.doctorPatientDetails.innerHTML =
      '<div class="empty-state">Select a patient to view their history, notes, and chats.</div>';
    return;
  }

  const patient = await api(`/patients/${state.selectedPatientId}`);
  elements.doctorPatientDetails.innerHTML = `
    <div class="stack">
      <div class="key-value-grid">
        <div class="metric"><p class="metric-label">Patient</p><p class="metric-value">${patient.user.name}</p></div>
        <div class="metric"><p class="metric-label">Email</p><p class="metric-value">${patient.user.email}</p></div>
        <div class="metric"><p class="metric-label">Age</p><p class="metric-value">${patient.age || "N/A"}</p></div>
        <div class="metric"><p class="metric-label">Gender</p><p class="metric-value">${patient.gender || "N/A"}</p></div>
      </div>
      <div>
        <p class="section-kicker">Medical history</p>
        ${patient.medical_history.length ? patient.medical_history
          .map((item) => `
            <article class="timeline-item">
              <h4>${item.condition}</h4>
              <p>${item.notes || "No notes provided."}</p>
            </article>
          `)
          .join("") : '<div class="empty-state">No history entries yet.</div>'}
      </div>
      <div>
        <p class="section-kicker">Doctor notes</p>
        ${patient.doctor_notes.length ? patient.doctor_notes
          .map((item) => `
            <article class="timeline-item">
              <h4>${item.diagnosis || "Doctor note"}</h4>
              <p>${item.notes}</p>
            </article>
          `)
          .join("") : '<div class="empty-state">No doctor notes yet.</div>'}
      </div>
      <div>
        <p class="section-kicker">Recent chats</p>
        ${patient.chats.length ? patient.chats
          .map((item) => `
            <article class="timeline-item">
              <h4>${item.message}</h4>
              <p class="timeline-meta">Severity: ${item.severity_level}${item.is_flagged ? " • Flagged" : ""}</p>
              <p class="timeline-response">${item.response}</p>
            </article>
          `)
          .join("") : '<div class="empty-state">No chats recorded yet.</div>'}
      </div>
    </div>
  `;
}

async function loadFlaggedChats() {
  const items = await api("/doctor/flagged-chats");
  renderTimeline(
    elements.flaggedChats,
    items,
    "No flagged conversations right now.",
    (item) => `
      <article class="timeline-item">
        <h4>${item.patient_name}</h4>
        <p class="timeline-meta">${item.severity_level.toUpperCase()} • ${item.risk_reason || "Flagged"}</p>
        <p>${item.message}</p>
        <p class="timeline-response">${item.response}</p>
      </article>
    `,
  );
}

async function handleChat(event) {
  event.preventDefault();
  setAlert("");
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = {
    message: formData.get("message"),
    symptoms: formData.get("symptoms") || null,
  };

  try {
    await api("/chat", { method: "POST", body: payload });
    form.reset();
    await loadPatientDashboard();
    setAlert("Chat saved successfully.", "info");
  } catch (error) {
    setAlert(error.message);
  }
}

async function handleDoctorNote(event) {
  event.preventDefault();
  setAlert("");
  const form = event.currentTarget;
  if (!state.selectedPatientId) {
    setAlert("Select a patient first.");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    patient_id: Number(formData.get("patient_id")),
    notes: formData.get("notes"),
    diagnosis: formData.get("diagnosis") || null,
  };

  try {
    await api("/doctor/notes", { method: "POST", body: payload });
    form.reset();
    syncDoctorForms();
    await Promise.all([loadSelectedPatient(), loadFlaggedChats()]);
    setAlert("Doctor note saved.", "info");
  } catch (error) {
    setAlert(error.message);
  }
}

async function handleMedicalHistory(event) {
  event.preventDefault();
  setAlert("");
  const form = event.currentTarget;
  if (!state.selectedPatientId) {
    setAlert("Select a patient first.");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    patient_id: Number(formData.get("patient_id")),
    condition: formData.get("condition"),
    notes: formData.get("notes") || null,
  };

  try {
    await api("/doctor/medical-history", { method: "POST", body: payload });
    form.reset();
    syncDoctorForms();
    await loadSelectedPatient();
    setAlert("Medical history updated.", "info");
  } catch (error) {
    setAlert(error.message);
  }
}

async function bootstrapDashboard() {
  updateShell();

  if (!state.user) {
    return;
  }

  if (state.user.role === "patient") {
    await loadPatientDashboard();
    return;
  }

  await loadPatients();
  await Promise.all([loadSelectedPatient(), loadFlaggedChats()]);
}

elements.loginForm.addEventListener("submit", handleLogin);
elements.registerForm.addEventListener("submit", handleRegister);
elements.registerRole.addEventListener("change", syncRegisterFields);
elements.logoutBtn.addEventListener("click", logout);
elements.chatForm.addEventListener("submit", handleChat);
elements.doctorNoteForm.addEventListener("submit", handleDoctorNote);
elements.medicalHistoryForm.addEventListener("submit", handleMedicalHistory);

syncRegisterFields();
updateShell();

if (state.token && state.user) {
  bootstrapDashboard().catch((error) => {
    logout();
    setAlert(error.message || "Session expired. Please sign in again.");
  });
}

