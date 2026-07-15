import { MesaDataProvider, Circle, ChamaSummary, Activity, Result, CircleStatus } from './types';
import { FactoryWrapper } from './factory';
import { CircleWrapper } from './circle';

export class RpcDataProvider implements MesaDataProvider {
  private factory: FactoryWrapper;
  private circle: CircleWrapper;

  constructor(factory: FactoryWrapper, circle: CircleWrapper) {
    this.factory = factory;
    this.circle = circle;
  }

  async getChamasSummary(): Promise<Result<ChamaSummary[]>> {
    return await this.factory.getChamasSummary(true);
  }

  async getCircleState(contractId: string): Promise<Result<Circle>> {
    return await this.circle.getState(contractId, true);
  }

  async getActivities(member?: string, limit?: number): Promise<Result<Activity[]>> {
    // Rpc cannot easily query historical events without indexer.
    // Return empty list as fallback.
    return { success: true, data: [] };
  }

  async getTVL(): Promise<Result<string>> {
    try {
      const summary = await this.factory.getChamasSummary();
      if (!summary.success || !summary.data) {
        return { success: false, error: summary.error || 'Failed to fetch chamas' };
      }
      let totalTvl = 0n;
      for (const c of summary.data) {
        if (c.status === CircleStatus.Active) {
          const amt = BigInt(c.contribution_amount || '0');
          const count = BigInt(c.member_count || 0);
          totalTvl += amt * count * 2n; // 2x join deposit
        }
      }
      return { success: true, data: totalTvl.toString() };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }
}
