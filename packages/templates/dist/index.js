"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_TEMPLATES = exports.SUBSCRIPTION_TEMPLATE = exports.INVOICE_TEMPLATE = exports.ESCROW_TEMPLATE = exports.VAULT_TEMPLATE = exports.PAYROLL_TEMPLATE = exports.REMITTANCE_TEMPLATE = void 0;
exports.getTemplate = getTemplate;
const schema_1 = require("@mesaprotocol/schema");
exports.REMITTANCE_TEMPLATE = {
    id: 'remittance-corridor',
    name: 'Cross-Border Remittance Corridor',
    category: 'remittance',
    description: 'Authenticates SEP-10 session, accepts SEP-24 USD deposit, converts via DEX Path Payment, and pays out XLM.',
    definition: schema_1.FlowDefinitionSchema.parse({
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
exports.PAYROLL_TEMPLATE = {
    id: 'payroll-payout',
    name: 'Automated Payroll Payout',
    category: 'payroll',
    description: 'Receives corporate treasury funding, evaluates compliance condition, and executes batch employee payouts.',
    definition: schema_1.FlowDefinitionSchema.parse({
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
exports.VAULT_TEMPLATE = {
    id: 'soroban-savings-vault',
    name: 'Soroban Smart Contract Savings Vault',
    category: 'vault',
    description: 'Authenticates user, receives deposit, and invokes Soroban Yield Vault smart contract.',
    definition: schema_1.FlowDefinitionSchema.parse({
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
exports.ESCROW_TEMPLATE = {
    id: 'escrow-savings-circle',
    name: 'Timelocked Escrow & Savings Circle',
    category: 'escrow',
    description: 'Receives member contribution, pauses for Operator Approval sign-off, and releases funds to winner.',
    definition: schema_1.FlowDefinitionSchema.parse({
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
exports.INVOICE_TEMPLATE = {
    id: 'invoice-settlement',
    name: 'Anchor Invoice Settlement',
    category: 'invoice',
    description: 'Accepts SEP-24 off-ramp invoice deposit and verifies ledger confirmation.',
    definition: schema_1.FlowDefinitionSchema.parse({
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
exports.SUBSCRIPTION_TEMPLATE = {
    id: 'subscription-payout',
    name: 'Recurring Subscription Payout',
    category: 'subscription',
    description: 'Schedules recurring payment cycles with delay pauses between charges.',
    definition: schema_1.FlowDefinitionSchema.parse({
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
exports.ALL_TEMPLATES = {
    remittance: exports.REMITTANCE_TEMPLATE,
    payroll: exports.PAYROLL_TEMPLATE,
    vault: exports.VAULT_TEMPLATE,
    escrow: exports.ESCROW_TEMPLATE,
    invoice: exports.INVOICE_TEMPLATE,
    subscription: exports.SUBSCRIPTION_TEMPLATE,
};
function getTemplate(key) {
    const t = exports.ALL_TEMPLATES[key.toLowerCase()];
    if (!t)
        return exports.REMITTANCE_TEMPLATE;
    return t;
}
