import { FlowDefinition, FlowDefinitionSchema } from '@mesaprotocol/schema';

export interface WorkflowTemplateInfo {
  id: string;
  name: string;
  category: 'remittance' | 'payroll' | 'vault' | 'escrow' | 'invoice' | 'subscription';
  description: string;
  definition: FlowDefinition;
}

export const REMITTANCE_TEMPLATE: WorkflowTemplateInfo = {
  id: 'remittance-corridor',
  name: 'Cross-Border Remittance Corridor',
  category: 'remittance',
  description: 'Authenticates SEP-10 session, accepts SEP-24 USD deposit, converts via DEX Path Payment, and pays out XLM.',
  definition: FlowDefinitionSchema.parse({
    id: 'remittance-corridor',
    name: 'Cross-Border Remittance Corridor',
    version: '1.0.0',
    steps: [
      {
        name: 'SEP-10 Auth Challenge',
        provider: 'sep10',
        params: {
          action: 'auth',
          domain: 'anchor.stellar.org',
          accountSecretRef: 'SENDER_SECRET'
        }
      },
      {
        name: 'SEP-24 Interactive USD Deposit',
        provider: 'anchor',
        params: {
          action: 'sep24-deposit',
          anchorDomain: 'anchor.stellar.org',
          assetCode: 'USDC',
          amount: 100
        }
      },
      {
        name: 'Stellar DEX Path Payment (USDC -> XLM)',
        provider: 'stellar',
        params: {
          action: 'path-payment',
          sendAsset: 'USDC',
          destAsset: 'XLM',
          sendAmount: 100,
          destMinAmount: 95,
          destination: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P'
        }
      },
      {
        name: 'Compliance Delay',
        provider: 'delay',
        params: { seconds: 2 }
      },
      {
        name: 'Final XLM Payout Settlement',
        provider: 'stellar',
        params: {
          action: 'payment',
          amount: 95,
          to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P',
          senderSecretRef: 'SENDER_SECRET'
        }
      }
    ]
  })
};

export const PAYROLL_TEMPLATE: WorkflowTemplateInfo = {
  id: 'payroll-payout',
  name: 'Automated Payroll Payout',
  category: 'payroll',
  description: 'Receives corporate treasury funding, evaluates compliance condition, and executes batch employee payouts.',
  definition: FlowDefinitionSchema.parse({
    id: 'payroll-payout',
    name: 'Automated Payroll Payout',
    version: '1.0.0',
    steps: [
      {
        name: 'Receive Treasury Deposit',
        provider: 'stellar',
        params: { action: 'receive', asset: 'USDC', minAmount: 1000, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' }
      },
      {
        name: 'Evaluate Compliance Check',
        provider: 'condition',
        params: { action: 'evaluate', expression: 'depositedAmount >= 1000' }
      },
      {
        name: 'Batch Employee Payout 1',
        provider: 'stellar',
        params: { action: 'payment', amount: 500, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'SENDER_SECRET' }
      },
      {
        name: 'Batch Employee Payout 2',
        provider: 'stellar',
        params: { action: 'payment', amount: 500, to: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU', senderSecretRef: 'SENDER_SECRET' }
      }
    ]
  })
};

export const VAULT_TEMPLATE: WorkflowTemplateInfo = {
  id: 'soroban-savings-vault',
  name: 'Soroban Smart Contract Savings Vault',
  category: 'vault',
  description: 'Authenticates user, receives deposit, and invokes Soroban Yield Vault smart contract.',
  definition: FlowDefinitionSchema.parse({
    id: 'soroban-savings-vault',
    name: 'Soroban Smart Contract Savings Vault',
    version: '1.0.0',
    steps: [
      {
        name: 'SEP-10 User Authentication',
        provider: 'sep10',
        params: { action: 'auth', domain: 'vault.stellar.org' }
      },
      {
        name: 'Receive Vault USDC Deposit',
        provider: 'stellar',
        params: { action: 'receive', asset: 'USDC', minAmount: 100, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' }
      },
      {
        name: 'Invoke Soroban Vault Deposit Method',
        provider: 'soroban',
        params: { action: 'invoke', contractId: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZFZFPG223LLT4Z6PNEV', method: 'deposit', args: [100] }
      }
    ]
  })
};

export const ESCROW_TEMPLATE: WorkflowTemplateInfo = {
  id: 'escrow-savings-circle',
  name: 'Timelocked Escrow & Savings Circle',
  category: 'escrow',
  description: 'Receives member contribution, pauses for Operator Approval sign-off, and releases funds to winner.',
  definition: FlowDefinitionSchema.parse({
    id: 'escrow-savings-circle',
    name: 'Timelocked Escrow & Savings Circle',
    version: '1.0.0',
    steps: [
      {
        name: 'Receive Member Deposit',
        provider: 'stellar',
        params: { action: 'receive', asset: 'XLM', minAmount: 50, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' }
      },
      {
        name: 'Operator Manual Approval',
        provider: 'approval',
        params: { action: 'manual-approval', approverRole: 'compliance_officer', timeoutSeconds: 86400 }
      },
      {
        name: 'Disburse Prize Pool Winner Payout',
        provider: 'stellar',
        params: { action: 'payment', amount: 50, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'SENDER_SECRET' }
      }
    ]
  })
};

export const INVOICE_TEMPLATE: WorkflowTemplateInfo = {
  id: 'invoice-settlement',
  name: 'Anchor Invoice Settlement',
  category: 'invoice',
  description: 'Accepts SEP-24 off-ramp invoice deposit and verifies ledger confirmation.',
  definition: FlowDefinitionSchema.parse({
    id: 'invoice-settlement',
    name: 'Anchor Invoice Settlement',
    version: '1.0.0',
    steps: [
      {
        name: 'SEP-24 Invoice Off-Ramp Deposit',
        provider: 'anchor',
        params: { action: 'sep24-deposit', anchorDomain: 'invoice.stellar.org', assetCode: 'USDC', amount: 250 }
      },
      {
        name: 'Confirm Ledger Settlement',
        provider: 'stellar',
        params: { action: 'confirm', ledgerCloses: 1 }
      }
    ]
  })
};

export const SUBSCRIPTION_TEMPLATE: WorkflowTemplateInfo = {
  id: 'subscription-payout',
  name: 'Recurring Subscription Payout',
  category: 'subscription',
  description: 'Schedules recurring payment cycles with delay pauses between charges.',
  definition: FlowDefinitionSchema.parse({
    id: 'subscription-payout',
    name: 'Recurring Subscription Payout',
    version: '1.0.0',
    steps: [
      {
        name: 'Receive Initial Subscription Charge',
        provider: 'stellar',
        params: { action: 'receive', asset: 'USDC', minAmount: 15, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' }
      },
      {
        name: 'Billing Cycle Delay (30 Days)',
        provider: 'delay',
        params: { seconds: 5 }
      },
      {
        name: 'Execute Recurring Merchant Payout',
        provider: 'stellar',
        params: { action: 'payment', amount: 15, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'SENDER_SECRET' }
      }
    ]
  })
};

export const ALL_TEMPLATES: Record<string, WorkflowTemplateInfo> = {
  remittance: REMITTANCE_TEMPLATE,
  payroll: PAYROLL_TEMPLATE,
  vault: VAULT_TEMPLATE,
  escrow: ESCROW_TEMPLATE,
  invoice: INVOICE_TEMPLATE,
  subscription: SUBSCRIPTION_TEMPLATE,
};

export function getTemplate(key: string): WorkflowTemplateInfo {
  const t = ALL_TEMPLATES[key.toLowerCase()];
  if (!t) return REMITTANCE_TEMPLATE;
  return t;
}
