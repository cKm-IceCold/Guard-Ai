# 🛡️ Guard AI: The Disciplined Trader's Terminal
### *Powered by Google Gemini 3*

[![Gemini 3](https://img.shields.io/badge/AI-Gemini%203%20Flash%2FPro-blueviolet)](https://deepmind.google/technologies/gemini/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Google%20DeepMind-blue)](https://hackathon.google)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Guard AI** is a professional-grade trading psychology terminal designed to bridge the "Execution Gap." It acts as an intelligent AI Risk Manager that sits between the trader and their emotions, enforcing strict mathematical rules through high-fidelity reasoning.

---

## 🤖 Gemini 3 Integration (Hackathon Showcase)

<<<<<<< HEAD
Guard AI is built from the ground up to leverage the **Gemini 3 series**, utilizing advanced reasoning depths to solve complex financial psychology problems.

### 1. Dynamic Model Resolution Engine
We've implemented an intelligent resolution layer that automatically detects and routes requests to the most capable Gemini 3 endpoints (`pro` or `flash`) based on the user's Tier and Region. This ensures the terminal is always utilizing the latest 3-series capabilities.

### 2. High-Reasoning Systematic Backtesting
*   **Model**: Gemini 3 Pro (Thinking Level: HIGH)
*   **Logic**: AI extracts quantitative execution rules from natural language descriptions and simulates performance over 2 years of historical market data.
*   **Resilience**: Automated **Quota Fallback** switch—if the Pro model hits rate limits, the system dynamically shifts to Gemini 3 Flash to ensure backtest completion.

### 3. AI Behavioral Synthesis (Social Layer)
*   **Model**: Gemini 3 Flash (Thinking Level: MEDIUM)
*   **Bio Generation**: The terminal analyze verified performance data (win rate, discipline score, profit) to write a professional "Trader Biography." It turns raw data into a prestigious narrative for social sharing.
=======
-   **Frontend**: React + Vite + Vanilla CSS. Premium financial terminal aesthetic with mobile-first responsiveness.
-   **Backend**: Django REST Framework (DRF) + Supabase (PostgreSQL).
-   **AI Integration**: Google Gemini 3 for natural language strategy synthesis.
-   **Market Connectivity**: CCXT (Crypto) and MetaTrader 5 (Forex) integration for live trade syncing.
>>>>>>> 3b8c57ba92aaea58021e96b16c0a17c581bf218d

---

## 🚀 Key Features

### 🏦 Risk Guardian (The Digital Lock)
*   **Daily Loss Limits**: Automatically locks the terminal if Max Daily Loss is hit.
*   **Discipline Enforcement**: Prevents "Revenge Trading" by enforcing a max trades-per-day cap.
*   **Tamper-Proof**: Risk limits cannot be relaxed while the terminal is in a locked or "Over-traded" state.

### 🧬 Strategy Lab
*   **Prose to Protocol**: Describe your strategy in English; Gemini 3 distills it into a binary execution checklist.
*   **Visual Confirmation**: Attach "Ideal Setup" screenshots to strategies for visual pattern matching in live markets.

### 📊 Verified Trade Journal
*   **Verified Profiles**: Every user gets a public page (`/u/username`) showing their verified equity curve and AI-generated bio.
*   **Screenshot Journaling**: Attach 'Before', 'Live', and 'After' screenshots to every trade to review psychological execution.
*   **yfinance Integration**: Stable, 100% reliable price feeds for Crypto, Forex, and Commodities.

---

## 🏗️ Technical Stack

-   **AI Core**: Google Gemini 3 Flash/Pro (via `google-genai` SDK)
-   **Backend**: Django REST Framework + SQLite (Production-ready for PostgreSQL)
-   **Frontend**: React (Vite) + Vanilla CSS (Premium Dark Terminal Aesthetic)
-   **Data Feed**: Unified Yahoo Finance (`yfinance`) Market Engine
-   **Analytics**: Recharts (High-performance financial visualization)

---

## 🛠️ Setup & Installation

### 1. Clone & Configure
```bash
git clone https://github.com/your-username/guard-ai.git
cd guard-ai
```

### 2. Backend (Engine)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # Populate with your GEMINI_API_KEY
python manage.py migrate
python manage.py runserver
```

### 3. Frontend (Terminal)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Security & Ethics
- **Encryption**: Broker API keys are encrypted using Fernet symmetric encryption.
- **Privacy**: All trade logs are private unless explicitly set to "Public" for the Social Layer.
- **AI Safety**: Prompts are engineered to avoid financial advice and focus on behavioral discipline.

---
*Built for the Google DeepMind Gemini 3 Hackathon. Bridging the gap between a plan and a profit.*
