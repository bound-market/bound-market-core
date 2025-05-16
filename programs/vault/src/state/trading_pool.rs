// trading_pool.rs - Add this to your state folder
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TradingPool {
    pub authority: Pubkey,         // Admin authority that can manage the pool
    pub total_active_amount: u64,  // Total funds currently in active positions
    pub total_pool_amount: u64,    // Total funds in the pool
    pub bump: u8,                  // PDA bump
    pub vault_bump: u8,            // Trading pool vault bump
}

