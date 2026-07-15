import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { db } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 4000;

const typeDefs = `#graphql
  type Member {
    address: String!
    reputation: Int!
    joined_at: Float!
  }

  type Circle {
    contract_id: String!
    chama_id: Int!
    name: String!
    creator: String!
    contribution_amount: String!
    max_members: Int!
    member_count: Int!
    current_round: Int!
    deadline: Float!
    status: Int!
    token: String!
    duration: Int!
    rotation_order: String
    members: [Member!]!
  }

  type Activity {
    id: ID!
    contract_id: String!
    tx_hash: String!
    type: String!
    member: String!
    amount: String
    round: Int
    timestamp: Float!
  }

  type GlobalStats {
    tvl: String!
    circleCount: Int!
    activeCircleCount: Int!
    uniqueMemberCount: Int!
  }

  type Query {
    circles(status: Int): [Circle!]!
    circle(contractId: String!): Circle
    activities(member: String, limit: Int): [Activity!]!
    globalStats: GlobalStats!
  }
`;

const resolvers = {
  Query: {
    circles: async (_parent: any, args: { status?: number }) => {
      return await db.getChamas(args.status);
    },
    circle: async (_parent: any, args: { contractId: string }) => {
      return await db.getChama(args.contractId);
    },
    activities: async (_parent: any, args: { member?: string, limit?: number }) => {
      return await db.getActivities(args.member, args.limit || 20);
    },
    globalStats: async () => {
      const chamas = await db.getChamas();
      
      // Calculate TVL: sum of (contribution_amount * member_count)
      let totalTvl = 0n;
      let activeCount = 0;
      for (const c of chamas) {
        if (c.status === 1) {
          activeCount++;
        }
        const amt = BigInt(c.contribution_amount || '0');
        const count = BigInt(c.member_count || 0);
        // Let's multiply by 2 because join deposit is 2x contribution
        totalTvl += amt * count * 2n;
      }

      // Unique member count
      // For simplicity, we can fetch all members and get unique addresses
      const allChamas = await db.getChamas();
      const uniqueAddresses = new Set<string>();
      for (const c of allChamas) {
        const members = await db.getMembers(c.contract_id);
        for (const m of members) {
          uniqueAddresses.add(m.address);
        }
      }

      return {
        tvl: totalTvl.toString(),
        circleCount: chamas.length,
        activeCircleCount: activeCount,
        uniqueMemberCount: uniqueAddresses.size,
      };
    },
  },
  Circle: {
    members: async (parent: { contract_id: string }) => {
      return await db.getMembers(parent.contract_id);
    },
  },
};

async function startServer() {
  await db.initSchema();

  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server),
  );

  app.listen(port, () => {
    console.log(`[Mesa Indexer API] GraphQL server running at http://localhost:${port}/graphql`);
  });
}

startServer().catch(err => {
  console.error('[Mesa Indexer API] Startup failed:', err);
  process.exit(1);
});
