"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookResumePayloadSchema = exports.CreateExecutionPayloadSchema = exports.RegisterFlowPayloadSchema = exports.FlowGraphDefinitionSchema = exports.FlowEdgeSchema = exports.FlowNodeSchema = exports.FlowDefinitionSchema = exports.StepDefinitionSchema = exports.CustomStepSchema = exports.SorobanStepSchema = exports.WebhookStepSchema = exports.DelayStepSchema = exports.ConvertStepSchema = exports.PaymentStepSchema = exports.ConfirmStepSchema = exports.ReceiveStepSchema = exports.ProviderMetadataSchema = exports.ProviderFieldSchema = void 0;
const zod_1 = require("zod");
// ─── Provider Field & Action Metadata ─────────────────────────────────────────
exports.ProviderFieldSchema = zod_1.z.object({
    key: zod_1.z.string(),
    label: zod_1.z.string(),
    type: zod_1.z.enum(['string', 'number', 'boolean', 'select', 'secretRef']),
    required: zod_1.z.boolean().default(true),
    defaultValue: zod_1.z.any().optional(),
    description: zod_1.z.string().optional(),
    options: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ProviderMetadataSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.enum(['stellar', 'compliance', 'utility', 'soroban', 'custom']),
    actions: zod_1.z.array(zod_1.z.string()),
    inputFields: zod_1.z.array(exports.ProviderFieldSchema),
    secretFields: zod_1.z.array(zod_1.z.string()).optional(),
    outputs: zod_1.z.array(zod_1.z.string()),
    mockSupport: zod_1.z.boolean().default(true),
    realSupport: zod_1.z.boolean().default(true),
    docs: zod_1.z.string().optional(),
});
// ─── Discriminated Step Schemas ───────────────────────────────────────────────
exports.ReceiveStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('stellar'),
    params: zod_1.z.object({
        action: zod_1.z.literal('receive'),
        asset: zod_1.z.string().min(1, 'receive.asset must be a non-empty string'),
        minAmount: zod_1.z.number().positive('minAmount must be a positive number'),
        toAddress: zod_1.z.string().min(1, 'invalid stellar address format'),
    }),
});
exports.ConfirmStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('stellar'),
    params: zod_1.z.object({
        action: zod_1.z.literal('confirm'),
        ledgerCloses: zod_1.z.number().positive('ledgerCloses must be positive'),
    }),
});
exports.PaymentStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('stellar'),
    params: zod_1.z.object({
        action: zod_1.z.enum(['payment', 'transfer']),
        to: zod_1.z.string().min(1, 'invalid stellar address format'),
        amount: zod_1.z.number().positive('transfer.amount must be a positive number'),
        asset: zod_1.z.string().optional(),
        senderSecretRef: zod_1.z.string().optional().default('SENDER_SECRET'),
        horizonUrl: zod_1.z.string().url().optional(),
    }),
});
exports.ConvertStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('anchor'),
    params: zod_1.z.object({
        action: zod_1.z.enum(['convert', 'sep24-deposit', 'sep24-withdraw', 'anchor']),
        anchor: zod_1.z.string().optional().default('stellar-anchor'),
        from: zod_1.z.string().optional(),
        to: zod_1.z.string().optional(),
        fromAsset: zod_1.z.string().optional(),
        toAsset: zod_1.z.string().optional(),
    }),
});
exports.DelayStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('delay'),
    params: zod_1.z.object({
        seconds: zod_1.z.number().positive('delay.seconds must be a positive number'),
    }),
});
exports.WebhookStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('webhook'),
    params: zod_1.z.object({
        url: zod_1.z.string().url('invalid url format'),
    }),
});
exports.SorobanStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.literal('soroban'),
    params: zod_1.z.object({
        action: zod_1.z.literal('invoke'),
        contractId: zod_1.z.string().min(1, 'invalid soroban contract id format'),
        method: zod_1.z.string().min(1),
        args: zod_1.z.array(zod_1.z.any()).optional(),
    }),
});
exports.CustomStepSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    provider: zod_1.z.string().min(1).refine(val => val.startsWith('custom') || !['stellar', 'anchor', 'delay', 'webhook', 'soroban'].includes(val), {
        message: "Invalid standard step parameters cannot fall back to custom step"
    }),
    params: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.StepDefinitionSchema = zod_1.z.union([
    exports.ReceiveStepSchema,
    exports.ConfirmStepSchema,
    exports.PaymentStepSchema,
    exports.ConvertStepSchema,
    exports.DelayStepSchema,
    exports.WebhookStepSchema,
    exports.SorobanStepSchema,
    exports.CustomStepSchema,
]);
// ─── Flow Definition Schemas ───────────────────────────────────────────────────
exports.FlowDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, 'flow name cannot be empty'),
    version: zod_1.z.string().default('1.0.0'),
    steps: zod_1.z.array(exports.StepDefinitionSchema).min(1, 'flow must contain at least one step'),
});
// ─── Visual Node & DAG Edge Schemas ───────────────────────────────────────────
exports.FlowNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    name: zod_1.z.string(),
    x: zod_1.z.number(),
    y: zod_1.z.number(),
    params: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.FlowEdgeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    source: zod_1.z.string(),
    target: zod_1.z.string(),
});
exports.FlowGraphDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    version: zod_1.z.string().default('1.0.0'),
    nodes: zod_1.z.array(exports.FlowNodeSchema),
    edges: zod_1.z.array(exports.FlowEdgeSchema),
});
// ─── HTTP API Request Payloads ────────────────────────────────────────────────
exports.RegisterFlowPayloadSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    definition: exports.FlowDefinitionSchema,
});
exports.CreateExecutionPayloadSchema = zod_1.z.object({
    flowId: zod_1.z.string().min(1),
    context: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    idempotencyKey: zod_1.z.string().optional(),
});
exports.WebhookResumePayloadSchema = zod_1.z.object({
    suspensionKey: zod_1.z.string().min(1),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    signature: zod_1.z.string().optional(),
    eventId: zod_1.z.string().optional(),
    timestamp: zod_1.z.number().optional(),
});
