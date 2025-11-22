

# 🎰 **Tyche – Modern Football Betting Web App**

Tyche is a full-stack football betting platform built with **React**, **Supabase**, and **Stripe**.
It delivers a clean and fast user experience for live football odds, wallet management, bet tracking, and secure deposits.

---

## 🚀 **Features**

### ✅ **Real-Time Football Data**

* Live match status and scores
* Upcoming fixtures from top European leagues
* Live odds fetched using the API-Football PRO plan
* Automatic refreshing every 30 seconds

### 💰 **Wallet System**

* Secure user wallet with balance stored in Supabase
* Deposit money instantly using **Stripe Checkout**
* Automated balance updates after successful payments
* Complete transaction history

### 🤑 **Betting Engine**

* Place single bets on live or upcoming matches
* Odds calculated dynamically
* Each bet stored in the Supabase `bets` table
* Clear bet status:

  * `pending`
  * `won`
  * `lost`

### 🔄 **Automatic Bet Settlement**

* Scheduled background job (`settle-bets`) runs every 2 minutes
* Compares match results from API-Football
* Automatically updates bet status and credits winnings
* Ensures accuracy even if the app is offline

### 🧾 **Bet History**

* View all created bets
* Separate display for pending and settled bets
* Shows winnings, losses, odds, stake, and match details

### 🔐 **Authentication**

* Full user auth using **Supabase Auth**
* Email-based sign-up, login, and session refresh
* Protected routes for dashboard, betting slip, and wallet actions

### 💸 **Withdrawals (Manual)**

* Users can request withdrawals inside the dashboard
* Stored under `withdrawal_requests` table
* Admin handles payout manually (bank transfer or other method)
* Status updates: `pending`, `approved`, `rejected`

---

## 🛠️ **Tech Stack**

### **Frontend**

* React + TypeScript
* Tailwind CSS
* shadcn/ui components
* TanStack React Query
* Lucide Icons

### **Backend**

* Supabase Database
* Supabase Auth
* Supabase Edge Functions
* pg_cron (automated jobs)

### **APIs**

* API-Football (live data + fixtures + odds)
* Stripe Payments API

---

## ⚙️ **How It Works**

### 1. **User Creates Account**

Supabase handles authentication and session management.

### 2. **User Adds Funds**

* User enters an amount
* Stripe Checkout processes the payment
* `verify-deposit` Edge Function confirms it
* User wallet balance updates immediately

### 3. **User Places Bets**

* Each selection is stored in the `bets` table
* Stakes are removed from wallet instantly

### 4. **Bet Settlement**

A Supabase scheduled job runs the `settle-bets` function:

* Fetches match results
* Marks bets as won or lost
* Updates balance
* Records transaction

### 5. **Withdrawal Requests**

Users submit withdrawal amount + method
Admin manually processes payments
Status updates stored in database

---

## 📦 **Project Structure Overview**

```
/src
 ├─ /components       → UI Components (Navigation, MatchCard, BettingSlip)
 ├─ /contexts         → AuthContext for user session + wallet updates
 ├─ /pages            → Home, Dashboard, Auth, CurrentBets
 ├─ /integrations
      └─ /supabase    → Client config
/supabase
 ├─ /functions        → Edge functions (deposits, odds, settle-bets)
 ├─ /migrations       → Database schema
/public
 └─ favicon.ico       → App icon
```

---

## 📈 **Roadmap / Future Features**

* Multi-bet accumulator (parlays)
* Live in-play betting
* Admin dashboard
* Full withdrawal automation via Stripe Connect
* Cash-out feature
* Notifications for bet results

---

## 🏆 **Purpose of Tyche**

Tyche was built as a high-quality, practical full-stack project demonstrating:

* Real-time data synchronization
* Payment processing
* Automated background tasks
* Full database + auth integration
* Clean UI + smooth user experience


---
