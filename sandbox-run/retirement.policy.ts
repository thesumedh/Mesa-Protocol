import { PolicyType, Policy } from '@mesa/sdk';

// retirement template config: 30 years time lock (946080000 seconds), autoconvert deposits to USDC
export const retirementPolicy: Policy[] = [
  { type: PolicyType.Lock, value: 946080000 },
  { type: PolicyType.AutoConvert, value: "USDC" }
];
