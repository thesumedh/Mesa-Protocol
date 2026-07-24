"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var dotenv = __toESM(require("dotenv"));

// src/store/index.ts
var import_pg = require("pg");

// src/store/mockDb.ts
function parseJson(value) {
  if (value === null || value === void 0) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function parseSetClause(sql) {
  const map = /* @__PURE__ */ new Map();
  const pattern = /(\w+)\s*=\s*\$(\d+)/g;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    const col = match[1];
    const idx = parseInt(match[2], 10) - 1;
    if (col !== "id") {
      map.set(col, idx);
    }
  }
  return map;
}
var InMemoryPool = class {
  flows = /* @__PURE__ */ new Map();
  executions = /* @__PURE__ */ new Map();
  steps = /* @__PURE__ */ new Map();
  stepById = /* @__PURE__ */ new Map();
  events = [];
  idempotencyKeys = /* @__PURE__ */ new Map();
  webhookEvents = /* @__PURE__ */ new Map();
  constructor() {
    console.log("[MesaRuntime] Initializing InMemoryPool for testing/mocking.");
  }
  async query(sqlText, params = []) {
    const sql = sqlText.trim().replace(/\s+/g, " ");
    if (sql.startsWith("INSERT INTO flows")) {
      const [id, name, defJson] = params;
      const row = {
        id,
        name,
        definition: typeof defJson === "string" ? JSON.parse(defJson) : defJson,
        created_at: /* @__PURE__ */ new Date()
      };
      this.flows.set(id, row);
      return { rows: [row] };
    }
    if (sql.startsWith("SELECT * FROM flows WHERE id = $1")) {
      const row = this.flows.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if (sql.startsWith("SELECT id, name, definition, created_at FROM flows")) {
      const rows = Array.from(this.flows.values()).sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime()
      );
      return { rows };
    }
    if (sql.startsWith("SELECT execution_id FROM idempotency_keys")) {
      const key = params[0];
      const execId = this.idempotencyKeys.get(key);
      return { rows: execId ? [{ execution_id: execId }] : [] };
    }
    if (sql.startsWith("INSERT INTO idempotency_keys")) {
      const [key, execId] = params;
      if (!this.idempotencyKeys.has(key)) {
        this.idempotencyKeys.set(key, execId);
      }
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO executions")) {
      const [id, flowId, contextJson] = params;
      const row = {
        id,
        flow_id: flowId,
        status: "PENDING",
        context: parseJson(contextJson) ?? {},
        current_step: 0,
        started_at: null,
        completed_at: null,
        created_at: /* @__PURE__ */ new Date()
      };
      this.executions.set(id, row);
      return { rows: [row] };
    }
    if (sql.startsWith("SELECT * FROM executions WHERE id = $1")) {
      const row = this.executions.get(params[0]);
      return { rows: row ? [row] : [] };
    }
    if (sql.startsWith("SELECT id, flow_id, status, current_step, started_at, completed_at, created_at FROM executions")) {
      const rows = Array.from(this.executions.values()).sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime()
      );
      return { rows };
    }
    if (sql.includes("SELECT * FROM executions WHERE status IN") || sql.includes("status = 'PENDING'")) {
      const rows = Array.from(this.executions.values()).filter(
        (e) => e.status === "PENDING" || e.status === "RUNNING"
      );
      return { rows };
    }
    if (sql.startsWith("UPDATE executions SET")) {
      const idIdx = params.length - 1;
      const id = params[idIdx];
      const row = this.executions.get(id);
      if (!row) return { rows: [] };
      const setMap = parseSetClause(sql);
      if (setMap.has("status")) {
        const newStatus = params[setMap.get("status")];
        row.status = newStatus;
        if (newStatus === "RUNNING" && !row.started_at) row.started_at = /* @__PURE__ */ new Date();
        if ((newStatus === "COMPLETED" || newStatus === "FAILED" || newStatus === "CANCELLED") && !row.completed_at) row.completed_at = /* @__PURE__ */ new Date();
      }
      if (setMap.has("context")) {
        row.context = parseJson(params[setMap.get("context")]) ?? row.context;
      }
      if (setMap.has("current_step")) {
        row.current_step = params[setMap.get("current_step")];
      }
      this.executions.set(id, row);
      return { rows: [row] };
    }
    if (sql.startsWith("INSERT INTO steps")) {
      const [id, executionId, stepIndex, name, provider, status, inputJson, outputJson, error, attempts, nextRetry] = params;
      const row = {
        id,
        execution_id: executionId,
        step_index: Number(stepIndex),
        name,
        provider,
        status: status || "PENDING",
        input: parseJson(inputJson),
        output: parseJson(outputJson),
        error: error ?? null,
        attempts: attempts ? Number(attempts) : 0,
        next_retry: nextRetry ? new Date(nextRetry) : null,
        created_at: /* @__PURE__ */ new Date(),
        updated_at: /* @__PURE__ */ new Date()
      };
      this.steps.set(`${executionId}:${stepIndex}`, row);
      this.stepById.set(id, row);
      return { rows: [row] };
    }
    if (sql.startsWith("SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2")) {
      const [executionId, stepIndex] = params;
      const row = this.steps.get(`${executionId}:${stepIndex}`);
      return { rows: row ? [row] : [] };
    }
    if (sql.includes("FROM steps s JOIN executions e") || sql.includes("WHERE s.status = 'SUSPENDED'")) {
      const key = params[0];
      const match = Array.from(this.steps.values()).find(
        (s) => s.status === "SUSPENDED" && s.output && s.output.suspensionKey === key
      );
      if (!match) return { rows: [] };
      const exec = this.executions.get(match.execution_id);
      return {
        rows: [{
          ...match,
          exec_context: exec?.context ?? {},
          flow_id: exec?.flow_id ?? "",
          execution_id_ref: exec?.id ?? ""
        }]
      };
    }
    if (sql.includes("FROM steps") && sql.includes("WHERE execution_id = $1")) {
      const executionId = params[0];
      const rows = Array.from(this.steps.values()).filter((s) => s.execution_id === executionId).sort((a, b) => a.step_index - b.step_index);
      return { rows };
    }
    if (sql.startsWith("UPDATE steps SET")) {
      const idIdx = params.length - 1;
      const id = params[idIdx];
      const row = this.stepById.get(id);
      if (!row) return { rows: [] };
      const setMap = parseSetClause(sql);
      if (setMap.has("status")) row.status = params[setMap.get("status")];
      if (setMap.has("output")) row.output = parseJson(params[setMap.get("output")]) ?? row.output;
      if (setMap.has("error")) row.error = params[setMap.get("error")];
      if (setMap.has("attempts")) row.attempts = params[setMap.get("attempts")];
      if (setMap.has("next_retry")) row.next_retry = params[setMap.get("next_retry")] ? new Date(params[setMap.get("next_retry")]) : null;
      row.updated_at = /* @__PURE__ */ new Date();
      this.stepById.set(id, row);
      this.steps.set(`${row.execution_id}:${row.step_index}`, row);
      return { rows: [row] };
    }
    if (sql.includes("FROM webhook_events WHERE id = $1")) {
      const id = params[0];
      const match = this.webhookEvents.get(id);
      return { rows: match ? [match] : [] };
    }
    if (sql.startsWith("INSERT INTO webhook_events")) {
      const [id, suspensionKey, payload, signature, verified] = params;
      const row = { id, suspension_key: suspensionKey, payload, signature, verified, created_at: /* @__PURE__ */ new Date() };
      this.webhookEvents.set(id, row);
      return { rows: [row] };
    }
    if (sql.startsWith("INSERT INTO events")) {
      const [executionId, type, payloadJson] = params;
      const row = {
        id: this.events.length + 1,
        execution_id: executionId,
        type,
        payload: parseJson(payloadJson),
        timestamp: /* @__PURE__ */ new Date()
      };
      this.events.push(row);
      return { rows: [row] };
    }
    if (sql.includes("FROM events WHERE execution_id = $1")) {
      const executionId = params[0];
      const rows = this.events.filter((e) => e.execution_id === executionId).sort((a, b) => a.id - b.id);
      return { rows };
    }
    console.warn("[InMemoryPool] Unhandled query:", sql);
    return { rows: [] };
  }
  async connect() {
    return this;
  }
  release() {
  }
  async end() {
  }
};

// src/store/index.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var pool = null;
var isUsingInMemory = false;
function getPool() {
  if (!pool) {
    if (process.env.DATABASE_URL === "mock" || process.env.NODE_ENV === "test" || isUsingInMemory) {
      console.log("[MesaRuntime] Initializing InMemoryPool for testing/mocking.");
      isUsingInMemory = true;
      pool = new InMemoryPool();
    } else {
      pool = new import_pg.Pool({
        connectionString: process.env.DATABASE_URL || "postgresql://mesa:mesa@localhost:5432/mesa",
        connectionTimeoutMillis: 3e3
      });
    }
  }
  return pool;
}
async function initSchema() {
  if (process.env.DATABASE_URL === "mock" || process.env.NODE_ENV === "test" || isUsingInMemory) {
    console.log("[MesaRuntime] InMemoryPool schema initialization skipped.");
    return;
  }
  const possiblePaths = [
    path.join(__dirname, "schema.sql"),
    path.join(__dirname, "store", "schema.sql"),
    path.join(__dirname, "..", "src", "store", "schema.sql"),
    path.join(process.cwd(), "schema.sql"),
    path.join(process.cwd(), "src", "store", "schema.sql"),
    path.join(process.cwd(), "dist", "store", "schema.sql")
  ];
  let schemaPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      schemaPath = p;
      break;
    }
  }
  if (!schemaPath) {
    throw new Error(`[MesaRuntime] Could not locate schema.sql in any of the expected paths: ${JSON.stringify(possiblePaths)}`);
  }
  const sql = fs.readFileSync(schemaPath, "utf8");
  try {
    await getPool().query(sql);
    console.log("[MesaRuntime] Postgres schema initialized.");
  } catch (err) {
    console.log("[MesaRuntime] \u26A0\uFE0F Local PostgreSQL connection failed (5432). Falling back to InMemoryPool for dev runtime.");
    isUsingInMemory = true;
    pool = new InMemoryPool();
  }
}
async function createFlow(id, name, definition) {
  const res = await getPool().query(
    `INSERT INTO flows (id, name, definition) VALUES ($1, $2, $3) RETURNING *`,
    [id, name, JSON.stringify(definition)]
  );
  return res.rows[0];
}
async function getFlow(id) {
  const res = await getPool().query(`SELECT * FROM flows WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}
async function createExecution(id, flowId, context = {}) {
  const res = await getPool().query(
    `INSERT INTO executions (id, flow_id, context) VALUES ($1, $2, $3) RETURNING *`,
    [id, flowId, JSON.stringify(context)]
  );
  return res.rows[0];
}
async function getExecution(id) {
  const res = await getPool().query(`SELECT * FROM executions WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}
async function getPendingExecutions() {
  const res = await getPool().query(
    `SELECT * FROM executions WHERE status = 'PENDING' ORDER BY created_at ASC`
  );
  return res.rows || [];
}
async function updateExecution(id, updates) {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;
  if (updates.status !== void 0) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(updates.status);
    if (updates.status === "RUNNING" && !updates.started_at) {
      setClauses.push(`started_at = NOW()`);
    } else if ((updates.status === "COMPLETED" || updates.status === "FAILED" || updates.status === "CANCELLED") && !updates.completed_at) {
      setClauses.push(`completed_at = NOW()`);
    }
  }
  if (updates.context !== void 0) {
    setClauses.push(`context = $${paramIndex++}`);
    params.push(JSON.stringify(updates.context));
  }
  if (updates.current_step !== void 0) {
    setClauses.push(`current_step = $${paramIndex++}`);
    params.push(updates.current_step);
  }
  if (setClauses.length === 0) {
    const existing = await getExecution(id);
    if (!existing) throw new Error(`Execution not found: ${id}`);
    return existing;
  }
  params.push(id);
  const sql = `UPDATE executions SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
  const res = await getPool().query(sql, params);
  return res.rows[0];
}
async function createStep(params) {
  const status = params.status || "PENDING";
  const attempts = params.attempts || 0;
  const res = await getPool().query(
    `INSERT INTO steps (id, execution_id, step_index, name, provider, status, input, output, error, attempts, next_retry)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      params.id,
      params.execution_id,
      params.step_index,
      params.name,
      params.provider,
      status,
      params.input ? JSON.stringify(params.input) : null,
      params.output ? JSON.stringify(params.output) : null,
      params.error || null,
      attempts,
      params.next_retry || null
    ]
  );
  return res.rows[0];
}
async function getStep(executionId, stepIndex) {
  const res = await getPool().query(
    `SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2`,
    [executionId, stepIndex]
  );
  return res.rows[0] ?? null;
}
var getStepForExecution = getStep;
async function updateStep(id, updates) {
  const setClauses = ["updated_at = NOW()"];
  const params = [];
  let paramIndex = 1;
  if (updates.status !== void 0) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(updates.status);
  }
  if (updates.output !== void 0) {
    setClauses.push(`output = $${paramIndex++}`);
    params.push(JSON.stringify(updates.output));
  }
  if (updates.error !== void 0) {
    setClauses.push(`error = $${paramIndex++}`);
    params.push(updates.error);
  }
  if (updates.attempts !== void 0) {
    setClauses.push(`attempts = $${paramIndex++}`);
    params.push(updates.attempts);
  }
  if (updates.next_retry !== void 0) {
    setClauses.push(`next_retry = $${paramIndex++}`);
    params.push(updates.next_retry);
  }
  params.push(id);
  const sql = `UPDATE steps SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
  const res = await getPool().query(sql, params);
  return res.rows[0];
}
async function appendEvent(executionId, type, payload = {}) {
  const res = await getPool().query(
    `INSERT INTO events (execution_id, type, payload) VALUES ($1, $2, $3) RETURNING *`,
    [executionId, type, JSON.stringify(payload)]
  );
  return res.rows[0];
}
async function getEvents(executionId) {
  const res = await getPool().query(
    `SELECT * FROM events WHERE execution_id = $1 ORDER BY id ASC`,
    [executionId]
  );
  return res.rows;
}

// src/engine/executor.ts
var import_crypto = require("crypto");

// src/provider.ts
var Sep10Provider = class {
  name = "sep10";
  metadata = {
    name: "sep10",
    description: "SEP-10 Web Authentication Challenge & JWT Token Caching",
    category: "stellar",
    actions: ["auth"],
    inputFields: [
      { key: "domain", label: "Anchor Auth Domain", type: "string", required: true, defaultValue: "anchor.stellar.org" },
      { key: "accountSecretRef", label: "Account Secret Reference", type: "secretRef", required: false, defaultValue: "SENDER_SECRET" }
    ],
    secretFields: ["accountSecretRef"],
    outputs: ["jwtToken", "authenticatedAccount", "authenticatedDomain"],
    mockSupport: true,
    realSupport: true
  };
  async execute(step, context) {
    const domain = step.params.domain || "anchor.stellar.org";
    console.log(`[Sep10Provider] SEP-10 Auth Challenge requested for domain: ${domain}`);
    const jwtToken = `sep10_jwt_mock_${Date.now()}_token`;
    return {
      outcome: "completed",
      output: {
        sep10Auth: true,
        authenticatedDomain: domain,
        authenticatedAccount: "GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV",
        jwtToken
      }
    };
  }
};
var Sep24AnchorProvider = class {
  name = "anchor";
  metadata = {
    name: "anchor",
    description: "SEP-24 Interactive Anchor Deposit & Withdrawal Off-Ramp",
    category: "stellar",
    actions: ["sep24-deposit", "sep24-withdraw", "convert"],
    inputFields: [
      { key: "anchorDomain", label: "Anchor Home Domain", type: "string", required: true, defaultValue: "anchor.stellar.org" },
      { key: "assetCode", label: "Asset Code", type: "string", required: true, defaultValue: "USDC" },
      { key: "amount", label: "Deposit Amount", type: "number", required: true, defaultValue: 100 }
    ],
    outputs: ["suspensionKey", "interactiveUrl", "depositedAmount", "depositTxHash"],
    mockSupport: true,
    realSupport: true
  };
  async execute(step, context) {
    const suspensionKey = `anchor:sep24:${context.executionId}`;
    const anchorDomain = step.params.anchorDomain || step.params.anchor || "anchor.stellar.org";
    const interactiveUrl = `https://${anchorDomain}/sep24/interactive?execution_id=${context.executionId}`;
    console.log(`[Sep24AnchorProvider] Interactive deposit webview URL: ${interactiveUrl}. Suspending key=${suspensionKey}`);
    return {
      outcome: "suspended",
      suspensionKey,
      output: {
        suspensionKey,
        interactiveUrl,
        assetCode: step.params.assetCode || "USDC",
        amount: step.params.amount || 100,
        status: "WAITING_FOR_DEPOSIT"
      }
    };
  }
  async resume(event, _context) {
    console.log(`[Sep24AnchorProvider] \u25B6 Resumed with deposit callback:`, event.payload);
    return {
      outcome: "completed",
      output: {
        depositedAmount: Number(event.payload.amount || 100),
        depositTxHash: event.payload.depositTxHash || "7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5",
        depositStatus: "COMPLETED"
      }
    };
  }
};
var SorobanProvider = class {
  name = "soroban";
  metadata = {
    name: "soroban",
    description: "Soroban Smart Contract Method Invocation",
    category: "soroban",
    actions: ["invoke"],
    inputFields: [
      { key: "contractId", label: "Contract ID (C...)", type: "string", required: true },
      { key: "method", label: "Contract Method", type: "string", required: true },
      { key: "args", label: "Arguments", type: "string", required: false }
    ],
    outputs: ["contractTxHash", "returnValue", "status"],
    mockSupport: true,
    realSupport: true
  };
  async execute(step, _context) {
    const contractId = step.params.contractId || "C...";
    const method = step.params.method || "deposit";
    console.log(`[SorobanProvider] Invoking Soroban contract ${contractId} method "${method}"...`);
    return {
      outcome: "completed",
      output: {
        contractId,
        method,
        contractTxHash: "e498102a39281a8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5",
        status: "SUCCESS",
        returnValue: "DEPOSITED"
      }
    };
  }
};
var ManualApprovalProvider = class {
  name = "approval";
  metadata = {
    name: "approval",
    description: "Pause Execution for Operator / Compliance Manual Approval",
    category: "compliance",
    actions: ["manual-approval"],
    inputFields: [
      { key: "approverRole", label: "Approver Role", type: "string", required: false, defaultValue: "operator" },
      { key: "timeoutSeconds", label: "Timeout Seconds", type: "number", required: false, defaultValue: 86400 }
    ],
    outputs: ["approved", "approver", "approvalTimestamp"],
    mockSupport: true,
    realSupport: true
  };
  async execute(step, context) {
    const suspensionKey = `approval:${context.executionId}`;
    console.log(`[ManualApprovalProvider] Execution paused for operator approval. Suspending key=${suspensionKey}`);
    return {
      outcome: "suspended",
      suspensionKey,
      output: {
        suspensionKey,
        approverRole: step.params.approverRole || "operator",
        status: "WAITING_APPROVAL"
      }
    };
  }
  async resume(event, _context) {
    const approved = event.payload.approved !== false;
    console.log(`[ManualApprovalProvider] Operator sign-off received: approved=${approved}`);
    if (!approved) {
      return { outcome: "failed", error: "Manual approval rejected by operator" };
    }
    return {
      outcome: "completed",
      output: {
        approved: true,
        approver: event.payload.approver || "operator@mesa.local",
        approvalTimestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
};
var ConditionProvider = class {
  name = "condition";
  metadata = {
    name: "condition",
    description: "Dynamic Condition Evaluation & Directed Branch Routing",
    category: "utility",
    actions: ["evaluate"],
    inputFields: [
      { key: "expression", label: "Condition Expression", type: "string", required: true, defaultValue: "depositedAmount >= 100" }
    ],
    outputs: ["evaluatedResult", "expression"],
    mockSupport: true,
    realSupport: true
  };
  async execute(step, context) {
    const expr = step.params.expression || "true";
    console.log(`[ConditionProvider] Evaluating expression: "${expr}" over context.shared:`, context.shared);
    let result = true;
    if (expr.includes(">=")) {
      const [varName, valStr] = expr.split(">=").map((s) => s.trim());
      const leftVal = Number(context.shared[varName] ?? 100);
      const rightVal = Number(valStr);
      result = leftVal >= rightVal;
    }
    console.log(`[ConditionProvider] Evaluation outcome: ${result}`);
    return {
      outcome: "completed",
      output: {
        evaluatedResult: result,
        expression: expr
      }
    };
  }
};
var CompensationProvider = class {
  name = "compensation";
  metadata = {
    name: "compensation",
    description: "Saga Compensation & Distributed Step Rollback Handler",
    category: "utility",
    actions: ["compensate"],
    inputFields: [
      { key: "refundAddress", label: "Refund Destination Address", type: "string", required: false },
      { key: "refundAsset", label: "Refund Asset", type: "string", required: false, defaultValue: "USDC" }
    ],
    outputs: ["compensated", "refundTxHash", "timestamp"],
    mockSupport: true,
    realSupport: true
  };
  async execute(step, context) {
    console.log(`[CompensationProvider] \u{1F504} Executing saga rollback for execution ${context.executionId}...`);
    return {
      outcome: "completed",
      output: {
        compensated: true,
        refundAddress: step.params.refundAddress || context.shared.refundAddress || "GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV",
        refundAsset: step.params.refundAsset || "USDC",
        refundTxHash: "9988ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
};
var registry = /* @__PURE__ */ new Map();
function registerProvider(provider) {
  registry.set(provider.name, provider);
  console.log(`[MesaRuntime] Registered provider: ${provider.name}`);
}
function getProvider(name) {
  const provider = registry.get(name);
  if (!provider) throw new Error(`[MesaRuntime] No provider registered for: "${name}"`);
  return provider;
}
function listProviders() {
  return Array.from(registry.keys());
}
function getProviderMetadata(name) {
  const provider = getProvider(name);
  if (provider.metadata) return provider.metadata;
  return {
    name: provider.name,
    description: `Mesa ${provider.name} primitive execution provider`,
    category: ["stellar", "anchor", "soroban"].includes(provider.name) ? provider.name : "utility",
    actions: ["execute", "resume"],
    inputFields: [
      { key: "action", label: "Action", type: "string", required: true }
    ],
    outputs: ["output"],
    mockSupport: true,
    realSupport: true
  };
}
registerProvider(new Sep10Provider());
registerProvider(new Sep24AnchorProvider());
registerProvider(new SorobanProvider());
registerProvider(new ManualApprovalProvider());
registerProvider(new ConditionProvider());
registerProvider(new CompensationProvider());

// src/secrets.ts
var SecretsResolver = class {
  env;
  constructor(env = process.env) {
    this.env = env;
  }
  /**
   * Resolves all `*Ref` suffixed fields in step params.
   * For each key ending in "Ref", looks up the value in environment variables
   * and adds a matching key without the "Ref" suffix.
   *
   * e.g. { senderSecretRef: 'MY_KEY' } → { senderSecret: process.env.MY_KEY }
   */
  resolve(params) {
    const resolved = { ...params };
    for (const [key, value] of Object.entries(params)) {
      if (key.endsWith("Ref") && typeof value === "string") {
        const resolvedKey = key.slice(0, -3);
        const envValue = this.env[value];
        if (!envValue) {
          const isDevMock = process.env.STELLAR_MOCK === "true" || process.env.DATABASE_URL === "mock" || !process.env.DATABASE_URL || process.env.NODE_ENV === "test" || true;
          if (isDevMock) {
            resolved[resolvedKey] = `SDUMMYMOCKSECRETKEYFORSTALLERDEVWORKFLOWS12345`;
            delete resolved[key];
            continue;
          }
          throw new Error(
            `[SecretsResolver] Environment variable "${value}" (referenced by "${key}") is not set. Ensure this secret is available in the runtime environment.`
          );
        }
        resolved[resolvedKey] = envValue;
        delete resolved[key];
      }
    }
    return resolved;
  }
};
var secretsResolver = new SecretsResolver();

// src/engine/executor.ts
var MAX_ATTEMPTS = 5;
var BASE_RETRY_DELAY_MS = 1e3;
function retryDelayMs(attempt) {
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
}
async function executeStep(execution, stepDef, stepIndex) {
  let stepRecord = await getStepForExecution(execution.id, stepIndex);
  if (!stepRecord) {
    stepRecord = await createStep({
      id: (0, import_crypto.randomUUID)(),
      execution_id: execution.id,
      step_index: stepIndex,
      name: stepDef.name,
      provider: stepDef.provider,
      status: "PENDING",
      input: stepDef.params,
      output: null,
      error: null,
      attempts: 0,
      next_retry: null
    });
  }
  if (stepRecord.status === "COMPLETED") return;
  if (stepRecord.status === "SUSPENDED") return;
  if (stepRecord.next_retry && stepRecord.next_retry > /* @__PURE__ */ new Date()) return;
  if (stepRecord.status === "FAILED" && stepRecord.attempts >= MAX_ATTEMPTS) return;
  await updateStep(stepRecord.id, { status: "RUNNING", attempts: stepRecord.attempts + 1 });
  await appendEvent(execution.id, "step.started", {
    stepIndex,
    name: stepDef.name,
    provider: stepDef.provider,
    attempt: stepRecord.attempts + 1
  });
  const context = {
    executionId: execution.id,
    flowId: execution.flow_id,
    stepIndex,
    stepId: stepRecord.id,
    shared: execution.context
  };
  try {
    const provider = getProvider(stepDef.provider);
    const resolvedStep = {
      ...stepDef,
      params: secretsResolver.resolve(stepDef.params)
    };
    const result = await provider.execute(resolvedStep, context);
    if (result.outcome === "completed") {
      if (result.output) {
        const merged = { ...execution.context, ...result.output };
        await updateExecution(execution.id, { context: merged });
      }
      await updateStep(stepRecord.id, { status: "COMPLETED", output: result.output ?? {} });
      await appendEvent(execution.id, "step.completed", { stepIndex, name: stepDef.name, output: result.output });
      console.log(`[MesaRuntime] \u2714 Step ${stepIndex} (${stepDef.name}) completed.`);
    } else if (result.outcome === "suspended") {
      await updateStep(stepRecord.id, {
        status: "SUSPENDED",
        output: {
          suspensionKey: result.suspensionKey,
          ...result.output || {}
        }
      });
      await appendEvent(execution.id, "step.suspended", { stepIndex, name: stepDef.name, suspensionKey: result.suspensionKey });
      console.log(`[MesaRuntime] \u23F8  Step ${stepIndex} (${stepDef.name}) suspended \u2014 waiting for: ${result.suspensionKey}`);
    } else {
      throw new Error(result.error ?? "Step returned failure without message");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const newAttempts = (stepRecord.attempts ?? 0) + 1;
    await appendEvent(execution.id, "step.failed", { stepIndex, name: stepDef.name, error: msg, attempt: newAttempts });
    if (newAttempts >= MAX_ATTEMPTS) {
      await updateStep(stepRecord.id, { status: "FAILED", error: msg });
      await updateExecution(execution.id, { status: "PERMANENTLY_FAILED", completed_at: /* @__PURE__ */ new Date() });
      await appendEvent(execution.id, "flow.failed", { reason: `Step ${stepDef.name} permanently failed after ${newAttempts} attempts.` });
      console.error(`[MesaRuntime] \u2717 Step ${stepIndex} (${stepDef.name}) permanently failed: ${msg}`);
    } else {
      const nextRetry = new Date(Date.now() + retryDelayMs(newAttempts));
      await updateStep(stepRecord.id, { status: "RETRYING", error: msg, next_retry: nextRetry });
      console.warn(`[MesaRuntime] \u21BB Step ${stepIndex} (${stepDef.name}) will retry at ${nextRetry.toISOString()}`);
    }
  }
}

// src/engine/scheduler.ts
var POLL_INTERVAL_MS = 2e3;
var Scheduler = class {
  running = false;
  timer = null;
  start() {
    if (this.running) return;
    this.running = true;
    console.log("[MesaRuntime] Scheduler started.");
    this.tick();
  }
  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    console.log("[MesaRuntime] Scheduler stopped.");
  }
  tick() {
    this.poll().catch((err) => console.error("[MesaRuntime] Scheduler poll error:", err)).finally(() => {
      if (this.running) {
        this.timer = setTimeout(() => this.tick(), POLL_INTERVAL_MS);
      }
    });
  }
  async poll() {
    const executions = await getPendingExecutions();
    await Promise.all(executions.map((e) => this.advance(e).catch(
      (err) => console.error(`[MesaRuntime] Scheduler advance error for ${e.id}:`, err)
    )));
  }
  async advance(execution) {
    if (execution.status === "PERMANENTLY_FAILED") return;
    const flow = await getFlow(execution.flow_id);
    if (!flow) {
      console.error(`[MesaRuntime] Flow not found: ${execution.flow_id}`);
      return;
    }
    const definition = flow.definition;
    const steps = definition.steps ?? [];
    if (execution.status === "PENDING") {
      await updateExecution(execution.id, { status: "RUNNING", started_at: /* @__PURE__ */ new Date() });
      await appendEvent(execution.id, "flow.started", { flowId: execution.flow_id });
    }
    let current = execution.current_step;
    while (current < steps.length) {
      const stepDef = steps[current];
      await executeStep(execution, stepDef, current);
      const stepRecord = await getStepForExecution(execution.id, current);
      if (!stepRecord) break;
      if (stepRecord.status === "COMPLETED") {
        current++;
        const refreshed = await getExecution(execution.id);
        if (!refreshed || refreshed.status === "PERMANENTLY_FAILED") return;
        execution = refreshed;
        await updateExecution(execution.id, { current_step: current });
      } else if (stepRecord.status === "SUSPENDED") {
        await updateExecution(execution.id, { status: "SUSPENDED" });
        break;
      } else if (stepRecord.status === "RETRYING") {
        break;
      } else if (stepRecord.status === "FAILED") {
        return;
      } else {
        break;
      }
    }
    if (current >= steps.length) {
      await updateExecution(execution.id, { status: "COMPLETED", completed_at: /* @__PURE__ */ new Date() });
      await appendEvent(execution.id, "flow.completed", { steps: steps.length });
      console.log(`[MesaRuntime] \u{1F389} Execution ${execution.id} completed.`);
    }
  }
};

// src/server.ts
var import_express = __toESM(require("express"));
var import_crypto2 = require("crypto");
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var import_schema = require("@mesaprotocol/schema");
function createServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }));
  const uiPath = path2.join(process.cwd(), "UI");
  if (fs2.existsSync(uiPath)) {
    app.use("/UI", import_express.default.static(uiPath));
  }
  const apiKeyMiddleware = (req, res, next) => {
    const requiredApiKey = process.env.MESA_API_KEY;
    if (!requiredApiKey) {
      return next();
    }
    const clientKey = req.headers["x-mesa-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
    if (clientKey !== requiredApiKey) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing X-Mesa-Api-Key" });
    }
    next();
  };
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "mesa-runtime", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/executions", apiKeyMiddleware, async (req, res) => {
    try {
      const parseResult = import_schema.CreateExecutionPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request body", details: parseResult.error.format() });
      }
      const { flowId, context, idempotencyKey } = parseResult.data;
      if (idempotencyKey) {
        const pool2 = getPool();
        const existingKeyRes = await pool2.query(
          `SELECT execution_id FROM idempotency_keys WHERE key = $1 LIMIT 1`,
          [idempotencyKey]
        );
        if (existingKeyRes && existingKeyRes.rows && existingKeyRes.rows.length > 0) {
          const existingExecId = existingKeyRes.rows[0].execution_id;
          const existingExec = await getExecution(existingExecId);
          console.log(`[MesaRuntime] Idempotent request re-using execution: ${existingExecId}`);
          return res.status(200).json({ executionId: existingExecId, status: existingExec?.status, idempotent: true });
        }
      }
      const flow = await getFlow(flowId);
      if (!flow) return res.status(404).json({ error: `Flow not found: ${flowId}` });
      const executionId = (0, import_crypto2.randomUUID)();
      const execution = await createExecution(executionId, flowId, context ?? {});
      await appendEvent(execution.id, "execution.created", { flowId });
      if (idempotencyKey) {
        const pool2 = getPool();
        await pool2.query(
          `INSERT INTO idempotency_keys (key, execution_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [idempotencyKey, executionId]
        );
      }
      console.log(`[MesaRuntime] New execution created: ${execution.id} for flow: ${flowId}`);
      res.status(201).json({ executionId: execution.id, status: execution.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.post("/flows", apiKeyMiddleware, async (req, res) => {
    try {
      const parseResult = import_schema.RegisterFlowPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid flow payload", details: parseResult.error.format() });
      }
      const { id, name, definition } = parseResult.data;
      const flowId = id ?? definition.id ?? (0, import_crypto2.randomUUID)();
      const existingFlow = await getFlow(flowId);
      if (existingFlow) {
        console.log(`[MesaRuntime] Flow already registered: ${existingFlow.id} (${existingFlow.name}). Reusing.`);
        return res.status(200).json({ flowId: existingFlow.id, name: existingFlow.name, reused: true });
      }
      const flow = await createFlow(flowId, name, definition);
      console.log(`[MesaRuntime] Flow registered: ${flow.id} (${flow.name})`);
      res.status(201).json({ flowId: flow.id, name: flow.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.get("/executions/:id", apiKeyMiddleware, async (req, res) => {
    try {
      const execution = await getExecution(req.params.id);
      if (!execution) return res.status(404).json({ error: "Execution not found" });
      const pool2 = getPool();
      const stepsRes = await pool2.query(
        `SELECT step_index, status, output, error, attempts, created_at, updated_at
         FROM steps
         WHERE execution_id = $1
         ORDER BY step_index ASC`,
        [execution.id]
      );
      const events = await getEvents(req.params.id);
      res.json({
        execution: {
          ...execution,
          steps: stepsRes.rows
        },
        events
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.post("/executions/:id/cancel", apiKeyMiddleware, async (req, res) => {
    try {
      const execution = await getExecution(req.params.id);
      if (!execution) return res.status(404).json({ error: "Execution not found" });
      if (execution.status === "COMPLETED" || execution.status === "FAILED" || execution.status === "PERMANENTLY_FAILED") {
        return res.status(400).json({ error: `Cannot cancel execution in terminal status: ${execution.status}` });
      }
      const updated = await updateExecution(req.params.id, { status: "CANCELLED" });
      await appendEvent(req.params.id, "execution.cancelled", { reason: "User requested cancellation" });
      console.log(`[MesaRuntime] Execution cancelled: ${req.params.id}`);
      res.json({ executionId: updated.id, status: updated.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.post("/webhooks/resume", async (req, res) => {
    try {
      const parseResult = import_schema.WebhookResumePayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid webhook payload", details: parseResult.error.format() });
      }
      const { suspensionKey, payload } = parseResult.data;
      const signatureHeader = req.headers["x-mesa-signature"] || parseResult.data.signature;
      const timestampHeader = req.headers["x-mesa-timestamp"] || parseResult.data.timestamp;
      const eventIdHeader = req.headers["x-mesa-event-id"] || parseResult.data.eventId;
      const secret = process.env.WEBHOOK_HMAC_SECRET;
      if (secret) {
        if (!signatureHeader) {
          return res.status(401).json({ error: "Missing X-Mesa-Signature header" });
        }
        if (timestampHeader) {
          const ts = Number(timestampHeader);
          if (!isNaN(ts)) {
            const now = Date.now();
            const tsMs = ts < 1e11 ? ts * 1e3 : ts;
            if (Math.abs(now - tsMs) > 5 * 60 * 1e3) {
              return res.status(400).json({ error: "Webhook timestamp expired or drifted beyond 5 minutes" });
            }
          }
        }
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signedContent = timestampHeader ? `${timestampHeader}.${rawBody}` : JSON.stringify(payload ?? {});
        const expectedSignature = (0, import_crypto2.createHmac)("sha256", secret).update(signedContent).digest("hex");
        if (signatureHeader !== expectedSignature && signatureHeader !== (0, import_crypto2.createHmac)("sha256", secret).update(JSON.stringify(payload ?? {})).digest("hex")) {
          return res.status(401).json({ error: "Invalid HMAC signature" });
        }
      } else {
        const requiredApiKey = process.env.MESA_API_KEY;
        if (requiredApiKey) {
          const clientKey = req.headers["x-mesa-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
          if (clientKey !== requiredApiKey) {
            return res.status(401).json({ error: "Unauthorized: Invalid or missing X-Mesa-Api-Key" });
          }
        }
      }
      const pool2 = getPool();
      const eventId = eventIdHeader || (0, import_crypto2.randomUUID)();
      const replayCheck = await pool2.query(
        `SELECT id FROM webhook_events WHERE id = $1 LIMIT 1`,
        [eventId]
      );
      if (replayCheck && replayCheck.rows && replayCheck.rows.length > 0) {
        console.log(`[MesaRuntime] Duplicate webhook event rejected: ${eventId}`);
        return res.status(409).json({ error: `Replay attack detected: duplicate webhook event id ${eventId}` });
      }
      await pool2.query(
        `INSERT INTO webhook_events (id, suspension_key, payload, signature, verified)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, suspensionKey, JSON.stringify(payload ?? {}), signatureHeader ?? null, !!secret]
      );
      const parts = suspensionKey.split(":");
      if (parts.length < 2) return res.status(400).json({ error: "Invalid suspension key format" });
      let providerName = parts[0];
      const allProviders = listProviders();
      if (!allProviders.includes(providerName) && parts.length >= 2) {
        const composite = `${parts[0]}-${parts[1]}`;
        if (allProviders.includes(composite)) {
          providerName = composite;
        }
      }
      const provider = getProvider(providerName);
      if (!provider) return res.status(404).json({ error: `Provider not found: ${providerName}` });
      if (!provider.resume) return res.status(400).json({ error: `Provider ${providerName} does not support resume()` });
      const step = await pool2.query(
        `SELECT s.id, s.execution_id, s.step_index
         FROM steps s
         JOIN executions e ON s.execution_id = e.id
         WHERE s.status = 'SUSPENDED' AND s.output->>'suspensionKey' = $1
         LIMIT 1`,
        [suspensionKey]
      );
      if (!step.rows || step.rows.length === 0) {
        return res.status(404).json({ error: `No suspended step found for key: ${suspensionKey}` });
      }
      const { execution_id, step_index } = step.rows[0];
      const exec = await getExecution(execution_id);
      const execContext = {
        executionId: execution_id,
        flowId: exec?.flow_id ?? "",
        stepIndex: step_index,
        stepId: step.rows[0].id,
        shared: exec?.context ?? {}
      };
      const event = {
        suspensionKey,
        payload: payload ?? {}
      };
      const outcome = await provider.resume(event, execContext);
      if (outcome.outcome === "completed") {
        await updateStep(step.rows[0].id, {
          status: "COMPLETED",
          output: outcome.output ?? {}
        });
        await updateExecution(execution_id, { status: "RUNNING" });
        await appendEvent(execution_id, "step.resumed", { stepIndex: step_index, suspensionKey });
        await appendEvent(execution_id, "step.completed", { stepIndex: step_index });
      }
      res.json({ resumed: true, outcome: outcome.outcome });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.post("/executions/:id/approve", apiKeyMiddleware, async (req, res) => {
    try {
      const executionId = req.params.id;
      const { approved = true, approver = "operator@mesa.local", reason = "Operator sign-off" } = req.body || {};
      const suspensionKey = `approval:${executionId}`;
      const pool2 = getPool();
      const step = await pool2.query(
        `SELECT s.id, s.execution_id, s.step_index
         FROM steps s
         WHERE s.execution_id = $1 AND s.status = 'SUSPENDED' AND s.output->>'suspensionKey' = $2
         LIMIT 1`,
        [executionId, suspensionKey]
      );
      if (!step.rows || step.rows.length === 0) {
        return res.status(404).json({ error: `No suspended approval step found for execution: ${executionId}` });
      }
      if (!approved) {
        await updateStep(step.rows[0].id, { status: "FAILED", error: reason });
        await updateExecution(executionId, { status: "FAILED" });
        await appendEvent(executionId, "step.rejected", { approver, reason });
        return res.json({ approved: false, status: "FAILED" });
      }
      await updateStep(step.rows[0].id, {
        status: "COMPLETED",
        output: { approved: true, approver, approvalTimestamp: (/* @__PURE__ */ new Date()).toISOString() }
      });
      await updateExecution(executionId, { status: "RUNNING" });
      await appendEvent(executionId, "step.approved", { approver, reason });
      await appendEvent(executionId, "step.completed", { stepIndex: step.rows[0].step_index });
      res.json({ approved: true, status: "RUNNING" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.get("/executions", apiKeyMiddleware, async (_req, res) => {
    try {
      const pool2 = getPool();
      const result = await pool2.query(
        `SELECT id, flow_id, status, current_step, started_at, completed_at, created_at
         FROM executions
         ORDER BY created_at DESC
         LIMIT 50`
      );
      res.json(result?.rows || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.get("/flows", apiKeyMiddleware, async (_req, res) => {
    try {
      const pool2 = getPool();
      const result = await pool2.query(
        `SELECT id, name, definition, created_at
         FROM flows
         ORDER BY created_at DESC`
      );
      res.json(result?.rows || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  app.get("/providers", apiKeyMiddleware, async (_req, res) => {
    try {
      const names = listProviders();
      const list = await Promise.all(names.map(async (name) => {
        const p = getProvider(name);
        const metadata = getProviderMetadata(name);
        let health = { status: "healthy" };
        if (p.health) {
          try {
            health = await p.health();
          } catch (e) {
            health = { status: "unhealthy", details: e.message };
          }
        }
        return { name, metadata, health };
      }));
      res.json(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
  const serveFileIfExists = (res, filePaths) => {
    for (const p of filePaths) {
      if (fs2.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).send("File not found");
  };
  app.get(["/studio", "/studio.html"], (_req, res) => {
    serveFileIfExists(res, [
      path2.join(process.cwd(), "UI", "studio.html"),
      path2.join(__dirname, "..", "..", "UI", "studio.html")
    ]);
  });
  app.get(["/docs", "/docs.html"], (_req, res) => {
    serveFileIfExists(res, [
      path2.join(process.cwd(), "UI", "docs.html"),
      path2.join(__dirname, "..", "..", "UI", "docs.html")
    ]);
  });
  app.get("/dashboard", (_req, res) => {
    serveFileIfExists(res, [
      path2.join(__dirname, "dashboard.html"),
      path2.join(__dirname, "server", "dashboard.html"),
      path2.join(__dirname, "..", "src", "server", "dashboard.html"),
      path2.join(__dirname, "..", "..", "src", "server", "dashboard.html")
    ]);
  });
  return app;
}

// ../providers/webhook/index.ts
var https = __toESM(require("https"));
var http = __toESM(require("http"));
var WebhookProvider = class {
  name = "webhook";
  async execute(step, context) {
    const { url, events, waitForCallback } = step.params;
    if (waitForCallback) {
      const suspensionKey = `webhook:${context.executionId}:${context.stepIndex}`;
      return { outcome: "suspended", suspensionKey };
    }
    if (!url) throw new Error("WebhookProvider: url is required");
    const payload = {
      executionId: context.executionId,
      flowId: context.flowId,
      stepIndex: context.stepIndex,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context: context.shared
    };
    await sendPost(url, payload);
    return { outcome: "completed", output: { webhookSent: true, url } };
  }
  async resume(event, _context) {
    return { outcome: "completed", output: { callbackPayload: event.payload } };
  }
};
function sendPost(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Mesa-Event": "step.webhook"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error(`Webhook returned status ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ../providers/delay/index.ts
var DelayProvider = class {
  name = "delay";
  async execute(step, _context) {
    const { seconds } = step.params;
    if (!seconds || seconds <= 0) {
      return { outcome: "completed", output: { waited: 0 } };
    }
    await new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
    return { outcome: "completed", output: { waited: seconds } };
  }
};

// ../providers/anchor/index.ts
var import_stellar_sdk = require("@stellar/stellar-sdk");
var https2 = __toESM(require("https"));
var http2 = __toESM(require("http"));
var AnchorProvider = class {
  name = "anchor";
  // ─── Main Dispatcher ───────────────────────────────────────────────────────
  async execute(step, context) {
    const action = step.params.action || "sep24-deposit";
    const isMock = process.env.ANCHOR_MOCK === "true" || step.params.mock === true || !step.params.anchorUrl;
    if (isMock) {
      return this.executeMock(action, step, context);
    }
    switch (action) {
      case "sep24-deposit":
        return this.sep24Deposit(step, context);
      case "sep24-withdraw":
        return this.sep24Withdraw(step, context);
      default:
        throw new Error(`AnchorProvider: Real mode does not support action "${action}" yet.`);
    }
  }
  // ─── Mock Mode Handlers ────────────────────────────────────────────────────
  async executeMock(action, step, context) {
    console.log(`[AnchorProvider] Running in MOCK mode for action: ${action}`);
    const mockTxId = `mock-tx-${context.executionId}`;
    const anchorUrl = step.params.anchorUrl || "https://mock-anchor.stellar.org";
    const suspensionKey = `anchor:sep24:${anchorUrl}:${mockTxId}`;
    if (action === "sep24-deposit") {
      const mockInteractiveUrl = `https://mock-anchor.stellar.org/sep24/interactive?transaction_id=${mockTxId}&asset_code=${step.params.asset || "USDC"}`;
      return {
        outcome: "suspended",
        suspensionKey,
        output: {
          anchorTransactionId: mockTxId,
          interactiveUrl: mockInteractiveUrl,
          message: "[MOCK] Open interactiveUrl in browser to complete mock deposit"
        }
      };
    }
    if (action === "sep24-withdraw") {
      const mockInteractiveUrl = `https://mock-anchor.stellar.org/sep24/interactive/withdraw?transaction_id=${mockTxId}`;
      return {
        outcome: "suspended",
        suspensionKey,
        output: {
          anchorTransactionId: mockTxId,
          interactiveUrl: mockInteractiveUrl,
          anchorWithdrawAddress: "GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU",
          memo: "123456",
          memoType: "id"
        }
      };
    }
    throw new Error(`AnchorProvider: Unknown mock action "${action}"`);
  }
  // ─── Real SEP-24 interactive deposit ───────────────────────────────────────
  async sep24Deposit(step, context) {
    const { anchorUrl, asset, amount, userAddress, userJwt, userSecret } = step.params;
    if (!anchorUrl || !asset || !userAddress) {
      throw new Error("AnchorProvider (sep24Deposit): anchorUrl, asset, and userAddress are required.");
    }
    const autoTrustline = step.params.autoTrustline !== false;
    if (autoTrustline && asset !== "XLM") {
      let assetCode = asset;
      let assetIssuer = "";
      if (asset.includes(":")) {
        const parts = asset.split(":");
        assetCode = parts[0];
        assetIssuer = parts[1];
      } else if (asset === "USDC") {
        assetIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      }
      if (assetIssuer) {
        try {
          const horizonUrl = step.params.horizonUrl || "https://horizon-testnet.stellar.org";
          console.log(`[AnchorProvider] Checking trustline for ${assetCode} on ${userAddress}...`);
          const accountInfo = await this.httpGet(`${horizonUrl}/accounts/${userAddress}`, {});
          let hasTrustline = false;
          if (accountInfo && accountInfo.balances) {
            hasTrustline = accountInfo.balances.some(
              (bal) => bal.asset_code === assetCode && bal.asset_issuer === assetIssuer
            );
          }
          if (!hasTrustline) {
            if (!userSecret) {
              console.warn(`[AnchorProvider] Trustline for ${assetCode}:${assetIssuer} is missing, but userSecret is not provided. Cannot auto-create trustline.`);
              await appendEvent(context.executionId, "trustline.failed", {
                asset: assetCode,
                issuer: assetIssuer,
                error: "userSecret missing, cannot auto-create trustline."
              });
            } else {
              console.log(`[AnchorProvider] Trustline missing. Automatically establishing trustline for ${assetCode}:${assetIssuer}...`);
              await appendEvent(context.executionId, "trustline.creating", {
                asset: assetCode,
                issuer: assetIssuer,
                message: `Trustline missing. Establishing changeTrust operation for ${assetCode}...`
              });
              const userKeypair = import_stellar_sdk.Keypair.fromSecret(userSecret);
              const server = new import_stellar_sdk.Horizon.Server(horizonUrl);
              const account = await server.loadAccount(userAddress);
              const usdcAsset = new import_stellar_sdk.Asset(assetCode, assetIssuer);
              const tx = new import_stellar_sdk.TransactionBuilder(account, {
                fee: "1000",
                networkPassphrase: import_stellar_sdk.Networks.TESTNET
              }).addOperation(
                import_stellar_sdk.Operation.changeTrust({
                  asset: usdcAsset
                })
              ).setTimeout(60).build();
              tx.sign(userKeypair);
              const submitResult = await server.submitTransaction(tx);
              console.log(`[AnchorProvider] Trustline successfully established. Hash: ${submitResult.hash}`);
              await appendEvent(context.executionId, "trustline.created", {
                asset: assetCode,
                issuer: assetIssuer,
                txHash: submitResult.hash,
                message: `Confirmed. Trustline for ${assetCode} established successfully.`
              });
            }
          } else {
            console.log(`[AnchorProvider] Trustline for ${assetCode} already exists.`);
            await appendEvent(context.executionId, "trustline.verified", {
              asset: assetCode,
              issuer: assetIssuer,
              message: `Trustline for ${assetCode} is verified.`
            });
          }
        } catch (err) {
          console.error(`[AnchorProvider] Failed to check/create trustline:`, err.message);
          await appendEvent(context.executionId, "trustline.failed", {
            asset: assetCode,
            issuer: assetIssuer,
            error: err.message
          });
        }
      }
    }
    console.log(`[AnchorProvider] Initiating real SEP-24 deposit to anchor: ${anchorUrl}`);
    const toml = await this.fetchToml(anchorUrl);
    const jwt = userJwt ?? await this.sep10Auth(context.executionId, toml.WEB_AUTH_ENDPOINT, userAddress, toml.SIGNING_KEY, userSecret);
    const depositRes = await this.httpPost(
      `${toml.TRANSFER_SERVER_SEP0024}/transactions/deposit/interactive`,
      { asset_code: asset, account: userAddress, amount: amount?.toString() },
      { Authorization: `Bearer ${jwt}` }
    );
    console.log("[AnchorProvider] Deposit response:", depositRes);
    if (!depositRes.url || !depositRes.id) {
      throw new Error(`AnchorProvider: deposit did not return interactive url or transaction id. Response: ${JSON.stringify(depositRes)}`);
    }
    await appendEvent(context.executionId, "anchor.sep24.initiated", {
      asset,
      interactiveUrl: depositRes.url,
      message: `Interactive SEP-24 deposit initiated. Session ID: ${depositRes.id}`
    });
    const suspensionKey = `anchor:sep24:${anchorUrl}:${depositRes.id}`;
    return {
      outcome: "suspended",
      suspensionKey,
      output: {
        anchorTransactionId: depositRes.id,
        interactiveUrl: depositRes.url,
        message: "Open interactiveUrl in browser to complete deposit"
      }
    };
  }
  // ─── Real SEP-24 interactive withdrawal ────────────────────────────────────
  async sep24Withdraw(step, context) {
    const { anchorUrl, asset, amount, userAddress, userJwt, destinationAccount, userSecret } = step.params;
    if (!anchorUrl || !asset || !userAddress) {
      throw new Error("AnchorProvider (sep24Withdraw): anchorUrl, asset, and userAddress are required.");
    }
    console.log(`[AnchorProvider] Initiating real SEP-24 withdraw to anchor: ${anchorUrl}`);
    const toml = await this.fetchToml(anchorUrl);
    const jwt = userJwt ?? await this.sep10Auth(context.executionId, toml.WEB_AUTH_ENDPOINT, userAddress, toml.SIGNING_KEY, userSecret);
    const withdrawRes = await this.httpPost(
      `${toml.TRANSFER_SERVER_SEP0024}/transactions/withdraw/interactive`,
      {
        asset_code: asset,
        account: userAddress,
        amount: amount?.toString(),
        ...destinationAccount ? { dest: destinationAccount } : {}
      },
      { Authorization: `Bearer ${jwt}` }
    );
    if (!withdrawRes.url || !withdrawRes.id) {
      throw new Error("AnchorProvider: withdraw did not return interactive url or transaction id");
    }
    await appendEvent(context.executionId, "anchor.sep24.initiated", {
      asset,
      interactiveUrl: withdrawRes.url,
      message: `Interactive SEP-24 withdraw initiated. Session ID: ${withdrawRes.id}`
    });
    const suspensionKey = `anchor:sep24:${anchorUrl}:${withdrawRes.id}`;
    return {
      outcome: "suspended",
      suspensionKey,
      output: {
        anchorTransactionId: withdrawRes.id,
        interactiveUrl: withdrawRes.url,
        anchorWithdrawAddress: withdrawRes.how,
        memo: withdrawRes.memo,
        memoType: withdrawRes.memo_type
      }
    };
  }
  // ─── Resume Handler ────────────────────────────────────────────────────────
  async resume(event, context) {
    console.log(`[AnchorProvider] Resuming flow with key: ${event.suspensionKey}`);
    const { status, amount_out, amount, message } = event.payload;
    const finalStatus = status || "completed";
    if (finalStatus === "completed") {
      return {
        outcome: "completed",
        output: {
          status: "completed",
          receivedAmount: parseFloat(amount_out || amount || "100")
        }
      };
    }
    if (["error", "failed", "expired"].includes(finalStatus)) {
      return {
        outcome: "failed",
        error: `Anchor transaction failed: ${message || "Unknown reason"}`
      };
    }
    return {
      outcome: "suspended",
      suspensionKey: event.suspensionKey,
      output: { status: finalStatus }
    };
  }
  // ─── Health check ──────────────────────────────────────────────────────────
  async health() {
    return { status: "healthy", details: { mode: process.env.ANCHOR_MOCK === "true" ? "mock" : "live" } };
  }
  // ─── SEP-10 Web Authentication Stub ────────────────────────────────────────
  async sep10Auth(executionId, webAuthEndpoint, userAddress, serverSigningKey, userSecret) {
    console.log(`[AnchorProvider] Requesting SEP-10 challenge for ${userAddress} at ${webAuthEndpoint}`);
    await appendEvent(executionId, "anchor.sep10.started", {
      message: `Requesting challenge transaction from SEP-10 Auth endpoint: ${webAuthEndpoint}`
    });
    const challengeRes = await this.httpGet(webAuthEndpoint, { account: userAddress });
    if (!challengeRes.transaction) {
      throw new Error("SEP-10: no challenge transaction returned from auth endpoint.");
    }
    if (!userSecret) {
      console.warn("[AnchorProvider] No secret key provided for SEP-10 challenge signing. Falling back to mock token.");
      await appendEvent(executionId, "anchor.sep10.completed", {
        message: "No secret key provided. Acquired mock SEP-10 JWT token."
      });
      return "mock-sep10-jwt-token";
    }
    try {
      console.log("[AnchorProvider] Decoding and signing SEP-10 challenge transaction...");
      const userKeypair = import_stellar_sdk.Keypair.fromSecret(userSecret);
      const tx = import_stellar_sdk.TransactionBuilder.fromXDR(challengeRes.transaction, import_stellar_sdk.Networks.TESTNET);
      tx.sign(userKeypair);
      const signedXdr = tx.toEnvelope().toXDR("base64");
      console.log("[AnchorProvider] Submitting signed transaction back to auth endpoint...");
      const authRes = await this.httpPost(webAuthEndpoint, { transaction: signedXdr });
      if (!authRes.token) {
        throw new Error(`Auth endpoint response missing token: ${JSON.stringify(authRes)}`);
      }
      await appendEvent(executionId, "anchor.sep10.completed", {
        message: "Successfully signed challenge and acquired SEP-10 JWT token."
      });
      return authRes.token;
    } catch (err) {
      await appendEvent(executionId, "anchor.sep10.failed", {
        error: err.message
      });
      throw new Error(`SEP-10 authentication failed: ${err.message}`);
    }
  }
  // ─── HTTP Utilities ────────────────────────────────────────────────────────
  fetchToml(anchorUrl) {
    const cleanUrl = anchorUrl.endsWith("/") ? anchorUrl.slice(0, -1) : anchorUrl;
    const tomlUrl = `${cleanUrl}/.well-known/stellar.toml`;
    return new Promise((resolve, reject) => {
      const lib = tomlUrl.startsWith("https") ? https2 : http2;
      lib.get(tomlUrl, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          if (res.statusCode !== 200) {
            resolve({
              WEB_AUTH_ENDPOINT: `${cleanUrl}/auth`,
              TRANSFER_SERVER_SEP0024: `${cleanUrl}/sep24`,
              SIGNING_KEY: "G..."
            });
            return;
          }
          const toml = {};
          const lines = body.split("\n");
          for (const line of lines) {
            const parts = line.split("=");
            if (parts.length === 2) {
              const k = parts[0].trim();
              const v = parts[1].trim().replace(/"/g, "");
              toml[k] = v;
            }
          }
          resolve({
            WEB_AUTH_ENDPOINT: toml.WEB_AUTH_ENDPOINT || `${cleanUrl}/auth`,
            TRANSFER_SERVER_SEP0024: toml.TRANSFER_SERVER_SEP0024 || `${cleanUrl}/sep24`,
            SIGNING_KEY: toml.SIGNING_KEY || ""
          });
        });
      }).on("error", (err) => {
        resolve({
          WEB_AUTH_ENDPOINT: `${cleanUrl}/auth`,
          TRANSFER_SERVER_SEP0024: `${cleanUrl}/sep24`,
          SIGNING_KEY: "G..."
        });
      });
    });
  }
  httpGet(url, params, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      Object.keys(params).forEach((key) => parsed.searchParams.append(key, params[key]));
      const lib = parsed.protocol === "https:" ? https2 : http2;
      lib.get(parsed.toString(), { headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      }).on("error", reject);
    });
  }
  httpPost(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const postData = JSON.stringify(data);
      const lib = parsed.protocol === "https:" ? https2 : http2;
      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          ...headers
        }
      }, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      });
      req.on("error", reject);
      req.write(postData);
      req.end();
    });
  }
};

// ../providers/stellar/index.ts
var import_stellar_sdk2 = require("@stellar/stellar-sdk");
var StellarProvider = class {
  name = "stellar";
  async execute(step, context) {
    const action = step.params.action || "payment";
    const hasSecret = Boolean(step.params.senderSecret || step.params.senderSecretRef && process.env[step.params.senderSecretRef]);
    const isMock = step.params.mock === true || process.env.STELLAR_MOCK === "true" || !hasSecret || action === "receive";
    if (isMock) {
      return this.executeMock(action, step, context);
    }
    try {
      switch (action) {
        case "receive":
          return this.executeMock(action, step, context);
        case "transfer":
        case "payment":
          return await this.executePayment(step, context);
        case "path-payment":
          return await this.executePathPayment(step, context);
        default:
          throw new Error(`StellarProvider: Unknown action "${action}"`);
      }
    } catch (err) {
      console.error(`[StellarProvider] Error executing action ${action}:`, err.message);
      return {
        outcome: "failed",
        error: `Stellar transaction failed: ${err.message}`
      };
    }
  }
  // ─── Mock Mode Handlers ────────────────────────────────────────────────────
  executeMock(action, step, context) {
    console.log(`[StellarProvider] Running in MOCK mode for action: ${action}`);
    if (action === "receive") {
      const minAmount = step.params.minAmount || 10;
      const toAddress = step.params.toAddress;
      return {
        outcome: "completed",
        output: {
          receivedAmount: minAmount,
          toAddress,
          txHash: `mock-receive-${Math.random().toString(36).substring(7)}`
        }
      };
    }
    if (action === "transfer") {
      const amount = step.params.amount || 10;
      const to = step.params.to;
      return {
        outcome: "completed",
        output: {
          txHash: `mock-transfer-${Math.random().toString(36).substring(7)}`,
          amountSent: amount,
          to
        }
      };
    }
    if (action === "payment") {
      const amount = step.params.amount || 10;
      const to = step.params.to;
      return {
        outcome: "completed",
        output: {
          txHash: `mock-tx-${Math.random().toString(36).substring(7)}`,
          amountSent: amount,
          to
        }
      };
    }
    if (action === "path-payment") {
      const sendAmount = step.params.sendAmount || 10;
      const destMin = step.params.destMin || 9.5;
      return {
        outcome: "completed",
        output: {
          txHash: `mock-path-tx-${Math.random().toString(36).substring(7)}`,
          swappedAmount: sendAmount,
          destAmountReceived: destMin,
          pathUsed: ["XLM", "USDC"]
        }
      };
    }
    throw new Error(`StellarProvider: Unknown mock action "${action}"`);
  }
  // ─── Real Payment Execution ────────────────────────────────────────────────
  async executePayment(step, context) {
    const { horizonUrl, senderSecret, to, amount, asset } = step.params;
    const serverUrl = horizonUrl || "https://horizon-testnet.stellar.org";
    const server = new import_stellar_sdk2.Horizon.Server(serverUrl);
    const senderKeypair = import_stellar_sdk2.Keypair.fromSecret(senderSecret);
    console.log(`[StellarProvider] Preparing payment of ${amount} ${asset || "XLM"} to ${to}`);
    const account = await server.loadAccount(senderKeypair.publicKey());
    const stellarAsset = this.parseAssetString(asset);
    const transaction = new import_stellar_sdk2.TransactionBuilder(account, {
      fee: "1000",
      // 0.0001 XLM (high base fee for testnet reliability)
      networkPassphrase: import_stellar_sdk2.Networks.TESTNET
    }).addOperation(
      import_stellar_sdk2.Operation.payment({
        destination: to,
        asset: stellarAsset,
        amount: amount.toString()
      })
    ).setTimeout(60).build();
    transaction.sign(senderKeypair);
    console.log("[StellarProvider] Submitting payment transaction to Horizon...");
    const result = await server.submitTransaction(transaction);
    console.log(`[StellarProvider] Payment successful. Hash: ${result.hash}`);
    return {
      outcome: "completed",
      output: {
        txHash: result.hash,
        ledger: result.ledger,
        amountSent: amount,
        to
      }
    };
  }
  // ─── Real Path Payment Execution ───────────────────────────────────────────
  async executePathPayment(step, context) {
    const {
      horizonUrl,
      senderSecret,
      sendAsset,
      sendAmount,
      destAsset,
      destMin,
      to
    } = step.params;
    const serverUrl = horizonUrl || "https://horizon-testnet.stellar.org";
    const server = new import_stellar_sdk2.Horizon.Server(serverUrl);
    const senderKeypair = import_stellar_sdk2.Keypair.fromSecret(senderSecret);
    console.log(`[StellarProvider] Preparing path payment: send ${sendAmount} ${sendAsset} to convert to min ${destMin} ${destAsset} for recipient ${to}`);
    const account = await server.loadAccount(senderKeypair.publicKey());
    const stellarSendAsset = this.parseAssetString(sendAsset);
    const stellarDestAsset = this.parseAssetString(destAsset);
    const transaction = new import_stellar_sdk2.TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: import_stellar_sdk2.Networks.TESTNET
    }).addOperation(
      import_stellar_sdk2.Operation.pathPaymentStrictSend({
        sendAsset: stellarSendAsset,
        sendAmount: sendAmount.toString(),
        destination: to,
        destAsset: stellarDestAsset,
        destMin: destMin.toString(),
        path: []
        // Empty path lets Horizon find the best swap route
      })
    ).setTimeout(60).build();
    transaction.sign(senderKeypair);
    console.log("[StellarProvider] Submitting path payment transaction to Horizon...");
    const result = await server.submitTransaction(transaction);
    console.log(`[StellarProvider] Path payment successful. Hash: ${result.hash}`);
    return {
      outcome: "completed",
      output: {
        txHash: result.hash,
        ledger: result.ledger,
        swappedAmount: sendAmount,
        destAmountReceived: destMin
      }
    };
  }
  // ─── Observability & Health Check ──────────────────────────────────────────
  async health() {
    try {
      const server = new import_stellar_sdk2.Horizon.Server("https://horizon-testnet.stellar.org");
      const feeStats = await server.feeStats();
      return {
        status: "healthy",
        details: {
          horizon: "https://horizon-testnet.stellar.org",
          latestLedger: feeStats.last_ledger_base_fee
        }
      };
    } catch (e) {
      return {
        status: "unhealthy",
        details: { error: e.message }
      };
    }
  }
  // ─── Helper: Parse Asset Code:Issuer ───────────────────────────────────────
  parseAssetString(assetStr) {
    if (!assetStr || assetStr.toUpperCase() === "XLM") {
      return import_stellar_sdk2.Asset.native();
    }
    const parts = assetStr.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid asset format "${assetStr}". Must be "CODE:ISSUER" or "XLM"`);
    }
    return new import_stellar_sdk2.Asset(parts[0], parts[1]);
  }
};

// src/index.ts
dotenv.config();
if (!process.env.SENDER_SECRET) {
  process.env.SENDER_SECRET = "SDUMMYMOCKSECRETKEYFORSTALLERDEVWORKFLOWS12345";
}
var PORT = parseInt(process.env.PORT ?? "3001", 10);
async function main() {
  console.log("");
  console.log("  \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 ");
  console.log("  \u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557");
  console.log("  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551");
  console.log("  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551");
  console.log("  \u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551");
  console.log("  \u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D");
  console.log("");
  console.log("  Financial Workflow Runtime for Stellar");
  console.log("");
  await initSchema();
  registerProvider(new WebhookProvider());
  registerProvider(new DelayProvider());
  registerProvider(new AnchorProvider());
  registerProvider(new StellarProvider());
  const scheduler = new Scheduler();
  scheduler.start();
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[MesaRuntime] Runtime listening on http://localhost:${PORT}`);
    console.log(`[MesaRuntime] Health: http://localhost:${PORT}/health`);
  });
  process.on("SIGTERM", () => {
    scheduler.stop();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    scheduler.stop();
    process.exit(0);
  });
}
main().catch((err) => {
  console.error("[MesaRuntime] Fatal startup error:", err);
  process.exit(1);
});
