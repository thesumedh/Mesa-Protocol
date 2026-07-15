export interface MesaConfig {
  rpcUrl: string;
  factoryContractId: string;
  network: 'testnet' | 'futurenet' | 'mainnet';
  networkPassphrase: string;
  indexerUrl?: string;
}

export enum CircleStatus {
  Signup = 0,
  Active = 1,
  Paused = 2,
  Completed = 3,
}

export interface Circle {
  name: string;
  creator: string;
  contribution_amount: string; // BigInt represented as string for JSON safety
  max_members: number;
  duration: number;
  token: string;
  members: string[];
  rotation_order: string[];
  current_round: number;
  deadline: number;
  status: CircleStatus;
  payout_mode: number;
}

export interface ChamaSummary {
  id: number;
  name: string;
  contract_id: string;
  contribution_amount: string;
  max_members: number;
  member_count: number;
  status: CircleStatus;
  token: string;
  payout_mode: number;
}

export interface Activity {
  hash: string;
  type: string;
  member: string;
  amount?: string;
  timestamp: number;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MesaDataProvider {
  getChamasSummary(): Promise<Result<ChamaSummary[]>>;
  getCircleState(contractId: string): Promise<Result<Circle>>;
  getActivities(member?: string, limit?: number): Promise<Result<Activity[]>>;
  getTVL(): Promise<Result<string>>;
}
