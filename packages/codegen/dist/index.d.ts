import { FlowDefinition } from '@mesaprotocol/schema';
export declare function generateSDKCode(flow: FlowDefinition): string;
export declare function generateJSON(flow: FlowDefinition): string;
export declare function generateCurl(flow: FlowDefinition, runtimeUrl?: string): string;
export declare function parseSDKCode(code: string): FlowDefinition;
export declare function generateRunnableAppZip(flow: FlowDefinition): Promise<Blob | Buffer>;
