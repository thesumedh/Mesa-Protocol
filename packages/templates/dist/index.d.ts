import { FlowDefinition } from '@mesaprotocol/schema';
export interface WorkflowTemplateInfo {
    id: string;
    name: string;
    category: 'remittance' | 'payroll' | 'vault' | 'escrow' | 'invoice' | 'subscription';
    description: string;
    definition: FlowDefinition;
}
export declare const REMITTANCE_TEMPLATE: WorkflowTemplateInfo;
export declare const PAYROLL_TEMPLATE: WorkflowTemplateInfo;
export declare const VAULT_TEMPLATE: WorkflowTemplateInfo;
export declare const ESCROW_TEMPLATE: WorkflowTemplateInfo;
export declare const INVOICE_TEMPLATE: WorkflowTemplateInfo;
export declare const SUBSCRIPTION_TEMPLATE: WorkflowTemplateInfo;
export declare const ALL_TEMPLATES: Record<string, WorkflowTemplateInfo>;
export declare function getTemplate(key: string): WorkflowTemplateInfo;
