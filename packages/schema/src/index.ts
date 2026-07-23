import { z } from 'zod';

// ─── Provider Field & Action Metadata ─────────────────────────────────────────

export const ProviderFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'select', 'secretRef']),
  required: z.boolean().default(true),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
});
export type ProviderField = z.infer<typeof ProviderFieldSchema>;

export const ProviderMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(['stellar', 'compliance', 'utility', 'soroban', 'custom']),
  actions: z.array(z.string()),
  inputFields: z.array(ProviderFieldSchema),
  secretFields: z.array(z.string()).optional(),
  outputs: z.array(z.string()),
  mockSupport: z.boolean().default(true),
  realSupport: z.boolean().default(true),
  docs: z.string().optional(),
});
export type ProviderMetadata = z.infer<typeof ProviderMetadataSchema>;

// ─── Execution Status State Machine ───────────────────────────────────────────

export const ExecutionStatusSchema = z.enum([
  'CREATED',
  'RUNNING',
  'SUSPENDED',
  'WAITING_APPROVAL',
  'WAITING_WEBHOOK',
  'RETRYING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'COMPENSATED'
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const CompensationStepSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  params: z.object({
    action: z.string().optional().default('compensate'),
    forStepIndex: z.number().optional(),
    refundAddress: z.string().optional(),
    refundAsset: z.string().optional(),
  }).passthrough(),
});

// ─── Discriminated Step Schemas ───────────────────────────────────────────────

export const Sep10StepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('sep10'),
  params: z.object({
    action: z.literal('auth'),
    domain: z.string().min(1, 'sep10.domain must be a non-empty string'),
    accountSecretRef: z.string().optional(),
  }),
});

export const ReceiveStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('stellar'),
  params: z.object({
    action: z.literal('receive'),
    asset: z.string().min(1, 'receive.asset must be a non-empty string'),
    minAmount: z.number().positive('minAmount must be a positive number'),
    toAddress: z.string().min(1, 'invalid stellar address format'),
  }),
});

export const ConfirmStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('stellar'),
  params: z.object({
    action: z.literal('confirm'),
    ledgerCloses: z.number().positive('ledgerCloses must be positive'),
  }),
});

export const PaymentStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('stellar'),
  params: z.object({
    action: z.enum(['payment', 'transfer']),
    to: z.string().min(1, 'invalid stellar address format'),
    amount: z.number().positive('transfer.amount must be a positive number'),
    asset: z.string().optional(),
    senderSecretRef: z.string().optional().default('SENDER_SECRET'),
    horizonUrl: z.string().url().optional(),
  }),
});

export const PathPaymentStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('stellar'),
  params: z.object({
    action: z.literal('path-payment'),
    sendAsset: z.string().min(1),
    destAsset: z.string().min(1),
    sendAmount: z.number().positive(),
    destMinAmount: z.number().positive(),
    destination: z.string().min(1),
    path: z.array(z.string()).optional(),
  }),
});

export const ConvertStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('anchor'),
  params: z.object({
    action: z.enum(['convert', 'sep24-deposit', 'sep24-withdraw', 'anchor']),
    anchor: z.string().optional().default('stellar-anchor'),
    anchorDomain: z.string().optional(),
    assetCode: z.string().optional(),
    amount: z.number().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    fromAsset: z.string().optional(),
    toAsset: z.string().optional(),
  }),
});

export const DelayStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('delay'),
  params: z.object({
    seconds: z.number().positive('delay.seconds must be a positive number'),
  }),
});

export const WebhookStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('webhook'),
  params: z.object({
    url: z.string().url('invalid url format'),
  }),
});

export const SorobanStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('soroban'),
  params: z.object({
    action: z.literal('invoke'),
    contractId: z.string().min(1, 'invalid soroban contract id format'),
    method: z.string().min(1),
    args: z.array(z.any()).optional(),
  }),
});

export const ApprovalStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('approval'),
  params: z.object({
    action: z.literal('manual-approval'),
    approverRole: z.string().optional().default('operator'),
    timeoutSeconds: z.number().optional(),
  }),
});

export const ConditionStepSchema = z.object({
  name: z.string().min(1),
  provider: z.literal('condition'),
  params: z.object({
    action: z.literal('evaluate'),
    expression: z.string().min(1),
    ifTrueStep: z.number().optional(),
    ifFalseStep: z.number().optional(),
  }),
});

export const CustomStepSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1).refine(val => val.startsWith('custom') || !['stellar', 'anchor', 'delay', 'webhook', 'soroban', 'sep10', 'approval', 'condition'].includes(val), {
    message: "Invalid standard step parameters cannot fall back to custom step"
  }),
  params: z.record(z.string(), z.unknown()),
});

export const StepDefinitionSchema = z.union([
  Sep10StepSchema,
  ReceiveStepSchema,
  ConfirmStepSchema,
  PaymentStepSchema,
  PathPaymentStepSchema,
  ConvertStepSchema,
  DelayStepSchema,
  WebhookStepSchema,
  SorobanStepSchema,
  ApprovalStepSchema,
  ConditionStepSchema,
  CustomStepSchema,
]);
export type StepDefinition = z.infer<typeof StepDefinitionSchema>;

// ─── Flow Definition Schemas ───────────────────────────────────────────────────

export const FlowDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'flow name cannot be empty'),
  version: z.string().default('1.0.0'),
  steps: z.array(StepDefinitionSchema).min(1, 'flow must contain at least one step'),
});
export type FlowDefinition = z.infer<typeof FlowDefinitionSchema>;

// ─── Visual Node & DAG Edge Schemas ───────────────────────────────────────────

export const FlowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  params: z.record(z.string(), z.unknown()),
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;

export const FlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;

export const FlowGraphDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  version: z.string().default('1.0.0'),
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
});
export type FlowGraphDefinition = z.infer<typeof FlowGraphDefinitionSchema>;

// ─── HTTP API Request Payloads ────────────────────────────────────────────────

export const RegisterFlowPayloadSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  version: z.string().optional(),
  definition: FlowDefinitionSchema,
});
export type RegisterFlowPayload = z.infer<typeof RegisterFlowPayloadSchema>;

export const CreateExecutionPayloadSchema = z.object({
  flowId: z.string().min(1),
  flowVersion: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateExecutionPayload = z.infer<typeof CreateExecutionPayloadSchema>;

export const WebhookResumePayloadSchema = z.object({
  suspensionKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  signature: z.string().optional(),
  eventId: z.string().optional(),
  timestamp: z.number().optional(),
});
export type WebhookResumePayload = z.infer<typeof WebhookResumePayloadSchema>;

export const ApproveExecutionPayloadSchema = z.object({
  executionId: z.string().min(1),
  approved: z.boolean(),
  approver: z.string().optional(),
  reason: z.string().optional(),
});
export type ApproveExecutionPayload = z.infer<typeof ApproveExecutionPayloadSchema>;
