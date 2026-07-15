#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contractmeta, contracttype, token, Address, Env, Map,
    String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    InvalidAmount = 2,
    GoalExceeded = 3,
    InsufficientBalance = 4,
    FundsLocked = 5,
    NotActiveSaver = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Policy {
    Lock(u64),                     // Time-lock period in seconds
    AutoConvert(Address),          // Target asset address
    WeeklyDeposit(i128),           // Target contribution amount
    Goal(i128),                    // Target savings limit
    AllowEmergencyWithdrawal(bool),// Toggle emergency exit rules
}

#[contracttype]
pub enum DataKey {
    Creator,
    Name,
    Token,
    Policies,
    Balance(Address),              // Track balance per user
    DepositTime(Address),          // Track deposit timestamp per user
    EmergencyActive,
    EmergencyVotes,                // Map<Address, bool>
    MemberCount,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultState {
    pub creator: Address,
    pub name: String,
    pub token: Address,
    pub policies: Vec<Policy>,
    pub total_balance: i128,
    pub emergency_active: bool,
}

contractmeta!(key = "Description", val = "Mesa Protocol policy-based dynamic savings vault");

#[contract]
pub struct MesaVault;

#[contractimpl]
impl MesaVault {
    pub fn initialize(
        env: Env,
        creator: Address,
        name: String,
        token: Address,
        policies: Vec<Policy>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Policies, &policies);
        env.storage().instance().set(&DataKey::EmergencyActive, &false);
        env.storage().instance().set(&DataKey::MemberCount, &0u32);
        Ok(())
    }

    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let policies: Vec<Policy> = env.storage().instance().get(&DataKey::Policies).unwrap();

        // Check Goal policy prior to deposit
        let user_bal: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        let new_user_bal = user_bal + amount;

        for policy in policies.iter() {
            match policy {
                Policy::Goal(limit) => {
                    if new_user_bal > limit {
                        return Err(Error::GoalExceeded);
                    }
                }
                _ => {}
            }
        }

        // Perform token transfer
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&user, &env.current_contract_address(), &amount);

        // Update state
        if user_bal == 0 {
            let count: u32 = env.storage().instance().get(&DataKey::MemberCount).unwrap_or(0);
            env.storage().instance().set(&DataKey::MemberCount, &(count + 1));
        }
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &new_user_bal);
        env.storage().persistent().set(&DataKey::DepositTime(user.clone()), &env.ledger().timestamp());
        Ok(())
    }

    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let user_bal: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        if user_bal < amount {
            return Err(Error::InsufficientBalance);
        }

        let emergency_active: bool = env.storage().instance().get(&DataKey::EmergencyActive).unwrap_or(false);

        if !emergency_active {
            let policies: Vec<Policy> = env.storage().instance().get(&DataKey::Policies).unwrap();
            let deposit_time: u64 = env.storage().persistent().get(&DataKey::DepositTime(user.clone())).unwrap_or(0);

            for policy in policies.iter() {
                match policy {
                    Policy::Lock(lock_period) => {
                        let current_time = env.ledger().timestamp();
                        if current_time < deposit_time + lock_period {
                            return Err(Error::FundsLocked);
                        }
                    }
                    _ => {}
                }
            }
        }

        // Perform token transfer out
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &user, &amount);

        let new_user_bal = user_bal - amount;
        if new_user_bal == 0 {
            let count: u32 = env.storage().instance().get(&DataKey::MemberCount).unwrap_or(0);
            if count > 0 {
                env.storage().instance().set(&DataKey::MemberCount, &(count - 1));
            }
        }
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &new_user_bal);
        Ok(())
    }

    pub fn vote_emergency(env: Env, user: Address) -> Result<(), Error> {
        user.require_auth();
        let user_bal: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        if user_bal <= 0 {
            return Err(Error::NotActiveSaver);
        }

        let mut votes: Map<Address, bool> = env.storage().instance().get(&DataKey::EmergencyVotes).unwrap_or_else(|| Map::new(&env));
        votes.set(user.clone(), true);
        env.storage().instance().set(&DataKey::EmergencyVotes, &votes);

        // Check if > 50% of active members have voted emergency
        let member_count: u32 = env.storage().instance().get(&DataKey::MemberCount).unwrap_or(0);
        let mut vote_count = 0;
        for (_, voted) in votes.iter() {
            if voted {
                vote_count += 1;
            }
        }

        if vote_count * 2 > member_count {
            env.storage().instance().set(&DataKey::EmergencyActive, &true);
        }
        Ok(())
    }

    pub fn get_vault_state(env: Env) -> VaultState {
        let creator: Address = env.storage().instance().get(&DataKey::Creator).unwrap();
        let name: String = env.storage().instance().get(&DataKey::Name).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let policies: Vec<Policy> = env.storage().instance().get(&DataKey::Policies).unwrap();
        let emergency_active: bool = env.storage().instance().get(&DataKey::EmergencyActive).unwrap_or(false);

        // Fetch contract balance from token client
        let client = token::Client::new(&env, &token);
        let total_balance = client.balance(&env.current_contract_address());

        VaultState {
            creator,
            name,
            token,
            policies,
            total_balance,
            emergency_active,
        }
    }
}

mod test;
