#![no_std]
use soroban_sdk::{
    contract, contractimpl, contractmeta, contracttype, token, Address, Env, Map,
    String, Vec, Symbol
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Creator,
    Name,
    Contribution,
    MaxMembers,
    Duration,
    Token,
    Members,
    RotationOrder,
    CurrentRound,
    Deadline,
    Status,
    SecDeposits,
    RoundContribs,
    MissedPayments,
    Reputation,
    Vouches,
    Forfeits,
    EmergencyFlags,
    EmergencyActive,
    FlaggedMisses,
    PayoutMode,   // 0 = FixedRotation, 1 = DiscountAuction
    AuctionBids,  // Map<Address, i128> — member -> discount they offer
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
    pub status: u32,      // 0=Signup, 1=Active, 2=Paused, 3=Completed
    pub payout_mode: u32, // 0=FixedRotation, 1=DiscountAuction
}

contractmeta!(key = "Description", val = "Mesa Protocol ROSCA contract on Stellar");

#[contract]
pub struct MesaCore;

fn get_members(e: &Env) -> Vec<Address> {
    e.storage().instance().get(&DataKey::Members).unwrap_or_else(|| Vec::new(e))
}

fn get_status(e: &Env) -> u32 {
    e.storage().instance().get(&DataKey::Status).unwrap_or(0)
}

fn transfer(e: &Env, to: &Address, amount: &i128) {
    let token: Address = e.storage().instance().get(&DataKey::Token).unwrap();
    token::Client::new(e, &token).transfer(&e.current_contract_address(), to, amount);
}

fn eject_member(e: &Env, member: &Address, members: &Vec<Address>) {
    let mut reputation: Map<Address, u32> = e.storage().instance().get(&DataKey::Reputation).unwrap_or_else(|| Map::new(e));
    reputation.set(member.clone(), 0);
    e.storage().instance().set(&DataKey::Reputation, &reputation);

    let mut deps: Map<Address, i128> = e.storage().instance().get(&DataKey::SecDeposits).unwrap_or_else(|| Map::new(e));
    let dep = deps.get(member.clone()).unwrap_or(0);
    if dep > 0 {
        deps.set(member.clone(), 0);
        e.storage().instance().set(&DataKey::SecDeposits, &deps);
        
        let creator: Address = e.storage().instance().get(&DataKey::Creator).unwrap();
        transfer(e, &creator, &(dep / 2));
        let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
        e.storage().instance().set(&DataKey::Forfeits, &(forfeits + (dep - dep / 2)));
    }

    // Vouch penalty: slash sponsor
    let vouches: Map<Address, Address> = e.storage().instance().get(&DataKey::Vouches).unwrap_or_else(|| Map::new(e));
    if let Some(sponsor) = vouches.get(member.clone()) {
        if sponsor != *member {
            let sponsor_dep = deps.get(sponsor.clone()).unwrap_or(0);
            if sponsor_dep > 0 {
                let slash_amt = sponsor_dep / 4;
                deps.set(sponsor.clone(), sponsor_dep - slash_amt);
                e.storage().instance().set(&DataKey::SecDeposits, &deps);

                let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
                e.storage().instance().set(&DataKey::Forfeits, &(forfeits + slash_amt));
            }
            let sponsor_rep = reputation.get(sponsor.clone()).unwrap_or(100).saturating_sub(50);
            reputation.set(sponsor, sponsor_rep);
            e.storage().instance().set(&DataKey::Reputation, &reputation);
        }
    }

    // Remove member
    let mut mems = members.clone();
    if let Some(i) = mems.first_index_of(member.clone()) { mems.remove(i); }
    e.storage().instance().set(&DataKey::Members, &mems);

    let mut rot: Vec<Address> = e.storage().instance().get(&DataKey::RotationOrder).unwrap();
    if let Some(i) = rot.first_index_of(member.clone()) {
        let current_round: u32 = e.storage().instance().get(&DataKey::CurrentRound).unwrap_or(0);
        rot.remove(i);
        e.storage().instance().set(&DataKey::RotationOrder, &rot);

        // Adjust current_round if the ejected member was already paid
        if i < (current_round as u32) {
            let new_round = current_round.saturating_sub(1);
            e.storage().instance().set(&DataKey::CurrentRound, &new_round);

            // Shift contributions of the active round from current_round to new_round
            let mut contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(e));
            for m in mems.iter() {
                if contribs.get((current_round, m.clone())).unwrap_or(false) {
                    contribs.set((new_round, m.clone()), true);
                    contribs.set((current_round, m.clone()), false);
                }
            }
            e.storage().instance().set(&DataKey::RoundContribs, &contribs);
        }
    }
}

#[contractimpl]
impl MesaCore {
    pub fn initialize(
        e: Env,
        creator: Address,
        name: String,
        contribution: i128,
        max_members: u32,
        duration: u64,
        token: Address,
        payout_mode: u32,
    ) {
        assert!(!e.storage().instance().has(&DataKey::Creator), "already initialized");
        e.storage().instance().set(&DataKey::Creator, &creator);
        e.storage().instance().set(&DataKey::Name, &name);
        e.storage().instance().set(&DataKey::Contribution, &contribution);
        e.storage().instance().set(&DataKey::MaxMembers, &max_members);
        e.storage().instance().set(&DataKey::Duration, &duration);
        e.storage().instance().set(&DataKey::Token, &token);
        e.storage().instance().set(&DataKey::PayoutMode, &payout_mode);
        
        e.storage().instance().set(&DataKey::Members, &Vec::<Address>::new(&e));
        e.storage().instance().set(&DataKey::RotationOrder, &Vec::<Address>::new(&e));
        e.storage().instance().set(&DataKey::CurrentRound, &0u32);
        e.storage().instance().set(&DataKey::Deadline, &0u64);
        e.storage().instance().set(&DataKey::Status, &0u32); // 0 = Signup
    }

    pub fn join(e: Env, member: Address, sponsor: Address) {
        member.require_auth();
        assert!(get_status(&e) == 0, "not in signup status");

        let mut members = get_members(&e);
        let max_members: u32 = e.storage().instance().get(&DataKey::MaxMembers).unwrap();
        assert!(members.len() < max_members, "circle full");
        assert!(!members.contains(&member), "already joined");

        members.push_back(member.clone());
        e.storage().instance().set(&DataKey::Members, &members);

        // Vouching system check
        if sponsor != member {
            assert!(members.contains(&sponsor), "sponsor not in circle");
            let mut vouches: Map<Address, Address> = e.storage().instance().get(&DataKey::Vouches).unwrap_or_else(|| Map::new(&e));
            vouches.set(member.clone(), sponsor);
            e.storage().instance().set(&DataKey::Vouches, &vouches);
        }

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let token: Address = e.storage().instance().get(&DataKey::Token).unwrap();

        // Deposit = contribution * 2 (1 round contribution + 1 security deposit)
        token::Client::new(&e, &token).transfer(&member, &e.current_contract_address(), &(contrib * 2));

        let mut deps: Map<Address, i128> = e.storage().instance().get(&DataKey::SecDeposits).unwrap_or_else(|| Map::new(&e));
        deps.set(member.clone(), contrib);
        e.storage().instance().set(&DataKey::SecDeposits, &deps);

        // Mark first round contribution (round 0) as paid
        let mut contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e));
        contribs.set((0, member.clone()), true);
        e.storage().instance().set(&DataKey::RoundContribs, &contribs);

        // Set initial reputation score to 100
        let mut reputation: Map<Address, u32> = e.storage().instance().get(&DataKey::Reputation).unwrap_or_else(|| Map::new(&e));
        reputation.set(member.clone(), 100);
        e.storage().instance().set(&DataKey::Reputation, &reputation);

        e.events().publish((Symbol::new(&e, "MemberJoined"), member), ());
    }

    pub fn activate(e: Env, caller: Address) {
        caller.require_auth();
        let creator: Address = e.storage().instance().get(&DataKey::Creator).unwrap();
        assert!(caller == creator, "only creator can activate");
        assert!(get_status(&e) == 0, "not in signup status");
        let members = get_members(&e);
        assert!(members.len() > 1, "not enough members");

        e.storage().instance().set(&DataKey::Status, &1u32); // 1 = Active
        e.storage().instance().set(&DataKey::RotationOrder, &members); // Set rotation order to member joining order
        
        let duration: u64 = e.storage().instance().get(&DataKey::Duration).unwrap();
        e.storage().instance().set(&DataKey::Deadline, &(e.ledger().timestamp() + duration));

        e.events().publish((Symbol::new(&e, "CircleActivated"),), ());
    }

    pub fn contribute(e: Env, member: Address) {
        member.require_auth();
        assert!(get_status(&e) == 1, "circle not active");

        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        let round: u32 = e.storage().instance().get(&DataKey::CurrentRound).unwrap();
        let mut contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e));
        assert!(!contribs.get((round, member.clone())).unwrap_or(false), "already contributed");

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        let mut reputation: Map<Address, u32> = e.storage().instance().get(&DataKey::Reputation).unwrap_or_else(|| Map::new(&e));
        let mut current_rep = reputation.get(member.clone()).unwrap_or(100);

        if e.ledger().timestamp() > deadline {
            let mut flagged_misses: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::FlaggedMisses).unwrap_or_else(|| Map::new(&e));
            if !flagged_misses.get((round, member.clone())).unwrap_or(false) {
                flagged_misses.set((round, member.clone()), true);
                e.storage().instance().set(&DataKey::FlaggedMisses, &flagged_misses);

                let mut missed: Map<Address, u32> = e.storage().instance().get(&DataKey::MissedPayments).unwrap_or_else(|| Map::new(&e));
                let count = missed.get(member.clone()).unwrap_or(0) + 1;
                missed.set(member.clone(), count);
                e.storage().instance().set(&DataKey::MissedPayments, &missed);

                // Deduct reputation on missed payment
                current_rep = current_rep.saturating_sub(20);
                reputation.set(member.clone(), current_rep);
                e.storage().instance().set(&DataKey::Reputation, &reputation);

                // Ejection check
                if count >= 2 {
                    eject_member(&e, &member, &members);
                    return;
                }
            }
        } else {
            // Reward on-time payment
            if current_rep < 100 {
                current_rep = (current_rep + 5).min(100);
                reputation.set(member.clone(), current_rep);
                e.storage().instance().set(&DataKey::Reputation, &reputation);
            }
        }

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let token: Address = e.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&e, &token).transfer(&member, &e.current_contract_address(), &contrib);

        contribs.set((round, member.clone()), true);
        e.storage().instance().set(&DataKey::RoundContribs, &contribs);

        e.events().publish((Symbol::new(&e, "RoundContributed"), member), round);
    }

    pub fn distribute(e: Env, caller: Address) {
        caller.require_auth();
        let creator: Address = e.storage().instance().get(&DataKey::Creator).unwrap();
        assert!(caller == creator, "only creator can distribute");
        assert!(get_status(&e) == 1, "circle not active");

        let round: u32 = e.storage().instance().get(&DataKey::CurrentRound).unwrap();
        let members = get_members(&e);
        assert!(round < members.len(), "circle already completed");

        let contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e));
        for m in members.iter() {
            assert!(contribs.get((round, m.clone())).unwrap_or(false), "unpaid member");
        }

        let mut rot: Vec<Address> = e.storage().instance().get(&DataKey::RotationOrder).unwrap();
        let payout_mode: u32 = e.storage().instance().get(&DataKey::PayoutMode).unwrap_or(0);

        let mut winner = rot.get(round).unwrap();
        let mut discount_amount = 0i128;

        if payout_mode == 1 {
            // Find the highest bid
            let bids: Map<Address, i128> = e.storage().instance().get(&DataKey::AuctionBids).unwrap_or_else(|| Map::new(&e));
            let mut highest_bidder: Option<Address> = None;
            let mut highest_bid = -1i128;

            for bidder in bids.keys().iter() {
                if members.contains(&bidder) {
                    if let Some(idx) = rot.first_index_of(bidder.clone()) {
                        if idx >= round {
                            let bid_val = bids.get(bidder.clone()).unwrap();
                            if bid_val > highest_bid {
                                highest_bid = bid_val;
                                highest_bidder = Some(bidder);
                            }
                        }
                    }
                }
            }

            if let Some(winner_addr) = highest_bidder {
                winner = winner_addr.clone();
                discount_amount = highest_bid;

                // Swap winner into the current round index of rotation_order
                if let Some(winner_idx) = rot.first_index_of(winner.clone()) {
                    if winner_idx != round {
                        let temp = rot.get(round).unwrap();
                        rot.set(round, winner.clone());
                        rot.set(winner_idx, temp);
                        e.storage().instance().set(&DataKey::RotationOrder, &rot);
                    }
                }
            }
        }

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
        let pot = (contrib * (members.len() as i128)) + forfeits;

        let winner_payout = pot - discount_amount;
        assert!(winner_payout >= 0, "winner payout cannot be negative");

        // Transfer payout to winner
        transfer(&e, &winner, &winner_payout);

        // Distribute dividends to other active members
        if discount_amount > 0 && members.len() > 1 {
            let dividend_count = (members.len() as i128) - 1;
            let dividend_per_member = discount_amount / dividend_count;
            let remainder = discount_amount % dividend_count;

            for m in members.iter() {
                if m != winner {
                    transfer(&e, &m, &dividend_per_member);
                }
            }

            // Remainder goes back to forfeits
            e.storage().instance().set(&DataKey::Forfeits, &remainder);
        } else {
            e.storage().instance().set(&DataKey::Forfeits, &0i128);
        }

        // Clear bids for the next round
        e.storage().instance().remove(&DataKey::AuctionBids);

        e.events().publish((Symbol::new(&e, "RoundDistributed"), round, winner.clone()), winner_payout);

        let next_round = round + 1;
        e.storage().instance().set(&DataKey::CurrentRound, &next_round);

        if next_round >= members.len() {
            e.storage().instance().set(&DataKey::Status, &3u32); // 3 = Completed
        } else {
            let duration: u64 = e.storage().instance().get(&DataKey::Duration).unwrap();
            e.storage().instance().set(&DataKey::Deadline, &(e.ledger().timestamp() + duration));
        }
    }

    pub fn flag_missed(e: Env, member: Address, round: u32) {
        assert!(get_status(&e) == 1, "circle not active");

        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        let current_round: u32 = e.storage().instance().get(&DataKey::CurrentRound).unwrap();
        assert!(round == current_round, "not active round");

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        assert!(e.ledger().timestamp() > deadline, "deadline has not passed");

        let contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e));
        assert!(!contribs.get((round, member.clone())).unwrap_or(false), "already contributed");

        let mut flagged_misses: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::FlaggedMisses).unwrap_or_else(|| Map::new(&e));
        if !flagged_misses.get((round, member.clone())).unwrap_or(false) {
            flagged_misses.set((round, member.clone()), true);
            e.storage().instance().set(&DataKey::FlaggedMisses, &flagged_misses);

            let mut missed: Map<Address, u32> = e.storage().instance().get(&DataKey::MissedPayments).unwrap_or_else(|| Map::new(&e));
            let count = missed.get(member.clone()).unwrap_or(0) + 1;
            missed.set(member.clone(), count);
            e.storage().instance().set(&DataKey::MissedPayments, &missed);

            let mut reputation: Map<Address, u32> = e.storage().instance().get(&DataKey::Reputation).unwrap_or_else(|| Map::new(&e));
            let mut current_rep = reputation.get(member.clone()).unwrap_or(100);
            current_rep = current_rep.saturating_sub(20);
            reputation.set(member.clone(), current_rep);
            e.storage().instance().set(&DataKey::Reputation, &reputation);

            e.events().publish((Symbol::new(&e, "MissedPayment"), member.clone()), round);

            if count >= 2 {
                eject_member(&e, &member, &members);
            }
        }
    }

    pub fn flag_emergency(e: Env, member: Address) {
        member.require_auth();
        assert!(get_status(&e) == 1, "circle not active");

        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        let mut emergency_flags: Map<Address, bool> = e.storage().instance().get(&DataKey::EmergencyFlags).unwrap_or_else(|| Map::new(&e));
        assert!(!emergency_flags.get(member.clone()).unwrap_or(false), "already flagged emergency");

        emergency_flags.set(member.clone(), true);
        e.storage().instance().set(&DataKey::EmergencyFlags, &emergency_flags);

        e.events().publish((Symbol::new(&e, "EmergencyFlagged"), member), ());

        // Count flags
        let mut flag_count = 0;
        for m in members.iter() {
            if emergency_flags.get(m).unwrap_or(false) {
                flag_count += 1;
            }
        }

        // If > 50% flagged
        if flag_count * 2 > members.len() {
            e.storage().instance().set(&DataKey::EmergencyActive, &true);
            e.storage().instance().set(&DataKey::Status, &2u32); // 2 = Paused
        }
    }

    pub fn withdraw_principal(e: Env, member: Address) {
        member.require_auth();
        let emergency_active = e.storage().instance().get(&DataKey::EmergencyActive).unwrap_or(false);
        assert!(emergency_active, "emergency not active");

        let mut deps: Map<Address, i128> = e.storage().instance().get(&DataKey::SecDeposits).unwrap_or_else(|| Map::new(&e));
        let dep = deps.get(member.clone()).unwrap_or(0);

        let round: u32 = e.storage().instance().get(&DataKey::CurrentRound).unwrap_or(0);
        let mut contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e));
        let contributed_this_round = contribs.get((round, member.clone())).unwrap_or(false);

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let mut withdrawable = dep;
        if contributed_this_round {
            withdrawable += contrib;
        }

        assert!(withdrawable > 0, "nothing to withdraw");

        // Clear state first
        deps.set(member.clone(), 0);
        e.storage().instance().set(&DataKey::SecDeposits, &deps);

        if contributed_this_round {
            contribs.set((round, member.clone()), false);
            e.storage().instance().set(&DataKey::RoundContribs, &contribs);
        }

        // Transfer funds
        transfer(&e, &member, &withdrawable);

        // Remove from members
        let mut members = get_members(&e);
        if let Some(i) = members.first_index_of(member.clone()) {
            members.remove(i);
        }
        e.storage().instance().set(&DataKey::Members, &members);

        // Remove from rotation order
        let mut rot: Vec<Address> = e.storage().instance().get(&DataKey::RotationOrder).unwrap_or_else(|| Vec::new(&e));
        if let Some(i) = rot.first_index_of(member.clone()) {
            rot.remove(i);
        }
        e.storage().instance().set(&DataKey::RotationOrder, &rot);

        e.events().publish((Symbol::new(&e, "PrincipalWithdrawn"), member), withdrawable);
    }

    pub fn can_distribute(e: Env) -> bool {
        if get_status(&e) != 1 {
            return false;
        }
        let round: u32 = match e.storage().instance().get(&DataKey::CurrentRound) {
            Some(r) => r,
            None => return false,
        };
        let members = get_members(&e);
        if round >= members.len() {
            return false;
        }
        let contribs: Map<(u32, Address), bool> = e.storage().instance().get(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e));
        for m in members.iter() {
            if !contribs.get((round, m.clone())).unwrap_or(false) {
                return false;
            }
        }
        true
    }

    pub fn get_circle(e: Env) -> Circle {
        Circle {
            creator: e.storage().instance().get(&DataKey::Creator).unwrap(),
            name: e.storage().instance().get(&DataKey::Name).unwrap(),
            contribution_amount: e.storage().instance().get(&DataKey::Contribution).unwrap(),
            max_members: e.storage().instance().get(&DataKey::MaxMembers).unwrap(),
            duration: e.storage().instance().get(&DataKey::Duration).unwrap(),
            token: e.storage().instance().get(&DataKey::Token).unwrap(),
            members: get_members(&e),
            rotation_order: e.storage().instance().get(&DataKey::RotationOrder).unwrap_or_else(|| Vec::new(&e)),
            current_round: e.storage().instance().get(&DataKey::CurrentRound).unwrap_or(0),
            deadline: e.storage().instance().get(&DataKey::Deadline).unwrap_or(0),
            status: get_status(&e),
            payout_mode: e.storage().instance().get(&DataKey::PayoutMode).unwrap_or(0),
        }
    }

    pub fn place_bid(e: Env, member: Address, discount_amount: i128) {
        member.require_auth();
        assert!(get_status(&e) == 1, "circle not active");

        let payout_mode: u32 = e.storage().instance().get(&DataKey::PayoutMode).unwrap_or(0);
        assert!(payout_mode == 1, "not in auction mode");

        let members = get_members(&e);
        assert!(members.contains(&member), "not member");

        let current_round: u32 = e.storage().instance().get(&DataKey::CurrentRound).unwrap_or(0);
        let rot: Vec<Address> = e.storage().instance().get(&DataKey::RotationOrder).unwrap();
        
        let idx = rot.first_index_of(member.clone()).unwrap();
        assert!(idx >= current_round, "member already won payout");

        let contrib: i128 = e.storage().instance().get(&DataKey::Contribution).unwrap();
        let forfeits: i128 = e.storage().instance().get(&DataKey::Forfeits).unwrap_or(0);
        let pot = (contrib * (members.len() as i128)) + forfeits;

        assert!(discount_amount > 0, "discount must be positive");
        assert!(discount_amount < pot, "discount must be less than pot");

        let mut bids: Map<Address, i128> = e.storage().instance().get(&DataKey::AuctionBids).unwrap_or_else(|| Map::new(&e));
        bids.set(member.clone(), discount_amount);
        e.storage().instance().set(&DataKey::AuctionBids, &bids);

        e.events().publish((Symbol::new(&e, "BidPlaced"), member), discount_amount);
    }

    pub fn get_auction_bids(e: Env) -> Map<Address, i128> {
        e.storage().instance().get(&DataKey::AuctionBids).unwrap_or_else(|| Map::new(&e))
    }

    // Helper reader methods for detailed user metrics
    pub fn get_member_deposit(e: Env, m: Address) -> i128 {
        e.storage().instance().get::<_, Map<Address, i128>>(&DataKey::SecDeposits).unwrap_or_else(|| Map::new(&e)).get(m).unwrap_or(0)
    }
    pub fn get_member_misses(e: Env, m: Address) -> u32 {
        e.storage().instance().get::<_, Map<Address, u32>>(&DataKey::MissedPayments).unwrap_or_else(|| Map::new(&e)).get(m).unwrap_or(0)
    }
    pub fn has_contributed(e: Env, r: u32, m: Address) -> bool {
        e.storage().instance().get::<_, Map<(u32, Address), bool>>(&DataKey::RoundContribs).unwrap_or_else(|| Map::new(&e)).get((r, m)).unwrap_or(false)
    }
    pub fn get_reputation(e: Env, m: Address) -> u32 {
        e.storage().instance().get::<_, Map<Address, u32>>(&DataKey::Reputation).unwrap_or_else(|| Map::new(&e)).get(m).unwrap_or(100)
    }
    pub fn get_sponsor(e: Env, m: Address) -> Address {
        let vouches: Map<Address, Address> = e.storage().instance().get(&DataKey::Vouches).unwrap_or_else(|| Map::new(&e));
        vouches.get(m.clone()).unwrap_or(m)
    }
}

#[cfg(test)]
mod test;
