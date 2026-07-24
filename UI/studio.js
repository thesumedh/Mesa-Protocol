// State
let flowName = "Stellar Payment Flow";
let previewFormat = "ts";
let nextId = 4;
let selectedNodeId = 1;
let isDragging = false;
let dragNodeId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let zoomLevel = 1.0;
let stellarNetwork = "testnet";
let userWalletPublicKey = null;

let nodes = [
    { id: 1, type: 'receive', name: 'Receive Payment', x: 60, y: 60, params: { asset: 'XLM', minAmount: 25, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' } },
    { id: 2, type: 'delay', name: 'Compliance Delay', x: 360, y: 60, params: { seconds: 5 } },
    { id: 3, type: 'payment', name: 'Stellar Payout', x: 660, y: 60, params: { horizonUrl: 'https://horizon-testnet.stellar.org', senderSecretRef: 'SENDER_SECRET', to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', amount: 25 } }
];

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadSavedFlow();
    render();
    setupDragListeners();
    setupZoomWheelListeners();
    setupCanvasPanning();
    setupKeyboardShortcuts();
    initFreighterAutoConnect();
});

// Main Render Dispatcher
function render() {
    renderNodes();
    renderConnections();
    renderProperties();
    renderCode();
    applyZoomTransform();
    updateCanvasValidation();
    autoSaveFlow();
}

// Render Nodes on Canvas
function renderNodes() {
    const container = document.getElementById('canvas-nodes');
    if (!container) return;
    container.innerHTML = '';

    nodes.forEach((node, idx) => {
        const isSelected = node.id === selectedNodeId;
        const card = document.createElement('div');
        card.className = `node-card absolute w-64 bg-surface/90 border ${isSelected ? 'node-active border-primary' : 'border-outline-variant/40'} rounded-xl p-4 cursor-move shadow-2xl transition-all`;
        card.style.left = `${node.x}px`;
        card.style.top = `${node.y}px`;
        card.onmousedown = (e) => startDrag(e, node.id);

        card.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-lg">${getIcon(node.type)}</span>
                    <span class="text-xs font-headline-md font-bold text-on-surface">${node.name}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="moveNode(event, ${node.id}, -1)" class="text-outline hover:text-on-surface text-xs p-0.5" title="Move Left">◀</button>
                    <span class="text-[9px] font-label-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">#${idx + 1}</span>
                    <button onclick="moveNode(event, ${node.id}, 1)" class="text-outline hover:text-on-surface text-xs p-0.5" title="Move Right">▶</button>
                </div>
            </div>
            <div class="flex items-center justify-between my-2">
                <span class="text-[9px] font-label-mono uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-bold">
                    ${getProviderTag(node.type)}
                </span>
                <span class="status-led" title="Node Active"></span>
            </div>
            <div class="text-[11px] font-label-mono text-on-surface-variant bg-background p-2.5 rounded-lg border border-outline-variant/30">
                ${getSummary(node)}
            </div>
            ${idx < nodes.length - 1 ? `<div id="port-out-${node.id}" class="node-port node-port-out" style="right: -5px; top: 50%; transform: translateY(-50%);"></div>` : ''}
            ${idx > 0 ? `<div id="port-in-${node.id}" class="node-port node-port-in" style="left: -5px; top: 50%; transform: translateY(-50%);"></div>` : ''}
        `;

        container.appendChild(card);
    });
}

// Draw SVG Connections
function renderConnections() {
    const svg = document.getElementById('svg-connections');
    if (!svg) return;
    svg.innerHTML = '';

    for (let i = 0; i < nodes.length - 1; i++) {
        const n1 = nodes[i];
        const n2 = nodes[i + 1];

        // Exact center of right output port (n1) to left input port (n2)
        const x1 = n1.x + 256;
        const y1 = n1.y + 58;
        const x2 = n2.x;
        const y2 = n2.y + 58;

        const dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
        const pathStr = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathStr);
        path.setAttribute('class', 'connection-path');

        svg.appendChild(path);
    }
}

// Render Node Properties Panel
function renderProperties() {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;
    const node = nodes.find(n => n.id === selectedNodeId);

    if (!node) {
        panel.innerHTML = '<div class="text-xs text-outline">Select a node on the canvas to configure properties.</div>';
        return;
    }

    let fieldsHtml = `
        <div>
            <label class="block text-[11px] font-label-mono text-outline mb-1">Step Name</label>
            <input type="text" value="${node.name}" oninput="updateNodeName(this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
        </div>
    `;

    if (node.type === 'receive') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Asset Code</label>
                <input type="text" value="${node.params.asset || 'XLM'}" oninput="updateNodeParam('asset', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Min Amount</label>
                <input type="number" value="${node.params.minAmount || 10}" oninput="updateNodeParam('minAmount', Number(this.value))" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Receiver Address</label>
                <input type="text" value="${node.params.toAddress || ''}" oninput="updateNodeParam('toAddress', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'delay') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Delay Duration (Seconds)</label>
                <input type="number" value="${node.params.seconds || 5}" oninput="updateNodeParam('seconds', Number(this.value))" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'payment') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Destination Address</label>
                <input type="text" value="${node.params.to || ''}" oninput="updateNodeParam('to', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Amount</label>
                <input type="number" value="${node.params.amount || 10}" oninput="updateNodeParam('amount', Number(this.value))" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Sender Secret Env Ref</label>
                <input type="text" value="${node.params.senderSecretRef || 'SENDER_SECRET'}" oninput="updateNodeParam('senderSecretRef', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-primary font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'sep10') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Anchor Auth Domain</label>
                <input type="text" value="${node.params.domain || 'anchor.stellar.org'}" oninput="updateNodeParam('domain', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'anchor') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Anchor Home Domain</label>
                <input type="text" value="${node.params.anchorDomain || 'anchor.stellar.org'}" oninput="updateNodeParam('anchorDomain', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Asset Code</label>
                <input type="text" value="${node.params.assetCode || 'USDC'}" oninput="updateNodeParam('assetCode', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Amount</label>
                <input type="number" value="${node.params.amount || 100}" oninput="updateNodeParam('amount', Number(this.value))" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'path-payment') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Send Asset</label>
                <input type="text" value="${node.params.sendAsset || 'USDC'}" oninput="updateNodeParam('sendAsset', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Destination Asset</label>
                <input type="text" value="${node.params.destAsset || 'XLM'}" oninput="updateNodeParam('destAsset', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Destination Address</label>
                <input type="text" value="${node.params.destination || ''}" oninput="updateNodeParam('destination', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'soroban') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Soroban Contract ID</label>
                <input type="text" value="${node.params.contractId || ''}" oninput="updateNodeParam('contractId', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Contract Method</label>
                <input type="text" value="${node.params.method || 'deposit'}" oninput="updateNodeParam('method', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'approval') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Approver Role</label>
                <input type="text" value="${node.params.approverRole || 'operator'}" oninput="updateNodeParam('approverRole', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'condition') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Condition Expression</label>
                <input type="text" value="${node.params.expression || 'depositedAmount >= 100'}" oninput="updateNodeParam('expression', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    } else if (node.type === 'webhook') {
        fieldsHtml += `
            <div>
                <label class="block text-[11px] font-label-mono text-outline mb-1">Webhook Target URL</label>
                <input type="text" value="${node.params.url || ''}" oninput="updateNodeParam('url', this.value)" class="w-full bg-background border border-outline-variant/40 rounded px-3 py-1.5 text-xs text-on-surface font-label-mono outline-none focus:border-primary"/>
            </div>
        `;
    }

    panel.innerHTML = fieldsHtml;
}

// Render Generated Code Snippet
function renderCode() {
    const preview = document.getElementById('sdk-code-preview');
    if (!preview) return;
    const flowObject = {
        id: `flow-${Date.now()}`,
        name: flowName,
        version: '1.0.0',
        steps: nodes.map(n => ({
            name: n.name,
            provider: n.type === 'receive' || n.type === 'payment' ? 'stellar' : n.type,
            params: { action: n.type, ...n.params }
        }))
    };

    if (previewFormat === 'json') {
        preview.innerText = JSON.stringify(flowObject, null, 2);
        return;
    }

    if (previewFormat === 'curl') {
        preview.innerText = `curl -X POST "http://localhost:3001/flows" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ name: flowName, definition: flowObject }, null, 2)}'`;
        return;
    }

    let code = `import { Mesa } from '@mesaprotocol/sdk';\n\nMesa.configure({ runtimeUrl: 'http://localhost:3001' });\n\nconst flow = Mesa.flow('${flowName}')`;
    
    nodes.forEach(node => {
        if (node.type === 'receive') {
            code += `\n  .receive({ asset: '${node.params.asset || 'XLM'}', minAmount: ${node.params.minAmount || 25}, toAddress: '${node.params.toAddress || 'GD3Z...KAOV'}' })`;
        } else if (node.type === 'delay') {
            code += `\n  .delay({ seconds: ${node.params.seconds || 5} })`;
        } else if (node.type === 'payment') {
            code += `\n  .payment({ horizonUrl: 'https://horizon-testnet.stellar.org', senderSecretRef: '${node.params.senderSecretRef || 'SENDER_SECRET'}', to: '${node.params.to || 'GA4U...IW3P'}', amount: ${node.params.amount || 25} })`;
        } else if (node.type === 'webhook') {
            code += `\n  .webhook({ url: '${node.params.url || 'https://api.example.com/hooks'}' })`;
        }
    });
    
    code += `\n  .build();\n\nawait Mesa.execute(flow);`;
    preview.innerText = code;
}

// Load Stellar-Native Preset Templates
window.loadTemplate = function(templateType) {
    if (templateType === 'remittance') {
        flowName = "Cross-Border Remittance Corridor";
        nodes = [
            { id: 1, type: 'receive', name: 'Receive USD Deposit', x: 60, y: 60, params: { asset: 'USDC', minAmount: 100, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' } },
            { id: 2, type: 'delay', name: 'KYC Sanctions Hold', x: 360, y: 60, params: { seconds: 5 } },
            { id: 3, type: 'payment', name: 'Stellar XLM Path Payout', x: 660, y: 60, params: { horizonUrl: 'https://horizon-testnet.stellar.org', senderSecretRef: 'SENDER_SECRET', to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', amount: 100 } }
        ];
    } else if (templateType === 'ngo') {
        flowName = "NGO Aid Distribution Corridor";
        nodes = [
            { id: 1, type: 'receive', name: 'Receive Grant Funds', x: 60, y: 60, params: { asset: 'USDC', minAmount: 5000, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' } },
            { id: 2, type: 'payment', name: 'Batch Disburse Beneficiary 1', x: 360, y: 60, params: { amount: 2500, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'TREASURY_SECRET' } },
            { id: 3, type: 'webhook', name: 'Send Audit Report Webhook', x: 660, y: 60, params: { url: 'https://api.ngo-aid.org/webhooks/disbursement-confirm' } }
        ];
    } else if (templateType === 'escrow') {
        flowName = "Savings Circle Escrow Hold";
        nodes = [
            { id: 1, type: 'receive', name: 'SEP-24 Member Deposit', x: 60, y: 60, params: { asset: 'XLM', minAmount: 200, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' } },
            { id: 2, type: 'delay', name: '7-Day Savings Hold', x: 360, y: 60, params: { seconds: 15 } },
            { id: 3, type: 'payment', name: 'Release Pool Winner', x: 660, y: 60, params: { amount: 200, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'ESCROW_SECRET' } }
        ];
    } else if (templateType === 'payroll') {
        flowName = "Automated Stellar Payroll";
        nodes = [
            { id: 1, type: 'receive', name: 'Receive Corporate Treasury', x: 60, y: 60, params: { asset: 'USDC', minAmount: 10000, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' } },
            { id: 2, type: 'payment', name: 'Disburse Payroll Salary', x: 360, y: 60, params: { amount: 5000, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'PAYROLL_SECRET' } },
            { id: 3, type: 'webhook', name: 'Notify HR System Webhook', x: 660, y: 60, params: { url: 'https://hr.company.com/payroll/confirm' } }
        ];
    } else if (templateType === 'soroban') {
        flowName = "Soroban Liquidity Yield Vault";
        nodes = [
            { id: 1, type: 'receive', name: 'Receive Collateral Deposit', x: 60, y: 60, params: { asset: 'XLM', minAmount: 500, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' } },
            { id: 2, type: 'payment', name: 'Invoke Soroban Vault Deposit', x: 360, y: 60, params: { amount: 500, to: 'CCW67TSB5V7LLT4KQQ34VEXF4DYBKHUUXSL22B4XXFBT2W2675N56555', senderSecretRef: 'USER_SECRET' } },
            { id: 3, type: 'delay', name: 'Yield Staking Window', x: 660, y: 60, params: { seconds: 10 } }
        ];
    }

    const input = document.getElementById('flow-name-input');
    if (input) input.value = flowName;
    selectedNodeId = nodes[0].id;
    render();
    showToast(`Loaded Template: ${flowName}`);
}

// Export Full Production Runnable App Workspace ZIP
window.downloadStarterZip = async function() {
    showToast("Generating Runnable App Workspace...");
    if (window.JSZip) {
        const zip = new JSZip();

        const flowObject = {
            id: `flow-${Date.now()}`,
            name: flowName,
            version: '1.0.0',
            steps: nodes.map(n => ({ 
                name: n.name, 
                provider: n.type === 'receive' || n.type === 'payment' ? 'stellar' : n.type, 
                params: { action: n.type, ...n.params } 
            }))
        };

        // Root Package.json
        zip.file("package.json", JSON.stringify({
            name: flowName.toLowerCase().replace(/\s+/g, '-'),
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

        const slugName = flowName.toLowerCase().replace(/\s+/g, '-');
        const flowId = slugName;

        // .env.example
        zip.file(".env.example", `SENDER_SECRET=SBXXXXX...\nMESA_RUNTIME_URL=http://localhost:3001\n# MESA_API_KEY=my_secure_api_key\nWEBHOOK_HMAC_SECRET=my_hmac_secret\nDATABASE_URL=mock\n`);

        // docker-compose.yml
        zip.file("docker-compose.yml", `version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_DB: mesa\n      POSTGRES_USER: mesa\n      POSTGRES_PASSWORD: mesa\n    ports:\n      - "5432:5432"\n`);

        // packages/workflows/mesa.flow.ts
        const codeElem = document.getElementById("codePreview");
        let tsCode = codeElem ? codeElem.innerText : `import { Mesa } from '@mesaprotocol/sdk';\nexport const flow = Mesa.flow('${flowName}', '${flowId}').build();`;
        if (!tsCode.includes(`'${flowId}'`)) {
            tsCode = tsCode.replace(`Mesa.flow('${flowName}')`, `Mesa.flow('${flowName}', '${flowId}')`);
        }

        zip.file("packages/workflows/mesa.flow.ts", tsCode);
        zip.file("packages/workflows/flow.json", JSON.stringify(flowObject, null, 2));

        // mesa-server.ts
        zip.file("mesa-server.ts", `import 'dotenv/config';\nimport express from 'express';\nimport { createServer } from '@mesaprotocol/runtime';\nimport { main as registerAndRun } from './packages/workflows/mesa.flow';\n\nconst app = createServer();\nconst port = process.env.PORT || 3001;\n\napp.listen(port, async () => {\n  console.log(\`🚀 Mesa Production Runtime Server running on http://localhost:\${port}\`);\n  try {\n    await registerAndRun();\n  } catch (err) {\n    console.error('Failed to auto-register flow:', err);\n  }\n});\n`);

        // apps/web/index.html & App.tsx
        zip.file("apps/web/index.html", `<!DOCTYPE html><html><head><title>${flowName} App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
        zip.file("apps/web/src/App.tsx", `import React, { useState } from 'react';\n\nexport default function App() {\n  const [status, setStatus] = useState('Idle');\n  const [execId, setExecId] = useState('');\n  const [depositAmount, setDepositAmount] = useState('100');\n  const [resumeLog, setResumeLog] = useState('');\n\n  const triggerWorkflow = async () => {\n    setStatus('Triggering...');\n    try {\n      const res = await fetch('http://localhost:3001/executions', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ flowId: '${flowId}' })\n      });\n      const data = await res.json();\n      setExecId(data.executionId);\n      setStatus('SUSPENDED (Waiting for deposit/webhook)');\n    } catch (err) {\n      setStatus('Failed to connect to Mesa Runtime');\n    }\n  };\n\n  const simulateDepositWebhook = async () => {\n    if (!execId) {\n      alert('Please trigger workflow execution first!');\n      return;\n    }\n    try {\n      const suspensionKey = \`stellar:receive:\${execId}\`;\n      const res = await fetch('http://localhost:3001/webhooks/resume', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          suspensionKey,\n          payload: { amount: Number(depositAmount), depositTxHash: '7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5' }\n        })\n      });\n      const data = await res.json();\n      setResumeLog(\`Webhook Resumed: \${JSON.stringify(data)}\`);\n      setStatus('COMPLETED (Payment Payout Sent)');\n    } catch (err) {\n      setResumeLog('Failed to send webhook');\n    }\n  };\n\n  return (\n    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#040608', color: '#00dbe9', minHeight: '100vh' }}>\n      <h1>${flowName} App</h1>\n      <p>Stellar Embedded Finance App Scaffold generated by Mesa Studio</p>\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a2634' }}>\n        <h2>1. Trigger Workflow Execution</h2>\n        <p>Flow ID: <code>${flowId}</code></p>\n        <button onClick={triggerWorkflow} style={{ padding: '0.75rem 1.5rem', background: '#00dbe9', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Launch ${flowName}\n        </button>\n        {execId && <p style={{ marginTop: '1rem' }}>Active Execution ID: <code>{execId}</code></p>}\n        <p>Current Status: <strong>{status}</strong></p>\n      </div>\n\n      <div style={{ background: '#0d131a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #1a2634' }}>\n        <h2>2. Webhook Deposit Simulator</h2>\n        <label>Simulated USD Deposit Amount: </label>\n        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #00dbe9', background: '#040608', color: '#fff', marginRight: '1rem' }} />\n        <button onClick={simulateDepositWebhook} style={{ padding: '0.75rem 1.5rem', background: '#00ff88', color: '#040608', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>\n          Simulate Stellar USD Deposit Callback\n        </button>\n        {resumeLog && <p style={{ marginTop: '1rem', color: '#00ff88' }}>{resumeLog}</p>}\n      </div>\n    </div>\n  );\n}`);

        // Soroban Contract Rust Template
        zip.file("contracts/vault/Cargo.toml", `[package]\nname = "mesa-vault-contract"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib"]\n\n[dependencies]\nsoroban-sdk = "20.0.0"\n`);
        zip.file("contracts/vault/src/lib.rs", `#![no_std]\nuse soroban_sdk::{contract, contractimpl, Symbol, Env};\n\n#[contract]\npub struct VaultContract;\n\n#[contractimpl]\nimpl VaultContract {\n    pub fn deposit(env: Env, amount: i128) -> Symbol {\n        Symbol::new(&env, "DEPOSITED")\n    }\n}\n`);

        // README.md
        zip.file("README.md", "# " + flowName + " App\n\nGenerated by Mesa Studio — Stellar Visual Workflow & App Builder.\n\n## 🚀 1-Click Execution Guide\n\n### 1. Install Dependencies\n```bash\nnpm install\n```\n\n### 2. Copy Environment Variables\n```bash\ncp .env.example .env\n```\n\n### 3. Start Database & App Workspace\n```bash\ndocker compose up -d\nnpm run dev\n```\n\n- Mesa Runtime API: http://localhost:3001\n- Mesa Dashboard Console: http://localhost:3001/dashboard\n");

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${flowName.toLowerCase().replace(/\s+/g, '-')}-app.zip`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Full Runnable App Workspace Exported!");
    }
}

// Helpers
function getIcon(type) {
    if (type === 'receive') return 'payments';
    if (type === 'delay') return 'schedule';
    if (type === 'payment') return 'send';
    if (type === 'sep10') return 'key';
    if (type === 'anchor') return 'account_balance';
    if (type === 'path-payment') return 'swap_horiz';
    if (type === 'soroban') return 'code';
    if (type === 'approval') return 'gavel';
    if (type === 'condition') return 'alt_route';
    if (type === 'webhook') return 'link';
    return 'extension';
}

function getProviderTag(type) {
    if (type === 'receive') return 'Stellar Receive';
    if (type === 'delay') return 'Compliance Delay';
    if (type === 'payment') return 'Horizon Payout';
    if (type === 'sep10') return 'SEP-10 Auth';
    if (type === 'anchor') return 'SEP-24 Anchor';
    if (type === 'path-payment') return 'DEX Path Swap';
    if (type === 'soroban') return 'Soroban Contract';
    if (type === 'approval') return 'Operator Sign-off';
    if (type === 'condition') return 'Router Condition';
    if (type === 'compensation') return 'Saga Refund';
    return 'Custom Provider';
}

function getSummary(node) {
    if (node.type === 'receive') return `${node.params.minAmount || 0} ${node.params.asset || 'XLM'}`;
    if (node.type === 'delay') return `${node.params.seconds || 0} Sec Hold`;
    if (node.type === 'payment') return `${node.params.amount || 0} XLM`;
    if (node.type === 'sep10') return node.params.domain || 'anchor.stellar.org';
    if (node.type === 'anchor') return `${node.params.amount || 100} ${node.params.assetCode || 'USDC'}`;
    if (node.type === 'path-payment') return `${node.params.sendAsset || 'USDC'} ➔ ${node.params.destAsset || 'XLM'}`;
    if (node.type === 'soroban') return node.params.contractId ? `${node.params.contractId.substring(0, 8)}...` : 'Yield Vault';
    if (node.type === 'webhook') return node.params.url || 'No URL';
    return 'Configured Step';
}

function startDrag(e, nodeId) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    isDragging = true;
    dragNodeId = nodeId;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragOffsetX = e.clientX - node.x;
    dragOffsetY = e.clientY - node.y;
    selectedNodeId = nodeId;
    render();
}

let rafId = null;

function setupDragListeners() {
    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragNodeId) return;
        const node = nodes.find(n => n.id === dragNodeId);
        if (node) {
            node.x = Math.max(20, e.clientX - dragOffsetX);
            node.y = Math.max(20, e.clientY - dragOffsetY);

            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    renderNodes();
                    renderConnections();
                    rafId = null;
                });
            }
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        dragNodeId = null;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    });
}

window.moveNode = function(e, id, dir) {
    e.stopPropagation();
    const idx = nodes.findIndex(n => n.id === id);
    if (idx + dir < 0 || idx + dir >= nodes.length) return;
    
    const temp = nodes[idx];
    nodes[idx] = nodes[idx + dir];
    nodes[idx + dir] = temp;
    
    const tempX = nodes[idx].x;
    nodes[idx].x = nodes[idx + dir].x;
    nodes[idx + dir].x = tempX;

    render();
}

window.addNode = function(type) {
    const lastNode = nodes[nodes.length - 1];
    const newX = lastNode ? lastNode.x + 300 : 60;
    const newY = lastNode ? lastNode.y : 60;

    const nameMap = { receive: 'Incoming Payment', delay: 'Wait Window', payment: 'Stellar Payment', webhook: 'Webhook Trigger' };
    const defaultParams = {
        receive: { asset: 'XLM', minAmount: 10, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' },
        delay: { seconds: 10 },
        payment: { amount: 10, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'SENDER_SECRET' },
        webhook: { url: 'https://api.example.com/hooks' }
    };

    const newNode = { id: nextId++, type, name: nameMap[type] || 'New Node', x: newX, y: newY, params: { ...defaultParams[type] } };
    nodes.push(newNode);
    selectedNodeId = newNode.id;
    render();

    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) wrapper.scrollTo({ left: newX - 100, behavior: 'smooth' });
}

window.updateFlowName = function(val) { flowName = val; renderCode(); }
window.selectNode = function(id) { selectedNodeId = id; render(); }
window.updateNodeName = function(val) { const node = nodes.find(n => n.id === selectedNodeId); if (node) { node.name = val; renderNodes(); renderCode(); } }
window.updateNodeParam = function(key, val) { const node = nodes.find(n => n.id === selectedNodeId); if (node) { node.params[key] = val; renderNodes(); renderCode(); } }
window.deleteSelectedNode = function() {
    if (nodes.length <= 1) return alert("Cannot delete the last node.");
    nodes = nodes.filter(n => n.id !== selectedNodeId);
    selectedNodeId = nodes[0].id;
    render();
}

window.setPreviewFormat = function(fmt) {
    previewFormat = fmt;
    ['ts', 'json', 'curl'].forEach(f => {
        const btn = document.getElementById(`tab-${f}`);
        if (btn) btn.className = f === fmt ? "text-xs font-label-mono text-primary font-bold border-b-2 border-primary pb-0.5" : "text-xs font-label-mono text-outline hover:text-on-surface pb-0.5";
    });
    renderCode();
}

window.copyGeneratedCode = function() {
    const el = document.getElementById('sdk-code-preview');
    if (el) {
        navigator.clipboard.writeText(el.innerText);
        showToast("Copied to Clipboard!");
    }
}

window.openImportModal = function() { const m = document.getElementById('import-modal'); if (m) m.classList.remove('hidden'); }
window.closeImportModal = function() { const m = document.getElementById('import-modal'); if (m) m.classList.add('hidden'); }
window.executeCodeImport = function() {
    const input = document.getElementById('import-code-input');
    if (!input || !input.value.trim()) return alert("Please paste valid TypeScript SDK code.");
    const code = input.value;
    
    const newNodes = [];
    let currentX = 60;
    let id = 1;

    if (code.includes('.receive(')) {
        newNodes.push({ id: id++, type: 'receive', name: 'Receive Payment', x: currentX, y: 60, params: { asset: 'XLM', minAmount: 25 } });
        currentX += 300;
    }
    if (code.includes('.delay(')) {
        newNodes.push({ id: id++, type: 'delay', name: 'Compliance Delay', x: currentX, y: 60, params: { seconds: 10 } });
        currentX += 300;
    }
    if (code.includes('.payment(')) {
        newNodes.push({ id: id++, type: 'payment', name: 'Stellar Payout', x: currentX, y: 60, params: { amount: 25, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'SENDER_SECRET' } });
    }

    if (newNodes.length > 0) {
        nodes = newNodes; selectedNodeId = nodes[0].id; nextId = id; render(); closeImportModal(); showToast("Code Imported & Canvas Rendered!");
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const txt = document.getElementById('toast-text');
    if (!toast || !txt) return;
    txt.innerText = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 2500);
}

// ─── Canvas Zoom & Append Step Controls ─────────────────────────────────────

function applyZoomTransform() {
    const viewportEl = document.getElementById('canvas-viewport');
    const badgeEl = document.getElementById('zoom-badge');
    
    if (viewportEl) viewportEl.style.transform = `scale(${zoomLevel})`;
    if (badgeEl) badgeEl.innerText = `${Math.round(zoomLevel * 100)}%`;
}

window.zoomIn = function() {
    if (zoomLevel < 2.0) {
        zoomLevel = Math.min(2.0, zoomLevel + 0.15);
        applyZoomTransform();
    }
}

window.zoomOut = function() {
    if (zoomLevel > 0.4) {
        zoomLevel = Math.max(0.4, zoomLevel - 0.15);
        applyZoomTransform();
    }
}

window.resetZoom = function() {
    zoomLevel = 1.0;
    applyZoomTransform();
}



function setupZoomWheelListeners() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    wrapper.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    }, { passive: false });
}

// ─── Production Palette Search & Filtering ────────────────────────────────────

window.filterPaletteNodes = function(query) {
    const q = (query || '').toLowerCase().trim();
    const items = document.querySelectorAll('.palette-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (!q || text.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ─── Production Canvas Viewport Panning (Space + Drag / Background Drag) ──────

function setupCanvasPanning() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    wrapper.addEventListener('mousedown', (e) => {
        // Pan if clicking background (not on a node or button) or holding Space
        const isNode = e.target.closest('.node-card') || e.target.closest('button') || e.target.closest('input');
        if (isNode && !e.spaceKey) return;

        isPanning = true;
        wrapper.classList.add('canvas-panning');
        startX = e.pageX - wrapper.offsetLeft;
        startY = e.pageY - wrapper.offsetTop;
        scrollLeft = wrapper.scrollLeft;
        scrollTop = wrapper.scrollTop;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const y = e.pageY - wrapper.offsetTop;
        const walkX = (x - startX) * 1.2;
        const walkY = (y - startY) * 1.2;
        wrapper.scrollLeft = scrollLeft - walkX;
        wrapper.scrollTop = scrollTop - walkY;
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            wrapper.classList.remove('canvas-panning');
        }
    });
}

// ─── Production Keyboard Shortcuts (Delete, Esc, Ctrl+S) ─────────────────────

function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // Ignore if user is typing inside an input or textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedNodeId && nodes.length > 1) {
                e.preventDefault();
                deleteSelectedNode();
                showToast("Step Removed!");
            }
        }

        if (e.key === 'Escape') {
            closeImportModal();
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            autoSaveFlow();
            showToast("Flow Saved to Session!");
        }
    });
}

// ─── Flow Validation & Status Telemetry Bar ──────────────────────────────────

function updateCanvasValidation() {
    const textEl = document.getElementById('canvas-validation-text');
    const infoEl = document.getElementById('canvas-status-info');
    const chipEl = document.getElementById('node-count-chip');

    if (chipEl) chipEl.innerText = `${nodes.length} Primitive Steps`;

    let isValid = true;
    let issue = '';

    nodes.forEach((n, idx) => {
        if (n.type === 'receive' && (!n.params.toAddress || n.params.toAddress.length < 10)) {
            isValid = false;
            issue = `Step #${idx + 1} (${n.name}): Invalid receiver address`;
        }
        if (n.type === 'payment' && (!n.params.to || n.params.to.length < 10)) {
            isValid = false;
            issue = `Step #${idx + 1} (${n.name}): Invalid payout destination`;
        }
    });

    if (textEl) {
        if (isValid) {
            textEl.innerHTML = `<span class="text-emerald-400 font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">verified</span> Flow 100% Valid</span>`;
        } else {
            textEl.innerHTML = `<span class="text-amber-400 font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">warning</span> ${issue}</span>`;
        }
    }

    if (infoEl) {
        infoEl.innerText = `${nodes.length} Steps connected • Engine Active`;
    }
}

// ─── Local Storage Session Persistence ────────────────────────────────────────

function autoSaveFlow() {
    try {
        const payload = { flowName, nodes, nextId, selectedNodeId, stellarNetwork };
        localStorage.setItem('mesa_studio_flow', JSON.stringify(payload));
    } catch {
        // Ignore quota error
    }
}

function loadSavedFlow() {
    try {
        const raw = localStorage.getItem('mesa_studio_flow');
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.nodes) && saved.nodes.length > 0) {
            nodes = saved.nodes;
            flowName = saved.flowName || flowName;
            nextId = saved.nextId || (nodes.length + 1);
            selectedNodeId = saved.selectedNodeId || nodes[0].id;
            stellarNetwork = saved.stellarNetwork || 'testnet';
            const input = document.getElementById('flow-name-input');
            if (input) input.value = flowName;
            const netSelect = document.getElementById('network-select');
            if (netSelect) netSelect.value = stellarNetwork;
        }
    } catch {
        // Ignore parse error
    }
}

// ─── Stellar Network & Wallet Integrations ────────────────────────────────────

window.switchStellarNetwork = function(net) {
    stellarNetwork = net;
    const led = document.getElementById('network-icon-led');
    
    nodes.forEach(node => {
        if (node.type === 'payment') {
            node.params.horizonUrl = (net === 'mainnet') 
                ? 'https://horizon.stellar.org' 
                : 'https://horizon-testnet.stellar.org';
        }
    });

    if (led) {
        if (net === 'mainnet') {
            led.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        } else {
            led.className = 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse';
        }
    }

    render();
    showToast(`Switched Network to Stellar ${net.toUpperCase()}`);
}

// ─── Native Freighter Extension API Connector ─────────────────────────────────

async function getFreighterPublicKey() {
    const f = window.freighterApi || window.freighter;
    if (!f) return null;

    try {
        let res = null;
        if (typeof f.requestAccess === 'function') {
            res = await f.requestAccess();
        } else if (typeof f.setAllowed === 'function') {
            res = await f.setAllowed();
        } else if (typeof f.getPublicKey === 'function') {
            res = await f.getPublicKey();
        }

        if (!res) return null;

        // Parse String vs Object return schemas ({ publicKey: "G..." }, { address: "G..." }, or "G...")
        if (typeof res === 'string' && res.startsWith('G')) {
            return res;
        } else if (res && typeof res.publicKey === 'string' && res.publicKey.startsWith('G')) {
            return res.publicKey;
        } else if (res && typeof res.address === 'string' && res.address.startsWith('G')) {
            return res.address;
        }

        // Secondary fallback to getPublicKey() if requestAccess returned boolean true
        if (typeof f.getPublicKey === 'function') {
            const keyRes = await f.getPublicKey();
            if (typeof keyRes === 'string' && keyRes.startsWith('G')) {
                return keyRes;
            } else if (keyRes && typeof keyRes.publicKey === 'string' && keyRes.publicKey.startsWith('G')) {
                return keyRes.publicKey;
            }
        }
    } catch (err) {
        console.warn("Freighter API call warning:", err);
    }
    return null;
}

function applyConnectedWallet(pubKey, toastMsg) {
    userWalletPublicKey = pubKey;
    const btnText = document.getElementById('wallet-btn-text');
    const btn = document.getElementById('wallet-connect-btn');

    const shortKey = `${pubKey.substring(0, 4)}...${pubKey.substring(pubKey.length - 4)}`;
    if (btnText) btnText.innerHTML = `<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ${shortKey}</span>`;
    if (btn) btn.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-label-mono font-semibold transition shadow-md shadow-emerald-500/10';

    // Update Receive Payment step parameter
    const receiveNode = nodes.find(n => n.type === 'receive');
    if (receiveNode && receiveNode.params) {
        receiveNode.params.toAddress = pubKey;
        render();
    }

    showToast(toastMsg || `Connected: ${shortKey}`);
}

function initFreighterAutoConnect() {
    let attempts = 0;
    const interval = setInterval(async () => {
        attempts++;
        const f = window.freighterApi || window.freighter;
        if (f) {
            clearInterval(interval);
            const btnText = document.getElementById('wallet-btn-text');
            if (btnText && !userWalletPublicKey) {
                btnText.innerText = "Connect Freighter";
            }
            
            try {
                if (typeof f.isAllowed === 'function') {
                    const allowedRes = await f.isAllowed();
                    const isAllowed = (typeof allowedRes === 'boolean') ? allowedRes : (allowedRes && allowedRes.isAllowed);
                    if (isAllowed) {
                        const key = await getFreighterPublicKey();
                        if (key) {
                            applyConnectedWallet(key, "Freighter Extension Detected & Connected");
                        }
                    }
                }
            } catch {
                // Ignore error
            }
        } else if (attempts >= 10) {
            clearInterval(interval);
        }
    }, 250);
}

window.connectStellarWallet = async function() {
    const btnText = document.getElementById('wallet-btn-text');
    const btn = document.getElementById('wallet-connect-btn');

    if (userWalletPublicKey) {
        // Disconnect
        userWalletPublicKey = null;
        if (btnText) btnText.innerText = 'Connect Wallet';
        if (btn) btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-label-mono font-semibold transition shadow-sm';
        showToast("Wallet Disconnected");
        return;
    }

    // Inspect all possible Freighter injection locations
    const freighter = window.freighterApi || window.freighter || (window.StellarFreighter && window.StellarFreighter.freighterApi) || window.stellar;

    if (freighter) {
        try {
            console.log("⚡ Executing Freighter Extension Connection Request...");

            let res = null;
            if (typeof freighter.requestAccess === 'function') {
                res = await freighter.requestAccess();
            } else if (typeof freighter.setAllowed === 'function') {
                res = await freighter.setAllowed();
            } else if (typeof freighter.getPublicKey === 'function') {
                res = await freighter.getPublicKey();
            }

            console.log("⚡ Freighter Response Raw:", res);

            let pubKey = null;
            if (typeof res === 'string' && res.startsWith('G')) {
                pubKey = res;
            } else if (res && typeof res.publicKey === 'string' && res.publicKey.startsWith('G')) {
                pubKey = res.publicKey;
            } else if (res && typeof res.address === 'string' && res.address.startsWith('G')) {
                pubKey = res.address;
            } else if (res && res.error) {
                alert(`Freighter Error: ${res.error}`);
                return;
            }

            if (!pubKey && typeof freighter.getPublicKey === 'function') {
                const keyRes = await freighter.getPublicKey();
                if (typeof keyRes === 'string' && keyRes.startsWith('G')) {
                    pubKey = keyRes;
                } else if (keyRes && typeof keyRes.publicKey === 'string' && keyRes.publicKey.startsWith('G')) {
                    pubKey = keyRes.publicKey;
                }
            }

            if (pubKey) {
                applyConnectedWallet(pubKey, "Freighter Extension Connected Successfully!");
                return;
            }
        } catch (err) {
            console.error("Freighter Extension error:", err);
            alert("Freighter extension connection request failed or modal was closed. Please unlock your Freighter browser extension and try again.");
            return;
        }
    }

    // Fallback if extension not detected on window
    const promptResult = prompt(
        "🚀 Freighter Wallet Not Detected on window.freighterApi\n\n" +
        "Make sure:\n" +
        "1. Freighter Chrome/Edge Extension is installed & active\n" +
        "2. Reload this page so Chrome injects the extension API\n\n" +
        "Or paste your Stellar Public Key (G...):",
        "GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV"
    );

    if (promptResult && promptResult.startsWith('G')) {
        applyConnectedWallet(promptResult, "Stellar Wallet Connected");
    } else if (promptResult) {
        alert("Invalid Stellar Public Key. Key must start with 'G'.");
    }
}

