use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct OrderState {
    // Essential identification
    pub user: Pubkey,             // User who placed the order
    pub order_type: OrderType,    // Stay In or Breakout
    
    // Core parameters
    pub amount: u64,              // Amount in lamports/smallest unit
    pub percentage_range: u16,    // Range percentage (basis points)
    
    // Price boundaries
    pub upper_bound: u64,         // Upper price boundary
    pub lower_bound: u64,         // Lower price boundary
    pub entry_price: u64,         // Price at order creation
    
    // Timing
    pub execution_timestamp: u64, // When order was executed/matched
    pub expiry_timestamp: u64,    // When order expires
    
    // Status
    pub status: OrderStatus,      // Active, Completed, Cancelled
    
    // Payout
    pub potential_payout: u64,    // Maximum possible payout
    pub final_payout: u64,        // Final payout amount (when settled)
    
    // Admin/security
    pub bump: u8,                 // PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum OrderType {
    StayIn,
    Breakout,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum OrderStatus {
    Active,         // Order matched and active
    Completed,      // Order completed (expired or condition met)
    Cancelled,      // Order cancelled by user
}