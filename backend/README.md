# 🧠 Guard AI: Backend Engine

The backend of Guard AI is as a high-performance REST API built with Django and Django REST Framework. It serves as the central intelligence for risk enforcement and AI orchestration.

---

## 🛠️ Internal Component Logic

### 1. `core`
Handles the Custom User model and Authentication.
- **Auth**: [SimpleJWT](https://django-rest-framework-simplejwt.readthedocs.io/) for secure, token-based sessions.

### 2. `strategies`
The AI Integration layer.
- **AI Engine**: Connects to Google Gemini.
- **Service Layer**: Implements a **Multi-Model Fallback** in `services.py`. It attempts to use `gemini-2.0-flash` first, falling back to `gemini-pro` if rate-limited or unavailable.

### 3. `risk_engine`
The live enforcement module.
- **Model**: `RiskProfile` tracks `current_daily_loss` and `trades_today`.
- **Logic**: A server-side `check_discipline()` method that acts as a gatekeeper for execution.

### 4. `journal`
The performance ledger.
- **Lifecycle**: Handles `OPEN` and `CLOSED` trade states.
- **Sync**: Uses signals/view-overrides to update the `risk_engine` the moment a trade is logged.

---

## 🚀 Local Setup

1. **Environment**:
   ```bash
   python -m venv venv
   source venv/Scripts/activate # Windows: venv/Scripts/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   GEMINI_API_KEY=your_key
   SECRET_KEY=your_secret
   DEBUG=True
   ```

3. **Database**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Run**:
   ```bash
   python manage.py runserver
   ```

---

## 📡 API Endpoints (Core)

| Path | Method | Description |
| :--- | :--- | :--- |
| `/api/token/` | POST | Login and receive JWT pair. |
| `/api/strategies/` | GET/POST | Manage AI Generated Strategies. |
| `/api/journal/trades/` | POST/PATCH | Open or Close trade entries. |
| `/api/risk/risk-profile/current/` | GET | Check current risk limits. |
