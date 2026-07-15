#![cfg(test)]

use crate::{MesaCore, MesaCoreClient};
use soroban_sdk::{
    testutils::{Address as AddressTestTrait, Ledger},
    token, vec, Address, Env, Vec, String,
};

fn advance_ledger(e: &Env, delta: u64) {
    e.ledger().with_mut(|l| {
        l.timestamp += delta;
    });
}

struct TestEnv<'a> {
    env: Env,
    token: token::Client<'a>,
    creator: Address,
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

        let creator = Address::generate(&e);
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

        let circle_name = String::from_str(&e, "Test Circle");

        client.initialize(
            &creator,
            &circle_name,
            &100i128, // contribution
            &3u32,    // max members
            &3600u64, // duration: 1 hour
            &token.address,
            &0u32,    // payout_mode: 0 = FixedRotation
        );

        Self {
            env: e,
            token,
            creator,
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

    // Verify all marked as contributed in first round (round 0)
    assert!(client.has_contributed(&0u32, m1));
    assert!(client.has_contributed(&0u32, m2));
    assert!(client.has_contributed(&0u32, m3));

    // Verify get_circle returns correct details
    let circle = client.get_circle();
    assert_eq!(circle.creator, setup.creator);
    assert_eq!(circle.contribution_amount, 100);
    assert_eq!(circle.max_members, 3);
    assert_eq!(circle.duration, 3600);
    assert_eq!(circle.status, 0); // Signup status
}

#[test]
fn test_activation() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();

    // Join 2 members
    client.join(m1, m1);
    client.join(m2, m2);

    // Verify can_distribute is false in Signup mode
    assert!(!client.can_distribute());

    // Activate circle
    client.activate(&setup.creator);

    let circle = client.get_circle();
    assert_eq!(circle.status, 1); // Active status
    assert_eq!(circle.rotation_order.len(), 2);
    assert!(circle.deadline > 0);

    // Verify can_distribute is true now because round 0 (join) contributions are paid
    assert!(client.can_distribute());
}

#[test]
fn test_contribute_and_distribute() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    // Join
    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    // Activate
    client.activate(&setup.creator);

    // Verify we can distribute round 0
    assert!(client.can_distribute());
    client.distribute(&setup.creator);

    // Verify Round 0 winner (m1) received the pot (300)
    assert_eq!(setup.token.balance(m1), 1100);

    // Verify can_distribute is false for Round 1 since no one has contributed yet
    assert!(!client.can_distribute());

    // Round 1 contributions - partially contributed
    client.contribute(m1);
    assert!(!client.can_distribute());

    // m2 contributes
    client.contribute(m2);
    assert!(!client.can_distribute());

    // m3 pays -> now can distribute
    client.contribute(m3);
    assert!(client.can_distribute());

    // Distribute Round 1
    client.distribute(&setup.creator);

    // Verify Round 1 winner (m2) received the pot (300)
    assert_eq!(setup.token.balance(m2), 1000);

    // Round 2 contributions to complete the circle
    client.contribute(m1);
    client.contribute(m2);
    client.contribute(m3);
    client.distribute(&setup.creator);

    let circle = client.get_circle();
    assert_eq!(circle.status, 3); // 3 = Completed status!
}

#[test]
fn test_distribute_before_all_paid_fails() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    client.activate(&setup.creator);
    client.distribute(&setup.creator); // Distribute round 0 (success)

    // Round 1: only m1 and m2 pay, m3 has not paid
    client.contribute(m1);
    client.contribute(m2);

    // Distribute should not be allowed
    assert!(!client.can_distribute());
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

    client.activate(&setup.creator);

    // Distribute round 0
    client.distribute(&setup.creator);

    // Member 1 and 3 pay on time
    client.contribute(m1);
    client.contribute(m3);

    // Advance ledger beyond round 1 deadline (1 hour + 1 second)
    advance_ledger(&setup.env, 3601);

    // Member 2 contributes late (after deadline) -> Missed payment count increments to 1
    client.contribute(m2);
    assert_eq!(client.get_member_misses(m2), 1);

    // Distribute round 1
    client.distribute(&setup.creator);

    // Member 1 and 3 contribute on time
    client.contribute(m1);
    client.contribute(m3);

    // Advance ledger beyond round 2 deadline
    advance_ledger(&setup.env, 3601);

    // Member 2 contributes late again (after deadline) -> Missed payment count increments to 2
    // This triggers ejection and 50/50 forfeiture
    client.contribute(m2);

    // Member 2 is ejected
    let circle = client.get_circle();
    assert_eq!(circle.members.len(), 2);
    assert_eq!(circle.rotation_order.len(), 2);

    // Security deposit for Member 2 is forfeited: 50% to creator, 50% to pot
    assert_eq!(client.get_member_deposit(m2), 0);
    assert_eq!(setup.token.balance(&setup.creator), 50); // 50 tokens to creator
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

    client.activate(&setup.creator);

    // Distribute round 0
    client.distribute(&setup.creator);

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
    client.distribute(&setup.creator);

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

    // Sponsor m2's deposit is slashed by 25% (100 -> 75)
    assert_eq!(client.get_member_deposit(m2), m2_dep_before - 25);

    // Sponsor m2's reputation is penalized by -50 (100 -> 50)
    assert_eq!(client.get_reputation(m2), 50);
}

#[test]
fn test_flag_missed() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    client.activate(&setup.creator);
    client.distribute(&setup.creator); // Distribute round 0

    // Round 1 active
    client.contribute(m1);
    client.contribute(m3);

    // Advance ledger so deadline passes
    advance_ledger(&setup.env, 3601);

    // Flag m2 as missed for round 1
    client.flag_missed(m2, &1u32);
    assert_eq!(client.get_member_misses(m2), 1);
    assert_eq!(client.get_reputation(m2), 80);

    // m2 contributes late so we can distribute round 1 without panicking
    client.contribute(m2);

    // Distribute round 1
    client.distribute(&setup.creator);

    // Round 2 active
    client.contribute(m1);
    client.contribute(m3);

    // Advance ledger so deadline passes again
    advance_ledger(&setup.env, 3601);

    // Flag m2 as missed again -> should eject m2
    client.flag_missed(m2, &2u32);

    let circle = client.get_circle();
    assert_eq!(circle.members.len(), 2);
    assert!(!circle.members.contains(m2.clone()));

    // Now since m2 is ejected, we can distribute round 2!
    client.distribute(&setup.creator);
}

#[test]
fn test_flag_emergency_flow() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    client.activate(&setup.creator);

    // 1 member flags emergency -> should not pause yet (1 out of 3 is 33%)
    client.flag_emergency(m1);
    let circle = client.get_circle();
    assert_eq!(circle.status, 1); // still active

    // 2nd member flags emergency -> should pause (2 out of 3 is 66% > 50%)
    client.flag_emergency(m2);
    let circle = client.get_circle();
    assert_eq!(circle.status, 2); // 2 = Paused
}

#[test]
fn test_withdraw_principal_emergency() {
    let setup = TestEnv::setup();
    let client = &setup.client;
    let m1 = &setup.members.get(0).unwrap();
    let m2 = &setup.members.get(1).unwrap();
    let m3 = &setup.members.get(2).unwrap();

    client.join(m1, m1);
    client.join(m2, m2);
    client.join(m3, m3);

    client.activate(&setup.creator);
    client.distribute(&setup.creator); // round 0 pot paid to m1

    // Round 1: m2 contributes
    client.contribute(m2);

    // Flag emergency by m1 and m2 -> pauses contract
    client.flag_emergency(m1);
    client.flag_emergency(m2);

    let circle = client.get_circle();
    assert_eq!(circle.status, 2); // Paused

    // Now withdraw principal for m2 (has deposit 100 + contributed 100 this round)
    let m2_balance_before = setup.token.balance(m2);
    client.withdraw_principal(m2);
    let m2_balance_after = setup.token.balance(m2);
    
    // Should get 200 back (100 security deposit + 100 contribution)
    assert_eq!(m2_balance_after - m2_balance_before, 200);

    // Verify m2 is removed from members and rotation_order
    let circle = client.get_circle();
    assert!(!circle.members.contains(m2.clone()));
    assert!(!circle.rotation_order.contains(m2.clone()));

    // Now withdraw principal for m3 (has deposit 100, has NOT contributed this round)
    let m3_balance_before = setup.token.balance(m3);
    client.withdraw_principal(m3);
    let m3_balance_after = setup.token.balance(m3);
    
    // Should get 100 back (only security deposit)
    assert_eq!(m3_balance_after - m3_balance_before, 100);
}

#[test]
fn test_auction_payout_flow() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let token_addr = e.register_stellar_asset_contract(admin.clone());
    let token = token::Client::new(&e, &token_addr);
    let token_admin = token::StellarAssetClient::new(&e, &token_addr);

    let creator = Address::generate(&e);
    let m1 = Address::generate(&e);
    let m2 = Address::generate(&e);
    let m3 = Address::generate(&e);

    // Mint tokens to members
    token_admin.mint(&m1, &1000);
    token_admin.mint(&m2, &1000);
    token_admin.mint(&m3, &1000);

    let contract_id = e.register_contract(None, MesaCore);
    let client = MesaCoreClient::new(&e, &contract_id);

    let circle_name = String::from_str(&e, "Auction Circle");

    client.initialize(
        &creator,
        &circle_name,
        &100i128, // contribution
        &3u32,    // max members
        &3600u64, // duration
        &token.address,
        &1u32,    // payout_mode: 1 = DiscountAuction
    );

    // Join
    client.join(&m1, &m1);
    client.join(&m2, &m2);
    client.join(&m3, &m3);

    // Activate
    client.activate(&creator);

    let circle = client.get_circle();
    assert_eq!(circle.payout_mode, 1);

    // Bids for Round 0:
    // m2 bids 30 discount
    // m3 bids 45 discount
    client.place_bid(&m2, &30i128);
    client.place_bid(&m3, &45i128);

    // Check bids are recorded
    let bids = client.get_auction_bids();
    assert_eq!(bids.get(m2.clone()).unwrap(), 30);
    assert_eq!(bids.get(m3.clone()).unwrap(), 45);

    // Distribute round 0 pot. Total pot = 3 members * 100 = 300.
    // m3 has highest bid (45). So m3 wins the auction.
    // m3 gets 300 - 45 = 255.
    // The 45 discount is split as dividends between other active members (m1 and m2).
    // dividend per member = 45 / (3 - 1) = 45 / 2 = 22.
    // Remainder (1) goes back to forfeits.
    let m1_bal_before = token.balance(&m1);
    let m2_bal_before = token.balance(&m2);
    let m3_bal_before = token.balance(&m3);

    client.distribute(&creator);

    let m1_bal_after = token.balance(&m1);
    let m2_bal_after = token.balance(&m2);
    let m3_bal_after = token.balance(&m3);

    // m3 payout
    assert_eq!(m3_bal_after - m3_bal_before, 255);
    // m1 and m2 get dividends
    assert_eq!(m1_bal_after - m1_bal_before, 22);
    assert_eq!(m2_bal_after - m2_bal_before, 22);

    // Verify winner swap in rotation order:
    // m3 (who was index 2) should now be at index 0 (current round).
    let circle = client.get_circle();
    assert_eq!(circle.rotation_order.get(0).unwrap(), m3.clone());
    assert_eq!(circle.current_round, 1);

    // Bids are cleared
    let bids_after = client.get_auction_bids();
    assert_eq!(bids_after.len(), 0);

    // Round 1 contributions:
    // All must pay their contribution (100)
    token_admin.mint(&m1, &1000);
    token_admin.mint(&m2, &1000);
    token_admin.mint(&m3, &1000);
    
    client.contribute(&m1);
    client.contribute(&m2);
    client.contribute(&m3);

    // Bids for Round 1:
    // m1 bids 20.
    client.place_bid(&m1, &20i128);

    let m1_bal_before = token.balance(&m1);
    let m2_bal_before = token.balance(&m2);
    let m3_bal_before = token.balance(&m3);

    // Distribute round 1.
    // Total pot = 300 + 1 (forfeit remainder from previous round) = 301.
    // m1 wins with bid 20.
    // m1 gets 301 - 20 = 281.
    // Dividend is 20 / 2 = 10 each for m2 and m3.
    // Remainder 0.
    client.distribute(&creator);

    let m1_bal_after = token.balance(&m1);
    let m2_bal_after = token.balance(&m2);
    let m3_bal_after = token.balance(&m3);

    assert_eq!(m1_bal_after - m1_bal_before, 281);
    assert_eq!(m2_bal_after - m2_bal_before, 10);
    assert_eq!(m3_bal_after - m3_bal_before, 10);

    // Rotation order winner check: m1 should be at index 1.
    let circle = client.get_circle();
    assert_eq!(circle.rotation_order.get(1).unwrap(), m1.clone());
    assert_eq!(circle.current_round, 2);
}
