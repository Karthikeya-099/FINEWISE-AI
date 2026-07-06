const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, 'handbook.html');

console.log('Writing FineWise AI Handbook generator...');

// Standard Header & Styling
const headerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FineWise AI - Complete Technical Project Handbook</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e293b;
      --secondary: #0f172a;
      --accent: #2563eb;
      --accent-light: #eff6ff;
      --border: #e2e8f0;
      --bg-light: #f8fafc;
      --text: #334155;
      --text-dark: #0f172a;
    }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.7;
      color: var(--text);
      max-width: 900px;
      margin: 0 auto;
      padding: 3rem 2rem;
    }
    
    h1, h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
      color: var(--text-dark);
      font-weight: 700;
      margin-top: 2rem;
    }
    
    h1 {
      font-size: 2.5rem;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 0.5rem;
      margin-bottom: 2rem;
    }
    
    h2 {
      font-size: 1.8rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.35rem;
      margin-top: 3.5rem;
    }
    
    h3 {
      font-size: 1.3rem;
      color: var(--accent);
    }
    
    code {
      font-family: Consolas, Monaco, 'Andale Mono', monospace;
      background-color: var(--bg-light);
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-size: 0.9em;
      border: 1px solid var(--border);
    }
    
    pre {
      background-color: var(--bg-light);
      border: 1px solid var(--border);
      padding: 1.25rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    
    pre code {
      background: none;
      border: none;
      padding: 0;
      font-size: 0.875rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: 0.925rem;
    }
    
    th, td {
      border: 1px solid var(--border);
      padding: 0.75rem;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background-color: var(--bg-light);
      font-weight: 600;
      color: var(--text-dark);
    }
    
    .question-box {
      background-color: var(--accent-light);
      border-left: 4px solid var(--accent);
      padding: 1.25rem;
      margin: 1.75rem 0;
      border-radius: 0 8px 8px 0;
    }
    
    .question-title {
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 0.5rem;
    }
    
    .page-break {
      page-break-before: always;
      margin-top: 4rem;
    }
    
    .diagram {
      font-family: monospace;
      white-space: pre;
      background: var(--secondary);
      color: #38bdf8;
      padding: 1.25rem;
      border-radius: 8px;
      line-height: 1.25;
      font-size: 0.85rem;
      overflow-x: auto;
      margin: 1.5rem 0;
      border: 1px solid #1e293b;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 4px;
      background: var(--accent-light);
      color: var(--accent);
      margin-right: 0.5rem;
    }
    
    .bullet-points li {
      margin-bottom: 0.5rem;
    }
    
    /* Cover Page Styling */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 80vh;
      text-align: center;
      border-bottom: 3px double var(--border);
      padding-bottom: 5rem;
      margin-bottom: 5rem;
    }
    
    .cover-title {
      font-size: 3.5rem;
      margin: 0;
      font-weight: 800;
      color: var(--text-dark);
    }
    
    .cover-subtitle {
      font-size: 1.5rem;
      color: var(--accent);
      margin: 1.5rem 0 3rem;
    }
    
    .cover-metadata {
      font-size: 1rem;
      color: var(--text);
      line-height: 2;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <h1 class="cover-title" style="border:none; margin-bottom:0;">FINEWISE AI</h1>
    <div class="cover-subtitle">Complete Project Architecture, Engineering & Placement Interview Handbook</div>
    <div style="flex-grow: 1;"></div>
    <div class="cover-metadata">
      <strong>Candidate Handbook</strong><br>
      Role Targets: Software Development Engineer (SDE I/II), Full Stack Engineer, Systems Architect<br>
      System Focus: Multi-Factor Financial Intelligence, Client Risk Modeling, Secure RBAC Authentication<br>
      Date: July 2026<br>
      <br>
      <em>Generated for Technical Placements, Campus Recruitment, and Startup Hiring Hackathons</em>
    </div>
  </div>
`;

fs.writeFileSync(targetPath, headerHtml);

console.log('Writing Section 1: Project Overview...');
const section1 = `
  <div class="page-break"></div>
  <h2>1. Project Overview & Product Scoping</h2>
  
  <h3>1.1 Project Introduction</h3>
  <p>
    <strong>FineWise AI</strong> is a full-stack financial intelligence and credit risk assessment application. The system provides clients with real-time feedback regarding their credit profile stability and matches them with pre-qualified personal loans based on custom rulesets. FineWise AI leverages the <strong>Multi-Factor Creditworthiness Index (MF-CWI)</strong> mathematical algorithm to determine loan ceilings and interest rates, offering users structured financial diagnostics in place of generic credit score assessments.
  </p>
  
  <h3>1.2 The Problem Statement</h3>
  <p>
    The standard credit underwriting landscape suffers from three core bottlenecks:
  </p>
  <ul class="bullet-points">
    <li><strong>Siloed Scoring Models:</strong> Traditional financial structures rely heavily on standalone bureaus (e.g. TransUnion, Equifax). These scores do not factor in real-time liquid cash cushions, creating a disadvantage for individuals with high net assets but thin credit file histories.</li>
    <li><strong>High Administrative Overhead:</strong> Traditional underwriting takes days or weeks to manually check liabilities, verify asset values, and review bank statements.</li>
    <li><strong>Data Vulnerability:</strong> When clients register their bank credentials with lenders, administrators are frequently exposed to raw passwords, account routing numbers, and balances, violating basic data privacy standards (e.g. GLBA, GDPR).</li>
  </ul>
  
  <h3>1.3 Objectives & Project Scope</h3>
  <p>
    The primary objectives of the FineWise AI project are:
  </p>
  <ul class="bullet-points">
    <li>Deploy a secure, token-based authentication system separating clients from administrators using a single physical login view with a logic toggle.</li>
    <li>Execute real-time mathematical risk evaluation using multi-factor financial assets and liabilities constraints.</li>
    <li>Ensure strict backend data privacy separating sensitive client banking credentials from administrative queries.</li>
  </ul>
  
  <div class="question-box">
    <div class="question-title">Interview Question: What is the Unique Selling Proposition (USP) of FineWise AI compared to standard credit bureaus?</div>
    <div class="question-answer">
      <strong>Answer:</strong> Standard credit bureaus evaluate credit history retrospectively (historical repayment records). FineWise AI uses the <strong>Multi-Factor Creditworthiness Index (MF-CWI)</strong>, which aggregates retrospective history (40% weight) with real-time current liquidity buffers (10% weight), live debt-to-income (25% weight), and budgeting parameters (15% weight). Furthermore, it provides automated match-making against real-world bank policy models while keeping sensitive routing data isolated from human administrators via database-level routing separations.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section1);

console.log('Writing Section 2: Complete System Architecture...');
const section2 = `
  <div class="page-break"></div>
  <h2>2. Complete System Architecture & Flow</h2>
  
  <h3>2.1 System Architecture Diagram</h3>
  <p>
    The system follows a classic 3-Tier Web Architecture model (Client, Application, and Data Tier):
  </p>
  <div class="diagram">
+-----------------------------------------------------------------+
|                           CLIENT TIER                           |
|  [Browser (index.html / login.html / client.html / admin.html)] |
+-----------------------------------------------------------------+
                                |
                   HTTP / REST APIs (JWT Auth)
                                |
                                v
+-----------------------------------------------------------------+
|                        APPLICATION TIER                         |
|   [Node.js + Express Server (server.js)]                        |
|     +-- /api/auth    (routes/auth.js)                           |
|     +-- /api/client  (routes/client.js)                         |
|     +-- /api/admin   (routes/admin.js)                          |
|     +-- CWI Engine   (services/analysis.js)                     |
+-----------------------------------------------------------------+
                                |
                  SQLite Operations (database.js)
                                |
                                v
+-----------------------------------------------------------------+
|                            DATA TIER                            |
|                     [SQLite (finewise.db)]                      |
+-----------------------------------------------------------------+
  </div>

  <h3>2.2 Folder Structure Explanation</h3>
  <p>
    The project directory is structured cleanly to enforce modularity and maintain a clear separation of concerns (SoC):
  </p>
  <pre><code>finewise-ai/
├── database.js          # SQLite3 initialization, schema scripts, and async helpers
├── server.js            # Express server initialization, routing tables, static asset hosts
├── package.json         # Project manifests, dependency lists, and npm scripts
├── finewise.db          # SQLite3 local database binary file
├── middleware/
│   └── auth.js          # Authentication filters (JWT verification, requireRole)
├── routes/
│   ├── auth.js          # Authentication routes (Login/Register endpoints)
│   ├── client.js        # Client workspace API endpoints (Profile, bank logs)
│   └── admin.js         # Administrative dashboard directory queries
├── services/
│   └── analysis.js      # Main MF-CWI algorithmic scoring module
└── public/
    ├── index.html       # Landing page (Marketing & mathematical scoping)
    ├── login.html       # Authentication (Dynamic switch portal)
    ├── client.html      # Client workspace (Data input, gauge charts, offers)
    ├── admin.html       # Admin control board (User directories, risk metrics)
    └── styles.css       # Unified premium glassmorphism styling
  </code></pre>

  <div class="question-box">
    <div class="question-title">Interview Question: Walk me through the Request-Response lifecycle when a user requests their Credit analysis.</div>
    <div class="question-answer">
      <strong>Answer:</strong> 
      1. The client browser makes a <code>GET</code> request to <code>/api/client/analysis</code> with a JWT in the <code>Authorization: Bearer &lt;token&gt;</code> header.<br>
      2. The Express server passes the request to the <code>authenticateToken</code> middleware which decodes and verifies the signature using the server secret key.<br>
      3. The request is routed to the client router, where a database read query verifies if the user already has a generated row in the <code>loan_analysis</code> table.<br>
      4. If the analysis is missing but a profile exists, the server triggers the <code>runAnalysis()</code> function inside the CWI service module.<br>
      5. The service runs queries to retrieve profiles, bank accounts, and active liabilities, executes the MF-CWI normalization scoring, updates the database table, and returns the analysis payload to the user as a JSON response.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section2);

console.log('Writing Section 3: Technologies Used...');
const section3 = `
  <div class="page-break"></div>
  <h2>3. Technologies Used & Trade-Offs</h2>
  
  <table>
    <tr>
      <th>Technology</th>
      <th>Why Chosen</th>
      <th>Advantages</th>
      <th>Alternatives & Trade-offs</th>
    </tr>
    <tr>
      <td><strong>Node.js & Express.js</strong></td>
      <td>Allows javascript to be run natively on the backend, enabling quick routing setups.</td>
      <td>Asynchronous non-blocking I/O model handles multiple database queries efficiently. Single language stack.</td>
      <td>Spring Boot or Django. Trade-off: Node.js is single-threaded, so heavy CPU math operations could block the event loop if not handled asynchronously.</td>
    </tr>
    <tr>
      <td><strong>SQLite3</strong></td>
      <td>Zero-configuration, lightweight, and files are stored inside the project folder.</td>
      <td>No complex installation, fast reading speed for single-connection local test suites.</td>
      <td>PostgreSQL or MySQL. Trade-off: SQLite lacks concurrent writing capabilities, locking the database during simultaneous updates.</td>
    </tr>
    <tr>
      <td><strong>JSON Web Tokens (JWT)</strong></td>
      <td>Provides stateless, decentralized authentication signatures.</td>
      <td>Eliminates database-level session tables; server reads token payload directly from headers.</td>
      <td>Redis-backed Sessions. Trade-off: JWTs cannot be easily revoked before expiration without building a blacklist registry.</td>
    </tr>
  </table>

  <div class="question-box">
    <div class="question-title">Interview Question: Why did you choose SQLite over MongoDB for this financial project?</div>
    <div class="question-answer">
      <strong>Answer:</strong> FineWise AI relies on strong transactional consistency and relational integrity (e.g. mapping client profiles to users, and foreign keys deleting bank statements on account teardowns). Relational databases guarantee ACID properties. MongoDB is document-based, which is excellent for unstructured data, but relational tables with strict foreign keys (e.g., <code>ON DELETE CASCADE</code>) are cleaner for transaction logs and financial records.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section3);

console.log('Writing Section 4: Authentication Module...');
const section4 = `
  <div class="page-break"></div>
  <h2>4. Authentication Module & Security Architecture</h2>
  
  <h3>4.1 Strict Role Separation Logic</h3>
  <p>
    A critical requirement of FineWise AI is that Client accounts and Administrator accounts are completely isolated:
  </p>
  <ul class="bullet-points">
    <li><strong>Toggle OFF (Client Mode):</strong> Requests go to the backend indicating <code>role: 'client'</code>. The system queries only client accounts. Any attempts using admin credentials will be rejected immediately with an HTTP 401 response: <code>"Administrator credentials cannot be used in Client Login."</code></li>
    <li><strong>Toggle ON (Admin Mode):</strong> Requests go to the backend indicating <code>role: 'admin'</code>. The system queries only admin accounts. Any client attempts are rejected with: <code>"Client credentials cannot be used in Administrator Login."</code></li>
  </ul>

  <h3>4.2 Backend Password Salting & Hashing</h3>
  <p>
    Passwords are never saved in plain text. FineWise AI uses <strong>bcryptjs</strong> to salt and hash passwords. The salt rounds value is set to <code>10</code>.
  </p>

  <div class="question-box">
    <div class="question-title">Interview Question: What is salt in bcrypt, and how does it prevent rainbow table attacks?</div>
    <div class="question-answer">
      <strong>Answer:</strong> A salt is a random string of characters appended to a password before hashing. Bcrypt automatically generates a unique salt for every password. Even if two users choose the same password (e.g. <code>password123</code>), they will yield completely different hashes in the database. This prevents rainbow table attacks (pre-computed dictionary hash maps) because the attacker cannot pre-compute the target hashes without knowing the unique salt.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section4);

console.log('Writing Section 5: Database Design...');
const section5 = `
  <div class="page-break"></div>
  <h2>5. Database Design & SQL Catalog</h2>
  
  <h3>5.1 Text ER Diagram</h3>
  <div class="diagram">
+-------------+         1 : 1         +-----------------+
|    USERS    |-----------------------| CLIENT_PROFILES |
| (PK) id     |                       | (PK) id         |
|  username   |                       | (FK) user_id    |
|  password   |                       |  credit_score   |
|  role       |                       |  annual_income  |
+-------------+                       +-----------------+
       | 1                                     |
       |                                       |
       | 1 : N                                 | 1 : 1
       +-----------------+                     |
       |                 |                     |
       v 1 : N           v                     v
+---------------+ +----------------+ +-------------------+
| BANK_ACCOUNTS | | PREVIOUS_LOANS | |   LOAN_ANALYSIS   |
| (PK) id       | | (PK) id        | | (PK) id           |
| (FK) user_id  | | (FK) user_id   | | (FK) user_id      |
|  balance      | |  loan_amount   | |  risk_score       |
+---------------+ +----------------+ |  approved_amount  |
                                     +-------------------+
  </div>

  <h3>5.2 Normalization Analysis</h3>
  <p>
    The tables are normalized up to <strong>Third Normal Form (3NF)</strong>:
  </p>
  <ul class="bullet-points">
    <li><strong>1NF:</strong> All columns store atomic values, and there are no repeating groups.</li>
    <li><strong>2NF:</strong> Meets 1NF, and all non-key columns (e.g., <code>credit_score</code> in client_profiles) are fully functionally dependent on the primary key (<code>id</code>).</li>
    <li><strong>3NF:</strong> Meets 2NF, and there are no transitive dependencies (no non-key column depends on another non-key column).</li>
  </ul>

  <div class="question-box">
    <div class="question-title">Interview Question: What is the purpose of ON DELETE CASCADE in the database foreign keys?</div>
    <div class="question-answer">
      <strong>Answer:</strong> <code>ON DELETE CASCADE</code> is a database referential integrity constraint. In our schema, tables like <code>client_profiles</code> and <code>bank_accounts</code> reference the <code>users</code> table. If a user account is deleted, the SQLite engine automatically deletes all related profile data, bank account registries, and active debt balances, preventing orphaned records.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section5);

console.log('Writing Section 6: AI Module...');
const section6 = `
  <div class="page-break"></div>
  <h2>6. Algorithmic Credit Intelligence Module</h2>
  
  <h3>6.1 Multi-Factor Creditworthiness Index (MF-CWI)</h3>
  <p>
    The core innovation is the mathematical scoring engine. Instead of a single credit rating, the CWI aggregates normalized inputs:
  </p>
  <pre><code>CWI = (0.40 * sCredit) + (0.25 * sDti) + (0.15 * sExp) + (0.10 * sRes) + (0.10 * sHistory)</code></pre>
  
  <h3>6.2 Step-by-Step Core Calculations</h3>
  <ol>
    <li><strong>Credit Score Normalization ($sCredit$):</strong> Map score (300 to 850) on 0 to 1 scale.</li>
    <li><strong>Debt-to-Income ($sDti$):</strong> Calculate DTI (monthly debt/income). Normalizes where 0% debt is 1.0, and DTI &ge; 60% maps to 0.</li>
    <li><strong>Expense-to-Income ($sExp$):</strong> Calculates monthly costs vs income. Low expense ratios map close to 1.0.</li>
    <li><strong>Liquidity Buffer ($sRes$):</strong> Cash balance evaluated against 3 months of emergency expenses.</li>
    <li><strong>Payment History ($sHistory$):</strong> Evaluates outstanding debt vs original principal.</li>
  </ol>

  <div class="question-box">
    <div class="question-title">Interview Question: How does the algorithm prevent over-leveraging a client with a high credit score?</div>
    <div class="question-answer">
      <strong>Answer:</strong> The CWI limits approval amounts via an amortization check. It calculates the maximum allowable monthly payment: <code>maxPayment = (income * (DTI_Threshold * CWI)) - active_debts</code>. Even if a client has a 800 credit score, if their active debt payments exhaust their income margin, the allowable monthly payment drops to $0, resulting in a rejected application.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section6);

console.log('Writing Section 7: Features...');
const section7 = `
  <div class="page-break"></div>
  <h2>7. Features Breakdown</h2>
  
  <h3>7.1 Landing Page Dashboard</h3>
  <p>
    Displays marketing material detailing CWI metrics and access points to portals. Contains visual references to how weight limits are divided.
  </p>
  
  <h3>7.2 Client Dashboard Portal</h3>
  <p>
    Offers direct navigation tabs:
  </p>
  <ul class="bullet-points">
    <li><strong>Overview Dashboard:</strong> Features stats cards showing maximum approved ceilings, risk tiers, and an interactive semi-doughnut Chart.js gauge.</li>
    <li><strong>Financial Data Registry:</strong> Collects credit scores, desired loans, income inputs, and purposes.</li>
    <li><strong>Bank Account Linker:</strong> Connects savings and checking accounts to the cash reserve buffer.</li>
    <li><strong>Debt Obligations Ledger:</strong> Records previous loans and monthly payment schedules.</li>
    <li><strong>Bank Matching System:</strong> Displays matching pre-approved credit products and terms.</li>
  </ul>

  <div class="question-box">
    <div class="question-title">Interview Question: How did you implement the CWI gauge chart on the client dashboard?</div>
    <div class="question-answer">
      <strong>Answer:</strong> I used <strong>Chart.js</strong> with a custom canvas element rendering a <code>doughnut</code> chart. To format it as a gauge, I set the configuration property <code>circumference</code> to <code>180</code> degrees and <code>rotation</code> to <code>270</code> degrees. The dataset passes two segments: the CWI score (e.g. 0.75) and the remainder (0.25). The background colors dynamically shift depending on risk levels (Green for Low Risk, Orange for Medium Risk, Red for High Risk).
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section7);

console.log('Writing Section 8: Backend APIs...');
const section8 = `
  <div class="page-break"></div>
  <h2>8. Backend API Specifications</h2>
  
  <h3>8.1 /api/auth/register</h3>
  <p><strong>Method:</strong> <code>POST</code></p>
  <p><strong>Request Body:</strong></p>
  <pre><code>{
  "username": "client01",
  "password": "securepassword",
  "role": "client"
}</code></pre>
  <p><strong>Success Response (201 Created):</strong></p>
  <pre><code>{
  "message": "User registered successfully.",
  "userId": 12
}</code></pre>

  <h3>8.2 /api/auth/login</h3>
  <p><strong>Method:</strong> <code>POST</code></p>
  <p><strong>Request Body:</strong></p>
  <pre><code>{
  "username": "client01",
  "password": "securepassword",
  "role": "client"
}</code></pre>
  <p><strong>Success Response (200 OK):</strong></p>
  <pre><code>{
  "token": "eyJhbGciOi...",
  "role": "client",
  "username": "client01"
}</code></pre>

  <div class="question-box">
    <div class="question-title">Interview Question: What HTTP status codes do you return for validation failures vs server errors?</div>
    <div class="question-answer">
      <strong>Answer:</strong> I return <code>400 Bad Request</code> for client validation errors (e.g., missing fields during registration), <code>401 Unauthorized</code> for incorrect credentials, <code>403 Forbidden</code> for access control mismatches (e.g., standard users hitting admin URLs), and <code>500 Internal Server Error</code> for database query issues.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section8);

console.log('Writing Section 9: Frontend Components...');
const section9 = `
  <div class="page-break"></div>
  <h2>9. Frontend Component Layout & Routing Control</h2>
  
  <h3>9.1 Frontend Route Protection</h3>
  <p>
    Standard users should never access the admin portal files directly. FineWise AI checks authorization elements on page load inside scripts on dashboards:
  </p>
  <pre><code>// Client portal route safety check
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'client') {
    localStorage.clear();
    window.location.href = '/login.html?role=client';
  }
});</code></pre>

  <div class="question-box">
    <div class="question-title">Interview Question: Is client-side route redirection sufficient for security?</div>
    <div class="question-answer">
      <strong>Answer:</strong> No, client-side redirection is only for user experience (redirecting unauthenticated users to login). True security is enforced at the backend level. Even if a malicious user bypasses the client-side redirect using developer tools, every subsequent API call they make to retrieve profiles or directories will be rejected by the backend server middleware because they lack a valid JWT containing the required claims.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section9);

console.log('Writing Section 10: Project Workflow...');
const section10 = `
  <div class="page-break"></div>
  <h2>10. Complete System Workflow</h2>
  
  <h3>10.1 Workflow Sequence Diagram</h3>
  <div class="diagram">
Client Browser           Express Web Server             SQLite Database
      |                          |                            |
      |-- 1. POST /login ------->|                            |
      |   (Payload + Role)       |-- 2. Query user Details -->|
      |                          |&lt;-- 3. Return user record --|
      |&lt;-- 4. Send JWT Token ----|                            |
      |                          |                            |
      |-- 5. POST /profile ----->|                            |
      |   (Auth Header + Data)   |-- 6. Save Profile -------->|
      |                          |-- 7. Recalculate CWI ----->|
      |                          |-- 8. UPDATE analysis ----->|
      |&lt;-- 9. Profile Saved -----|                            |
      |                          |                            |
  </div>

  <div class="question-box">
    <div class="question-title">Interview Question: What happens behind the scenes when a user clicks 'Sign Out'?</div>
    <div class="question-answer">
      <strong>Answer:</strong> The frontend JavaScript calls <code>localStorage.clear()</code> to destroy the client's token, username, and role records. It then redirects the window to <code>/login.html</code>. Because the token is wiped, any future page loads will fail the authentication checks, and any backend API requests will be rejected by the server.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section10);

console.log('Writing Section 11: Challenges Faced...');
const section11 = `
  <div class="page-break"></div>
  <h2>11. Engineering Challenges & Troubleshooting Solutions</h2>
  
  <h3>11.1 The Missing CWI Database Column Bug</h3>
  <p>
    <strong>Problem:</strong> During testing, the client dashboard always displayed the CWI score as '0.00' on page reload, even though it was correctly calculated immediately after updating the profile.
    <br>
    <strong>Root Cause:</strong> The SQLite schema for the 'loan_analysis' table did not contain a 'cwi' column. The calculation service ran correctly, but the SQL queries ignored 'cwi' during updates, saving only the risk tier and limits. Subsequent GET requests queried the database and returned 'undefined' for CWI.
    <br>
    <strong>Solution:</strong>
  </p>
  <ul class="bullet-points">
    <li>Modified the database initialization schema inside 'database.js' to include the 'cwi REAL' column.</li>
    <li>Added a safe migration block to execute 'ALTER TABLE loan_analysis ADD COLUMN cwi REAL' inside a try-catch statement, ensuring existing installations upgraded automatically.</li>
    <li>Patched 'services/analysis.js' to insert and update the 'cwi' parameter.</li>
  </ul>

  <h3>11.2 Relative URL Pathing Mismatch</h3>
  <p>
    <strong>Problem:</strong> Accessing login pages directly via local directories ('file:///E:/...') resulted in network failures and 'Unexpected end of JSON input'.
    <br>
    <strong>Root Cause:</strong> Relative path requests like 'fetch(\\'/api/auth/login\\')' resolve to the local system root 'file:///api/auth/login' when opened directly as a file.
    <br>
    <strong>Solution:</strong> Guided the client setup to run the local server on 'http://localhost:3000' and access it through standard HTTP origins instead of double-clicking files.
  </p>

  <div class="question-box">
    <div class="question-title">Interview Question: How do you handle unhandled exceptions in asynchronous Express route handlers?</div>
    <div class="question-answer">
      <strong>Answer:</strong> I wrap asynchronous database queries in standard <code>try...catch</code> blocks. In case of failure, I log the error on the server console and return an HTTP 500 error code with a JSON payload <code>{ error: 'Failed to process request.' }</code>, preventing the server from crashing.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section11);

console.log('Writing Section 12: Optimization...');
const section12 = `
  <div class="page-break"></div>
  <h2>12. Optimization Strategies</h2>
  
  <h3>12.1 Database Indexing</h3>
  <p>
    To optimize lookups, indices are created on foreign keys that are frequently queried or joined:
  </p>
  <pre><code>CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON previous_loans(user_id);</code></pre>

  <h3>12.2 Security Hardening</h3>
  <p>
    We prevent typical vulnerabilities using standard measures:
  </p>
  <ul class="bullet-points">
    <li><strong>SQL Injection:</strong> Handled by using parameterized prepared statements ('sqlite3' parameterized arrays like '?' inputs) instead of raw string concatenations.</li>
    <li><strong>Cross-Site Scripting (XSS):</strong> Controlled by storing auth data securely and sanitizing output inputs before rendering them using 'textContent' instead of 'innerHTML'.</li>
  </ul>

  <div class="question-box">
    <div class="question-title">Interview Question: How do prepared statements prevent SQL Injection?</div>
    <div class="question-answer">
      <strong>Answer:</strong> Prepared statements separate the SQL code template from the variables. The database engine compiles the SQL query structure first (using placeholder markers <code>?</code>), and then inserts the values strictly as literals. Even if a user enters malicious SQL payloads (like <code>' OR 1=1 --</code>), the engine treats the input as a string literal value rather than executable SQL statements, neutralizing the attack.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section12);

console.log('Writing Section 13: Future Enhancements...');
const section13 = `
  <div class="page-break"></div>
  <h2>13. Future Enhancements & Product Roadmap</h2>
  
  <h3>13.1 Plaid API Integration</h3>
  <p>
    Replacing manual balance inputs with direct open-banking bank statement integrations (e.g. Plaid, Finicity) to automatically import balances, reducing friction and preventing user data manipulation.
  </p>
  
  <h3>13.2 Machine Learning Credit Analytics</h3>
  <p>
    Upgrading the static scoring weights with a dynamic Random Forest or XGBoost classification model trained on public credit records to dynamically assign factor weights based on market defaults.
  </p>

  <div class="question-box">
    <div class="question-title">Interview Question: What architecture patterns would you use to scale FineWise AI to millions of active users?</div>
    <div class="question-answer">
      <strong>Answer:</strong> I would shift from a monolithic server with SQLite to a containerized microservices architecture (Docker + Kubernetes). The authentication service and CWI engine would be deployed separately. I would replace SQLite with a managed distributed database cluster like PostgreSQL with read replicas, and introduce Redis caching layers to store profile records and computed analysis metrics.
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section13);

console.log('Writing Section 14: Testing...');
const section14 = `
  <div class="page-break"></div>
  <h2>14. Testing Methodologies</h2>
  
  <h3>14.1 Backend Integration Testing</h3>
  <p>
    We deployed an automated script ('test_backend.js') to verify end-to-end routing.
  </p>
  <ul class="bullet-points">
    <li><strong>Access Verification:</strong> Asserts that admins are blocked from client endpoints with 403, and clients are blocked from admin tools.</li>
    <li><strong>Data Isolation Checks:</strong> Asserts that when queries retrieve directories, raw bank balances and numbers remain isolated.</li>
  </ul>

  <div class="question-box">
    <div class="question-title">Interview Question: Explain the difference between Unit testing and Integration testing in this project.</div>
    <div class="question-answer">
      <strong>Answer:</strong> Unit testing validates individual isolated functions (like testing if the CWI calculation yields 0.81 for a specific inputs set in the analysis service module). Integration testing validates the connections between modules (like verifying if sending a POST request to <code>/api/client/profile</code> correctly updates the database and triggers the analysis update script).
    </div>
  </div>
`;
fs.appendFileSync(targetPath, section14);

console.log('Writing Section 15: Deployment...');
const section15 = `
  <div class="page-break"></div>
  <h2>15. Deployment & Production Setup</h2>
  
  <h3>15.1 Local Runbook</h3>
  <ol>
    <li>Navigate to folder: <code>cd finewise-ai</code></li>
    <li>Install packages: <code>npm install</code></li>
    <li>Boot application: <code>npm start</code></li>
    <li>View page: <code>http://localhost:3000</code></li>
  </ol>

  <h3>15.2 Environment Configuration</h3>
  <p>
    Always separate configuration data from codebase files. Set variables in a <code>.env</code> file in production:
  </p>
  <pre><code>PORT=3000
JWT_SECRET=super_secure_production_secret_key_abc_123
DATABASE_URL=./finewise.db</code></pre>

  <div class="question-box">
    <div class="question-title">Interview Question: Why should you never commit your JWT_SECRET to your git repository?</div>
    <div class="question-answer">
      <strong>Answer:</strong> Committing secrets to a public or shared repository exposes them to unauthorized users. If an attacker obtains your <code>JWT_SECRET</code>, they can forge valid authentication tokens for any user (including administrators) and gain full access to the database, compromising the entire system.
    </div>
  </div>

  <div style="text-align: center; margin-top: 6rem; font-size: 0.85rem; color: var(--text-secondary);">
    <p>--- End of FineWise AI Project Interview Handbook ---</p>
  </div>
`;
fs.appendFileSync(targetPath, section15);

// Close body tags
const footerHtml = `
</body>
</html>
`;
fs.appendFileSync(targetPath, footerHtml);

console.log('Successfully completed building the project handbook!');
process.exit(0);
