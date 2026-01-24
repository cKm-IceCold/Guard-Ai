# 🛡️ Guard AI

**Guard AI** is a full-stack trading psychology companion designed to enforce discipline and automate strategy adherence. It acts as a "Risk Manager" that sits between the trader and the market, preventing impulsive decisions and enforcing pre-defined rules.

---

## 🏗️ Architecture

The application works as a cohesive system with a clear separation of concerns:

-   **Frontend (The Console)**: Built with **React + Vite** and **TailwindCSS**. It provides a "Financial Terminal" aesthetic with real-time feedback.
    -   *Key Tech*: Axios (API), React Context (Auth), Material Symbols.
-   **Backend (The Brain)**: Built with **Django REST Framework (DRF)**. It handles authentication, data persistence, and AI orchestration.
    -   *Key Tech*: SimpleJWT (Auth), Google Gemini (AI), SQLite (DB).
-   **AI Integration**: A robust service layer that connects to Google's Gemini models to convert natural language strategies into executable JSON checklists.

---

## 🚀 Features Implemented

### 1. Risk Guardian Engine
*   **Goal**: Prevent "blowing up" accounts.
*   **Mechanism**: Tracks daily P&L and trade volume. If limits are hit (e.g., -$500 loss), the system "Locks" the trader out mentally by showing a red "TRADING LOCKED" state.
*   **Status**: Fully functional with backend logic (`RiskProfile` model).

### 2. Strategy Lab (AI Powered)
*   **Goal**: Turn vague trading ideas into strict checklists.
*   **Mechanism**:
    1.  User types a strategy (e.g., "Buy when RSI < 30").
    2.  Backend sends this to Google Gemini with a "System Prompt" to act as an Algo Architect.
    3.  AI returns a JSON array of rules.
    4.  Frontend renders these as a checklist that *must* be ticked before entering a trade.
*   **Status**: Connected to real Gemini API with Multi-Model Fallback.

### 3. Secure Authentication
*   **Goal**: Protect user data and settings.
*   **Mechanism**: JWT (JSON Web Token) authentication.
*   **Status**: Login implemented with auto-refresh token logic.

---

## 🧠 Approach & Problem Solving

During the development of Guard AI, we encountered and solved several real-world engineering challenges. Here is exactly how we approached them:

### Challenge 1: "It works on my machine" (Environment Issues)
*   **Problem**: The project used different Python environments (`venv` vs `.venv`), causing `ModuleNotFoundError`.
*   **Solution**: We explicitly activated the correct environment and added a `requirements.txt` to ensure consistency.
*   **Lesson**: Always verify *which* python executable is running (`which python` or checking paths) before assuming dependencies are installed.

### Challenge 2: The "Port Conflict" (CORS & Connections)
*   **Problem**: Frontend was trying to talk to port `8080`, but backend started on `8000`. This caused `ERR_CONNECTION_REFUSED`.
*   **Solution**: We standardized the API client (`src/services/api.ts`) to match the backend port (`8000`).
*   **Lesson**: Hardcoded ports are brittle. In production, use environment variables (`VITE_API_URL`) to manage this.

### Challenge 3: brittle AI Models (The 404/429 Errors)
*   **Problem**: The specific model `gemini-2.0-flash-lite` worked for some keys but was rate-limited or unavailable for others, causing crashes.
*   **Solution**: We implemented a **Robust Fallback System** in `GeminiService`.
    *   *Logic*: Try Model A -> if fail, Try Model B -> if fail, Try Model C.
    *   *Result*: The system now self-heals by finding a working model without user intervention.
*   **Lesson**: Never rely on a single external API endpoint. Always build redundancy for critical 3rd party services.

---

## 🛠️ How to Run This Project

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   Google Gemini API Key

### 1. Backend Setup
```bash
cd backend
# Create/Activate Virtual Env
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

# Configure Secrets
# Create a .env file with:
# GEMINI_API_KEY=your_key_here
# DEBUG=True
# SECRET_KEY=django-insecure-key

# Run Migrations & Server
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1.  Open `http://localhost:5173`.
2.  Login with **admin** / **admin123** (or create a superuser).
3.  Go to **Strategy Lab**.
4.  Type a strategy and hit Generate.

---

## 🔮 Future Roadmap (Phase 4 & 5)
*   **Execution Mode**: Tying the "Checklist" to a physical "Enter Trade" button.
*   **Psychology Scoring**: Giving users a "Discipline Score" based on how often they follow their plan.
*   **Broker Integration**: Connecting to MT4/5 or Interactive Brokers for real trade execution.
