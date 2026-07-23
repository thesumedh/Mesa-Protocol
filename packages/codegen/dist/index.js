"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSDKCode = generateSDKCode;
exports.generateJSON = generateJSON;
exports.generateCurl = generateCurl;
exports.parseSDKCode = parseSDKCode;
exports.generateRunnableAppZip = generateRunnableAppZip;
const ts = __importStar(require("typescript"));
const schema_1 = require("@mesaprotocol/schema");
const jszip_1 = __importDefault(require("jszip"));
// ─── Code Generators ─────────────────────────────────────────────────────────
function generateSDKCode(flow) {
    const slugName = flow.name.toLowerCase().replace(/\s+/g, '-');
    const flowId = flow.id || slugName;
    let code = `import { Mesa } from '@mesaprotocol/sdk';\n\n`;
    code += `Mesa.configure({\n`;
    code += `  runtimeUrl: process.env.MESA_RUNTIME_URL || 'http://localhost:3001',\n`;
    code += `  apiKey: process.env.MESA_API_KEY,\n`;
    code += `});\n\n`;
    code += `export const flow = Mesa.flow('${flow.name}', '${flowId}')`;
    for (const step of flow.steps) {
        const p = step.params;
        if (step.provider === 'sep10') {
            code += `\n  .sep10Auth({ domain: '${p.domain}' })`;
        }
        else if (step.provider === 'stellar' && p.action === 'receive') {
            code += `\n  .receive({ asset: '${p.asset}', minAmount: ${p.minAmount}, toAddress: '${p.toAddress}' })`;
        }
        else if (step.provider === 'stellar' && p.action === 'payment') {
            code += `\n  .payment({ to: '${p.to}', amount: ${p.amount}, senderSecretRef: '${p.senderSecretRef || 'SENDER_SECRET'}' })`;
        }
        else if (step.provider === 'stellar' && p.action === 'path-payment') {
            code += `\n  .pathPayment({ sendAsset: '${p.sendAsset}', destAsset: '${p.destAsset}', sendAmount: ${p.sendAmount}, destMinAmount: ${p.destMinAmount}, destination: '${p.destination}' })`;
        }
        else if (step.provider === 'anchor') {
            if (p.action === 'sep24-deposit') {
                code += `\n  .anchorDeposit({ anchorDomain: '${p.anchorDomain || 'anchor.stellar.org'}', assetCode: '${p.assetCode || 'USDC'}', amount: ${p.amount || 100} })`;
            }
            else {
                code += `\n  .convert({ anchor: '${p.anchor || 'stellar-anchor'}', fromAsset: '${p.fromAsset || 'XLM'}', toAsset: '${p.toAsset || 'USDC'}' })`;
            }
        }
        else if (step.provider === 'delay') {
            code += `\n  .delay({ seconds: ${p.seconds} })`;
        }
        else if (step.provider === 'webhook') {
            code += `\n  .webhook({ url: '${p.url}' })`;
        }
        else if (step.provider === 'soroban') {
            code += `\n  .invoke({ contractId: '${p.contractId}', method: '${p.method}' })`;
        }
        else if (step.provider === 'approval') {
            code += `\n  .manualApproval({ approverRole: '${p.approverRole || 'operator'}' })`;
        }
        else if (step.provider === 'condition') {
            code += `\n  .condition({ expression: '${p.expression}' })`;
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
function generateJSON(flow) {
    return JSON.stringify(flow, null, 2);
}
function generateCurl(flow, runtimeUrl = 'http://localhost:3001') {
    const payload = JSON.stringify({
        id: flow.id,
        name: flow.name,
        definition: flow,
    }, null, 2);
    return `curl -X POST "${runtimeUrl}/flows" \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;
}
// ─── TS Compiler AST Parser ───────────────────────────────────────────────────
function parseAstValue(node) {
    if (ts.isStringLiteral(node))
        return node.text;
    if (ts.isNumericLiteral(node))
        return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword)
        return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword)
        return false;
    if (ts.isObjectLiteralExpression(node)) {
        return parseObjectLiteral(node);
    }
    if (ts.isPropertyAccessExpression(node)) {
        return node.getText();
    }
    return node.getText().replace(/^['"]|['"]$/g, '');
}
function parseObjectLiteral(obj) {
    const result = {};
    for (const prop of obj.properties) {
        if (ts.isPropertyAssignment(prop)) {
            const key = prop.name.getText().replace(/^['"]|['"]$/g, '');
            result[key] = parseAstValue(prop.initializer);
        }
    }
    return result;
}
function parseSDKCode(code) {
    const sourceFile = ts.createSourceFile('flow.ts', code, ts.ScriptTarget.Latest, true);
    let flowName = 'imported-flow';
    let flowId = undefined;
    const steps = [];
    function visit(node) {
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
                }
                else if (['receive', 'confirm', 'convert', 'anchor', 'transfer', 'payment', 'delay', 'webhook', 'invoke'].includes(methodName)) {
                    const firstArg = node.arguments[0];
                    const params = (firstArg && ts.isObjectLiteralExpression(firstArg)) ? parseObjectLiteral(firstArg) : {};
                    let provider = 'custom';
                    let name = methodName;
                    if (methodName === 'receive' || methodName === 'payment' || methodName === 'transfer' || methodName === 'confirm') {
                        provider = 'stellar';
                        params.action = methodName === 'transfer' ? 'payment' : methodName;
                    }
                    else if (methodName === 'convert' || methodName === 'anchor') {
                        provider = 'anchor';
                        params.action = methodName;
                    }
                    else if (methodName === 'delay') {
                        provider = 'delay';
                    }
                    else if (methodName === 'webhook') {
                        provider = 'webhook';
                    }
                    else if (methodName === 'invoke') {
                        provider = 'soroban';
                        params.action = 'invoke';
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
    return schema_1.FlowDefinitionSchema.parse(rawFlow);
}
// ─── 1-Click Runnable App Workspace Exporter ─────────────────────────
async function generateRunnableAppZip(flow) {
    const zip = new jszip_1.default();
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
            "@mesaprotocol/runtime": "^0.2.0",
            "@mesaprotocol/sdk": "^0.2.0",
            "@mesaprotocol/schema": "^0.2.0",
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
    // mesa-server.ts (Includes dotenv/config import)
    zip.file("mesa-server.ts", `import 'dotenv/config';\nimport express from 'express';\nimport { createServer } from '@mesaprotocol/runtime';\nimport { main as registerAndRun } from './packages/workflows/mesa.flow';\n\nconst app = createServer();\nconst port = process.env.PORT || 3001;\n\napp.listen(port, async () => {\n  console.log(\`🚀 Mesa Production Runtime Server running on http://localhost:\${port}\`);\n  try {\n    await registerAndRun();\n  } catch (err) {\n    console.error('Failed to auto-register flow:', err);\n  }\n});\n`);
    // apps/web/index.html & App.tsx
    zip.file("apps/web/index.html", `<!DOCTYPE html><html><head><title>${flow.name} App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
    zip.file("apps/web/src/main.tsx", `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);\n`);
    zip.file("apps/web/src/App.tsx", `import React, { useState } from 'react';\n\nexport default function App() {\n  const [status, setStatus] = useState('Idle');\n  const [execId, setExecId] = useState('');\n  const [depositAmount, setDepositAmount] = useState('100');\n  const [resumeLog, setResumeLog] = useState('');\n\n  const triggerWorkflow = async () => {\n    setStatus('Triggering...');\n    try {\n      const res = await fetch('http://localhost:3001/executions', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ flowId: '${flowId}' })\n      });\n      const data = await res.json();\n      setExecId(data.executionId);\n      setStatus('SUSPENDED (Waiting for deposit/webhook)');\n    } catch (err) {\n      setStatus('Failed to connect to Mesa Runtime');\n    }\n  };\n\n  const simulateDepositWebhook = async () => {\n    if (!execId) {\n      alert('Please trigger workflow execution first!');\n      return;\n    }\n    try {\n      const suspensionKey = \`stellar:receive:\${execId}\`;\n      const res = await fetch('http://localhost:3001/webhooks/resume', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          suspensionKey,\n          payload: { amount: Number(depositAmount), depositTxHash: '7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5' }\n        })\n      });\n      const data = await res.json();\n      setResumeLog(\`Webhook Resumed: \${JSON.stringify(data)}\`);\n      setStatus('COMPLETED (Payment Payout Sent)');\n    } catch (err) {\n      setResumeLog('Failed to send webhook');\n    }\n  };\n\n  return (\n    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#040608', color: '#00dbe9', minHeight: '100vh' }}>\n      <h1>${flow.name} App</h1>\n      <p>Stellar Embedded Finance App Scaffold generated by Mesa Protocol</p>\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a2634' }}>\n        <h2>1. Trigger Workflow Execution</h2>\n        <p>Flow ID: <code>${flowId}</code></p>\n        <button onClick={triggerWorkflow} style={{ padding: '0.75rem 1.5rem', background: '#00dbe9', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Launch ${flow.name}\n        </button>\n        {execId && <p style={{ marginTop: '1rem' }}>Active Execution ID: <code>{execId}</code></p>}\n        <p>Current Status: <strong>{status}</strong></p>\n      </div>\n\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #1a2634' }}>\n        <h2>2. Webhook Deposit Simulator</h2>\n        <label>Simulated USD Deposit Amount: </label>\n        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #00dbe9', background: '#040608', color: '#fff', marginRight: '1rem' }} />\n        <button onClick={simulateDepositWebhook} style={{ padding: '0.75rem 1.5rem', background: '#00ff88', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Simulate Stellar USD Deposit Callback\n        </button>\n        {resumeLog && <p style={{ marginTop: '1rem', color: '#00ff88' }}>{resumeLog}</p>}\n      </div>\n    </div>\n  );\n}`);
    // Soroban Contract Rust Template
    zip.file("contracts/vault/Cargo.toml", `[package]\nname = "mesa-vault-contract"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib"]\n\n[dependencies]\nsoroban-sdk = "20.0.0"\n`);
    zip.file("contracts/vault/src/lib.rs", `#![no_std]\nuse soroban_sdk::{contract, contractimpl, Symbol, Env};\n\n#[contract]\npub struct VaultContract;\n\n#[contractimpl]\nimpl VaultContract {\n    pub fn deposit(env: Env, amount: i128) -> Symbol {\n        Symbol::new(&env, "DEPOSITED")\n    }\n}\n`);
    // README.md
    zip.file("README.md", `# ${flow.name} App\n\nGenerated by **Mesa Studio — Stellar Visual Workflow & App Builder**.\n\n## 🚀 1-Click Execution Guide\n\n### 1. Install Dependencies\n\`\`\`bash\nnpm install\n\`\`\`\n\n### 2. Copy Environment Variables\n\`\`\`bash\ncp .env.example .env\n\`\`\`\n\n### 3. Start Database & App Workspace\n\`\`\`bash\ndocker compose up -d\nnpm run dev\n\`\`\`\n\n- **Mesa Runtime API:** [http://localhost:3001](http://localhost:3001)\n- **Mesa Dashboard Console:** [http://localhost:3001/dashboard](http://localhost:3001/dashboard)\n- **React Frontend:** [http://localhost:5173](http://localhost:5173)\n`);
    return zip.generateAsync({ type: "nodebuffer" });
}
