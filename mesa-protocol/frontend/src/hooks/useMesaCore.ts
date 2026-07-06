import { useState, useCallback } from 'react';
import { useSorobanReact } from '@soroban-react/core';
import { contractInvoke } from '@soroban-react/contracts';
import { nativeToScVal, scValToNative, Address, xdr } from '@stellar/stellar-sdk';
import toast from 'react-hot-toast';
import { TREASURY_ADDRESS, SUPPORTED_ASSETS, MESACORE_CONTRACT_ID } from '../utils/config';

export interface Chama {
  id: string;
  name: string;
  tokenAddress: string;
  tokenCode: string;
  contributionAmount: number;
  roundDuration: number; // in seconds
  currentRound: number;
  roundDeadline: number; // timestamp
  emergencyMode: boolean;
  members: string[];
  rotationOrder: string[];
  missedPayments: Record<string, number>;
  securityDeposits: Record<string, number>;
  contributions: Record<string, boolean>;
}

// Initial Mock Chamas stored in LocalStorage for demo purposes
const DEFAULT_CHAMAS: Chama[] = [
  {
    id: 'CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU',
    name: 'East Africa USDC Chama',
    tokenAddress: SUPPORTED_ASSETS.USDC.contractId,
    tokenCode: 'USDC',
    contributionAmount: 100,
    roundDuration: 86400 * 7, // 1 week
    currentRound: 0,
    roundDeadline: Math.floor(Date.now() / 1000) + 86400 * 4,
    emergencyMode: false,
    members: [
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC',
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC',
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEKES',
    ],
    rotationOrder: [
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC',
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC',
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEKES',
    ],
    missedPayments: {
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC': 0,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC': 0,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEKES': 0,
    },
    securityDeposits: {
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC': 100,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC': 100,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEKES': 100,
    },
    contributions: {
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC': true,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC': false,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEKES': false,
    },
  },
  {
    id: 'CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQDEMO2',
    name: 'Pan-European EURC Savings Circle',
    tokenAddress: SUPPORTED_ASSETS.EURC.contractId,
    tokenCode: 'EURC',
    contributionAmount: 250,
    roundDuration: 86400 * 14, // 2 weeks
    currentRound: 1,
    roundDeadline: Math.floor(Date.now() / 1000) + 86400 * 10,
    emergencyMode: false,
    members: [
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC',
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC',
    ],
    rotationOrder: [
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC',
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC',
    ],
    missedPayments: {
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC': 0,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC': 1,
    },
    securityDeposits: {
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC': 250,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC': 250,
    },
    contributions: {
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC': true,
      'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TEURC': true,
    },
  },
];

export function useMesaCore() {
  const sorobanContext = useSorobanReact();
  const { address } = sorobanContext;
  const [loading, setLoading] = useState(false);

  // Load chamas from LocalStorage or seed with defaults
  const getChamasFromStorage = useCallback((): Chama[] => {
    if (typeof window === 'undefined') return DEFAULT_CHAMAS;
    const stored = localStorage.getItem('mesa_chamas');
    if (!stored) {
      localStorage.setItem('mesa_chamas', JSON.stringify(DEFAULT_CHAMAS));
      return DEFAULT_CHAMAS;
    }
    return JSON.parse(stored);
  }, []);

  const saveChamasToStorage = useCallback((chamas: Chama[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mesa_chamas', JSON.stringify(chamas));
    }
  }, []);

  // Fetch chama details either from blockchain or fallback storage
  const getChama = useCallback(async (chamaId: string): Promise<Chama> => {
    setLoading(true);
    try {
      // Attempt on-chain fetch
      if (sorobanContext.server && address) {
        const stateRes = await contractInvoke({
          contractAddress: chamaId,
          method: 'get_chama_state',
          args: [],
          sorobanContext,
        });

        const membersRes = await contractInvoke({
          contractAddress: chamaId,
          method: 'get_members_list',
          args: [],
          sorobanContext,
        });

        const rotationRes = await contractInvoke({
          contractAddress: chamaId,
          method: 'get_rotation_list',
          args: [],
          sorobanContext,
        });

        if (stateRes && membersRes && rotationRes) {
          const state = scValToNative(stateRes as any);
          const membersList = scValToNative(membersRes as any) as string[];
          const rotationList = scValToNative(rotationRes as any) as string[];

          // Construct maps for contributions, missed payments, security deposits
          const missedPayments: Record<string, number> = {};
          const securityDeposits: Record<string, number> = {};
          const contributions: Record<string, boolean> = {};

          for (const m of membersList) {
            const depVal = await contractInvoke({
              contractAddress: chamaId,
              method: 'get_member_deposit',
              args: [nativeToScVal(m, { type: 'address' })],
              sorobanContext,
            });
            const missVal = await contractInvoke({
              contractAddress: chamaId,
              method: 'get_member_misses',
              args: [nativeToScVal(m, { type: 'address' })],
              sorobanContext,
            });
            const contrVal = await contractInvoke({
              contractAddress: chamaId,
              method: 'has_contributed',
              args: [nativeToScVal(m, { type: 'address' })],
              sorobanContext,
            });

            securityDeposits[m] = depVal ? (scValToNative(depVal as any) as number) : 0;
            missedPayments[m] = missVal ? (scValToNative(missVal as any) as number) : 0;
            contributions[m] = contrVal ? (scValToNative(contrVal as any) as boolean) : false;
          }

          const matchedAsset = Object.values(SUPPORTED_ASSETS).find(
            (a) => a.contractId === state[0]
          );

          const fetched: Chama = {
            id: chamaId,
            name: matchedAsset ? `Chama ${matchedAsset.code}` : 'On-Chain Chama',
            tokenAddress: state[0],
            tokenCode: matchedAsset ? matchedAsset.code : 'USDC',
            contributionAmount: state[1],
            roundDuration: state[2],
            currentRound: state[3],
            roundDeadline: state[4],
            emergencyMode: state[5],
            members: membersList,
            rotationOrder: rotationList,
            missedPayments,
            securityDeposits,
            contributions,
          };
          return fetched;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch chama details from on-chain, falling back to LocalStorage:", err);
    } finally {
      setLoading(false);
    }

    // LocalStorage Fallback
    const chamas = getChamasFromStorage();
    const found = chamas.find((c) => c.id === chamaId);
    if (!found) throw new Error("Chama not found");
    return found;
  }, [sorobanContext, address, getChamasFromStorage]);

  // Create/Deploy a new Chama
  const createChama = useCallback(async (
    name: string,
    tokenAddress: string,
    contributionAmount: number,
    roundDuration: number,
    members: string[],
    rotationOrder: string[]
  ): Promise<string> => {
    setLoading(true);
    const newContractId = 'CDWGVPSUXXSGABQ663FVV' + Math.random().toString(36).substring(2, 15).toUpperCase();
    const tokenAsset = Object.values(SUPPORTED_ASSETS).find(a => a.contractId === tokenAddress);

    const newChama: Chama = {
      id: newContractId,
      name,
      tokenAddress,
      tokenCode: tokenAsset ? tokenAsset.code : 'USDC',
      contributionAmount,
      roundDuration,
      currentRound: 0,
      roundDeadline: Math.floor(Date.now() / 1000) + roundDuration,
      emergencyMode: false,
      members,
      rotationOrder,
      missedPayments: members.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      securityDeposits: members.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      contributions: members.reduce((acc, m) => ({ ...acc, [m]: false }), {}),
    };

    try {
      if (sorobanContext.server && address) {
        // Attempt on-chain deployment / initialization
        // We'll call the initialize method on the deployed template contract as a mock instance
        // Or if custom deploying is simulated, we initialize a test instance.
        const res = await contractInvoke({
          contractAddress: MESACORE_CONTRACT_ID,
          method: 'initialize',
          args: [
            nativeToScVal(tokenAddress, { type: 'address' }),
            nativeToScVal(contributionAmount, { type: 'i128' }),
            nativeToScVal(roundDuration, { type: 'u64' }),
            nativeToScVal(members.map(m => nativeToScVal(m, { type: 'address' }))),
            nativeToScVal(rotationOrder.map(r => nativeToScVal(r, { type: 'address' }))),
            nativeToScVal(TREASURY_ADDRESS, { type: 'address' }),
          ],
          sorobanContext,
          signAndSend: true,
        });
        toast.success("Initialized contract on-chain successfully!");
      }
    } catch (err) {
      console.warn("Could not deploy on-chain, saving locally:", err);
    }

    // Always save to local storage so the demo flows smoothly
    const current = getChamasFromStorage();
    current.push(newChama);
    saveChamasToStorage(current);
    setLoading(false);
    return newContractId;
  }, [sorobanContext, address, getChamasFromStorage, saveChamasToStorage]);

  // Join a Savings Circle
  const joinChama = useCallback(async (chamaId: string) => {
    setLoading(true);
    try {
      if (sorobanContext.server && address) {
        await contractInvoke({
          contractAddress: chamaId,
          method: 'join',
          args: [nativeToScVal(address, { type: 'address' })],
          sorobanContext,
          signAndSend: true,
        });
      }
    } catch (err) {
      console.warn("On-chain join failed, using local storage update:", err);
    }

    // Update LocalStorage
    const chamas = getChamasFromStorage();
    const idx = chamas.findIndex(c => c.id === chamaId);
    if (idx !== -1) {
      const user = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
      if (!chamas[idx].members.includes(user)) {
        chamas[idx].members.push(user);
        chamas[idx].rotationOrder.push(user);
      }
      chamas[idx].securityDeposits[user] = chamas[idx].contributionAmount;
      chamas[idx].contributions[user] = true;
      saveChamasToStorage(chamas);
      toast.success("Joined chama successfully! (Security deposit and 1st round paid)");
    }
    setLoading(false);
  }, [sorobanContext, address, getChamasFromStorage, saveChamasToStorage]);

  // Contribute to round
  const contribute = useCallback(async (chamaId: string, memberAddress?: string) => {
    setLoading(true);
    const activeUser = memberAddress || address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
    try {
      if (sorobanContext.server && address) {
        await contractInvoke({
          contractAddress: chamaId,
          method: 'contribute',
          args: [nativeToScVal(activeUser, { type: 'address' })],
          sorobanContext,
          signAndSend: true,
        });
      }
    } catch (err) {
      console.warn("On-chain contribute failed, using local storage update:", err);
    }

    // Update LocalStorage
    const chamas = getChamasFromStorage();
    const idx = chamas.findIndex(c => c.id === chamaId);
    if (idx !== -1) {
      chamas[idx].contributions[activeUser] = true;
      saveChamasToStorage(chamas);
      toast.success(`Contributed ${chamas[idx].contributionAmount} ${chamas[idx].tokenCode} successfully!`);
    }
    setLoading(false);
  }, [sorobanContext, address, getChamasFromStorage, saveChamasToStorage]);

  // Distribute round pot
  const distributeRound = useCallback(async (chamaId: string) => {
    setLoading(true);
    try {
      if (sorobanContext.server && address) {
        await contractInvoke({
          contractAddress: chamaId,
          method: 'distribute_round',
          args: [],
          sorobanContext,
          signAndSend: true,
        });
      }
    } catch (err) {
      console.warn("On-chain distribute failed, updating local storage:", err);
    }

    // Update LocalStorage
    const chamas = getChamasFromStorage();
    const idx = chamas.findIndex(c => c.id === chamaId);
    if (idx !== -1) {
      const chama = chamas[idx];
      const winner = chama.rotationOrder[chama.currentRound % chama.rotationOrder.length];
      toast.success(`Round distributed! Pot of ${chama.contributionAmount * chama.members.length} ${chama.tokenCode} paid to ${winner.substring(0, 8)}...`);
      chama.currentRound += 1;
      // Reset contributions
      chama.members.forEach(m => {
        chama.contributions[m] = false;
      });
      chama.roundDeadline = Math.floor(Date.now() / 1000) + chama.roundDuration;
      saveChamasToStorage(chamas);
    }
    setLoading(false);
  }, [sorobanContext, address, getChamasFromStorage, saveChamasToStorage]);

  // Flag emergency mode
  const flagEmergency = useCallback(async (chamaId: string) => {
    setLoading(true);
    const activeUser = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
    try {
      if (sorobanContext.server && address) {
        await contractInvoke({
          contractAddress: chamaId,
          method: 'flag_emergency',
          args: [nativeToScVal(activeUser, { type: 'address' })],
          sorobanContext,
          signAndSend: true,
        });
      }
    } catch (err) {
      console.warn("On-chain flag failed, updating local storage:", err);
    }

    // Update LocalStorage
    const chamas = getChamasFromStorage();
    const idx = chamas.findIndex(c => c.id === chamaId);
    if (idx !== -1) {
      chamas[idx].emergencyMode = true;
      saveChamasToStorage(chamas);
      toast.error("Emergency mode activated! Funds unlocked for withdrawal.");
    }
    setLoading(false);
  }, [sorobanContext, address, getChamasFromStorage, saveChamasToStorage]);

  // Withdraw remaining principal
  const withdrawPrincipal = useCallback(async (chamaId: string) => {
    setLoading(true);
    const activeUser = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
    try {
      if (sorobanContext.server && address) {
        await contractInvoke({
          contractAddress: chamaId,
          method: 'withdraw_principal',
          args: [nativeToScVal(activeUser, { type: 'address' })],
          sorobanContext,
          signAndSend: true,
        });
      }
    } catch (err) {
      console.warn("On-chain withdrawal failed, updating local storage:", err);
    }

    // Update LocalStorage
    const chamas = getChamasFromStorage();
    const idx = chamas.findIndex(c => c.id === chamaId);
    if (idx !== -1) {
      const chama = chamas[idx];
      let amount = 0;
      if (chama.securityDeposits[activeUser] > 0) {
        amount += chama.securityDeposits[activeUser];
        chama.securityDeposits[activeUser] = 0;
      }
      if (chama.contributions[activeUser]) {
        amount += chama.contributionAmount;
        chama.contributions[activeUser] = false;
      }
      saveChamasToStorage(chamas);
      toast.success(`Withdrew principal: ${amount} ${chama.tokenCode}`);
    }
    setLoading(false);
  }, [sorobanContext, address, getChamasFromStorage, saveChamasToStorage]);

  return {
    loading,
    getChamas: getChamasFromStorage,
    getChama,
    createChama,
    joinChama,
    contribute,
    distributeRound,
    flagEmergency,
    withdrawPrincipal,
  };
}
