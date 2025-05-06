use anchor_lang::prelude::*;

use crate::state::SettlementData;
use crate::error::ErrorCode;

#[account]
#[derive(InitSpace)]
pub struct PositionState {
    pub user: Pubkey,              // User who created this position
    pub position_type: PositionType, // StayIn or Breakout
    pub lower_bound: u64,           // Lower price boundary (passed from off-chain)
    pub upper_bound: u64,           // Upper price boundary (passed from off-chain)
    pub start_time: i64,            // When the position became active (order matched)
    pub order_id: u64,              // Reference to off-chain order ID
    pub status: PositionStatus,     // Current position status
    pub amount: u64,                // Position size
    pub settlement_data: Option<SettlementData>, // Only populated when settled
    pub bump: u8,                   // PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq,Eq, InitSpace)]
pub enum PositionType {
    StayIn,    
    Breakout,  
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PositionStatus {
    Active,    
    Settled,   
    Claimed,   
}

//<------------------Helper functions-------------------->


impl PositionState {
    
    
    pub fn initialize(
        &mut self,
        user: Pubkey,
        position_type: PositionType,
        lower_bound: u64,
        upper_bound: u64,
        start_time: i64,
        order_id: u64,
        amount: u64,
        bump: u8,
    ) -> Result<()> {
        self.user = user;
        self.position_type = position_type;
        self.lower_bound = lower_bound;
        self.upper_bound = upper_bound;
        self.start_time = start_time;
        self.order_id = order_id;
        self.status = PositionStatus::Active;
        self.amount = amount;
        self.settlement_data = None;
        self.bump = bump;
        
        Ok(())
    }
    
    // Get position expiry time (start_time + 24 hours)
    pub fn get_expiry_time(&self) -> i64 {
        self.start_time + 24 * 60 * 60 // 24 hours in seconds
    }
    
    // Check if a position is expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time >= self.get_expiry_time()
    }
    
    // Check if price is outside the range
    pub fn is_outside_range(&self, current_price: u64) -> bool {
        current_price < self.lower_bound || current_price > self.upper_bound
    }
    
    // Settle a position with outcome
    pub fn settle(
        &mut self, 
        settlement_time: i64,
        settlement_price: u64,
        payout_percentage: u8
    ) -> Result<()> {
        require!(self.status == PositionStatus::Active, ErrorCode::PositionAlreadySettled);
        
        self.status = PositionStatus::Settled;
        self.settlement_data = Some(SettlementData {
            settlement_time,
            settlement_price,
            payout_percentage,
        });
        
        Ok(())
    }
    
    // Mark a position as claimed
    pub fn claim(&mut self) -> Result<()> {
        require!(self.status == PositionStatus::Settled, ErrorCode::PositionNotSettled);
        
        self.status = PositionStatus::Claimed;
        
        Ok(())
    }
    
   // Calculate payout based on position outcome with fair time-based distribution
pub fn calculate_payout(&self, current_time: i64, current_price: u64) -> u8 {
    let is_outside_range = self.is_outside_range(current_price);
    let expiry_time = self.get_expiry_time();
    let is_expired = current_time >= expiry_time;
    
    // Position duration in seconds (24 hours = 86400 seconds)
    let total_duration_seconds = 86400; // 24 hours in seconds
    
    // Elapsed time in seconds (capped at 86400)
    let elapsed_seconds = (current_time - self.start_time).min(total_duration_seconds).max(0);
    
    match (self.position_type, is_outside_range, is_expired) {
        // StayIn position outcomes
        (PositionType::StayIn, false, true) => {
            // Price stayed in range until expiry = full win
            200 // 2x return (100% profit)
        },
        (PositionType::StayIn, false, false) => {
            // Position still active, price in range
            // Partial payout based on elapsed time
            let payout_percentage = (elapsed_seconds as u128 * 200) / total_duration_seconds as u128;
            payout_percentage as u8
        },
        (PositionType::StayIn, true, _) => {
            // Price broke out of range - partial refund based on time held
            let payout_percentage = (elapsed_seconds as u128 * 100) / total_duration_seconds as u128;
            payout_percentage as u8
        },
        
        // Breakout position outcomes

        //@dev - payout = total amount in trade - Stay In
        (PositionType::Breakout, true, _) => {
            // Price broke out of range - full win if early, decreasing with time
            let remaining_seconds = total_duration_seconds - elapsed_seconds;
            let payout_percentage = (remaining_seconds as u128 * 200) / total_duration_seconds as u128;
            payout_percentage as u8
        },
        (PositionType::Breakout, false, true) => {
            // Price stayed in range until expiry = complete loss
            0
        },
        (PositionType::Breakout, false, false) => {
            // Position still active, price in range
            // Partial refund based on remaining time
            let remaining_seconds = total_duration_seconds - elapsed_seconds;
            let payout_percentage = (remaining_seconds as u128 * 100) / total_duration_seconds as u128;
            payout_percentage as u8
        },
    }
}
}