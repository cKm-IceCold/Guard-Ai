# 🛡️ Guard AI: The Disciplined Trader's Terminal

**Guard AI** is a professional-grade trading psychology terminal designed to enforce discipline and automate strategy adherence. It acts as an intelligent "Risk Manager" that sits between the trader and the market, preventing impulsive entries and enforcing pre-defined mathematical rules.

---

## 🏗️ Architecture

-   **Frontend**: React + Vite + Vanilla CSS. Premium financial terminal aesthetic with mobile-first responsiveness.
-   **Backend**: Django REST Framework (DRF) + Supabase (PostgreSQL).
-   **AI Integration**: Google Gemini (Flash 1.5/2.0) for natural language strategy synthesis.
-   **Market Connectivity**: CCXT (Crypto) and MetaTrader 5 (Forex) integration for live trade syncing.

---

## 🚀 Key Features

### 1. Risk Guardian (Live Protection)
*   **Enforcement**: Tracks daily P&L and frequency. Automatically locks the terminal if limits are hit.
*   **Integrity**: Limits cannot be increased while the terminal is locked.

### 2. Strategy Lab (AI Synthesis)
*   **Natural Language to Protocol**: Describe a strategy, and AI generates a strict execution checklist.
*   **Backtesting Engine**: 2-year historical simulations using Binance data to verify strategy edge.

### 3. Universal Broker Connect 🔌
*   **Crypto**: Link Binance, Bybit, Kraken, etc., via encrypted API Keys.
*   **Forex**: Support for MetaTrader 5 accounts.
*   **Silent Sync**: Auto-import closed trades directly into your journal.

### 4. Visual Trade Journal 🖼️
*   **Screenshot Support**: Attach "Before", "Live", and "After" chart screenshots to every trade.
*   **Performance Metrics**: Win rate, average yield, and a unique **Discipline Score**.

---

## 🛠️ Setup Instructions

### Backend (Django)
1.  **Environment**: `cd backend && python -m venv venv && source venv/bin/activate` (or `.\venv\Scripts\activate` on Windows).
2.  **Dependencies**: `pip install -r requirements.txt`.
3.  **Database**: Ensure Supabase credentials are in your `.env`. Run `python manage.py migrate`.
4.  **Run**: `python manage.py runserver`.

### Frontend (React)
1.  **Installation**: `cd frontend && npm install`.
2.  **Run**: `npm run dev`.
3.  **Access**: `http://localhost:5173`.


---

## 🔐 Security
- **Credential Encryption**: API keys are encrypted at rest using Fernet symmetric encryption.
- **Session Stability**: Automated JWT token refresh prevents unexpected logouts.
- **Privacy**: All logs and strategies are private to the authenticated user.

---
## To View Demo
visit guard-ai-five.vercel.app

*Built for traders who value discipline over luck.*
