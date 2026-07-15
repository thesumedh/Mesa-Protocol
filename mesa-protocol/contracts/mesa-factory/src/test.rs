#![cfg(test)]

use crate::{MesaFactory, MesaFactoryClient};
use soroban_sdk::{
    testutils::Address as AddressTestTrait,
    token, vec, Address, Env, String, Symbol, IntoVal
};

mod mesa_core_contract {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/mesa_core.wasm"
    );
}

#[test]
fn test_factory_deployment_and_sync() {
    let e = Env::default();
    e.mock_all_auths();

    // Register factory
    let factory_id = e.register_contract(None, MesaFactory);
    let client = MesaFactoryClient::new(&e, &factory_id);

    // Upload MesaCore WASM
    let wasm_hash = e.deployer().upload_contract_wasm(mesa_core_contract::WASM);

    // Initialize factory
    client.initialize(&wasm_hash);

    // Setup asset and creator
    let admin = Address::generate(&e);
    let token_addr = e.register_stellar_asset_contract(admin.clone());
    let token_admin = token::StellarAssetClient::new(&e, &token_addr);

    let creator = Address::generate(&e);
    let name1 = String::from_str(&e, "Circle 1");
    let name2 = String::from_str(&e, "Circle 2");
    let name3 = String::from_str(&e, "Circle 3");

    // Create three chamas
    let (id1, addr1) = client.create_chama(&creator, &name1, &100i128, &3u32, &3600u64, &token_addr, &0u32);
    let (id2, addr2) = client.create_chama(&creator, &name2, &200i128, &4u32, &7200u64, &token_addr, &0u32);
    let (id3, addr3) = client.create_chama(&creator, &name3, &300i128, &2u32, &1800u64, &token_addr, &0u32);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);

    // Verify lookup get_chama
    assert_eq!(client.get_chama(&1), addr1);
    assert_eq!(client.get_chama(&2), addr2);
    assert_eq!(client.get_chama(&3), addr3);

    // Verify list_chamas pagination (limit = 2, offset = 0)
    let paginated_list = client.list_chamas(&2, &0);
    assert_eq!(paginated_list.len(), 2);
    assert_eq!(paginated_list.get(0).unwrap().id, 1);
    assert_eq!(paginated_list.get(0).unwrap().contract_id, addr1);
    assert_eq!(paginated_list.get(0).unwrap().contribution_amount, 100i128);
    assert_eq!(paginated_list.get(1).unwrap().id, 2);
    assert_eq!(paginated_list.get(1).unwrap().contract_id, addr2);
    assert_eq!(paginated_list.get(1).unwrap().contribution_amount, 200i128);

    // Verify list_chamas next page (limit = 2, offset = 2)
    let paginated_list_2 = client.list_chamas(&2, &2);
    assert_eq!(paginated_list_2.len(), 1);
    assert_eq!(paginated_list_2.get(0).unwrap().id, 3);
    assert_eq!(paginated_list_2.get(0).unwrap().contract_id, addr3);

    // Verify get_chamas_summary
    let summary = client.get_chamas_summary();
    assert_eq!(summary.len(), 3);
    assert_eq!(summary.get(0).unwrap().name, String::from_str(&e, "Circle 1"));
    assert_eq!(summary.get(0).unwrap().member_count, 0);

    // Test sync_chama after a player joins
    let player = Address::generate(&e);
    token_admin.mint(&player, &1000);

    // Call join on the first chama directly using e.invoke_contract
    e.invoke_contract::<()>(
        &addr1,
        &Symbol::new(&e, "join"),
        vec![&e, player.clone().into_val(&e), player.clone().into_val(&e)],
    );

    // Call sync_chama on the factory
    client.sync_chama(&1);

    // Verify the summary updated member_count to 1
    let updated_summary = client.list_chamas(&1, &0);
    assert_eq!(updated_summary.get(0).unwrap().member_count, 1);
}
