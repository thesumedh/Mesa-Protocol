#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const schema_1 = require("@mesaprotocol/schema");
const codegen_1 = require("@mesaprotocol/codegen");
const templates_1 = require("@mesaprotocol/templates");
const args = process.argv.slice(2);
const command = args[0];
console.log(`
  ███╗   ███╗███████╗███████╗ █████╗ 
  ████╗ ████║██╔════╝██╔════╝██╔══██╗
  ██╔████╔██║█████╗  ███████╗███████║
  ██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║
  ██║ ╚═╝ ██║███████╗███████║██║  ██║
  ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝

  Mesa Protocol CLI — Stellar Embedded Finance App Builder v0.2.0
`);
switch (command) {
    case 'create':
        handleCreate(args);
        break;
    case 'validate':
        handleValidate(args[1]);
        break;
    case 'dev':
        handleDev();
        break;
    case 'help':
    default:
        showHelp();
        break;
}
function showHelp() {
    console.log(`
Usage:
  npx mesa create <app-name> [--template remittance|payroll|vault|escrow|invoice|subscription]
                                Scaffold a new 1-click runnable Stellar app workspace
  npx mesa validate <file.json> Validate a workflow flow definition against Mesa schema
  npx mesa dev                  Launch local Mesa workflow runtime & development server
  npx mesa help                 Show command options and usage details
  `);
}
async function handleCreate(cmdArgs) {
    const appName = cmdArgs[1] && !cmdArgs[1].startsWith('--') ? cmdArgs[1] : 'remittance-corridor-app';
    let templateKey = 'remittance';
    const templateIdx = cmdArgs.indexOf('--template');
    if (templateIdx !== -1 && cmdArgs[templateIdx + 1]) {
        templateKey = cmdArgs[templateIdx + 1].toLowerCase();
    }
    console.log(`🚀 Creating new Mesa Stellar Financial App: ${appName} (Template: ${templateKey})...`);
    // Single Source of Truth — Import template from @mesaprotocol/templates
    const templateInfo = (0, templates_1.getTemplate)(templateKey);
    const sampleFlow = schema_1.FlowDefinitionSchema.parse({
        ...templateInfo.definition,
        id: appName,
        name: appName.replace(/-/g, ' ').toUpperCase(),
    });
    const outputDir = path.join(process.cwd(), appName);
    if (fs.existsSync(outputDir)) {
        console.error(`❌ Error: Directory "${appName}" already exists.`);
        process.exit(1);
    }
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'packages', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'apps', 'web', 'src'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'contracts', 'vault', 'src'), { recursive: true });
    // Write package.json
    fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify({
        name: appName,
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
    // Write .env.example
    fs.writeFileSync(path.join(outputDir, '.env.example'), `SENDER_SECRET=SBXXXXX...\nMESA_RUNTIME_URL=http://localhost:3001\n# MESA_API_KEY=my_secure_api_key\nWEBHOOK_HMAC_SECRET=my_hmac_secret\nDATABASE_URL=mock\n`);
    // Write docker-compose.yml
    fs.writeFileSync(path.join(outputDir, 'docker-compose.yml'), `version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_DB: mesa\n      POSTGRES_USER: mesa\n      POSTGRES_PASSWORD: mesa\n    ports:\n      - "5432:5432"\n`);
    // Write Workflow Files
    fs.writeFileSync(path.join(outputDir, 'packages', 'workflows', 'mesa.flow.ts'), (0, codegen_1.generateSDKCode)(sampleFlow));
    fs.writeFileSync(path.join(outputDir, 'packages', 'workflows', 'flow.json'), JSON.stringify(sampleFlow, null, 2));
    // Write Server Startup File with dotenv/config import
    fs.writeFileSync(path.join(outputDir, 'mesa-server.ts'), `import 'dotenv/config';\nimport express from 'express';\nimport { createServer } from '@mesaprotocol/runtime';\nimport { main as registerAndRun } from './packages/workflows/mesa.flow';\n\nconst app = createServer();\nconst port = process.env.PORT || 3001;\n\napp.listen(port, async () => {\n  console.log(\`🚀 Mesa Production Runtime Server running on http://localhost:\${port}\`);\n  try {\n    await registerAndRun();\n  } catch (err) {\n    console.error('Failed to auto-register flow:', err);\n  }\n});\n`);
    // Write Web App Files
    fs.writeFileSync(path.join(outputDir, 'apps', 'web', 'index.html'), `<!DOCTYPE html><html><head><title>${appName}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
    fs.writeFileSync(path.join(outputDir, 'apps', 'web', 'src', 'main.tsx'), `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);\n`);
    fs.writeFileSync(path.join(outputDir, 'apps', 'web', 'src', 'App.tsx'), `import React, { useState } from 'react';\n\nexport default function App() {\n  const [status, setStatus] = useState('Idle');\n  const [execId, setExecId] = useState('');\n  const [depositAmount, setDepositAmount] = useState('100');\n  const [resumeLog, setResumeLog] = useState('');\n\n  const triggerWorkflow = async () => {\n    setStatus('Triggering...');\n    try {\n      const res = await fetch('http://localhost:3001/executions', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ flowId: '${appName}' })\n      });\n      const data = await res.json();\n      setExecId(data.executionId);\n      setStatus('SUSPENDED (Waiting for deposit/webhook)');\n    } catch (err) {\n      setStatus('Failed to connect to Mesa Runtime');\n    }\n  };\n\n  const simulateDepositWebhook = async () => {\n    if (!execId) {\n      alert('Please trigger workflow execution first!');\n      return;\n    }\n    try {\n      const suspensionKey = \`anchor:sep24:\${execId}\`;\n      const res = await fetch('http://localhost:3001/webhooks/resume', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          suspensionKey,\n          payload: { amount: Number(depositAmount), depositTxHash: '7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5' }\n        })\n      });\n      const data = await res.json();\n      setResumeLog(\`Webhook Resumed: \${JSON.stringify(data)}\`);\n      setStatus('COMPLETED (Payment Payout Sent)');\n    } catch (err) {\n      setResumeLog('Failed to send webhook');\n    }\n  };\n\n  const approveOperatorExecution = async () => {\n    if (!execId) {\n      alert('Please trigger workflow execution first!');\n      return;\n    }\n    try {\n      const res = await fetch(\`http://localhost:3001/executions/\${execId}/approve\`,\n        {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ approved: true, approver: 'operator@mesa.local' })\n        }\n      );\n      const data = await res.json();\n      setResumeLog(\`Manual Approval Approved: \${JSON.stringify(data)}\`);\n      setStatus('RUNNING (Approved by Operator)');\n    } catch (err) {\n      setResumeLog('Failed to approve execution');\n    }\n  };\n\n  return (\n    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#040608', color: '#00dbe9', minHeight: '100vh' }}>\n      <h1>${appName} (${templateKey.toUpperCase()} Template)</h1>\n      <p>Stellar Embedded Finance App Scaffold generated by Mesa Protocol CLI</p>\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a2634' }}>\n        <h2>1. Trigger Workflow Execution</h2>\n        <p>Flow ID: <code>${appName}</code></p>\n        <button onClick={triggerWorkflow} style={{ padding: '0.75rem 1.5rem', background: '#00dbe9', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Launch ${appName}\n        </button>\n        {execId && <p style={{ marginTop: '1rem' }}>Active Execution ID: <code>{execId}</code></p>}\n        <p>Current Status: <strong>{status}</strong></p>\n      </div>\n\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a2634' }}>\n        <h2>2. Webhook Deposit Simulator</h2>\n        <label>Simulated USD Deposit Amount: </label>\n        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #00dbe9', background: '#040608', color: '#fff', marginRight: '1rem' }} />\n        <button onClick={simulateDepositWebhook} style={{ padding: '0.75rem 1.5rem', background: '#00ff88', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Simulate Stellar USD Deposit Callback\n        </button>\n      </div>\n\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #1a2634' }}>\n        <h2>3. Operator Manual Approval Panel</h2>\n        <button onClick={approveOperatorExecution} style={{ padding: '0.75rem 1.5rem', background: '#ffaa00', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Approve Suspended Execution\n        </button>\n        {resumeLog && <p style={{ marginTop: '1rem', color: '#00ff88' }}>{resumeLog}</p>}\n      </div>\n    </div>\n  );\n}`);
    // Write README.md
    fs.writeFileSync(path.join(outputDir, 'README.md'), `# ${appName}\n\nGenerated by **Mesa Protocol CLI — Stellar Visual Workflow & App Builder** (Template: ${templateKey}).\n\n## 🚀 1-Click Execution Guide\n\n\`\`\`bash\ncd ${appName}\nnpm install\ncp .env.example .env\nnpm run dev\n\`\`\`\n`);
    console.log(`\n🎉 App scaffold successfully created in: ./${appName}`);
    console.log(`\nNext steps:\n  cd ${appName}\n  npm install\n  npm run dev\n`);
}
function handleValidate(filePath) {
    if (!filePath) {
        console.error('❌ Error: Please specify a JSON flow file path. Example: npx mesa validate flow.json');
        process.exit(1);
    }
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Error: File not found: ${absolutePath}`);
        process.exit(1);
    }
    try {
        const rawContent = fs.readFileSync(absolutePath, 'utf8');
        const json = JSON.parse(rawContent);
        const validated = schema_1.FlowDefinitionSchema.parse(json);
        console.log(`✔ Flow definition is 100% valid!`);
        console.log(`  Name: ${validated.name}`);
        console.log(`  Steps: ${validated.steps.length}`);
    }
    catch (err) {
        console.error(`❌ Validation Failed:`, err.message);
        process.exit(1);
    }
}
function handleDev() {
    console.log('🚀 Launching local Mesa Workflow Runtime...');
    try {
        (0, child_process_1.execSync)('npx ts-node node_modules/@mesaprotocol/runtime/src/index.ts', { stdio: 'inherit' });
    }
    catch (err) {
        console.error('Runtime process exited.');
    }
}
