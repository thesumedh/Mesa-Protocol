#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, Vec, Symbol, String, IntoVal
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChamaSummary {
    pub id: u32,
    pub contract_id: Address,
    pub name: String,
    pub contribution_amount: i128,
    pub token: Address,
    pub member_count: u32,
    pub max_members: u32,
    pub status: u32,
    pub payout_mode: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Circle {
    pub creator: Address,
    pub name: String,
    pub contribution_amount: i128,
    pub max_members: u32,
    pub duration: u64,
    pub token: Address,
    pub members: Vec<Address>,
    pub rotation_order: Vec<Address>,
    pub current_round: u32,
    pub deadline: u64,
    pub status: u32,
    pub payout_mode: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    WasmHash,
    ChamaCount,
    Chama(u32),
    Summary(u32),
}

#[contract]
pub struct MesaFactory;

#[contractimpl]
impl MesaFactory {
    pub fn initialize(e: Env, wasm_hash: BytesN<32>) {
        assert!(!e.storage().instance().has(&DataKey::WasmHash), "already initialized");
        e.storage().instance().set(&DataKey::WasmHash, &wasm_hash);
        e.storage().instance().set(&DataKey::ChamaCount, &0u32);
    }

    pub fn create_chama(
        e: Env,
        creator: Address,
        name: String,
        contribution: i128,
        max_members: u32,
        duration: u64,
        token: Address,
        payout_mode: u32,
    ) -> (u32, Address) {
        creator.require_auth();

        let wasm_hash: BytesN<32> = e.storage().instance().get(&DataKey::WasmHash).expect("factory not initialized");
        let mut chama_count: u32 = e.storage().instance().get(&DataKey::ChamaCount).unwrap_or(0);
        chama_count += 1;
        e.storage().instance().set(&DataKey::ChamaCount, &chama_count);

        let mut salt_bin = [0u8; 32];
        salt_bin[0..4].copy_from_slice(&chama_count.to_be_bytes());
        let salt = BytesN::from_array(&e, &salt_bin);

        let contract_id = e.deployer().with_current_contract(salt).deploy(wasm_hash);

        e.invoke_contract::<()>(
            &contract_id,
            &Symbol::new(&e, "initialize"),
            soroban_sdk::vec![
                &e,
                creator.into_val(&e),
                name.clone().into_val(&e),
                contribution.into_val(&e),
                max_members.into_val(&e),
                duration.into_val(&e),
                token.clone().into_val(&e),
                payout_mode.into_val(&e),
            ],
        );

        let summary = ChamaSummary {
            id: chama_count,
            contract_id: contract_id.clone(),
            name,
            contribution_amount: contribution,
            token,
            member_count: 0,
            max_members,
            status: 0,
            payout_mode,
        };

        e.storage().persistent().set(&DataKey::Chama(chama_count), &contract_id);
        e.storage().persistent().set(&DataKey::Summary(chama_count), &summary);

        e.storage().persistent().extend_ttl(&DataKey::Chama(chama_count), 10000, 50000);
        e.storage().persistent().extend_ttl(&DataKey::Summary(chama_count), 10000, 50000);

        e.events().publish(
            (Symbol::new(&e, "CircleCreated"), chama_count),
            contract_id.clone()
        );

        (chama_count, contract_id)
    }

    pub fn get_chama(e: Env, chama_id: u32) -> Address {
        e.storage().persistent().get(&DataKey::Chama(chama_id)).expect("chama not found")
    }

    pub fn list_chamas(e: Env, limit: u32, offset: u32) -> Vec<ChamaSummary> {
        let count: u32 = e.storage().instance().get(&DataKey::ChamaCount).unwrap_or(0);
        let mut list = Vec::new(&e);
        if offset >= count {
            return list;
        }
        let end = count.min(offset + limit);
        for id in (offset + 1)..=(end) {
            if let Some(summary) = e.storage().persistent().get::<_, ChamaSummary>(&DataKey::Summary(id)) {
                list.push_back(summary);
            }
        }
        list
    }

    pub fn get_chamas_summary(e: Env) -> Vec<ChamaSummary> {
        let count: u32 = e.storage().instance().get(&DataKey::ChamaCount).unwrap_or(0);
        let mut list = Vec::new(&e);
        for id in 1..=count {
            if let Some(summary) = e.storage().persistent().get::<_, ChamaSummary>(&DataKey::Summary(id)) {
                list.push_back(summary);
            }
        }
        list
    }

    pub fn sync_chama(e: Env, chama_id: u32) {
        let contract_id: Address = e.storage().persistent().get(&DataKey::Chama(chama_id)).expect("chama not found");
        let circle: Circle = e.invoke_contract(&contract_id, &Symbol::new(&e, "get_circle"), Vec::new(&e));
        if let Some(mut summary) = e.storage().persistent().get::<_, ChamaSummary>(&DataKey::Summary(chama_id)) {
            summary.member_count = circle.members.len();
            summary.status = circle.status;
            e.storage().persistent().set(&DataKey::Summary(chama_id), &summary);
            e.storage().persistent().extend_ttl(&DataKey::Summary(chama_id), 10000, 50000);
        }
    }
}

#[cfg(test)]
mod test;

