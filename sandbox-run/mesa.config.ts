// Mesa Protocol Integration Configuration
export default {
  network: 'testnet',
  currency: 'USDC',
  factoryContractId: 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  templates: {
    'retirement': {
      policyPath: './retirement.policy.ts'
    }
  }
};
