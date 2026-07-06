// Application Configuration State
let appSettings = {
  mode: 'demo', // 'demo' or 'live'
  apiKey: '',
  sheetUrl: ''
};

let currentAnalysis = null;

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  // 1. Load configuration settings
  const savedSettings = localStorage.getItem('finewise_settings');
  if (savedSettings) {
    appSettings = JSON.parse(savedSettings);
  }
  
  // Set forms initial values in settings modal
  const modeEl = document.getElementById('set-mode');
  const keyEl = document.getElementById('set-api-key');
  const urlEl = document.getElementById('set-sheet-url');
  
  if (modeEl) modeEl.value = appSettings.mode;
  if (keyEl) keyEl.value = appSettings.apiKey || '';
  if (urlEl) urlEl.value = appSettings.sheetUrl || '';
  
  toggleApiFields(appSettings.mode);

  // 2. Load current analysis profile
  const savedAnalysis = localStorage.getItem('finewise_analysis');
  if (savedAnalysis) {
    currentAnalysis = JSON.parse(savedAnalysis);
  }

  // 3. Page-specific initialization handlers
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('eligibility.html')) {
    initEligibilityPage();
  } else if (currentPath.includes('credit.html')) {
    initCreditPage();
  } else if (currentPath.includes('tips.html')) {
    initTipsPage();
  }
});

// Mobile Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

// Open / Close Settings Modal
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('open');
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('open');
}

function toggleApiFields(mode) {
  const fields = document.getElementById('api-settings-fields');
  if (fields) {
    fields.style.display = mode === 'live' ? 'block' : 'none';
  }
}

// Save Settings
function handleSettingsSave(event) {
  event.preventDefault();
  
  appSettings.mode = document.getElementById('set-mode').value;
  appSettings.apiKey = document.getElementById('set-api-key').value.trim();
  appSettings.sheetUrl = document.getElementById('set-sheet-url').value.trim();
  
  localStorage.setItem('finewise_settings', JSON.stringify(appSettings));
  
  const alertContainer = document.getElementById('settings-alert');
  if (alertContainer) {
    alertContainer.innerHTML = `
      <div class="alert alert-success">
        <i class="fa-solid fa-circle-check"></i> Configuration saved successfully!
      </div>
    `;
    setTimeout(() => {
      alertContainer.innerHTML = '';
      closeSettingsModal();
      window.location.reload(); // Reload to refresh mode hooks
    }, 1000);
  }
}

// ----------------------------------------------------
// CORE FINANCIAL CALCULATORS & ALGORITHMS
// ----------------------------------------------------

/**
 * Reducing-Balance EMI Amortization calculation
 */
const defCalculateEmi = (principal, annualRate, tenureMonths) => {
  const r = (annualRate / 12) / 100; // Monthly interest rate
  const n = tenureMonths;
  
  if (r === 0) return principal / n;
  
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return emi;
};

// Handle Amortization calculator form
function handleEmiSubmit(event) {
  event.preventDefault();
  
  const principal = parseFloat(document.getElementById('calc-amount').value);
  const rate = parseFloat(document.getElementById('calc-interest').value);
  const tenure = parseInt(document.getElementById('calc-tenure').value);
  
  const emi = defCalculateEmi(principal, rate, tenure);
  
  // Show results section
  document.getElementById('emi-placeholder').style.display = 'none';
  document.getElementById('emi-active-section').style.display = 'block';
  document.getElementById('emi-output-val').textContent = `$${emi.toFixed(2)}`;
  
  // Build schedule
  const tableBody = document.querySelector('#emi-schedule-table tbody');
  tableBody.innerHTML = '';
  
  let balance = principal;
  const mr = (rate / 12) / 100;
  
  for (let i = 1; i <= tenure; i++) {
    const interest = balance * mr;
    const pPaid = emi - interest;
    balance -= pPaid;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i}</td>
      <td>$${emi.toFixed(2)}</td>
      <td>$${interest.toFixed(2)}</td>
      <td>$${pPaid.toFixed(2)}</td>
      <td>$${Math.max(0, balance).toFixed(2)}</td>
    `;
    tableBody.appendChild(row);
  }
  
  showGlobalAlert('success', `EMI calculation complete. Monthly payment: <strong>$${emi.toFixed(2)}</strong>`);
}

// ----------------------------------------------------
// ELIGIBILITY PAGE INITS & OPERATIONS
// ----------------------------------------------------

function initEligibilityPage() {
  // Check if we have an elected credit score from the analyzer page
  const electedScore = localStorage.getItem('elected_credit_score');
  
  if (currentAnalysis) {
    document.getElementById('el-name').value = currentAnalysis.name || '';
    document.getElementById('el-email').value = currentAnalysis.email || '';
    document.getElementById('el-income').value = currentAnalysis.income || '';
    document.getElementById('el-expenses').value = currentAnalysis.expenses || '';
    document.getElementById('el-score').value = electedScore ? electedScore : (currentAnalysis.creditScore || '');
    document.getElementById('el-emi').value = currentAnalysis.existingEmi || '';
    document.getElementById('el-amount').value = currentAnalysis.amount || '';
    document.getElementById('el-tenure').value = currentAnalysis.tenure || '';
    document.getElementById('el-interest').value = currentAnalysis.rate || '';
    document.getElementById('el-employment').value = currentAnalysis.employment || 'salaried';
    
    // Automatically trigger calculation display
    evaluateEligibilityMetrics(false);
  } else if (electedScore) {
    document.getElementById('el-score').value = electedScore;
    showGlobalAlert('success', `Imported estimated credit score: <strong>${electedScore}</strong>.`);
  }
}

function handleEligibilitySubmit(event) {
  event.preventDefault();
  evaluateEligibilityMetrics(true);
}

function evaluateEligibilityMetrics(triggerAlerts) {
  const name = document.getElementById('el-name').value.trim();
  const email = document.getElementById('el-email').value.trim();
  const income = parseFloat(document.getElementById('el-income').value);
  const expenses = parseFloat(document.getElementById('el-expenses').value);
  const creditScore = parseInt(document.getElementById('el-score').value);
  const existingEmi = parseFloat(document.getElementById('el-emi').value);
  const amount = parseFloat(document.getElementById('el-amount').value);
  const tenure = parseInt(document.getElementById('el-tenure').value);
  const rate = parseFloat(document.getElementById('el-interest').value);
  const employment = document.getElementById('el-employment').value;
  
  // Proposed Monthly EMI
  const proposedEmi = defCalculateEmi(amount, rate, tenure);
  
  // DTI = (Expenses + Existing EMIs + Proposed EMI) / Income
  const dti = income > 0 ? ((expenses + existingEmi + proposedEmi) / income) : 1.0;
  
  // Risk Category
  let riskCategory = 'Very High';
  let riskBadgeClass = 'badge-danger';
  if (creditScore >= 800) { riskCategory = 'Very Low'; riskBadgeClass = 'badge-success'; }
  else if (creditScore >= 740) { riskCategory = 'Low'; riskBadgeClass = 'badge-success'; }
  else if (creditScore >= 670) { riskCategory = 'Moderate'; riskBadgeClass = 'badge-warning'; }
  else if (creditScore >= 580) { riskCategory = 'High'; riskBadgeClass = 'badge-warning'; }
  
  // Eligibility decision rules
  let status = 'Approved';
  let badgeClass = 'badge-success';
  let reason = 'All primary credit risk metrics pass standard buffers.';
  
  const netRemainingCash = income - (expenses + existingEmi + proposedEmi);
  
  if (employment === 'unemployed') {
    status = 'Declined';
    badgeClass = 'badge-danger';
    reason = 'Employment stability is a mandatory checklist constraint.';
  } else if (creditScore < 580) {
    status = 'Declined';
    badgeClass = 'badge-danger';
    reason = 'Credit score is below the minimum threshold of 580.';
  } else if (netRemainingCash <= 0) {
    status = 'Declined';
    badgeClass = 'badge-danger';
    reason = 'Proposed installment payment exceeds remaining net cash flow.';
  } else if (dti > 0.45) {
    status = 'Declined';
    badgeClass = 'badge-danger';
    reason = `DTI ratio (${(dti * 100).toFixed(1)}%) exceeds the risk ceiling of 45%.`;
  } else if (dti > 0.38 || creditScore < 640) {
    status = 'Manual Review Required';
    badgeClass = 'badge-warning';
    reason = 'Elevated DTI or sub-prime credit rating requires secondary evaluation.';
  }
  
  // Save State
  currentAnalysis = {
    name, email, income, expenses, creditScore, existingEmi,
    amount, tenure, rate, proposedEmi, dti, riskCategory,
    status, reason, netRemainingCash, employment
  };
  localStorage.setItem('finewise_analysis', JSON.stringify(currentAnalysis));
  
  // Render Dashboard
  document.getElementById('dash-emi-value').textContent = `$${proposedEmi.toFixed(2)}`;
  
  const statusBadge = document.getElementById('dash-eligibility-badge');
  statusBadge.className = `stat-value badge ${badgeClass}`;
  statusBadge.textContent = status;
  document.getElementById('dash-eligibility-reason').textContent = reason;
  
  document.getElementById('dash-dti-value').textContent = `${(dti * 100).toFixed(1)}%`;
  const dtiStatus = document.getElementById('dash-dti-status');
  if (dti <= 0.35) dtiStatus.innerHTML = '<span style="color: var(--color-success);">Excellent Capacity</span>';
  else if (dti <= 0.45) dtiStatus.innerHTML = '<span style="color: var(--color-warning);">Nearing Ceiling</span>';
  else dtiStatus.innerHTML = '<span style="color: var(--color-danger);">Over-Leveraged</span>';
  
  const riskBadge = document.getElementById('dash-risk-badge');
  riskBadge.className = `stat-value badge ${riskBadgeClass}`;
  riskBadge.textContent = riskCategory;
  document.getElementById('dash-risk-score').textContent = `Rating Index: ${creditScore}`;
  
  document.getElementById('dash-net-income').textContent = `$${income.toFixed(2)}`;
  document.getElementById('dash-total-commit').textContent = `$${(expenses + existingEmi + proposedEmi).toFixed(2)}`;
  
  const bufferEl = document.getElementById('dash-cash-buffer');
  bufferEl.textContent = `$${netRemainingCash.toFixed(2)}`;
  bufferEl.className = netRemainingCash >= 0 ? 'text-success' : 'text-danger';
  
  document.getElementById('dashboard-placeholder').style.display = 'none';
  document.getElementById('dashboard-active').style.display = 'block';
  
  if (triggerAlerts) {
    showGlobalAlert('success', `Credit assessment updated. Decision status: <strong>${status}</strong>.`);
  }
}

// ----------------------------------------------------
// CREDIT SCORE ANALYZER PAGE OPERATIONS
// ----------------------------------------------------

function initCreditPage() {
  // If we have profile data, we can prepopulate utilization etc. if desired
}

function handleCreditSubmit(event) {
  event.preventDefault();
  
  const defaultFlag = document.getElementById('cr-history').value;
  const utilization = parseFloat(document.getElementById('cr-utilization').value);
  const age = parseFloat(document.getElementById('cr-age').value);
  const diversity = parseInt(document.getElementById('cr-diversity').value);
  const inquiries = parseInt(document.getElementById('cr-inquiries').value);
  
  // Calculate FICO Score estimate based on weights
  // Base Score: 300. Max: 850.
  let score = 300;
  
  // 1. Payment History (35% - Max 190 pts)
  if (defaultFlag === 'no') score += 190;
  else score += 50;
  
  // 2. Amounts Owed / Util (30% - Max 165 pts)
  if (utilization <= 15) score += 165;
  else if (utilization <= 30) score += 135;
  else if (utilization <= 50) score += 90;
  else if (utilization <= 75) score += 45;
  else score += 15;
  
  // 3. Length of Credit History (15% - Max 85 pts)
  if (age >= 10) score += 85;
  else if (age >= 5) score += 65;
  else if (age >= 3) score += 45;
  else if (age >= 1) score += 20;
  else score += 5;
  
  // 4. Hard inquiries (10% - Max 55 pts)
  if (inquiries === 0) score += 55;
  else if (inquiries <= 2) score += 35;
  else if (inquiries <= 4) score += 15;
  else score += 0;
  
  // 5. Diversity (10% - Max 55 pts)
  if (diversity >= 3) score += 55;
  else if (diversity >= 1) score += 35;
  else score += 10;
  
  // Bound limit
  score = Math.min(850, Math.max(300, score));
  
  // Set risk class
  let risk = 'Very High';
  let riskClass = 'badge-danger';
  let riskSub = 'Subprime Credit Portfolio';
  if (score >= 800) { risk = 'Very Low'; riskClass = 'badge-success'; riskSub = 'Super-Prime Credit Tier'; }
  else if (score >= 740) { risk = 'Low'; riskClass = 'badge-success'; riskSub = 'Prime Rating Portfolio'; }
  else if (score >= 670) { risk = 'Moderate'; riskClass = 'badge-warning'; riskSub = 'Standard Consumer Profile'; }
  else if (score >= 580) { risk = 'High'; riskClass = 'badge-warning'; riskSub = 'Near-Prime Credit Tier'; }
  
  // Save estimated score to temp session storage
  localStorage.setItem('elected_credit_score', score);
  
  // Update UI
  document.getElementById('dash-credit-value').textContent = score;
  const rBadge = document.getElementById('dash-credit-risk-badge');
  rBadge.className = `stat-value badge ${riskClass}`;
  rBadge.textContent = risk;
  document.getElementById('dash-credit-risk-sub').textContent = riskSub;
  
  // Impact labels
  document.getElementById('impact-history').textContent = defaultFlag === 'no' ? 'Excellent' : 'Severe Default Risk';
  document.getElementById('impact-history').className = defaultFlag === 'no' ? 'text-success' : 'text-danger';
  
  const utilEl = document.getElementById('impact-utilization');
  if (utilization <= 30) { utilEl.textContent = 'Excellent'; utilEl.className = 'text-success'; }
  else if (utilization <= 60) { utilEl.textContent = 'Moderate'; utilEl.className = 'text-warning'; }
  else { utilEl.textContent = 'High Overdraft Risk'; utilEl.className = 'text-danger'; }
  
  const ageEl = document.getElementById('impact-age');
  if (age >= 5) { ageEl.textContent = 'Established'; ageEl.className = 'text-success'; }
  else if (age >= 3) { ageEl.textContent = 'Moderate'; ageEl.className = 'text-warning'; }
  else { ageEl.textContent = 'Limited / Short'; ageEl.className = 'text-danger'; }
  
  const inqEl = document.getElementById('impact-inquiries');
  if (inquiries <= 1) { inqEl.textContent = 'Low hard-pulls'; inqEl.className = 'text-success'; }
  else { inqEl.textContent = 'Frequent hard-pulls'; inqEl.className = 'text-warning'; }
  
  // Reveal dashboard
  document.getElementById('credit-dashboard-placeholder').style.display = 'none';
  document.getElementById('credit-dashboard-active').style.display = 'block';
  
  showGlobalAlert('success', `Estimated credit rating computed: <strong>${score} (${risk})</strong>.`);
}

function saveElectedCreditToLocal() {
  const elected = localStorage.getItem('elected_credit_score');
  if (elected && currentAnalysis) {
    currentAnalysis.creditScore = parseInt(elected);
    localStorage.setItem('finewise_analysis', JSON.stringify(currentAnalysis));
  }
}

// ----------------------------------------------------
// AI ADVISOR / CHAT TIPS PAGE OPERATIONS
// ----------------------------------------------------

function initTipsPage() {
  const profilePlaceholder = document.getElementById('tips-profile-placeholder');
  const profileActive = document.getElementById('tips-profile-active');
  
  if (currentAnalysis) {
    document.getElementById('tips-net-income').textContent = `$${currentAnalysis.income.toFixed(2)}`;
    document.getElementById('tips-dti-val').textContent = `${(currentAnalysis.dti * 100).toFixed(1)}%`;
    document.getElementById('tips-credit-val').textContent = currentAnalysis.creditScore;
    document.getElementById('tips-amount-val').textContent = `$${currentAnalysis.amount.toLocaleString()}`;
    
    // Status Badges
    const rBadge = document.getElementById('tips-risk-badge');
    const eBadge = document.getElementById('tips-eligibility-badge');
    
    let riskClass = 'badge-danger';
    if (currentAnalysis.riskCategory === 'Very Low' || currentAnalysis.riskCategory === 'Low') riskClass = 'badge-success';
    else if (currentAnalysis.riskCategory === 'Moderate' || currentAnalysis.riskCategory === 'High') riskClass = 'badge-warning';
    
    rBadge.className = `stat-value badge ${riskClass}`;
    rBadge.textContent = currentAnalysis.riskCategory;
    
    let elClass = 'badge-success';
    if (currentAnalysis.status === 'Declined') elClass = 'badge-danger';
    else if (currentAnalysis.status === 'Manual Review Required') elClass = 'badge-warning';
    
    eBadge.className = `stat-value badge ${elClass}`;
    eBadge.textContent = currentAnalysis.status;
    
    profilePlaceholder.style.display = 'none';
    profileActive.style.display = 'block';
    
    const advice = `Welcome back **${currentAnalysis.name}**! I have initialized your diagnostic profile. Your assessment status is **${currentAnalysis.status}** with a credit risk level of **${currentAnalysis.riskCategory}**. Ask me any budgeting questions or click "Generate Audit Report" above for insights!`;
    appendChatMessage('ai', advice);
  }
}

async function generateAIAudit() {
  if (!currentAnalysis) {
    showGlobalAlert('warning', 'Please complete your loan eligibility profile first to compile a credit audit report.');
    return;
  }
  
  appendChatMessage('ai', '<em>Analyzing credit diagnostics and compiling your report...</em>', 'typing-loader');
  
  const systemPrompt = "You are a professional credit risk underwriter and financial planner. Review the client's financial details and output a structured financial diagnostic audit. Outline positive factors, risk liabilities, and action items.";
  const prompt = `Client Diagnostic Details:
- Name: ${currentAnalysis.name}
- Monthly Income: $${currentAnalysis.income}
- Basic Monthly Expenses: $${currentAnalysis.expenses}
- Credit Score: ${currentAnalysis.creditScore}
- Existing Loan EMIs: $${currentAnalysis.existingEmi}
- Requested Loan Amount: $${currentAnalysis.amount} for ${currentAnalysis.tenure} months at ${currentAnalysis.rate}% interest.
- Calculated Proposed Monthly EMI: $${currentAnalysis.proposedEmi.toFixed(2)}
- Calculated Debt-to-Income (DTI) Ratio: ${(currentAnalysis.dti * 100).toFixed(2)}%
- Eligibility Assessment: ${currentAnalysis.status} (${currentAnalysis.reason})
- Credit Risk Classification: ${currentAnalysis.riskCategory}`;

  const report = await callClaudeAPI(appSettings.apiKey, prompt, systemPrompt);
  
  const loader = document.getElementById('typing-loader');
  if (loader) loader.remove();
  
  appendChatMessage('ai', report);
}

async function handleChatSubmit(event) {
  event.preventDefault();
  
  const inputEl = document.getElementById('ai-chat-input');
  const messageText = inputEl.value.trim();
  if (!messageText) return;
  
  appendChatMessage('user', messageText);
  inputEl.value = '';
  
  appendChatMessage('ai', '<em>Claude is studying your question...</em>', 'typing-loader');
  
  let context = "The client has not entered financial profile details yet.";
  if (currentAnalysis) {
    context = `Client Financial Metrics:
- Name: ${currentAnalysis.name}
- Income: $${currentAnalysis.income}/mo
- Credit Rating Score: ${currentAnalysis.creditScore}
- Expenses: $${currentAnalysis.expenses}/mo
- Existing EMIs: $${currentAnalysis.existingEmi}/mo
- Requested Loan Amount: $${currentAnalysis.amount}
- Calculated proposed EMI: $${currentAnalysis.proposedEmi.toFixed(2)}
- Eligibility status: ${currentAnalysis.status}
- Credit risk category: ${currentAnalysis.riskCategory}`;
  }
  
  const systemPrompt = `You are a helpful AI Financial Advisor. Respond to the client's follow-up questions contextually using their credit profile details below:\n${context}`;
  const response = await callClaudeAPI(appSettings.apiKey, messageText, systemPrompt);
  
  const loader = document.getElementById('typing-loader');
  if (loader) loader.remove();
  
  appendChatMessage('ai', response);
}

/**
 * Fetch Claude Messages API or fallback locally
 */
async function callClaudeAPI(apiKey, prompt, systemPrompt) {
  if (appSettings.mode === 'demo' || !apiKey) {
    return getOfflineAISimulation(prompt);
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ],
        system: systemPrompt
      })
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
    
  } catch (err) {
    console.error("API Fetch Error:", err.message);
    
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return `⚠️ **API Connection Warning:** Direct browser requests to \`api.anthropic.com\` are blocked by standard web browser **CORS policies** to prevent exposing your Anthropic API Key in client-side script. 
      
To resolve this, you can setup a local CORS proxy or run this project inside a local Node proxy backend. 

**Here is the local offline AI Financial Diagnostic Audit generated for you:**

${getOfflineAISimulation(prompt)}`;
    }
    
    return `❌ **Claude API Error:** ${err.message}. Reverting to offline simulation:\n\n${getOfflineAISimulation(prompt)}`;
  }
}

// Append chat bubbles
function appendChatMessage(sender, text, id = '') {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-${sender}`;
  if (id) bubble.id = id;
  
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
    
  bubble.innerHTML = formatted;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// ----------------------------------------------------
// OFFLINE MOCK AI FINANCIAL INTELLIGENCE SIMULATOR
// ----------------------------------------------------

function getOfflineAISimulation(prompt) {
  if (!currentAnalysis) {
    return "Hi! Please enter your details on the Eligibility page first, and I'll produce a detailed credit audit report for you.";
  }
  
  const isAudit = prompt.includes('Client Diagnostic Details');
  
  if (isAudit) {
    let adviceText = '';
    
    if (currentAnalysis.status === 'Approved') {
      adviceText = `**Strengths:**
- High Credit Score (${currentAnalysis.creditScore}) places you in the *${currentAnalysis.riskCategory} Risk* classification.
- Low DTI ratio (${(currentAnalysis.dti * 100).toFixed(1)}%) indicates excellent utilization margins.
- Net liquid buffer remaining is positive ($${currentAnalysis.netRemainingCash.toFixed(2)}).

**Recommendations:**
- Your requested amount of **$${currentAnalysis.amount.toLocaleString()}** is well within standard risk rules.
- Settle outstanding loan balances to further improve DTI and qualify for lowest prime interest rates.`;
    } else if (currentAnalysis.status === 'Manual Review Required') {
      adviceText = `**Critical Vectors:**
- Credit Score is moderate (${currentAnalysis.creditScore}).
- DTI ratio is elevated at ${(currentAnalysis.dti * 100).toFixed(1)}%. This requires detailed verification.

**Recommendations:**
- Try to lower the requested principal amount to reduce the proposed EMI and lower your DTI.
- Link secondary bank sources to prove additional liquid cash reserves.`;
    } else {
      adviceText = `**Risk Factors Detected:**
- ${currentAnalysis.reason}
- High leverage: expenses and debts eat up your gross income.

**Path to Eligibility:**
1. **Reduce liabilities:** Pay off outstanding credit cards or previous loans first to free up monthly cash flows.
2. **Co-borrower:** Apply with a spouse or partner to aggregate income.
3. **Extend Tenure:** Increase loan duration (months) to reduce the monthly EMI payment.`;
    }
    
    return `### 📊 Financial Diagnostic Audit Report
**Client Name:** ${currentAnalysis.name}
**Status:** ${currentAnalysis.status}

${adviceText}

*Note: This report was generated by the local credit scoring module.*`;
  }
  
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes('credit score') || lowercasePrompt.includes('improve')) {
    return `To improve your credit score of **${currentAnalysis.creditScore}**:
1. **On-Time Payments:** Ensure 100% timely payment on all active EMIs and credit cards.
2. **Credit Utilization:** Keep credit card utilization below 30%.
3. **Avert Inquiries:** Do not apply for multiple credit accounts concurrently.`;
  }
  
  if (lowercasePrompt.includes('dti') || lowercasePrompt.includes('debt-to-income')) {
    return `Your Debt-to-Income (DTI) ratio is **${(currentAnalysis.dti * 100).toFixed(1)}%**.
It represents the percentage of your gross monthly income used to pay off housing, expenses, and debts.
- **Under 35%:** Healthy.
- **36% to 45%:** Manageable but elevated.
- **Over 45%:** Over-leveraged, which is our standard decline threshold.`;
  }
  
  return `Based on your profile (Income: $${currentAnalysis.income}/mo, Credit Score: ${currentAnalysis.creditScore}, Status: ${currentAnalysis.status}), I recommend reducing outstanding liabilities to lower your DTI and optimize your cash buffers. Let me know if you have specific questions about EMIs, bank policies, or budgeting.`;
}

// ----------------------------------------------------
// SERVERLESS DATA STORAGE & WEBHOOKS
// ----------------------------------------------------

async function triggerGoogleSheetSync() {
  if (!currentAnalysis) {
    showGlobalAlert('warning', 'No diagnostics details available. Perform assessment first.');
    return;
  }
  
  const payload = {
    name: currentAnalysis.name,
    email: currentAnalysis.email,
    monthlyIncome: currentAnalysis.income,
    monthlyExpenses: currentAnalysis.expenses,
    creditScore: currentAnalysis.creditScore,
    requestedAmount: currentAnalysis.amount,
    tenure: currentAnalysis.tenure,
    emi: parseFloat(currentAnalysis.proposedEmi.toFixed(2)),
    eligibilityStatus: currentAnalysis.status,
    riskCategory: currentAnalysis.riskCategory
  };
  
  // Local Backup: File Download
  if (appSettings.mode === 'demo' || !appSettings.sheetUrl) {
    downloadLocalBackup(payload);
    return;
  }
  
  showGlobalAlert('warning', 'Connecting to Google Sheets script...');
  
  try {
    await fetch(appSettings.sheetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    showGlobalAlert('success', 'Data sent! Record successfully appended to your serverless Google Sheet.');
  } catch (err) {
    console.error("Sheets sync failed:", err);
    showGlobalAlert('danger', `Sync failed: ${err.message}. Downloading CSV backup instead...`);
    downloadLocalBackup(payload);
  }
}

function downloadLocalBackup(data) {
  let csv = 'Timestamp,Name,Email,Monthly Income,Monthly Expenses,Credit Score,Requested Loan,Tenure,Monthly EMI,Eligibility Status,Risk Category\n';
  csv += `"${new Date().toLocaleString()}","${data.name}","${data.email}",${data.monthlyIncome},${data.monthlyExpenses},${data.creditScore},${data.requestedAmount},${data.tenure},${data.emi},"${data.eligibilityStatus}","${data.riskCategory}"`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `finewise_diagnostic_${data.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showGlobalAlert('success', 'Demo Mode: Eligibility assessment downloaded locally as a CSV backup file.');
}

// Global alert display helper
function showGlobalAlert(type, message) {
  const container = document.getElementById('global-alert-container');
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}">
      ${type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : type === 'warning' ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>'}
      <span>${message}</span>
    </div>
  `;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}
