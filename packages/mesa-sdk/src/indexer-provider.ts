import { MesaDataProvider, Circle, ChamaSummary, Activity, Result, CircleStatus } from './types';

export class IndexerProvider implements MesaDataProvider {
  private indexerUrl: string;

  constructor(indexerUrl: string) {
    this.indexerUrl = indexerUrl.endsWith('/graphql') ? indexerUrl : `${indexerUrl}/graphql`;
  }

  private async fetchGraphQL(query: string, variables: Record<string, any> = {}): Promise<any> {
    const res = await fetch(this.indexerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.statusText}`);
    }
    const json = await res.json();
    if (json.errors) {
      throw new Error(`GraphQL error: ${json.errors.map((e: any) => e.message).join(', ')}`);
    }
    return json.data;
  }

  async getChamasSummary(): Promise<Result<ChamaSummary[]>> {
    try {
      const q = `
        query {
          circles {
            contract_id
            chama_id
            name
            contribution_amount
            max_members
            member_count
            status
            token
          }
        }
      `;
      const data = await this.fetchGraphQL(q);
      const list: ChamaSummary[] = data.circles.map((c: any) => ({
        id: Number(c.chama_id),
        name: c.name,
        contract_id: c.contract_id,
        contribution_amount: c.contribution_amount,
        max_members: Number(c.max_members),
        member_count: Number(c.member_count),
        status: Number(c.status) as CircleStatus,
        token: c.token,
      }));
      return { success: true, data: list };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getCircleState(contractId: string): Promise<Result<Circle>> {
    try {
      const q = `
        query($contractId: String!) {
          circle(contractId: $contractId) {
            contract_id
            chama_id
            name
            creator
            contribution_amount
            max_members
            member_count
            current_round
            deadline
            status
            token
            duration
            rotation_order
            members {
              address
              reputation
            }
          }
        }
      `;
      const data = await this.fetchGraphQL(q, { contractId });
      const c = data.circle;
      if (!c) {
        return { success: false, error: 'Circle not found in indexer cache' };
      }

      // Convert rotation_order from comma-separated string to array
      const rotation_order = c.rotation_order ? c.rotation_order.split(',') : [];

      const state: Circle = {
        name: c.name,
        creator: c.creator,
        contribution_amount: c.contribution_amount,
        max_members: Number(c.max_members),
        duration: Number(c.duration),
        token: c.token,
        members: c.members.map((m: any) => m.address),
        rotation_order: rotation_order,
        current_round: Number(c.current_round),
        deadline: Number(c.deadline),
        status: Number(c.status) as CircleStatus,
      };
      return { success: true, data: state };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getActivities(member?: string, limit?: number): Promise<Result<Activity[]>> {
    try {
      const q = `
        query($member: String, $limit: Int) {
          activities(member: $member, limit: $limit) {
            id
            contract_id
            tx_hash
            type
            member
            amount
            round
            timestamp
          }
        }
      `;
      const data = await this.fetchGraphQL(q, { member, limit });
      const list: Activity[] = data.activities.map((a: any) => ({
        hash: a.tx_hash,
        type: a.type,
        member: a.member,
        amount: a.amount || undefined,
        timestamp: Number(a.timestamp),
      }));
      return { success: true, data: list };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getTVL(): Promise<Result<string>> {
    try {
      const q = `
        query {
          globalStats {
            tvl
          }
        }
      `;
      const data = await this.fetchGraphQL(q);
      return { success: true, data: data.globalStats.tvl };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }
}
