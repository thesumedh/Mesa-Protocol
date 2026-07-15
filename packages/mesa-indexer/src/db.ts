import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ChamaDb {
  contract_id: string;
  chama_id: number;
  name: string;
  creator: string;
  contribution_amount: string;
  max_members: number;
  member_count: number;
  current_round: number;
  deadline: number;
  status: number;
  token: string;
  duration: number;
  rotation_order?: string; // Comma-separated list of member addresses
}

export interface MemberDb {
  contract_id: string;
  address: string;
  reputation: number;
  joined_at: number;
}

export interface ActivityDb {
  id?: number;
  contract_id: string;
  tx_hash: string;
  type: string;
  member: string;
  amount?: string | null;
  round?: number | null;
  timestamp: number;
}

class DbManager {
  private pgPool: pg.Pool | null = null;
  private sqliteDb: Database.Database | null = null;
  private isPostgres = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      console.log('Connecting to PostgreSQL database...');
      this.pgPool = new pg.Pool({ connectionString: dbUrl });
      this.isPostgres = true;
    } else {
      const sqlitePath = path.resolve(__dirname, '../../mesa_indexer.sqlite');
      console.log(`Connecting to SQLite database at: ${sqlitePath}`);
      this.sqliteDb = new Database(sqlitePath);
      this.isPostgres = false;
    }
  }

  async initSchema() {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS ledgers (
          id INT PRIMARY KEY,
          last_indexed_ledger INT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chamas (
          contract_id VARCHAR(56) PRIMARY KEY,
          chama_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          creator VARCHAR(56) NOT NULL,
          contribution_amount VARCHAR(40) NOT NULL,
          max_members INT NOT NULL,
          member_count INT NOT NULL,
          current_round INT NOT NULL,
          deadline BIGINT NOT NULL,
          status INT NOT NULL,
          token VARCHAR(56) NOT NULL,
          duration INT NOT NULL,
          rotation_order TEXT
        );
        CREATE TABLE IF NOT EXISTS members (
          contract_id VARCHAR(56) NOT NULL,
          address VARCHAR(56) NOT NULL,
          reputation INT NOT NULL,
          joined_at BIGINT NOT NULL,
          PRIMARY KEY (contract_id, address)
        );
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          contract_id VARCHAR(56) NOT NULL,
          tx_hash VARCHAR(64) NOT NULL,
          type VARCHAR(30) NOT NULL,
          member VARCHAR(56) NOT NULL,
          amount VARCHAR(40),
          round INT,
          timestamp BIGINT NOT NULL
        );
      `);
      // Seed ledgers
      const res = await this.pgPool.query('SELECT count(*) FROM ledgers');
      if (parseInt(res.rows[0].count) === 0) {
        await this.pgPool.query('INSERT INTO ledgers (id, last_indexed_ledger) VALUES (1, 0)');
      }
    } else if (this.sqliteDb) {
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS ledgers (
          id INTEGER PRIMARY KEY,
          last_indexed_ledger INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chamas (
          contract_id TEXT PRIMARY KEY,
          chama_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          creator TEXT NOT NULL,
          contribution_amount TEXT NOT NULL,
          max_members INTEGER NOT NULL,
          member_count INTEGER NOT NULL,
          current_round INTEGER NOT NULL,
          deadline INTEGER NOT NULL,
          status INTEGER NOT NULL,
          token TEXT NOT NULL,
          duration INTEGER NOT NULL,
          rotation_order TEXT
        );
        CREATE TABLE IF NOT EXISTS members (
          contract_id TEXT NOT NULL,
          address TEXT NOT NULL,
          reputation INTEGER NOT NULL,
          joined_at INTEGER NOT NULL,
          PRIMARY KEY (contract_id, address)
        );
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contract_id TEXT NOT NULL,
          tx_hash TEXT NOT NULL,
          type TEXT NOT NULL,
          member TEXT NOT NULL,
          amount TEXT,
          round INTEGER,
          timestamp INTEGER NOT NULL
        );
      `);
      // Seed ledgers
      const row = this.sqliteDb.prepare('SELECT count(*) as count FROM ledgers').get() as { count: number };
      if (row.count === 0) {
        this.sqliteDb.prepare('INSERT INTO ledgers (id, last_indexed_ledger) VALUES (1, 0)').run();
      }
    }
  }

  async getIndexedLedger(): Promise<number> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT last_indexed_ledger FROM ledgers WHERE id = 1');
      return res.rows[0]?.last_indexed_ledger || 0;
    } else if (this.sqliteDb) {
      const row = this.sqliteDb.prepare('SELECT last_indexed_ledger FROM ledgers WHERE id = 1').get() as { last_indexed_ledger: number };
      return row?.last_indexed_ledger || 0;
    }
    return 0;
  }

  async updateIndexedLedger(ledger: number) {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query('UPDATE ledgers SET last_indexed_ledger = $1 WHERE id = 1', [ledger]);
    } else if (this.sqliteDb) {
      this.sqliteDb.prepare('UPDATE ledgers SET last_indexed_ledger = ? WHERE id = 1').run(ledger);
    }
  }

  async insertOrUpdateChama(chama: ChamaDb) {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(`
        INSERT INTO chamas (contract_id, chama_id, name, creator, contribution_amount, max_members, member_count, current_round, deadline, status, token, duration, rotation_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (contract_id) DO UPDATE SET
          member_count = EXCLUDED.member_count,
          current_round = EXCLUDED.current_round,
          deadline = EXCLUDED.deadline,
          status = EXCLUDED.status,
          rotation_order = EXCLUDED.rotation_order;
      `, [
        chama.contract_id, chama.chama_id, chama.name, chama.creator, chama.contribution_amount,
        chama.max_members, chama.member_count, chama.current_round, chama.deadline, chama.status, chama.token,
        chama.duration, chama.rotation_order || null
      ]);
    } else if (this.sqliteDb) {
      this.sqliteDb.prepare(`
        INSERT INTO chamas (contract_id, chama_id, name, creator, contribution_amount, max_members, member_count, current_round, deadline, status, token, duration, rotation_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contract_id) DO UPDATE SET
          member_count = excluded.member_count,
          current_round = excluded.current_round,
          deadline = excluded.deadline,
          status = excluded.status,
          rotation_order = excluded.rotation_order;
      `).run(
        chama.contract_id, chama.chama_id, chama.name, chama.creator, chama.contribution_amount,
        chama.max_members, chama.member_count, chama.current_round, chama.deadline, chama.status, chama.token,
        chama.duration, chama.rotation_order || null
      );
    }
  }

  async insertOrUpdateMember(member: MemberDb) {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(`
        INSERT INTO members (contract_id, address, reputation, joined_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (contract_id, address) DO UPDATE SET
          reputation = EXCLUDED.reputation;
      `, [member.contract_id, member.address, member.reputation, member.joined_at]);
    } else if (this.sqliteDb) {
      this.sqliteDb.prepare(`
        INSERT INTO members (contract_id, address, reputation, joined_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(contract_id, address) DO UPDATE SET
          reputation = excluded.reputation;
      `).run(member.contract_id, member.address, member.reputation, member.joined_at);
    }
  }

  async insertActivity(act: ActivityDb) {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(`
        INSERT INTO activities (contract_id, tx_hash, type, member, amount, round, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [act.contract_id, act.tx_hash, act.type, act.member, act.amount, act.round, act.timestamp]);
    } else if (this.sqliteDb) {
      this.sqliteDb.prepare(`
        INSERT INTO activities (contract_id, tx_hash, type, member, amount, round, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(act.contract_id, act.tx_hash, act.type, act.member, act.amount, act.round, act.timestamp);
    }
  }

  async getChamas(status?: number): Promise<ChamaDb[]> {
    if (this.isPostgres && this.pgPool) {
      const q = status !== undefined 
        ? await this.pgPool.query('SELECT * FROM chamas WHERE status = $1 ORDER BY chama_id DESC', [status])
        : await this.pgPool.query('SELECT * FROM chamas ORDER BY chama_id DESC');
      return q.rows;
    } else if (this.sqliteDb) {
      const stmt = status !== undefined
        ? this.sqliteDb.prepare('SELECT * FROM chamas WHERE status = ? ORDER BY chama_id DESC')
        : this.sqliteDb.prepare('SELECT * FROM chamas ORDER BY chama_id DESC');
      return stmt.all(status !== undefined ? [status] : []) as ChamaDb[];
    }
    return [];
  }

  async getChama(contractId: string): Promise<ChamaDb | null> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM chamas WHERE contract_id = $1', [contractId]);
      return res.rows[0] || null;
    } else if (this.sqliteDb) {
      const row = this.sqliteDb.prepare('SELECT * FROM chamas WHERE contract_id = ?').get(contractId) as ChamaDb;
      return row || null;
    }
    return null;
  }

  async getMembers(contractId: string): Promise<MemberDb[]> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM members WHERE contract_id = $1 ORDER BY joined_at ASC', [contractId]);
      return res.rows;
    } else if (this.sqliteDb) {
      return this.sqliteDb.prepare('SELECT * FROM members WHERE contract_id = ? ORDER BY joined_at ASC').all(contractId) as MemberDb[];
    }
    return [];
  }

  async getActivities(member?: string, limit = 20): Promise<ActivityDb[]> {
    if (this.isPostgres && this.pgPool) {
      const res = member
        ? await this.pgPool.query('SELECT * FROM activities WHERE member = $1 ORDER BY timestamp DESC LIMIT $2', [member, limit])
        : await this.pgPool.query('SELECT * FROM activities ORDER BY timestamp DESC LIMIT $1', [limit]);
      return res.rows;
    } else if (this.sqliteDb) {
      const stmt = member
        ? this.sqliteDb.prepare('SELECT * FROM activities WHERE member = ? ORDER BY timestamp DESC LIMIT ?')
        : this.sqliteDb.prepare('SELECT * FROM activities ORDER BY timestamp DESC LIMIT ?');
      return stmt.all(member ? [member, limit] : [limit]) as ActivityDb[];
    }
    return [];
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}

export const db = new DbManager();
