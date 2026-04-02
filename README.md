# AI Medical Chatbot

FastAPI backend plus a React frontend for a medical chatbot system with:

- JWT authentication
- PostgreSQL + SQLAlchemy
- Patient and doctor roles
- Ollama local LLM integration
- Chat history and medical history context
- High-risk message flagging
- React dashboards for patients and doctors

## Project Structure

```text
app/
+-- main.py
+-- config/
+-- database/
+-- models/
+-- routes/
+-- schemas/
+-- services/
+-- utils/

frontend/
+-- src/
+-- public/
+-- vite.config.js
```

## Features

- `POST /register` for patient and doctor registration
- `POST /login` for JWT login
- `POST /chat` for AI medical assistant responses
- `GET /chat/history` for patient chat history
- `GET /medical-history` for patient medical records
- `GET /patients` for doctors/admins to view patients
- `GET /patients/{id}` for detailed patient dashboard data
- `GET /doctor/flagged-chats` for high-risk conversations
- `POST /doctor/notes` for doctor notes and diagnosis
- `POST /doctor/medical-history` for medical record updates
- `/` serves the built React app when `frontend/dist` exists

## Setup

### 1. Create a virtual environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and update the values:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/medical_chatbot
JWT_SECRET_KEY=replace-with-a-long-random-secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 5. Create PostgreSQL database

```sql
CREATE DATABASE medical_chatbot;
```

Tables are created automatically when the FastAPI app starts.

### 6. Run Ollama locally

Install Ollama, then pull and run a model:

```bash
ollama pull llama3
ollama serve
```

The backend calls:

```http
POST http://localhost:11434/api/generate
```

### 7. Run the app

For React development with hot reload:

```bash
cd frontend
npm run dev
```

The Vite app runs on:

```text
http://127.0.0.1:5173
```

For a production-style setup, build the React app and let FastAPI serve it:

```bash
cd frontend
npm run build
cd ..
uvicorn app.main:app --reload
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

React frontend served by FastAPI:

```text
http://127.0.0.1:8000/
```

## Notes

- Patient registrations require `age` and `gender`.
- Doctor/admin routes require a JWT from a doctor or admin account.
- The chatbot is intentionally designed to act as a medical assistant, not a doctor.
- High-risk phrases such as chest pain, suicidal thoughts, or difficulty breathing are flagged automatically.
