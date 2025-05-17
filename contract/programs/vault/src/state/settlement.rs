use anchor_lang::prelude::*;


// Settlement data - only stored when a position is settled
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct SettlementData {
    pub settlement_time: i64,       // When position was settled
    pub settlement_price: u64,      // Price at settlement
    pub payout_percentage: u8,      // Percentage of original amount to pay out
}