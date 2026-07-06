#![no_std]
use soroban_sdk::{contract, contractimpl, contractmeta, contracttype, token, Address, Env, Map, Vec};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Token, Contribution, Duration, Members, Rotation, Round, Deadline, Treasury,
    SecDeposits, MissedPays, RoundContribs, EmergMode, EmergFlags, EmergFlagsCount, Forfeits,
    Vouches, Reputation,
}

contractmeta!(key = "Description", val = "Mesa Protocol ROSCA contract on Stellar");

#[contract]
pub struct MesaCore;

fn get_members(e: &Env) -> Vec<Address> {
    e.storage().instance().get(&DataKey::Members).unwrap()
}

fn transfer(e: &Env, to: &Address, amount: &i128) {
    let token: Address = e.storage().instance().get(&DataKey::Token).unwrap();
    token::Client::new(e, &token).transfer(&e.current_contract_address(), to, amount);
}

#[contractimpl]
impl MesaCore {
    pub fn initialize(e: Env, token: Address, contribution: i128, duration: u64, members: Vec<Address>, rotation: Vec<Address>, treasury: Address) {
        assert!(!e.storage().instance().has(&DataKey::Token), "initialized");
        e.storage().instance().set(&DataKey::Token, &token);
        e.storage().instance().set(&DataKey::Contribution, &contribution);
        e.storage().instance().set(&DataKey::Duration, &duration);
        e.storage().instance().set(&DataKey::Members, &members);
        e.storage().instance().set(&DataKey::Rotation, &rotation);
        e.storage().instance().set(&DataKey::Round, &0u32);
        e.storage().instance().set(&DataKey::Treasury, &treasury);
        e.storage().instance().set(&DataKey::EmergMode, &false);
        e.storage().instance().set(&DataKey::Deadline, &(e.ledger().timestamp() + duration));
    }

    pub fn join(e: Env, member: Address, sponsor: Address) {
        member.require_auth();
        assert!(!e.storage().instance().get::<_, bool>(&DataKey::EmergMode).unwrap_or(false), "emergency");
        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        // Vouching system check
        if sponsor != member {
            assert!(members.contains(&sponsor), "sponsor not in circle");
            let mut vouches: Map<Address, Address> = e.storage().instance().get(&DataKey::Vouches).unwrap_or(Map::new(&e));
            vouches.set(member.clone(), sponsor);
            e.storage().instance().set(&DataKey::Vouches, &vouches);
        }

        let mut deps: Map<Address, i128> = e.storage().instance().get(&DataKey::SecDeposits).unwrap_or(Map::new(&e));
        assert!(!deps.contains_key(member.clone()), "joined");

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let token: Address = e.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&e, &token).transfer(&member, &e.current_contract_address(), &(contrib * 2));

        deps.set(member.clone(), contrib);
        e.storage().instance().set(&DataKey::SecDeposits, &deps);

        let mut contribs: Map<Address, bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or(Map::new(&e));
        contribs.set(member.clone(), true);
        e.storage().instance().set(&DataKey::RoundContribs, &contribs);

        // Set initial reputation score to 100
        let mut reputation: Map<Address, u32> = e.storage().instance().get(&DataKey::Reputation).unwrap_or(Map::new(&e));
        reputation.set(member, 100);
        e.storage().instance().set(&DataKey::Reputation, &reputation);
    }

    pub fn contribute(e: Env, member: Address) {
        member.require_auth();
        assert!(!e.storage().instance().get::<_, bool>(&DataKey::EmergMode).unwrap_or(false), "emergency");
        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        let mut contribs: Map<Address, bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or(Map::new(&e));
        assert!(!contribs.get(member.clone()).unwrap_or(false), "paid");

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap_or(0);
        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();

        let mut reputation: Map<Address, u32> = e.storage().instance().get(&DataKey::Reputation).unwrap_or(Map::new(&e));
        let mut current_rep = reputation.get(member.clone()).unwrap_or(100);

        if e.ledger().timestamp() > deadline {
            let mut missed: Map<Address, u32> = e.storage().instance().get(&DataKey::MissedPays).unwrap_or(Map::new(&e));
            let count = missed.get(member.clone()).unwrap_or(0) + 1;
            missed.set(member.clone(), count);
            e.storage().instance().set(&DataKey::MissedPays, &missed);

            // Deduct reputation on missed payment
            current_rep = current_rep.saturating_sub(20);
            reputation.set(member.clone(), current_rep);
            e.storage().instance().set(&DataKey::Reputation, &reputation);

            if count >= 2 {
                // Eject member
                reputation.set(member.clone(), 0);
                e.storage().instance().set(&DataKey::Reputation, &reputation);

                let mut deps: Map<Address, i128> = e.storage().instance().get(&DataKey::SecDeposits).unwrap_or(Map::new(&e));
                let dep = deps.get(member.clone()).unwrap_or(0);
                if dep > 0 {
                    deps.set(member.clone(), 0);
                    e.storage().instance().set(&DataKey::SecDeposits, &deps);
                    let treasury: Address = e.storage().instance().get(&DataKey::Treasury).unwrap();
                    transfer(&e, &treasury, &(dep / 2));
                    let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
                    e.storage().instance().set(&DataKey::Forfeits, &(forfeits + (dep - dep / 2)));
                }

                // Vouch penalty: check if sponsor exists and slash them
                let vouches: Map<Address, Address> = e.storage().instance().get(&DataKey::Vouches).unwrap_or(Map::new(&e));
                if let Some(sponsor) = vouches.get(member.clone()) {
                    if sponsor != member {
                        // Slash 25% of sponsor's security deposit
                        let sponsor_dep = deps.get(sponsor.clone()).unwrap_or(0);
                        if sponsor_dep > 0 {
                            let slash_amt = sponsor_dep / 4;
                            deps.set(sponsor.clone(), sponsor_dep - slash_amt);
                            e.storage().instance().set(&DataKey::SecDeposits, &deps);

                            // Add slashed amount to forfeits (distributed to other members in next pot)
                            let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
                            e.storage().instance().set(&DataKey::Forfeits, &(forfeits + slash_amt));
                        }

                        // Penalize sponsor's reputation
                        let sponsor_rep = reputation.get(sponsor.clone()).unwrap_or(100).saturating_sub(50);
                        reputation.set(sponsor, sponsor_rep);
                        e.storage().instance().set(&DataKey::Reputation, &reputation);
                    }
                }

                let mut mems = members;
                if let Some(i) = mems.first_index_of(member.clone()) { mems.remove(i); }
                e.storage().instance().set(&DataKey::Members, &mems);

                let mut rot: Vec<Address> = e.storage().instance().get(&DataKey::Rotation).unwrap();
                if let Some(i) = rot.first_index_of(member.clone()) { rot.remove(i); }
                e.storage().instance().set(&DataKey::Rotation, &rot);
                return;
            }
        } else {
            // Reward on-time payment
            if current_rep < 100 {
                current_rep = (current_rep + 5).min(100);
                reputation.set(member.clone(), current_rep);
                e.storage().instance().set(&DataKey::Reputation, &reputation);
            }
        }

        let token: Address = e.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&e, &token).transfer(&member, &e.current_contract_address(), &contrib);
        contribs.set(member, true);
        e.storage().instance().set(&DataKey::RoundContribs, &contribs);
    }

    pub fn distribute_round(e: Env) {
        assert!(!e.storage().instance().get::<_, bool>(&DataKey::EmergMode).unwrap_or(false), "emergency");
        let round: u32 = e.storage().instance().get(&DataKey::Round).unwrap_or(0);
        let members = get_members(&e);
        assert!(round < members.len(), "ended");

        let contribs: Map<Address, bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or(Map::new(&e));
        for m in members.iter() {
            assert!(contribs.get(m).unwrap_or(false), "unpaid");
        }

        let rot: Vec<Address> = e.storage().instance().get(&DataKey::Rotation).unwrap();
        let winner = rot.get(round).unwrap();

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
        let pot = (contrib * (members.len() as i128)) + forfeits;

        transfer(&e, &winner, &pot);
        e.storage().instance().set(&DataKey::Forfeits, &0i128);

        e.events().publish((soroban_sdk::symbol_short!("RoundDist"), round, winner), pot);

        e.storage().instance().set(&DataKey::Round, &(round + 1));
        e.storage().instance().set(&DataKey::RoundContribs, &Map::<Address, bool>::new(&e));
        let duration: u64 = e.storage().instance().get(&DataKey::Duration).unwrap();
        e.storage().instance().set(&DataKey::Deadline, &(e.ledger().timestamp() + duration));
    }

    pub fn flag_emergency(e: Env, member: Address) {
        member.require_auth();
        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        let mut flags: Map<Address, bool> = e.storage().instance().get(&DataKey::EmergFlags).unwrap_or(Map::new(&e));
        if !flags.get(member.clone()).unwrap_or(false) {
            flags.set(member.clone(), true);
            e.storage().instance().set(&DataKey::EmergFlags, &flags);

            let count = e.storage().instance().get::<_, u32>(&DataKey::EmergFlagsCount).unwrap_or(0) + 1;
            e.storage().instance().set(&DataKey::EmergFlagsCount, &count);

            if count > (members.len() as u32) / 2 {
                e.storage().instance().set(&DataKey::EmergMode, &true);
            }
        }
    }

    pub fn withdraw_principal(e: Env, member: Address) {
        member.require_auth();
        assert!(e.storage().instance().get::<_, bool>(&DataKey::EmergMode).unwrap_or(false), "not emergency");

        let mut withdraw_amount = 0i128;
        let mut deps: Map<Address, i128> = e.storage().instance().get(&DataKey::SecDeposits).unwrap_or(Map::new(&e));
        let dep = deps.get(member.clone()).unwrap_or(0);
        if dep > 0 {
            withdraw_amount += dep;
            deps.set(member.clone(), 0);
            e.storage().instance().set(&DataKey::SecDeposits, &deps);
        }

        let mut contribs: Map<Address, bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or(Map::new(&e));
        if contribs.get(member.clone()).unwrap_or(false) {
            let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
            withdraw_amount += contrib;
            contribs.set(member.clone(), false);
            e.storage().instance().set(&DataKey::RoundContribs, &contribs);
        }

        assert!(withdraw_amount > 0, "no funds");
        transfer(&e, &member, &withdraw_amount);
    }

    // Read state functions for frontend integration
    pub fn get_chama_state(e: Env) -> (i128, u64, u32, u64, bool) {
        (
            e.storage().instance().get(&DataKey::Contribution).unwrap_or(0),
            e.storage().instance().get(&DataKey::Duration).unwrap_or(0),
            e.storage().instance().get(&DataKey::Round).unwrap_or(0),
            e.storage().instance().get(&DataKey::Deadline).unwrap_or(0),
            e.storage().instance().get::<_, bool>(&DataKey::EmergMode).unwrap_or(false)
        )
    }
    pub fn get_members_list(e: Env) -> Vec<Address> { get_members(&e) }
    pub fn get_rotation_list(e: Env) -> Vec<Address> { e.storage().instance().get(&DataKey::Rotation).unwrap() }
    pub fn get_member_deposit(e: Env, m: Address) -> i128 { e.storage().instance().get::<_, Map<Address, i128>>(&DataKey::SecDeposits).unwrap_or(Map::new(&e)).get(m).unwrap_or(0) }
    pub fn get_member_misses(e: Env, m: Address) -> u32 { e.storage().instance().get::<_, Map<Address, u32>>(&DataKey::MissedPays).unwrap_or(Map::new(&e)).get(m).unwrap_or(0) }
    pub fn has_contributed(e: Env, m: Address) -> bool { e.storage().instance().get::<_, Map<Address, bool>>(&DataKey::RoundContribs).unwrap_or(Map::new(&e)).get(m).unwrap_or(false) }
    pub fn get_reputation(e: Env, m: Address) -> u32 { e.storage().instance().get::<_, Map<Address, u32>>(&DataKey::Reputation).unwrap_or(Map::new(&e)).get(m).unwrap_or(100) }
    pub fn get_sponsor(e: Env, m: Address) -> Address {
        let vouches: Map<Address, Address> = e.storage().instance().get(&DataKey::Vouches).unwrap_or(Map::new(&e));
        vouches.get(m.clone()).unwrap_or(m)
    }
}

#[cfg(test)]
mod test;

