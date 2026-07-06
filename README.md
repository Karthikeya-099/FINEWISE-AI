# FinWise AI - AI-Powered Loan Eligibility & Credit Diagnostics Platform

FinWise AI is a premium, high-fidelity BFSI (Banking, Financial Services, and Insurance) web platform designed to simplify personal financial diagnostics. It provides users with instant, real-time calculations, automated credit diagnostics, and AI-driven coaching—all running completely serverless.

---

## 🚀 Key Features (The 5 Core Epics)

### 📁 Epic 1: Multi-Page Responsive Architecture
- Implements a modern **dark glassmorphism design system** utilizing dynamic HSL variables, backdrop filters, smooth hover animations, and scale transitions.
- Multi-page navigation linking the central landing hub, **Loan Eligibility Checker**, **Credit Score Analyzer**, **EMI Calculator**, and **AI Financial Tips** pages.
- Adaptive breakpoints optimized for Desktop, Tablet, and Mobile layouts, featuring an off-canvas slide-out sidebar for touch interfaces.

### 📐 Epic 2: Real-Time Loan Eligibility Diagnostics
- Predefined multi-factor business rule validation checks:
  - **Monthly Salary:** $\ge$ ₹20,000
  - **Credit Score:** $\ge$ 600
  - **Existing monthly liabilities:** < ₹20,000
  - **Applicant Age:** $\ge$ 21 Years
- Automatically computes the borrower's ceiling limit using the standard formula:
  $$\text{Eligible Loan Amount} = \text{Monthly Salary} \times 20$$

### 📊 Epic 3: Credit Score Diagnostics
- Computes FICO-style credit score estimates (range 300–900) based on weighted parameters:
  - **Payment History:** (35%)
  - **Amounts Owed / Credit Utilization:** (30%)
  - **Length of Credit History:** (15%)
  - **New Credit / Inquiries:** (10%)
  - **Credit Diversity:** (10%)
- Categorizes clients into risk tiers:
  - **Excellent Credit:** (750 - 900) — Very Low Risk
  - **Good Credit:** (650 - 749) — Moderate Risk
  - **Poor Credit:** (300 - 649) — High Risk

### 🧮 Epic 4: EMI Amortization Engine
- Calculates monthly installments using the standard reducing-balance loan amortization formula:
  $$EMI = \frac{P \times R \times (1 + R)^N}{(1 + R)^N - 1}$$
  *Where:*
  - $P$ = Principal Loan Amount
  - $R$ = Monthly Interest Rate ($\frac{\text{Annual Rate}}{12 \times 100}$)
  - $N$ = Loan Tenure in Months
- Automatically generates full amortization tables breaking down interest payments, principal returns, and remaining balances per month.

### 🤖 Epic 5: Claude AI Coaching & Cloud Integration
- Communicates directly with the **Claude API** to summarize financial status, explain rejection reasons, and recommend customized debt consolidation or credit-building strategies.
- Incorporates local mock backup simulations to guarantee 100% offline uptime and bypass browser CORS restrictions.
- Supports **Google Sheets integration** via serverless Apps Script webhooks to automatically save client entries to cloud sheets.

---

## 🎯 Verified Project Scenarios

1. **Scenario 1: Salaried Individual (Approved ✅)**
   - *Input:* ₹45,000 monthly income, 730 credit score, ₹0 existing EMIs.
   - *Result:* Approved, ₹9,00,000 eligible loan limit, Low risk classification.
2. **Scenario 2: High-Risk Applicant (Approved ✅ - Rules Adjusted)**
   - *Input:* ₹22,000 monthly income, 620 credit score, ₹18,000 existing EMIs.
   - *Result:* Approved (under adjusted ₹20k salary & 600 score thresholds), High risk classification.
3. **Scenario 3: EMI Planning (Verified 🧮)**
   - *Input:* ₹5,00,000 loan at 10.5% interest for 60 months.
   - *Result:* Exact monthly installment calculated as **₹10,746.95**.
4. **Scenario 4: Credit Improvement (Classified 📉)**
   - *Input:* 580 credit score.
   - *Result:* Classified as **Poor** and provided with actionable credit-building guidance.

---

## 💻 How to Run Locally

Since this is a static client-side web application, you can run it using any simple local HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx http-server -p 8080
```
Open **`http://localhost:8080`** in your browser.

---

## 🚀 How to Deploy on Render (Static Site)

1. Go to your **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** and select **Static Site**.
3. Link your GitHub repository.
4. Leave the **Root Directory** field blank.
5. Click **Create Static Site**.
