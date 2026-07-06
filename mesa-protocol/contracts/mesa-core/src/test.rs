#![cfg(test)]

use crate::{MesaCore, MesaCoreClient};
use soroban_sdk::{
    testutils::{Address as AddressTestTrait, Ledger},
    token, vec, Address, Env, Map, Vec,
};

fn create_token_contract<'a>(e: &Env, admin: &Address) -> token::Client<'a> {
    let contract_address = e.register_stellar_asset_contract(admin.clone());
    token::Client::new(e, &contract_address)
}

fn advance_ledger(e: &Env, delta: u64) {
    e.ledger().with_mut(|l| {
        l.timestamp += delta;
    });
}

struct TestEnv<'a> {
    env: Env,
    token: token::Client<'a>,
    token_admin: token::StellarAssetClient<'a>,
    treasury: Address,
    members: Vec<Address>,
    client: MesaCoreClient<'a>,
    contract_id: Address,
}

impl TestEnv<'_> {
    fn setup() -> Self {
        let e = Env::default();
        e.mock_all_auths();

        let admin = Address::generate(&e);
        let token_addr = e.register_stellar_asset_contract(admin.clone());
        let token = token::Client::new(&e, &token_addr);
        let token_admin = token::StellarAssetClient::new(&e, &token_addr);

        let treasury = Address::generate(&e);
        let m1 = Address::generate(&e);
        let m2 = Address::generate(&e);
        let m3 = Address::generate(&e);
        let members = vec![&e, m1.clone(), m2.clone(), m3.clone()];

        // Mint tokens to members
        token_admin.mint(&m1, &1000);
        token_admin.mint(&m2, &1000);
        token_admin.mint(&m3, &1000);

        let contract_id = e.register_contract(None, MesaCore);
        let client = MesaCoreClient::new(&e, &contract_id);

        client.initialize(
            &token.address,
            &100i128, // contribution
            &3600u64, // duration: 1 hour
            &members,
            &members, // rotation order is the same
            &treasury,
        );

        Self {
            env: e,
            token,
            token_admin,
            treasury,
            members,
            client,
            contract_id,
        }
    }
}

#[test]
fn test_join_and_initial_state() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    // 3 members join, depositing 2x contribution (200 each)
    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    // Verify balances
    assert_eq!(setup.token.balance(m1), 800);
    assert_eq!(setup.token.balance(m2), 800);
    assert_eq!(setup.token.balance(m3), 800);
    assert_eq!(setup.token.balance(&setup.contract_id), 600); // 3 * 200 = 600

    // Check security deposits are set
    assert_eq!(client.get_member_deposit(m1), 100);
    assert_eq!(client.get_member_deposit(m2), 100);
    assert_eq!(client.get_member_deposit(m3), 100);

    // Verify all marked as contributed in first round
    assert!(client.has_contributed(m1));
    assert!(client.has_contributed(m2));
    assert!(client.has_contributed(m3));
}

#[test]
fn test_round_1_contribution_and_distribution() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    // Join
    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    // Distribute round 0 (first round)
    client.distribute_round();

    // Verify Round 0 winner (m1) received the pot (300)
    // m1 balance: initial (1000) - join (200) + payout (300) = 1100
    assert_eq!(setup.token.balance(m1), 1100);
    assert_eq!(setup.token.balance(&setup.contract_id), 300); // Only security deposits remaining (3 * 100)

    // Round 1 contributions
    client.contribute(m1);
    client.contribute(m2);
    client.contribute(m3);

    // Distribute Round 1
    client.distribute_round();

    // Verify Round 1 winner (m2) received the pot (300)
    // m2 balance: initial (1000) - join (200) - round 1 contrib (100) + payout (300) = 1000
    assert_eq!(setup.token.balance(m2), 1000);
    assert_eq!(setup.token.balance(&setup.contract_id), 300); // Security deposits remaining (3 * 100)
}

#[test]
fn test_penalty_and_forfeiture() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    // Distribute round 0
    client.distribute_round();

    // Member 1 and 3 pay on time
    client.contribute(m1);
    client.contribute(m3);

    // Advance ledger beyond round 1 deadline (1 hour + 1 second)
    advance_ledger(&setup.env, 3601);

    // Member 2 contributes late (after deadline) -> Missed payment count increments to 1
    client.contribute(m2);
    assert_eq!(client.get_member_misses(m2), 1);

    // Distribute round 1
    client.distribute_round();

    // Member 1 and 3 contribute on time
    client.contribute(m1);
    client.contribute(m3);

    // Advance ledger beyond round 2 deadline
    advance_ledger(&setup.env, 3601);

    // Member 2 contributes late again (after deadline) -> Missed payment count increments to 2
    // This triggers ejection and 50/50 forfeiture
    client.contribute(m2);

    // Member 2 is ejected
    assert_eq!(client.get_members_list().len(), 2);
    assert_eq!(client.get_rotation_list().len(), 2);

    // Security deposit for Member 2 is forfeited: 50% to treasury, 50% to pot
    assert_eq!(client.get_member_deposit(m2), 0);
    assert_eq!(setup.token.balance(&setup.treasury), 50); // 50 tokens to treasury
}

#[test]
fn test_emergency_mode_and_withdrawal() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    // Distribute round 0
    client.distribute_round();

    // Member 1 contributes to Round 1
    client.contribute(m1);

    // Member 1 and Member 2 flag emergency (2 out of 3 = >50%)
    client.flag_emergency(m1);
    client.flag_emergency(m2);

    // Check emergency mode is active
    let (_, _, _, _, emerg_mode) = client.get_chama_state();
    assert!(emerg_mode);

    // Member 1 withdraws: security deposit (100) + current round contribution (100) = 200
    let bal_before_m1 = setup.token.balance(m1);
    client.withdraw_principal(m1);
    assert_eq!(setup.token.balance(m1), bal_before_m1 + 200);

    // Member 2 withdraws: only security deposit (100)
    let bal_before_m2 = setup.token.balance(m2);
    client.withdraw_principal(m2);
    assert_eq!(setup.token.balance(m2), bal_before_m2 + 100);
}

#[test]
fn test_vouching_and_reputation() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    // Join: m1 joins with no sponsor
    client.join(m1, m1);
    assert_eq!(client.get_reputation(m1), 100);
    assert_eq!(client.get_sponsor(m1), m1.clone());

    // m2 joins vouched for by m1
    client.join(m2, m1);
    assert_eq!(client.get_reputation(m2), 100);
    assert_eq!(client.get_sponsor(m2), m1.clone());

    // m3 joins vouched for by m2
    client.join(m3, m2);
    assert_eq!(client.get_reputation(m3), 100);
    assert_eq!(client.get_sponsor(m3), m2.clone());

    // Distribute round 0
    client.distribute_round();

    // Round 1 contributions:
    // m1 and m2 contribute on time
    client.contribute(m1);
    client.contribute(m2);
    assert_eq!(client.get_reputation(m1), 100);

    // Advance ledger beyond round 1 deadline (1 hour + 1 second)
    advance_ledger(&setup.env, 3601);

    // m3 contributes late (since deadline passed) -> gets reputation penalty: 100 - 20 = 80
    client.contribute(m3);
    assert_eq!(client.get_reputation(m3), 80);

    // Distribute round 1
    client.distribute_round();

    // Round 2 contributions:
    // m1 and m2 contribute on time
    client.contribute(m1);
    client.contribute(m2);

    // Advance ledger beyond round 2 deadline
    advance_ledger(&setup.env, 3601);

    // m3 contributes late again -> Missed payment count increments to 2
    // This triggers ejection of m3 and slashes sponsor m2's deposit and reputation
    let m2_dep_before = client.get_member_deposit(m2);
    client.contribute(m3);

    // m3 is ejected
    assert_eq!(client.get_reputation(m3), 0);

    // Sponsor m2's deposit is slashed by 25% (100 -> 75)
    assert_eq!(client.get_member_deposit(m2), m2_dep_before - 25);

    // Sponsor m2's reputation is penalized by -50 (100 -> 50)
    assert_eq!(client.get_reputation(m2), 50);
}
