# 📖 Guard AI: My Story

## 🛡️ About the Project
**Guard AI** is more than just a trading dashboard; it is a digital "Disciplined Ego." It exists to solve the single greatest problem in retail finance: **The Human Element.** While billions are spent on HFT (High-Frequency Trading) algorithms, retail traders often fail because of a primitive biological response—fear and greed. Guard AI is built to enforce mathematical logic when the human brain is under emotional duress.

---

## 💡 What Inspired me
The inspiration came from the classic **90-90-90 rule**: *90% of retail traders lose 90% of their capital within 90 days.*

When I looked at why they fail, it wasn't a lack of charts or indicators. It was the violation of the **Expected Value ($E$) equation**:

$$E = (P_w \times A_w) - (P_l \times A_l)$$

Where:
- $P_w$ is the Probability of a Win.
- $A_w$ is the Average Win amount.
- $P_l$ is the Probability of a Loss.
- $A_l$ is the Average Loss amount.

A trader with a positive $E$ can still go bankrupt if they double their trade size after a loss (revenge trading). I realized that if we could build a terminal that **physically prevents** execution when limits are hit, we could mathematically guarantee a trader stays in the game long enough to find their edge.

---

## 🛠️ How I Built It
Building Guard AI required a multi-layered stack that balanced security with visual excellence.

### 1. The Terminal Interface (React + Vite)
I wanted the UI to feel like a Lockheed Martin fighter jet cockpit or a high-end financial terminal. I used **Vanilla CSS** with glassmorphism to create a sleek, "Command Center" aesthetic. Micro-animations and real-time tickers ensure the trader feels like they are in a professional environment, which psychologically encourages professional behavior.

### 2. The Secure Brain (Django REST Framework)
The backend manages the complex "Risk Vault." For the **Broker Integration**, I implemented a pluggable adapter system:
- **Crypto**: Via CCXT, allowing the terminal to talk to 100+ exchanges.
- **Forex**: Via the MetaTrader 5 bridge, using IPC to communicate with local terminals.
- **Security**: I implemented **Fernet Symmetric Encryption** for API keys.
  - $C = E_k(M)$ (Ciphertext is the Encryption of Message with Key $k$).
  - Even if the database is compromised, the capital remains safe.

### 3. The AI Strategist (Google Gemini)
The most innovative part was the **Strategy Lab**. I used Gemini 1.5/2.0 to solve the "Vague Plan" problem. Traders say "I look for a bounce." Guard AI forces them to define that bounce as a **structured JSON protocol**.
- AI parses: *"Buy when RSI is low"*
- AI creates: `{"id": 1, "rule": "RSI < 30 on 15m TF", "mandatory": true}`

---

## 🧗 Challenges I Faced
### 1. The "Ghost Login" Bug
One of the toughest hurdles was session stability. The app kept logging the user out because the JWT tokens were expiring. I had to build a complex **Silent Refresh Interceptor**. It detects a $401$ error, pauses the request, gets a new token in the background, and retries the original request without the user ever knowing.

### 2. The MT5 Bridge
MetaTrader 5 is a legacy Windows application. Getting a modern web app to talk to it required a multi-step Python bridge that initializes the terminal and handles IPC errors in real-time.

### 3. AI Hallucination
Initially, the AI would generate rules that were too vague. I had to engineer a strict system prompt that forces the LLM to output only **executable checklists**, ensuring that "Execution Mode" is truly mandatory.

---

## 🎓 What I Learned
The biggest lesson I learned is that **Code is Discipline.** 

In the heat of a losing trade, a human will move their Stop Loss. But code doesn't have a heart; it doesn't feel fear. By moving the risk management from the human mind to the Python backend, we create an unbreakable barrier against self-destruction.

I learned that building a tool for traders is 20% about the data and 80% about the **psychological architecture.**

---

*“The goal of a successful trader is to make the best trades. Money is secondary.”*
*— Alexander Elder*
