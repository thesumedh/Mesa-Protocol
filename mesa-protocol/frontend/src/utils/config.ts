export const NETWORK = 'testnet';

// Default MesaCore WASM hash and a demo Contract ID on Stellar Testnet
export const MESACORE_WASM_HASH = '6e72c8ea41abdf8b248a3cb3df1a1b1b369c0d48962dfbb187b8f9e16a8a92bb';
export const MESACORE_CONTRACT_ID = 'CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU';

export interface Asset {
  code: string;
  name: string;
  issuer: string;
  contractId: string; // The wrapped Stellar Asset Contract (SAC) ID on Testnet
  icon: string;
}

export const SUPPORTED_ASSETS: Record<string, Asset> = {
  USDC: {
    code: 'USDC',
    name: 'USD Coin',
    issuer: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI',
    contractId: 'CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EUSDC',
    icon: '💵',
  },
  EURC: {
    code: 'EURC',
    name: 'Euro Coin',
    issuer: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI',
    contractId: 'CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEURC',
    icon: '💶',
  },
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    issuer: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI',
    contractId: 'CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEKES',
    icon: '🇰🇪',
  },
  XLM: {
    code: 'XLM',
    name: 'Lumen',
    issuer: 'native',
    contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQTY2W', // Native SAC ID
    icon: '🚀',
  },
};

export const TREASURY_ADDRESS = 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI';
