import { z } from 'zod';
export declare const ProviderFieldSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["string", "number", "boolean", "select", "secretRef"]>;
    required: z.ZodDefault<z.ZodBoolean>;
    defaultValue: z.ZodOptional<z.ZodAny>;
    description: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    key: string;
    label: string;
    type: "string" | "number" | "boolean" | "select" | "secretRef";
    required: boolean;
    options?: string[] | undefined;
    defaultValue?: any;
    description?: string | undefined;
}, {
    key: string;
    label: string;
    type: "string" | "number" | "boolean" | "select" | "secretRef";
    options?: string[] | undefined;
    required?: boolean | undefined;
    defaultValue?: any;
    description?: string | undefined;
}>;
export type ProviderField = z.infer<typeof ProviderFieldSchema>;
export declare const ProviderMetadataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["stellar", "compliance", "utility", "soroban", "custom"]>;
    actions: z.ZodArray<z.ZodString, "many">;
    inputFields: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["string", "number", "boolean", "select", "secretRef"]>;
        required: z.ZodDefault<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodAny>;
        description: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        type: "string" | "number" | "boolean" | "select" | "secretRef";
        required: boolean;
        options?: string[] | undefined;
        defaultValue?: any;
        description?: string | undefined;
    }, {
        key: string;
        label: string;
        type: "string" | "number" | "boolean" | "select" | "secretRef";
        options?: string[] | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
        description?: string | undefined;
    }>, "many">;
    secretFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    outputs: z.ZodArray<z.ZodString, "many">;
    mockSupport: z.ZodDefault<z.ZodBoolean>;
    realSupport: z.ZodDefault<z.ZodBoolean>;
    docs: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
    category: "custom" | "stellar" | "compliance" | "utility" | "soroban";
    actions: string[];
    inputFields: {
        key: string;
        label: string;
        type: "string" | "number" | "boolean" | "select" | "secretRef";
        required: boolean;
        options?: string[] | undefined;
        defaultValue?: any;
        description?: string | undefined;
    }[];
    outputs: string[];
    mockSupport: boolean;
    realSupport: boolean;
    secretFields?: string[] | undefined;
    docs?: string | undefined;
}, {
    description: string;
    name: string;
    category: "custom" | "stellar" | "compliance" | "utility" | "soroban";
    actions: string[];
    inputFields: {
        key: string;
        label: string;
        type: "string" | "number" | "boolean" | "select" | "secretRef";
        options?: string[] | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
        description?: string | undefined;
    }[];
    outputs: string[];
    secretFields?: string[] | undefined;
    mockSupport?: boolean | undefined;
    realSupport?: boolean | undefined;
    docs?: string | undefined;
}>;
export type ProviderMetadata = z.infer<typeof ProviderMetadataSchema>;
export declare const ExecutionStatusSchema: z.ZodEnum<["CREATED", "RUNNING", "SUSPENDED", "WAITING_APPROVAL", "WAITING_WEBHOOK", "RETRYING", "COMPLETED", "FAILED", "CANCELLED", "COMPENSATED"]>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
export declare const CompensationStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"compensation">;
    params: z.ZodObject<{
        action: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        forStepIndex: z.ZodOptional<z.ZodNumber>;
        refundAddress: z.ZodOptional<z.ZodString>;
        refundAsset: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        action: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        forStepIndex: z.ZodOptional<z.ZodNumber>;
        refundAddress: z.ZodOptional<z.ZodString>;
        refundAsset: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        action: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        forStepIndex: z.ZodOptional<z.ZodNumber>;
        refundAddress: z.ZodOptional<z.ZodString>;
        refundAsset: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: string;
        forStepIndex?: number | undefined;
        refundAddress?: string | undefined;
        refundAsset?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    name: string;
    provider: "compensation";
}, {
    params: {
        action?: string | undefined;
        forStepIndex?: number | undefined;
        refundAddress?: string | undefined;
        refundAsset?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    name: string;
    provider: "compensation";
}>;
export declare const Sep10StepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"sep10">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"auth">;
        domain: z.ZodString;
        accountSecretRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    }, {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    };
    name: string;
    provider: "sep10";
}, {
    params: {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    };
    name: string;
    provider: "sep10";
}>;
export declare const ReceiveStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"receive">;
        asset: z.ZodString;
        minAmount: z.ZodNumber;
        toAddress: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    }, {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    };
    name: string;
    provider: "stellar";
}>;
export declare const ConfirmStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"confirm">;
        ledgerCloses: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        action: "confirm";
        ledgerCloses: number;
    }, {
        action: "confirm";
        ledgerCloses: number;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "confirm";
        ledgerCloses: number;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "confirm";
        ledgerCloses: number;
    };
    name: string;
    provider: "stellar";
}>;
export declare const PaymentStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodEnum<["payment", "transfer"]>;
        to: z.ZodEffects<z.ZodString, string, string>;
        amount: z.ZodNumber;
        asset: z.ZodOptional<z.ZodString>;
        senderSecretRef: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        horizonUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        senderSecretRef: string;
        asset?: string | undefined;
        horizonUrl?: string | undefined;
    }, {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        asset?: string | undefined;
        senderSecretRef?: string | undefined;
        horizonUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        senderSecretRef: string;
        asset?: string | undefined;
        horizonUrl?: string | undefined;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        asset?: string | undefined;
        senderSecretRef?: string | undefined;
        horizonUrl?: string | undefined;
    };
    name: string;
    provider: "stellar";
}>;
export declare const PathPaymentStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"path-payment">;
        sendAsset: z.ZodString;
        destAsset: z.ZodString;
        sendAmount: z.ZodNumber;
        destMinAmount: z.ZodNumber;
        destination: z.ZodString;
        path: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    }, {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    };
    name: string;
    provider: "stellar";
}>;
export declare const ConvertStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"anchor">;
    params: z.ZodObject<{
        action: z.ZodEnum<["convert", "sep24-deposit", "sep24-withdraw", "anchor"]>;
        anchor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        anchorDomain: z.ZodOptional<z.ZodString>;
        assetCode: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<z.ZodNumber>;
        from: z.ZodOptional<z.ZodString>;
        to: z.ZodOptional<z.ZodString>;
        fromAsset: z.ZodOptional<z.ZodString>;
        toAsset: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        anchor: string;
        to?: string | undefined;
        amount?: number | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    }, {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        to?: string | undefined;
        amount?: number | undefined;
        anchor?: string | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        anchor: string;
        to?: string | undefined;
        amount?: number | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    };
    name: string;
    provider: "anchor";
}, {
    params: {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        to?: string | undefined;
        amount?: number | undefined;
        anchor?: string | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    };
    name: string;
    provider: "anchor";
}>;
export declare const DelayStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"delay">;
    params: z.ZodObject<{
        seconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        seconds: number;
    }, {
        seconds: number;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        seconds: number;
    };
    name: string;
    provider: "delay";
}, {
    params: {
        seconds: number;
    };
    name: string;
    provider: "delay";
}>;
export declare const WebhookStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"webhook">;
    params: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        url: string;
    };
    name: string;
    provider: "webhook";
}, {
    params: {
        url: string;
    };
    name: string;
    provider: "webhook";
}>;
export declare const SorobanStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"soroban">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"invoke">;
        contractId: z.ZodString;
        method: z.ZodString;
        args: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    }, {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    };
    name: string;
    provider: "soroban";
}, {
    params: {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    };
    name: string;
    provider: "soroban";
}>;
export declare const ApprovalStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"approval">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"manual-approval">;
        approverRole: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        timeoutSeconds: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        action: "manual-approval";
        approverRole: string;
        timeoutSeconds?: number | undefined;
    }, {
        action: "manual-approval";
        approverRole?: string | undefined;
        timeoutSeconds?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "manual-approval";
        approverRole: string;
        timeoutSeconds?: number | undefined;
    };
    name: string;
    provider: "approval";
}, {
    params: {
        action: "manual-approval";
        approverRole?: string | undefined;
        timeoutSeconds?: number | undefined;
    };
    name: string;
    provider: "approval";
}>;
export declare const ConditionStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"condition">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"evaluate">;
        expression: z.ZodString;
        ifTrueStep: z.ZodOptional<z.ZodNumber>;
        ifFalseStep: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    }, {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    };
    name: string;
    provider: "condition";
}, {
    params: {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    };
    name: string;
    provider: "condition";
}>;
export declare const CustomStepSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodEffects<z.ZodString, string, string>;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    name: string;
    provider: string;
}, {
    params: Record<string, unknown>;
    name: string;
    provider: string;
}>;
export declare const StepDefinitionSchema: z.ZodUnion<[z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"sep10">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"auth">;
        domain: z.ZodString;
        accountSecretRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    }, {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    };
    name: string;
    provider: "sep10";
}, {
    params: {
        action: "auth";
        domain: string;
        accountSecretRef?: string | undefined;
    };
    name: string;
    provider: "sep10";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"receive">;
        asset: z.ZodString;
        minAmount: z.ZodNumber;
        toAddress: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    }, {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "receive";
        asset: string;
        minAmount: number;
        toAddress: string;
    };
    name: string;
    provider: "stellar";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"confirm">;
        ledgerCloses: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        action: "confirm";
        ledgerCloses: number;
    }, {
        action: "confirm";
        ledgerCloses: number;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "confirm";
        ledgerCloses: number;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "confirm";
        ledgerCloses: number;
    };
    name: string;
    provider: "stellar";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodEnum<["payment", "transfer"]>;
        to: z.ZodEffects<z.ZodString, string, string>;
        amount: z.ZodNumber;
        asset: z.ZodOptional<z.ZodString>;
        senderSecretRef: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        horizonUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        senderSecretRef: string;
        asset?: string | undefined;
        horizonUrl?: string | undefined;
    }, {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        asset?: string | undefined;
        senderSecretRef?: string | undefined;
        horizonUrl?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        senderSecretRef: string;
        asset?: string | undefined;
        horizonUrl?: string | undefined;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "payment" | "transfer";
        to: string;
        amount: number;
        asset?: string | undefined;
        senderSecretRef?: string | undefined;
        horizonUrl?: string | undefined;
    };
    name: string;
    provider: "stellar";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"stellar">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"path-payment">;
        sendAsset: z.ZodString;
        destAsset: z.ZodString;
        sendAmount: z.ZodNumber;
        destMinAmount: z.ZodNumber;
        destination: z.ZodString;
        path: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    }, {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    };
    name: string;
    provider: "stellar";
}, {
    params: {
        action: "path-payment";
        sendAsset: string;
        destAsset: string;
        sendAmount: number;
        destMinAmount: number;
        destination: string;
        path?: string[] | undefined;
    };
    name: string;
    provider: "stellar";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"anchor">;
    params: z.ZodObject<{
        action: z.ZodEnum<["convert", "sep24-deposit", "sep24-withdraw", "anchor"]>;
        anchor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        anchorDomain: z.ZodOptional<z.ZodString>;
        assetCode: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<z.ZodNumber>;
        from: z.ZodOptional<z.ZodString>;
        to: z.ZodOptional<z.ZodString>;
        fromAsset: z.ZodOptional<z.ZodString>;
        toAsset: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        anchor: string;
        to?: string | undefined;
        amount?: number | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    }, {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        to?: string | undefined;
        amount?: number | undefined;
        anchor?: string | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        anchor: string;
        to?: string | undefined;
        amount?: number | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    };
    name: string;
    provider: "anchor";
}, {
    params: {
        action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
        to?: string | undefined;
        amount?: number | undefined;
        anchor?: string | undefined;
        anchorDomain?: string | undefined;
        assetCode?: string | undefined;
        from?: string | undefined;
        fromAsset?: string | undefined;
        toAsset?: string | undefined;
    };
    name: string;
    provider: "anchor";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"delay">;
    params: z.ZodObject<{
        seconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        seconds: number;
    }, {
        seconds: number;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        seconds: number;
    };
    name: string;
    provider: "delay";
}, {
    params: {
        seconds: number;
    };
    name: string;
    provider: "delay";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"webhook">;
    params: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        url: string;
    };
    name: string;
    provider: "webhook";
}, {
    params: {
        url: string;
    };
    name: string;
    provider: "webhook";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"soroban">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"invoke">;
        contractId: z.ZodString;
        method: z.ZodString;
        args: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    }, {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    };
    name: string;
    provider: "soroban";
}, {
    params: {
        action: "invoke";
        contractId: string;
        method: string;
        args?: any[] | undefined;
    };
    name: string;
    provider: "soroban";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"approval">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"manual-approval">;
        approverRole: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        timeoutSeconds: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        action: "manual-approval";
        approverRole: string;
        timeoutSeconds?: number | undefined;
    }, {
        action: "manual-approval";
        approverRole?: string | undefined;
        timeoutSeconds?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "manual-approval";
        approverRole: string;
        timeoutSeconds?: number | undefined;
    };
    name: string;
    provider: "approval";
}, {
    params: {
        action: "manual-approval";
        approverRole?: string | undefined;
        timeoutSeconds?: number | undefined;
    };
    name: string;
    provider: "approval";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodLiteral<"condition">;
    params: z.ZodObject<{
        action: z.ZodLiteral<"evaluate">;
        expression: z.ZodString;
        ifTrueStep: z.ZodOptional<z.ZodNumber>;
        ifFalseStep: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    }, {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    };
    name: string;
    provider: "condition";
}, {
    params: {
        action: "evaluate";
        expression: string;
        ifTrueStep?: number | undefined;
        ifFalseStep?: number | undefined;
    };
    name: string;
    provider: "condition";
}>, z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodEffects<z.ZodString, string, string>;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    name: string;
    provider: string;
}, {
    params: Record<string, unknown>;
    name: string;
    provider: string;
}>]>;
export type StepDefinition = z.infer<typeof StepDefinitionSchema>;
export declare const FlowDefinitionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    steps: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"sep10">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"auth">;
            domain: z.ZodString;
            accountSecretRef: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: "auth";
            domain: string;
            accountSecretRef?: string | undefined;
        }, {
            action: "auth";
            domain: string;
            accountSecretRef?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "auth";
            domain: string;
            accountSecretRef?: string | undefined;
        };
        name: string;
        provider: "sep10";
    }, {
        params: {
            action: "auth";
            domain: string;
            accountSecretRef?: string | undefined;
        };
        name: string;
        provider: "sep10";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"stellar">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"receive">;
            asset: z.ZodString;
            minAmount: z.ZodNumber;
            toAddress: z.ZodEffects<z.ZodString, string, string>;
        }, "strip", z.ZodTypeAny, {
            action: "receive";
            asset: string;
            minAmount: number;
            toAddress: string;
        }, {
            action: "receive";
            asset: string;
            minAmount: number;
            toAddress: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "receive";
            asset: string;
            minAmount: number;
            toAddress: string;
        };
        name: string;
        provider: "stellar";
    }, {
        params: {
            action: "receive";
            asset: string;
            minAmount: number;
            toAddress: string;
        };
        name: string;
        provider: "stellar";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"stellar">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"confirm">;
            ledgerCloses: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            action: "confirm";
            ledgerCloses: number;
        }, {
            action: "confirm";
            ledgerCloses: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "confirm";
            ledgerCloses: number;
        };
        name: string;
        provider: "stellar";
    }, {
        params: {
            action: "confirm";
            ledgerCloses: number;
        };
        name: string;
        provider: "stellar";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"stellar">;
        params: z.ZodObject<{
            action: z.ZodEnum<["payment", "transfer"]>;
            to: z.ZodEffects<z.ZodString, string, string>;
            amount: z.ZodNumber;
            asset: z.ZodOptional<z.ZodString>;
            senderSecretRef: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            horizonUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: "payment" | "transfer";
            to: string;
            amount: number;
            senderSecretRef: string;
            asset?: string | undefined;
            horizonUrl?: string | undefined;
        }, {
            action: "payment" | "transfer";
            to: string;
            amount: number;
            asset?: string | undefined;
            senderSecretRef?: string | undefined;
            horizonUrl?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "payment" | "transfer";
            to: string;
            amount: number;
            senderSecretRef: string;
            asset?: string | undefined;
            horizonUrl?: string | undefined;
        };
        name: string;
        provider: "stellar";
    }, {
        params: {
            action: "payment" | "transfer";
            to: string;
            amount: number;
            asset?: string | undefined;
            senderSecretRef?: string | undefined;
            horizonUrl?: string | undefined;
        };
        name: string;
        provider: "stellar";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"stellar">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"path-payment">;
            sendAsset: z.ZodString;
            destAsset: z.ZodString;
            sendAmount: z.ZodNumber;
            destMinAmount: z.ZodNumber;
            destination: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            action: "path-payment";
            sendAsset: string;
            destAsset: string;
            sendAmount: number;
            destMinAmount: number;
            destination: string;
            path?: string[] | undefined;
        }, {
            action: "path-payment";
            sendAsset: string;
            destAsset: string;
            sendAmount: number;
            destMinAmount: number;
            destination: string;
            path?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "path-payment";
            sendAsset: string;
            destAsset: string;
            sendAmount: number;
            destMinAmount: number;
            destination: string;
            path?: string[] | undefined;
        };
        name: string;
        provider: "stellar";
    }, {
        params: {
            action: "path-payment";
            sendAsset: string;
            destAsset: string;
            sendAmount: number;
            destMinAmount: number;
            destination: string;
            path?: string[] | undefined;
        };
        name: string;
        provider: "stellar";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"anchor">;
        params: z.ZodObject<{
            action: z.ZodEnum<["convert", "sep24-deposit", "sep24-withdraw", "anchor"]>;
            anchor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            anchorDomain: z.ZodOptional<z.ZodString>;
            assetCode: z.ZodOptional<z.ZodString>;
            amount: z.ZodOptional<z.ZodNumber>;
            from: z.ZodOptional<z.ZodString>;
            to: z.ZodOptional<z.ZodString>;
            fromAsset: z.ZodOptional<z.ZodString>;
            toAsset: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
            anchor: string;
            to?: string | undefined;
            amount?: number | undefined;
            anchorDomain?: string | undefined;
            assetCode?: string | undefined;
            from?: string | undefined;
            fromAsset?: string | undefined;
            toAsset?: string | undefined;
        }, {
            action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
            to?: string | undefined;
            amount?: number | undefined;
            anchor?: string | undefined;
            anchorDomain?: string | undefined;
            assetCode?: string | undefined;
            from?: string | undefined;
            fromAsset?: string | undefined;
            toAsset?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
            anchor: string;
            to?: string | undefined;
            amount?: number | undefined;
            anchorDomain?: string | undefined;
            assetCode?: string | undefined;
            from?: string | undefined;
            fromAsset?: string | undefined;
            toAsset?: string | undefined;
        };
        name: string;
        provider: "anchor";
    }, {
        params: {
            action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
            to?: string | undefined;
            amount?: number | undefined;
            anchor?: string | undefined;
            anchorDomain?: string | undefined;
            assetCode?: string | undefined;
            from?: string | undefined;
            fromAsset?: string | undefined;
            toAsset?: string | undefined;
        };
        name: string;
        provider: "anchor";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"delay">;
        params: z.ZodObject<{
            seconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            seconds: number;
        }, {
            seconds: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            seconds: number;
        };
        name: string;
        provider: "delay";
    }, {
        params: {
            seconds: number;
        };
        name: string;
        provider: "delay";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"webhook">;
        params: z.ZodObject<{
            url: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            url: string;
        }, {
            url: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            url: string;
        };
        name: string;
        provider: "webhook";
    }, {
        params: {
            url: string;
        };
        name: string;
        provider: "webhook";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"soroban">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"invoke">;
            contractId: z.ZodString;
            method: z.ZodString;
            args: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        }, "strip", z.ZodTypeAny, {
            action: "invoke";
            contractId: string;
            method: string;
            args?: any[] | undefined;
        }, {
            action: "invoke";
            contractId: string;
            method: string;
            args?: any[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "invoke";
            contractId: string;
            method: string;
            args?: any[] | undefined;
        };
        name: string;
        provider: "soroban";
    }, {
        params: {
            action: "invoke";
            contractId: string;
            method: string;
            args?: any[] | undefined;
        };
        name: string;
        provider: "soroban";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"approval">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"manual-approval">;
            approverRole: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            timeoutSeconds: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            action: "manual-approval";
            approverRole: string;
            timeoutSeconds?: number | undefined;
        }, {
            action: "manual-approval";
            approverRole?: string | undefined;
            timeoutSeconds?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "manual-approval";
            approverRole: string;
            timeoutSeconds?: number | undefined;
        };
        name: string;
        provider: "approval";
    }, {
        params: {
            action: "manual-approval";
            approverRole?: string | undefined;
            timeoutSeconds?: number | undefined;
        };
        name: string;
        provider: "approval";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodLiteral<"condition">;
        params: z.ZodObject<{
            action: z.ZodLiteral<"evaluate">;
            expression: z.ZodString;
            ifTrueStep: z.ZodOptional<z.ZodNumber>;
            ifFalseStep: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            action: "evaluate";
            expression: string;
            ifTrueStep?: number | undefined;
            ifFalseStep?: number | undefined;
        }, {
            action: "evaluate";
            expression: string;
            ifTrueStep?: number | undefined;
            ifFalseStep?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        params: {
            action: "evaluate";
            expression: string;
            ifTrueStep?: number | undefined;
            ifFalseStep?: number | undefined;
        };
        name: string;
        provider: "condition";
    }, {
        params: {
            action: "evaluate";
            expression: string;
            ifTrueStep?: number | undefined;
            ifFalseStep?: number | undefined;
        };
        name: string;
        provider: "condition";
    }>, z.ZodObject<{
        name: z.ZodString;
        provider: z.ZodEffects<z.ZodString, string, string>;
        params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        params: Record<string, unknown>;
        name: string;
        provider: string;
    }, {
        params: Record<string, unknown>;
        name: string;
        provider: string;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    steps: ({
        params: {
            action: "auth";
            domain: string;
            accountSecretRef?: string | undefined;
        };
        name: string;
        provider: "sep10";
    } | {
        params: {
            action: "receive";
            asset: string;
            minAmount: number;
            toAddress: string;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "confirm";
            ledgerCloses: number;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "payment" | "transfer";
            to: string;
            amount: number;
            senderSecretRef: string;
            asset?: string | undefined;
            horizonUrl?: string | undefined;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "path-payment";
            sendAsset: string;
            destAsset: string;
            sendAmount: number;
            destMinAmount: number;
            destination: string;
            path?: string[] | undefined;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
            anchor: string;
            to?: string | undefined;
            amount?: number | undefined;
            anchorDomain?: string | undefined;
            assetCode?: string | undefined;
            from?: string | undefined;
            fromAsset?: string | undefined;
            toAsset?: string | undefined;
        };
        name: string;
        provider: "anchor";
    } | {
        params: {
            seconds: number;
        };
        name: string;
        provider: "delay";
    } | {
        params: {
            url: string;
        };
        name: string;
        provider: "webhook";
    } | {
        params: {
            action: "invoke";
            contractId: string;
            method: string;
            args?: any[] | undefined;
        };
        name: string;
        provider: "soroban";
    } | {
        params: {
            action: "manual-approval";
            approverRole: string;
            timeoutSeconds?: number | undefined;
        };
        name: string;
        provider: "approval";
    } | {
        params: {
            action: "evaluate";
            expression: string;
            ifTrueStep?: number | undefined;
            ifFalseStep?: number | undefined;
        };
        name: string;
        provider: "condition";
    } | {
        params: Record<string, unknown>;
        name: string;
        provider: string;
    })[];
    id?: string | undefined;
}, {
    name: string;
    steps: ({
        params: {
            action: "auth";
            domain: string;
            accountSecretRef?: string | undefined;
        };
        name: string;
        provider: "sep10";
    } | {
        params: {
            action: "receive";
            asset: string;
            minAmount: number;
            toAddress: string;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "confirm";
            ledgerCloses: number;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "payment" | "transfer";
            to: string;
            amount: number;
            asset?: string | undefined;
            senderSecretRef?: string | undefined;
            horizonUrl?: string | undefined;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "path-payment";
            sendAsset: string;
            destAsset: string;
            sendAmount: number;
            destMinAmount: number;
            destination: string;
            path?: string[] | undefined;
        };
        name: string;
        provider: "stellar";
    } | {
        params: {
            action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
            to?: string | undefined;
            amount?: number | undefined;
            anchor?: string | undefined;
            anchorDomain?: string | undefined;
            assetCode?: string | undefined;
            from?: string | undefined;
            fromAsset?: string | undefined;
            toAsset?: string | undefined;
        };
        name: string;
        provider: "anchor";
    } | {
        params: {
            seconds: number;
        };
        name: string;
        provider: "delay";
    } | {
        params: {
            url: string;
        };
        name: string;
        provider: "webhook";
    } | {
        params: {
            action: "invoke";
            contractId: string;
            method: string;
            args?: any[] | undefined;
        };
        name: string;
        provider: "soroban";
    } | {
        params: {
            action: "manual-approval";
            approverRole?: string | undefined;
            timeoutSeconds?: number | undefined;
        };
        name: string;
        provider: "approval";
    } | {
        params: {
            action: "evaluate";
            expression: string;
            ifTrueStep?: number | undefined;
            ifFalseStep?: number | undefined;
        };
        name: string;
        provider: "condition";
    } | {
        params: Record<string, unknown>;
        name: string;
        provider: string;
    })[];
    id?: string | undefined;
    version?: string | undefined;
}>;
export type FlowDefinition = z.infer<typeof FlowDefinitionSchema>;
export declare const FlowNodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    name: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: string;
    params: Record<string, unknown>;
    name: string;
    id: string;
    x: number;
    y: number;
}, {
    type: string;
    params: Record<string, unknown>;
    name: string;
    id: string;
    x: number;
    y: number;
}>;
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export declare const FlowEdgeSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodString;
    target: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    source: string;
    target: string;
}, {
    id: string;
    source: string;
    target: string;
}>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export declare const FlowGraphDefinitionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        params: Record<string, unknown>;
        name: string;
        id: string;
        x: number;
        y: number;
    }, {
        type: string;
        params: Record<string, unknown>;
        name: string;
        id: string;
        x: number;
        y: number;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodString;
        target: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        source: string;
        target: string;
    }, {
        id: string;
        source: string;
        target: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    nodes: {
        type: string;
        params: Record<string, unknown>;
        name: string;
        id: string;
        x: number;
        y: number;
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
    }[];
    id?: string | undefined;
}, {
    name: string;
    nodes: {
        type: string;
        params: Record<string, unknown>;
        name: string;
        id: string;
        x: number;
        y: number;
    }[];
    edges: {
        id: string;
        source: string;
        target: string;
    }[];
    id?: string | undefined;
    version?: string | undefined;
}>;
export type FlowGraphDefinition = z.infer<typeof FlowGraphDefinitionSchema>;
export declare const RegisterFlowPayloadSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    definition: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        version: z.ZodDefault<z.ZodString>;
        steps: z.ZodArray<z.ZodUnion<[z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"sep10">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"auth">;
                domain: z.ZodString;
                accountSecretRef: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            }, {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            };
            name: string;
            provider: "sep10";
        }, {
            params: {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            };
            name: string;
            provider: "sep10";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"stellar">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"receive">;
                asset: z.ZodString;
                minAmount: z.ZodNumber;
                toAddress: z.ZodEffects<z.ZodString, string, string>;
            }, "strip", z.ZodTypeAny, {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            }, {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            };
            name: string;
            provider: "stellar";
        }, {
            params: {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            };
            name: string;
            provider: "stellar";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"stellar">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"confirm">;
                ledgerCloses: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                action: "confirm";
                ledgerCloses: number;
            }, {
                action: "confirm";
                ledgerCloses: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "confirm";
                ledgerCloses: number;
            };
            name: string;
            provider: "stellar";
        }, {
            params: {
                action: "confirm";
                ledgerCloses: number;
            };
            name: string;
            provider: "stellar";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"stellar">;
            params: z.ZodObject<{
                action: z.ZodEnum<["payment", "transfer"]>;
                to: z.ZodEffects<z.ZodString, string, string>;
                amount: z.ZodNumber;
                asset: z.ZodOptional<z.ZodString>;
                senderSecretRef: z.ZodDefault<z.ZodOptional<z.ZodString>>;
                horizonUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                senderSecretRef: string;
                asset?: string | undefined;
                horizonUrl?: string | undefined;
            }, {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                asset?: string | undefined;
                senderSecretRef?: string | undefined;
                horizonUrl?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                senderSecretRef: string;
                asset?: string | undefined;
                horizonUrl?: string | undefined;
            };
            name: string;
            provider: "stellar";
        }, {
            params: {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                asset?: string | undefined;
                senderSecretRef?: string | undefined;
                horizonUrl?: string | undefined;
            };
            name: string;
            provider: "stellar";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"stellar">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"path-payment">;
                sendAsset: z.ZodString;
                destAsset: z.ZodString;
                sendAmount: z.ZodNumber;
                destMinAmount: z.ZodNumber;
                destination: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            }, {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            };
            name: string;
            provider: "stellar";
        }, {
            params: {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            };
            name: string;
            provider: "stellar";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"anchor">;
            params: z.ZodObject<{
                action: z.ZodEnum<["convert", "sep24-deposit", "sep24-withdraw", "anchor"]>;
                anchor: z.ZodDefault<z.ZodOptional<z.ZodString>>;
                anchorDomain: z.ZodOptional<z.ZodString>;
                assetCode: z.ZodOptional<z.ZodString>;
                amount: z.ZodOptional<z.ZodNumber>;
                from: z.ZodOptional<z.ZodString>;
                to: z.ZodOptional<z.ZodString>;
                fromAsset: z.ZodOptional<z.ZodString>;
                toAsset: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                anchor: string;
                to?: string | undefined;
                amount?: number | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            }, {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                to?: string | undefined;
                amount?: number | undefined;
                anchor?: string | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                anchor: string;
                to?: string | undefined;
                amount?: number | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            };
            name: string;
            provider: "anchor";
        }, {
            params: {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                to?: string | undefined;
                amount?: number | undefined;
                anchor?: string | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            };
            name: string;
            provider: "anchor";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"delay">;
            params: z.ZodObject<{
                seconds: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                seconds: number;
            }, {
                seconds: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                seconds: number;
            };
            name: string;
            provider: "delay";
        }, {
            params: {
                seconds: number;
            };
            name: string;
            provider: "delay";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"webhook">;
            params: z.ZodObject<{
                url: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                url: string;
            }, {
                url: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                url: string;
            };
            name: string;
            provider: "webhook";
        }, {
            params: {
                url: string;
            };
            name: string;
            provider: "webhook";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"soroban">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"invoke">;
                contractId: z.ZodString;
                method: z.ZodString;
                args: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
            }, "strip", z.ZodTypeAny, {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            }, {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            };
            name: string;
            provider: "soroban";
        }, {
            params: {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            };
            name: string;
            provider: "soroban";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"approval">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"manual-approval">;
                approverRole: z.ZodDefault<z.ZodOptional<z.ZodString>>;
                timeoutSeconds: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                action: "manual-approval";
                approverRole: string;
                timeoutSeconds?: number | undefined;
            }, {
                action: "manual-approval";
                approverRole?: string | undefined;
                timeoutSeconds?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "manual-approval";
                approverRole: string;
                timeoutSeconds?: number | undefined;
            };
            name: string;
            provider: "approval";
        }, {
            params: {
                action: "manual-approval";
                approverRole?: string | undefined;
                timeoutSeconds?: number | undefined;
            };
            name: string;
            provider: "approval";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodLiteral<"condition">;
            params: z.ZodObject<{
                action: z.ZodLiteral<"evaluate">;
                expression: z.ZodString;
                ifTrueStep: z.ZodOptional<z.ZodNumber>;
                ifFalseStep: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            }, {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            params: {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            };
            name: string;
            provider: "condition";
        }, {
            params: {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            };
            name: string;
            provider: "condition";
        }>, z.ZodObject<{
            name: z.ZodString;
            provider: z.ZodEffects<z.ZodString, string, string>;
            params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            params: Record<string, unknown>;
            name: string;
            provider: string;
        }, {
            params: Record<string, unknown>;
            name: string;
            provider: string;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        version: string;
        steps: ({
            params: {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            };
            name: string;
            provider: "sep10";
        } | {
            params: {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "confirm";
                ledgerCloses: number;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                senderSecretRef: string;
                asset?: string | undefined;
                horizonUrl?: string | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                anchor: string;
                to?: string | undefined;
                amount?: number | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            };
            name: string;
            provider: "anchor";
        } | {
            params: {
                seconds: number;
            };
            name: string;
            provider: "delay";
        } | {
            params: {
                url: string;
            };
            name: string;
            provider: "webhook";
        } | {
            params: {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            };
            name: string;
            provider: "soroban";
        } | {
            params: {
                action: "manual-approval";
                approverRole: string;
                timeoutSeconds?: number | undefined;
            };
            name: string;
            provider: "approval";
        } | {
            params: {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            };
            name: string;
            provider: "condition";
        } | {
            params: Record<string, unknown>;
            name: string;
            provider: string;
        })[];
        id?: string | undefined;
    }, {
        name: string;
        steps: ({
            params: {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            };
            name: string;
            provider: "sep10";
        } | {
            params: {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "confirm";
                ledgerCloses: number;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                asset?: string | undefined;
                senderSecretRef?: string | undefined;
                horizonUrl?: string | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                to?: string | undefined;
                amount?: number | undefined;
                anchor?: string | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            };
            name: string;
            provider: "anchor";
        } | {
            params: {
                seconds: number;
            };
            name: string;
            provider: "delay";
        } | {
            params: {
                url: string;
            };
            name: string;
            provider: "webhook";
        } | {
            params: {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            };
            name: string;
            provider: "soroban";
        } | {
            params: {
                action: "manual-approval";
                approverRole?: string | undefined;
                timeoutSeconds?: number | undefined;
            };
            name: string;
            provider: "approval";
        } | {
            params: {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            };
            name: string;
            provider: "condition";
        } | {
            params: Record<string, unknown>;
            name: string;
            provider: string;
        })[];
        id?: string | undefined;
        version?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    definition: {
        name: string;
        version: string;
        steps: ({
            params: {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            };
            name: string;
            provider: "sep10";
        } | {
            params: {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "confirm";
                ledgerCloses: number;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                senderSecretRef: string;
                asset?: string | undefined;
                horizonUrl?: string | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                anchor: string;
                to?: string | undefined;
                amount?: number | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            };
            name: string;
            provider: "anchor";
        } | {
            params: {
                seconds: number;
            };
            name: string;
            provider: "delay";
        } | {
            params: {
                url: string;
            };
            name: string;
            provider: "webhook";
        } | {
            params: {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            };
            name: string;
            provider: "soroban";
        } | {
            params: {
                action: "manual-approval";
                approverRole: string;
                timeoutSeconds?: number | undefined;
            };
            name: string;
            provider: "approval";
        } | {
            params: {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            };
            name: string;
            provider: "condition";
        } | {
            params: Record<string, unknown>;
            name: string;
            provider: string;
        })[];
        id?: string | undefined;
    };
    id?: string | undefined;
    version?: string | undefined;
}, {
    name: string;
    definition: {
        name: string;
        steps: ({
            params: {
                action: "auth";
                domain: string;
                accountSecretRef?: string | undefined;
            };
            name: string;
            provider: "sep10";
        } | {
            params: {
                action: "receive";
                asset: string;
                minAmount: number;
                toAddress: string;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "confirm";
                ledgerCloses: number;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "payment" | "transfer";
                to: string;
                amount: number;
                asset?: string | undefined;
                senderSecretRef?: string | undefined;
                horizonUrl?: string | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "path-payment";
                sendAsset: string;
                destAsset: string;
                sendAmount: number;
                destMinAmount: number;
                destination: string;
                path?: string[] | undefined;
            };
            name: string;
            provider: "stellar";
        } | {
            params: {
                action: "anchor" | "convert" | "sep24-deposit" | "sep24-withdraw";
                to?: string | undefined;
                amount?: number | undefined;
                anchor?: string | undefined;
                anchorDomain?: string | undefined;
                assetCode?: string | undefined;
                from?: string | undefined;
                fromAsset?: string | undefined;
                toAsset?: string | undefined;
            };
            name: string;
            provider: "anchor";
        } | {
            params: {
                seconds: number;
            };
            name: string;
            provider: "delay";
        } | {
            params: {
                url: string;
            };
            name: string;
            provider: "webhook";
        } | {
            params: {
                action: "invoke";
                contractId: string;
                method: string;
                args?: any[] | undefined;
            };
            name: string;
            provider: "soroban";
        } | {
            params: {
                action: "manual-approval";
                approverRole?: string | undefined;
                timeoutSeconds?: number | undefined;
            };
            name: string;
            provider: "approval";
        } | {
            params: {
                action: "evaluate";
                expression: string;
                ifTrueStep?: number | undefined;
                ifFalseStep?: number | undefined;
            };
            name: string;
            provider: "condition";
        } | {
            params: Record<string, unknown>;
            name: string;
            provider: string;
        })[];
        id?: string | undefined;
        version?: string | undefined;
    };
    id?: string | undefined;
    version?: string | undefined;
}>;
export type RegisterFlowPayload = z.infer<typeof RegisterFlowPayloadSchema>;
export declare const CreateExecutionPayloadSchema: z.ZodObject<{
    flowId: z.ZodString;
    flowVersion: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    flowId: string;
    flowVersion?: string | undefined;
    context?: Record<string, unknown> | undefined;
    idempotencyKey?: string | undefined;
}, {
    flowId: string;
    flowVersion?: string | undefined;
    context?: Record<string, unknown> | undefined;
    idempotencyKey?: string | undefined;
}>;
export type CreateExecutionPayload = z.infer<typeof CreateExecutionPayloadSchema>;
export declare const WebhookResumePayloadSchema: z.ZodObject<{
    suspensionKey: z.ZodString;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    signature: z.ZodOptional<z.ZodString>;
    eventId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    suspensionKey: string;
    payload?: Record<string, unknown> | undefined;
    signature?: string | undefined;
    eventId?: string | undefined;
    timestamp?: number | undefined;
}, {
    suspensionKey: string;
    payload?: Record<string, unknown> | undefined;
    signature?: string | undefined;
    eventId?: string | undefined;
    timestamp?: number | undefined;
}>;
export type WebhookResumePayload = z.infer<typeof WebhookResumePayloadSchema>;
export declare const ApproveExecutionPayloadSchema: z.ZodObject<{
    executionId: z.ZodString;
    approved: z.ZodBoolean;
    approver: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    executionId: string;
    approved: boolean;
    approver?: string | undefined;
    reason?: string | undefined;
}, {
    executionId: string;
    approved: boolean;
    approver?: string | undefined;
    reason?: string | undefined;
}>;
export type ApproveExecutionPayload = z.infer<typeof ApproveExecutionPayloadSchema>;
export declare const MesaErrorCodeSchema: z.ZodEnum<["ERR_INVALID_FLOW_DEFINITION", "ERR_FLOW_NOT_FOUND", "ERR_EXECUTION_NOT_FOUND", "ERR_STEP_FAILED", "ERR_ANCHOR_TIMEOUT", "ERR_INSUFFICIENT_BALANCE", "ERR_HMAC_INVALID", "ERR_TIMESTAMP_DRIFT_EXCEEDED", "ERR_DUPLICATE_EVENT_ID", "ERR_APPROVAL_REJECTED", "ERR_COMPENSATION_FAILED", "ERR_PROVIDER_NOT_FOUND"]>;
export type MesaErrorCode = z.infer<typeof MesaErrorCodeSchema>;
export declare class MesaError extends Error {
    readonly code: MesaErrorCode;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    constructor(code: MesaErrorCode, message: string, statusCode?: number, details?: Record<string, unknown>);
    toJSON(): {
        error: string;
        code: "ERR_INVALID_FLOW_DEFINITION" | "ERR_FLOW_NOT_FOUND" | "ERR_EXECUTION_NOT_FOUND" | "ERR_STEP_FAILED" | "ERR_ANCHOR_TIMEOUT" | "ERR_INSUFFICIENT_BALANCE" | "ERR_HMAC_INVALID" | "ERR_TIMESTAMP_DRIFT_EXCEEDED" | "ERR_DUPLICATE_EVENT_ID" | "ERR_APPROVAL_REJECTED" | "ERR_COMPENSATION_FAILED" | "ERR_PROVIDER_NOT_FOUND";
        statusCode: number;
        details: Record<string, unknown> | undefined;
    };
}
