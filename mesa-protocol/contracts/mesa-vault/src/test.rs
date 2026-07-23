wwww#![cfg(test)]

use crate::{MesaVault, MesaVaultClient, Policy, Error};
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
    user: Address,
    client: MesaVaultClient<'a>,
    contract_id: Address,
}

impl TestEnv<'_> {
    fn setup(e: &Env, policies: Vec<Policy>) -> Self {
        e.mock_all_auths();

        let admin = Address::generate(e);
        let token_addr = e.register_stellar_asset_contract(admin.clone());
        let token = token::Client::new(e, &token_addr);
        let token_admin = token::StellarAssetClient::new(e, &token_addr);

        let creator = Address::generate(e);
        let user = Address::generate(e);

        // Mint tokens
        token_admin.mint(&user, &1000i128);

        let contract_id = e.register_contract(None, MesaVault);
        let client = MesaVaultClient::new(e, &contract_id);

        let vault_name = String::from_str(e, "Test Vault");

        client.initialize(
            &creator,
            &vault_name,
            &token.address,
            &policies,
        );

        Self {
            env: e.clone(),
            token,
            creator,
            user,
            client,
            contract_id,
        }
    }
}

#[test]
fn test_deposit_and_goal_policy() {
    let e = Env::default();
    let policies = vec![&e, Policy::Goal(500i128)];
    let setup = TestEnv::setup(&e, policies);

    // Deposit 200 - should succeed
    setup.client.deposit(&setup.user, &200i128);
    assert_eq!(setup.token.balance(&setup.user), 800);
    assert_eq!(setup.token.balance(&setup.contract_id), 200);

    // Get vault state
    let state = setup.client.get_vault_state();
    assert_eq!(state.total_balance, 200);

    // Deposit another 400 - should fail as it exceeds goal limit of 500
    let res = setup.client.try_deposit(&setup.user, &400i128);
    match res {
        Err(Ok(e)) => {
            assert_eq!(Error::try_from(e), Ok(Error::GoalExceeded));
        }
        _ => panic!("Expected goal exceeded error, got {:?}", res),
    }
}

#[test]
fn test_lock_policy() {
    let e = Env::default();
    let policies = vec![&e, Policy::Lock(3600u64)]; // 1 hour lock
    let setup = TestEnv::setup(&e, policies);

    // Deposit 300
    setup.client.deposit(&setup.user, &300i128);

    // Try to withdraw immediately - should fail
    let res = setup.client.try_withdraw(&setup.user, &100i128);
    match res {
        Err(Ok(e)) => {
            assert_eq!(Error::try_from(e), Ok(Error::FundsLocked));
        }
        _ => panic!("Expected funds locked error, got {:?}", res),
    }

    // Advance ledger by 4000 seconds
    advance_ledger(&setup.env, 4000);

    // Try to withdraw now - should succeed
    setup.client.withdraw(&setup.user, &100i128);
    assert_eq!(setup.token.balance(&setup.user), 800);
    assert_eq!(setup.token.balance(&setup.contract_id), 200);
}

#[test]
fn test_emergency_withdrawal_bypass() {
    let e = Env::default();
    let policies = vec![&e, Policy::Lock(3600u64), Policy::AllowEmergencyWithdrawal(true)];
    let setup = TestEnv::setup(&e, policies);

    // Deposit 300
    setup.client.deposit(&setup.user, &300i128);

    // Try to withdraw immediately - fails due to lock
    let res = setup.client.try_withdraw(&setup.user, &100i128);
    match res {
        Err(Ok(e)) => {
            assert_eq!(Error::try_from(e), Ok(Error::FundsLocked));
        }
        _ => panic!("Expected funds locked error, got {:?}", res),
    }

    // Vote for emergency
    setup.client.vote_emergency(&setup.user);

    // Check emergency is active (1 member, 1 vote = 100% > 50%)
    let state = setup.client.get_vault_state();
    assert!(state.emergency_active);

    // Try to withdraw immediately - should bypass lock and succeed
    setup.client.withdraw(&setup.user, &100i128);
    assert_eq!(setup.token.balance(&setup.user), 800);
    assert_eq!(setup.token.balance(&setup.contract_id), 200);
}
