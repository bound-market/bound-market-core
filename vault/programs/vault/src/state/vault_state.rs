use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub authority: Pubkey,        // Admin/authority of the vault
    pub vault_bump: u8,           // PDA bump for the vault
    pub state_bump: u8,
}

impl VaultState {
    pub const MIN_ORDER_AMOUNT: u64 = 100_000_000; // 0.1 SOL in lamports
}