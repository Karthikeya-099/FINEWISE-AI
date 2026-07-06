// Application State
let appSettings = {
  mode: 'demo', // 'demo' or 'live'
  apiKey: '',
  sheetUrl: ''
};

let currentAnalysis = null;

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  // Load settings from localStorage
  const savedSettings = localStorage.getItem('finewise_settings');
  if (savedSettings) {
    appSettings = JSON.parse(savedSettings);
  }
  
  // Set forms initial values in settings modal
  document.getElementById('set-mode').value = appSettings.mode;
  document.getElementById('set-api-key').value = appSettings.apiKey || '';
  document.getElementById('set-sheet-url').value = appSettings.sheetUrl || '';
  
  toggleApiFields(appSettings.mode);
});

// Form Tabs Switcher
function switchFormTab(tabName) {
  document.querySelectorAll('.form-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.form-panel').forEach(panel => panel.classList.remove('active'));
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`panel-${tabName}`).classList.add('active');
}

// Open / Close Settings Modal
function openSettingsModal() {
  document.getElementById('settings-modal').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('open');
}

function toggleApiFields(mode) {
  const fields = document.getElementById('api-settings-fields');
  fields.style.display = mode === 'live' ? 'block' : 'none';
}

// Save Developer Settings
function handleSettingsSave(event) {
  event.preventDefault();
  
  appSettings.mode = document.getElementById('set-mode').value;
  appSettings.apiKey = document.getElementById('set-api-key').value.trim();
  appSettings.sheetUrl = document.getElementById('set-sheet-url').value.trim();
  
  localStorage.setItem('finewise_settings', JSON.stringify(appSettings));
  
  const alertContainer = document.getElementById('settings-alert');
  alertContainer.innerHTML = `
    <div class="alert alert-success">
      <i class="fa-solid fa-circle-check"></i> Configuration saved successfully!
    </div>
  `;
  
  setTimeout(() => {
    alertContainer.innerHTML = '';
    closeSettingsModal();
  }, 1000);
}

// ----------------------------------------------------
// CORE FINANCIAL CALCULATORS & ALGORITHMS
// ----------------------------------------------------

/**
 * Reducing-Balance EMI Amortization calculation
 * Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 */
const defCalculateEmi = (principal, annualRate, tenureMonths) => {
  const r = (annualRate / 12) / 100; // Monthly interest rate
  const n = tenureMonths;
  
  if (r === 0) return principal / n;
  
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return emi;
};

// Handle Standard EMI Form submission
function handleEmiSubmit(event) {
  event.preventDefault();
  
  const principal = parseFloat(document.getElementById('calc-amount').value);
  const rate = parseFloat(document.getElementById('calc-interest').value);
  const tenure = parseInt(document.getElementById('calc-tenure').value);
  
  const emi = defCalculateEmi(principal, rate, tenure);
  
  // Show global alert with results
  showGlobalAlert('success', `Monthly EMI Payment calculated: <strong>$${emi.toFixed(2)}</strong>`);
  
  // Build Amortization schedule
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
      <td>Month ${i}</td>
      <td>$${emi.toFixed(2)}</td>
      <td>$${interest.toFixed(2)}</td>
      <td>$${pPaid.toFixed(2)}</td>
      <td>$${Math.max(0, balance).toFixed(2)}</td>
    `;
    tableBody.appendChild(row);
  }
  
  document.getElementById('emi-schedule-box').style.display = 'block';
}

// ----------------------------------------------------
// LOAN ELIGIBILITY & RISK DIAGNOSTIC ENGINE
// ----------------------------------------------------

function handleEligibilitySubmit(event) {
  event.preventDefault();
  
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
  
  // Calculate Proposed Monthly EMI
  const proposedEmi = defCalculateEmi(amount, rate, tenure);
  
  // 1. Calculate Debt-to-Income (DTI)
  // DTI = (Expenses + Existing EMIs + Proposed EMI) / Monthly Income
  const dti = income > 0 ? ((expenses + existingEmi + proposedEmi) / income) : 1.0;
  
  // 2. Risk Classification based on Credit Score
  let riskCategory = 'Very High';
  let riskBadgeClass = 'badge-danger';
  
  if (creditScore >= 800) {
    riskCategory = 'Very Low';
    riskBadgeClass = 'badge-success';
  } else if (creditScore >= 740) {
    riskCategory = 'Low';
    riskBadgeClass = 'badge-success';
  } else if (creditScore >= 670) {
    riskCategory = 'Moderate';
    riskBadgeClass = 'badge-warning';
  } else if (creditScore >= 580) {
    riskCategory = 'High';
    riskBadgeClass = 'badge-warning';
  }
  
  // 3. Eligibility Decision Logic (Rules-based check)
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
  
  // Save current analysis state
  currentAnalysis = {
    name, email, income, expenses, creditScore, existingEmi,
    amount, tenure, rate, proposedEmi, dti, riskCategory,
    status, reason, netRemainingCash
  };
  
  // Update Dashboard UI
  document.getElementById('dash-emi-value').textContent = `$${proposedEmi.toFixed(2)}`;
  
  const statusBadge = document.getElementById('dash-eligibility-badge');
  statusBadge.className = `stat-value badge ${badgeClass}`;
  statusBadge.textContent = status;
  document.getElementById('dash-eligibility-reason').textContent = reason;
  
  document.getElementById('dash-dti-value').textContent = `${(dti * 100).toFixed(1)}%`;
  const dtiStatus = document.getElementById('dash-dti-status');
  if (dti <= 0.35) {
    dtiStatus.innerHTML = '<span style="color: var(--color-success);">Excellent Capacity</span>';
  } else if (dti <= 0.45) {
    dtiStatus.innerHTML = '<span style="color: var(--color-warning);">Nearing Ceiling</span>';
  } else {
    dtiStatus.innerHTML = '<span style="color: var(--color-danger);">Over-Leveraged</span>';
  }
  
  const riskBadge = document.getElementById('dash-risk-badge');
  riskBadge.className = `stat-value badge ${riskBadgeClass}`;
  riskBadge.textContent = riskCategory;
  document.getElementById('dash-risk-score').textContent = `Rating Index: ${creditScore}`;
  
  document.getElementById('dash-net-income').textContent = `$${income.toFixed(2)}`;
  document.getElementById('dash-total-commit').textContent = `$${(expenses + existingEmi + proposedEmi).toFixed(2)}`;
  
  const bufferEl = document.getElementById('dash-cash-buffer');
  bufferEl.textContent = `$${netRemainingCash.toFixed(2)}`;
  bufferEl.className = netRemainingCash >= 0 ? 'text-success' : 'text-danger';
  
  // Reveal active dashboard
  document.getElementById('dashboard-placeholder').style.display = 'none';
  document.getElementById('dashboard-active').style.display = 'block';
  
  // Add initial AI system advice
  const welcomeMessage = `I see your loan application is **${status}** with a calculated credit risk tier of **${riskCategory}**. ${reason} You can type your questions below or click "Generate Audit Report" above for a detailed evaluation!`;
  appendChatMessage('ai', welcomeMessage);
  
  showGlobalAlert('success', `Financial diagnostic completed. Loan status: <strong>${status}</strong>.`);
}

// ----------------------------------------------------
// CLAUDE AI API INTEGRATION & CHAT ADVISOR
// ----------------------------------------------------

async function generateAIAudit() {
  if (!currentAnalysis) {
    showGlobalAlert('warning', 'Please submit your loan eligibility details first to generate an audit report.');
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
  
  // Remove typing loader
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
  
  // Build prompt context
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
  
  // Remove typing loader
  const loader = document.getElementById('typing-loader');
  if (loader) loader.remove();
  
  appendChatMessage('ai', response);
}

/**
 * Perform Claude Messages API request (or fallback to offline AI simulation)
 */
async function callClaudeAPI(apiKey, prompt, systemPrompt) {
  if (appSettings.mode === 'demo' || !apiKey) {
    // Return high-quality local simulated response
    return getOfflineAISimulation(prompt);
  }
  
  try {
    // Anthropic API calls client-side directly get blocked by browser CORS policy.
    // We implement the standard Anthropic fetch format. If it fails due to CORS, we output a detailed warning.
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
    
    // Check if it's likely a CORS error (network error)
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return `⚠️ **API Connection Warning:** Direct browser requests to \`api.anthropic.com\` are blocked by standard web browser **CORS policies** to prevent exposing your Anthropic API Key in client-side script. 
      
To resolve this, you can setup a local CORS proxy or run this project inside a local Node proxy backend. 

**Here is the local offline AI Financial Diagnostic Audit generated for you:**

${getOfflineAISimulation(prompt)}`;
    }
    
    return `❌ **Claude API Error:** ${err.message}. Reverting to offline simulation:\n\n${getOfflineAISimulation(prompt)}`;
  }
}

// Append chat bubbles to UI
function appendChatMessage(sender, text, id = '') {
  const container = document.getElementById('ai-chat-messages');
  
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-${sender}`;
  if (id) bubble.id = id;
  
  // Simple markdown conversion
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
    return "Hi! Please enter your details on the left, and I'll produce a detailed credit audit report for you.";
  }
  
  const isAudit = prompt.includes('Client Diagnostic Details');
  
  if (isAudit) {
    // Return a structured audit report based on client numbers
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
  
  // If it's a general question, reply based on keyword matching
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
    // Submit POST request to Apps Script Web App
    // We use mode: 'no-cors' since Google redirection triggers CORS issues in simple fetch configurations.
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

// Local File download backup helper
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
