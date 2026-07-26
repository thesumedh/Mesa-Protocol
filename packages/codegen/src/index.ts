import * as ts from 'typescript';
import { FlowDefinition, FlowDefinitionSchema } from '@mesaprotocol/schema';
import JSZip from 'jszip';

// ─── Code Generators ─────────────────────────────────────────────────────────

export function generateSDKCode(flow: FlowDefinition): string {
  const slugName = flow.name.toLowerCase().replace(/\s+/g, '-');
  const flowId = flow.id || slugName;

  let code = `import { Mesa } from '@mesaprotocol/sdk';\n\n`;
  code += `Mesa.configure({\n`;
  code += `  runtimeUrl: process.env.MESA_RUNTIME_URL || 'http://localhost:3001',\n`;
  code += `  apiKey: process.env.MESA_API_KEY,\n`;
  code += `});\n\n`;
  code += `export const flow = Mesa.flow('${flow.name}', '${flowId}')`;

  for (const step of flow.steps) {
    const p = step.params as any;
    if (step.provider === 'sep10') {
      code += `\n  .sep10Auth({ domain: '${p.domain}' })`;
    } else if (step.provider === 'stellar' && p.action === 'receive') {
      code += `\n  .receive({ asset: '${p.asset}', minAmount: ${p.minAmount}, toAddress: '${p.toAddress}' })`;
    } else if (step.provider === 'stellar' && p.action === 'payment') {
      code += `\n  .payment({ to: '${p.to}', amount: ${p.amount}, senderSecretRef: '${p.senderSecretRef || 'SENDER_SECRET'}' })`;
    } else if (step.provider === 'stellar' && p.action === 'path-payment') {
      code += `\n  .pathPayment({ sendAsset: '${p.sendAsset}', destAsset: '${p.destAsset}', sendAmount: ${p.sendAmount}, destMinAmount: ${p.destMinAmount}, destination: '${p.destination}' })`;
    } else if (step.provider === 'anchor') {
      if (p.action === 'sep24-deposit') {
        code += `\n  .anchorDeposit({ anchorDomain: '${p.anchorDomain || 'anchor.stellar.org'}', assetCode: '${p.assetCode || 'USDC'}', amount: ${p.amount || 100} })`;
      } else {
        code += `\n  .convert({ anchor: '${p.anchor || 'stellar-anchor'}', fromAsset: '${p.fromAsset || 'XLM'}', toAsset: '${p.toAsset || 'USDC'}' })`;
      }
    } else if (step.provider === 'delay') {
      code += `\n  .delay({ seconds: ${p.seconds} })`;
    } else if (step.provider === 'webhook') {
      code += `\n  .webhook({ url: '${p.url}' })`;
    } else if (step.provider === 'soroban') {
      code += `\n  .invoke({ contractId: '${p.contractId}', method: '${p.method}' })`;
    } else if (step.provider === 'approval') {
      code += `\n  .manualApproval({ approverRole: '${p.approverRole || 'operator'}' })`;
    } else if (step.provider === 'condition') {
      code += `\n  .condition({ expression: '${p.expression}' })`;
    } else if (step.provider === 'compensation') {
      code += `\n  .compensate({ refundAddress: '${p.refundAddress || ''}', refundAsset: '${p.refundAsset || 'USDC'}' })`;
    }
  }

  code += `\n  .build();\n\n`;
  code += `export async function main() {\n`;
  code += `  console.log('Registering flow definition...');\n`;
  code += `  await Mesa.register(flow);\n`;
  code += `  const { executionId } = await Mesa.execute(flow);\n`;
  code += `  console.log(\`Execution started with ID: \${executionId}\`);\n`;
  code += `}\n`;

  return code;
}

export function generateJSON(flow: FlowDefinition): string {
  return JSON.stringify(flow, null, 2);
}

export function generateCurl(flow: FlowDefinition, runtimeUrl = 'http://localhost:3001'): string {
  const payload = JSON.stringify({
    id: flow.id,
    name: flow.name,
    definition: flow,
  }, null, 2);

  return `curl -X POST "${runtimeUrl}/flows" \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;
}

// ─── TS Compiler AST Parser ───────────────────────────────────────────────────

function parseAstValue(node: ts.Expression): any {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;

  if (ts.isObjectLiteralExpression(node)) {
    return parseObjectLiteral(node);
  }

  if (ts.isPropertyAccessExpression(node)) {
    return node.getText();
  }

  return node.getText().replace(/^['"]|['"]$/g, '');
}

function parseObjectLiteral(obj: ts.ObjectLiteralExpression): Record<string, any> {
  const result: Record<string, any> = {};
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const key = prop.name.getText().replace(/^['"]|['"]$/g, '');
      result[key] = parseAstValue(prop.initializer);
    }
  }
  return result;
}

export function parseSDKCode(code: string): FlowDefinition {
  const sourceFile = ts.createSourceFile('flow.ts', code, ts.ScriptTarget.Latest, true);

  let flowName = 'imported-flow';
  let flowId: string | undefined = undefined;
  const steps: any[] = [];

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const methodName = expr.name.text;

        if (methodName === 'flow') {
          if (node.arguments.length > 0) {
            flowName = parseAstValue(node.arguments[0]);
          }
          if (node.arguments.length > 1) {
            flowId = parseAstValue(node.arguments[1]);
          }
        } else if (['receive', 'confirm', 'convert', 'anchor', 'transfer', 'payment', 'delay', 'webhook', 'invoke', 'sep10Auth', 'manualApproval', 'condition', 'compensate'].includes(methodName)) {
          const firstArg = node.arguments[0];
          const params = (firstArg && ts.isObjectLiteralExpression(firstArg)) ? parseObjectLiteral(firstArg) : {};

          let provider = 'custom';
          let name = methodName;

          if (methodName === 'receive' || methodName === 'payment' || methodName === 'transfer' || methodName === 'confirm') {
            provider = 'stellar';
            params.action = methodName === 'transfer' ? 'payment' : methodName;
          } else if (methodName === 'convert' || methodName === 'anchor') {
            provider = 'anchor';
            params.action = methodName;
          } else if (methodName === 'delay') {
            provider = 'delay';
          } else if (methodName === 'webhook') {
            provider = 'webhook';
          } else if (methodName === 'invoke') {
            provider = 'soroban';
            params.action = 'invoke';
          } else if (methodName === 'sep10Auth') {
            provider = 'sep10';
            params.action = 'auth';
          } else if (methodName === 'manualApproval') {
            provider = 'approval';
            params.action = 'manual-approval';
          } else if (methodName === 'condition') {
            provider = 'condition';
            params.action = 'evaluate';
          } else if (methodName === 'compensate') {
            provider = 'compensation';
            params.action = 'compensate';
          }

          steps.push({
            name,
            provider,
            params,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const rawFlow = {
    id: flowId,
    name: flowName,
    steps,
  };

  return FlowDefinitionSchema.parse(rawFlow);
}

// ─── 1-Click Runnable App Workspace Exporter ─────────────────────────

export async function generateRunnableAppZip(flow: FlowDefinition): Promise<Blob | Buffer> {
  const zip = new JSZip();
  const slugName = flow.name.toLowerCase().replace(/\s+/g, '-');
  const flowId = flow.id || slugName;

  // Root Package.json
  zip.file("package.json", JSON.stringify({
    name: slugName,
    version: "1.0.0",
    private: true,
    workspaces: ["apps/web", "packages/workflows"],
    scripts: {
      "dev": "concurrently \"npm run start:server\" \"npm run start:web\"",
      "start:server": "ts-node mesa-server.ts",
      "start:web": "vite apps/web",
      "build": "tsc"
    },
    dependencies: {
      "@mesaprotocol/runtime": "^0.3.1",
      "@mesaprotocol/sdk": "^0.3.1",
      "@mesaprotocol/schema": "^0.3.0",
      "concurrently": "^8.2.2",
      "dotenv": "^16.4.5",
      "express": "^4.19.2"
    },
    devDependencies: {
      "@types/express": "^4.17.21",
      "@types/node": "^20.10.0",
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "@vitejs/plugin-react": "^4.2.1",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "ts-node": "^10.9.2",
      "typescript": "^5.3.3",
      "vite": "^5.0.0"
    }
  }, null, 2));

  // .env.example (MESA_API_KEY commented out by default for zero-auth dev runs)
  zip.file(".env.example", `SENDER_SECRET=SBXXXXX...\nMESA_RUNTIME_URL=http://localhost:3001\n# MESA_API_KEY=my_secure_api_key\nWEBHOOK_HMAC_SECRET=my_hmac_secret\nDATABASE_URL=mock\n`);

  // docker-compose.yml
  zip.file("docker-compose.yml", `version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_DB: mesa\n      POSTGRES_USER: mesa\n      POSTGRES_PASSWORD: mesa\n    ports:\n      - "5432:5432"\n`);

  // packages/workflows/mesa.flow.ts
  const tsCode = generateSDKCode(flow);
  zip.file("packages/workflows/mesa.flow.ts", tsCode);
  zip.file("packages/workflows/flow.json", JSON.stringify(flow, null, 2));

  // mesa-server.ts (Includes dotenv/config import and auto-registration of workflow)
  zip.file("mesa-server.ts", `import 'dotenv/config';\nimport { startServer } from '@mesaprotocol/runtime';\nimport { Mesa } from '@mesaprotocol/sdk';\nimport { flow } from './packages/workflows/mesa.flow';\n\nconst port = Number(process.env.PORT || 3001);\n\nasync function main() {\n  await startServer(port);\n  try {\n    await Mesa.register(flow);\n    console.log(\`✅ Registered Mesa flow: \${flow.id}\`);\n  } catch (err) {\n    console.warn('Auto-registration notice:', (err as Error).message);\n  }\n  console.log(\`🚀 Mesa Production Runtime Server running on http://localhost:\${port}\`);\n  console.log(\`📊 Dashboard Console: http://localhost:\${port}/dashboard\`);\n}\n\nmain().catch(err => {\n  console.error('Failed to start Mesa app:', err);\n  process.exit(1);\n});\n`);

  // apps/web/index.html & App.tsx
  zip.file("apps/web/index.html", `<!DOCTYPE html><html><head><title>${flow.name} App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
  zip.file("apps/web/src/main.tsx", `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);\n`);
  zip.file("apps/web/src/App.tsx", generateAppTsxCode(flow));

  // Soroban Contract Rust Template
  zip.file("contracts/vault/Cargo.toml", `[package]\nname = "mesa-vault-contract"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib"]\n\n[dependencies]\nsoroban-sdk = "20.0.0"\n`);
  zip.file("contracts/vault/src/lib.rs", `#![no_std]\nuse soroban_sdk::{contract, contractimpl, Symbol, Env};\n\n#[contract]\npub struct VaultContract;\n\n#[contractimpl]\nimpl VaultContract {\n    pub fn deposit(env: Env, amount: i128) -> Symbol {\n        Symbol::new(&env, "DEPOSITED")\n    }\n}\n`);

  // README.md
  zip.file("README.md", `# ${flow.name} App\n\nGenerated by **Mesa Studio — Stellar Visual Workflow & App Builder**.\n\n## 🚀 1-Click Execution Guide\n\n### 1. Install Dependencies\n\`\`\`bash\nnpm install\n\`\`\`\n\n### 2. Copy Environment Variables\n\`\`\`bash\ncp .env.example .env\n\`\`\`\n\n### 3. Start Database & App Workspace\n\`\`\`bash\ndocker compose up -d\nnpm run dev\n\`\`\`\n\n- **Mesa Runtime API:** [http://localhost:3001](http://localhost:3001)\n- **Mesa Dashboard Console:** [http://localhost:3001/dashboard](http://localhost:3001/dashboard)\n- **React Frontend:** [http://localhost:5173](http://localhost:5173)\n`);

  return zip.generateAsync({ type: "nodebuffer" });
}

export function generateAppTsxCode(flow: FlowDefinition): string {
  const slugName = flow.name.toLowerCase().replace(/\s+/g, '-');
  const flowId = flow.id || slugName;

  if (slugName.includes('payroll')) {
    return `import React, { useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Ready');
  const [execId, setExecId] = useState('');
  const [employees, setEmployees] = useState([
    { id: '1', name: 'Alice Developer', wallet: 'GA7IL52JSHMHWCP6HEPYE6IXIR5IZGDEISUFSJVPKCAU7NE7A6EJOFMN', salary: '500 XLM' },
    { id: '2', name: 'Bob Designer', wallet: 'GBL62ZOZ75OAT73N76S43AIF6Q34I5X5RO75KCHWENB3XAPAYE3KROQZ', salary: '450 XLM' }
  ]);

  const triggerPayroll = async () => {
    setStatus('Dispatching Payroll...');
    try {
      const res = await fetch('http://localhost:3001/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: '${flowId}' })
      });
      const data = await res.json();
      setExecId(data.executionId);
      setStatus('EXECUTING BATCH PAYMENTS');
    } catch (err) {
      setStatus('Failed to connect to Mesa Runtime');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#040608', color: '#e0e2e8', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #272a2e', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#00dbe9', margin: 0 }}>💼 ${flow.name} Portal</h1>
        <p style={{ color: '#849495', margin: '0.5rem 0 0 0' }}>Automated Corporate Payroll & Compliance Disbursement on Stellar</p>
      </header>

      <div style={{ background: '#101417', padding: '1.5rem', borderRadius: '12px', border: '1px solid #272a2e', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#7df4ff', marginTop: 0 }}>1. Treasury Disburser</h2>
        <p>Target Workflow ID: <code>${flowId}</code></p>
        <button onClick={triggerPayroll} style={{ padding: '0.85rem 1.75rem', background: '#00dbe9', color: '#002022', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem' }}>
          🚀 Execute Employee Payroll
        </button>
        {execId && <p style={{ marginTop: '1rem' }}>Active Execution ID: <code style={{ color: '#7df4ff' }}>{execId}</code></p>}
        <p>Execution Status: <strong style={{ color: '#00ff88' }}>{status}</strong></p>
      </div>

      <div style={{ background: '#101417', padding: '1.5rem', borderRadius: '12px', border: '1px solid #272a2e' }}>
        <h2 style={{ color: '#7df4ff', marginTop: 0 }}>2. Employee Payout Roster</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #272a2e', color: '#849495' }}>
              <th style={{ padding: '0.5rem' }}>Employee</th>
              <th style={{ padding: '0.5rem' }}>Stellar Wallet Address</th>
              <th style={{ padding: '0.5rem' }}>Disbursement</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #1c2024' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{emp.name}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#b9cacb' }}>{emp.wallet}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#00ff88', fontWeight: 'bold' }}>{emp.salary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;
  }

  if (slugName.includes('escrow') || slugName.includes('vault') || slugName.includes('soroban')) {
    return `import React, { useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Ready');
  const [execId, setExecId] = useState('');
  const [depositAmount, setDepositAmount] = useState('100');
  const [actionLog, setActionLog] = useState('');

  const triggerEscrow = async () => {
    setStatus('Initializing Escrow...');
    try {
      const res = await fetch('http://localhost:3001/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: '${flowId}' })
      });
      const data = await res.json();
      setExecId(data.executionId);
      setStatus('SUSPENDED (Waiting for manual sign-off / approval)');
    } catch (err) {
      setStatus('Failed to connect to Mesa Runtime');
    }
  };

  const approveEscrow = async () => {
    if (!execId) return alert('Start escrow first!');
    try {
      const suspensionKey = \`approval:\${execId}\`;
      const res = await fetch('http://localhost:3001/webhooks/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionKey, payload: { approved: true, approver: 'operator@mesa.local' } })
      });
      const data = await res.json();
      setActionLog(\`Operator Approved: \${JSON.stringify(data)}\`);
      setStatus('COMPLETED (Soroban Vault Payout Released)');
    } catch (err) {
      setActionLog('Failed to approve escrow');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#040608', color: '#e0e2e8', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #272a2e', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#d1bcff', margin: 0 }}>🛡️ ${flow.name} Escrow & Soroban Vault</h1>
        <p style={{ color: '#849495', margin: '0.5rem 0 0 0' }}>Multi-Party Escrow with Automated Saga Rollbacks and Soroban Smart Contract Execution</p>
      </header>

      <div style={{ background: '#101417', padding: '1.5rem', borderRadius: '12px', border: '1px solid #272a2e', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#d1bcff', marginTop: 0 }}>1. Lock Escrow Funds</h2>
        <p>Workflow ID: <code>${flowId}</code></p>
        <button onClick={triggerEscrow} style={{ padding: '0.85rem 1.75rem', background: '#7000ff', color: '#ffffff', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem' }}>
          🔒 Lock Deposit in Vault
        </button>
        {execId && <p style={{ marginTop: '1rem' }}>Active Vault ID: <code style={{ color: '#d1bcff' }}>{execId}</code></p>}
        <p>Escrow Status: <strong style={{ color: '#ffd1bc' }}>{status}</strong></p>
      </div>

      <div style={{ background: '#101417', padding: '1.5rem', borderRadius: '12px', border: '1px solid #272a2e' }}>
        <h2 style={{ color: '#d1bcff', marginTop: 0 }}>2. Compliance Operator Sign-Off</h2>
        <p>Approve funds release or trigger automatic Saga refund compensation.</p>
        <button onClick={approveEscrow} style={{ padding: '0.85rem 1.75rem', background: '#00ff88', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '1rem' }}>
          ✅ Release Escrow Payout
        </button>
        {actionLog && <p style={{ marginTop: '1rem', color: '#00ff88' }}>{actionLog}</p>}
      </div>
    </div>
  );
}
`;
  }

  // Default Remittance Template
  return `import React, { useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Idle');
  const [execId, setExecId] = useState('');
  const [depositAmount, setDepositAmount] = useState('100');
  const [resumeLog, setResumeLog] = useState('');

  const triggerWorkflow = async () => {
    setStatus('Triggering...');
    try {
      const res = await fetch('http://localhost:3001/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: '${flowId}' })
      });
      const data = await res.json();
      setExecId(data.executionId);
      setStatus('SUSPENDED (Waiting for deposit/webhook)');
    } catch (err) {
      setStatus('Failed to connect to Mesa Runtime');
    }
  };

  const simulateDepositWebhook = async () => {
    if (!execId) {
      alert('Please trigger workflow execution first!');
      return;
    }
    try {
      const suspensionKey = \`stellar:receive:\${execId}\`;
      const res = await fetch('http://localhost:3001/webhooks/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspensionKey,
          payload: { amount: Number(depositAmount), depositTxHash: '7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5' }
        })
      });
      const data = await res.json();
      setResumeLog(\`Webhook Resumed: \${JSON.stringify(data)}\`);
      setStatus('COMPLETED (Payment Payout Sent)');
    } catch (err) {
      setResumeLog('Failed to send webhook');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#040608', color: '#00dbe9', minHeight: '100vh' }}>
      <h1>💸 ${flow.name} App</h1>
      <p>Stellar Cross-Border Remittance Corridor generated by Mesa Protocol</p>
      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a2634' }}>
        <h2>1. Trigger Workflow Execution</h2>
        <p>Flow ID: <code>${flowId}</code></p>
        <button onClick={triggerWorkflow} style={{ padding: '0.75rem 1.5rem', background: '#00dbe9', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Launch ${flow.name}
        </button>
        {execId && <p style={{ marginTop: '1rem' }}>Active Execution ID: <code>{execId}</code></p>}
        <p>Current Status: <strong>{status}</strong></p>
      </div>

      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #1a2634' }}>
        <h2>2. Webhook Deposit Simulator</h2>
        <label>Simulated USD Deposit Amount: </label>
        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #00dbe9', background: '#040608', color: '#fff', marginRight: '1rem' }} />
        <button onClick={simulateDepositWebhook} style={{ padding: '0.75rem 1.5rem', background: '#00ff88', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Simulate Stellar USD Deposit Callback
        </button>
        {resumeLog && <p style={{ marginTop: '1rem', color: '#00ff88' }}>{resumeLog}</p>}
      </div>
    </div>
  );
}
`;
}
