use anchor_lang::prelude::*;

// Constants
pub const PERCENTAGE_SCALE: i64 = 10000; // Scale percentages by 10000 (2 decimal precision)
pub const POSITION_DURATION_SECONDS: u64 = 24 * 60 * 60; // Standard 24-hour duration

// Enums for order types and asset types
#[derive(Debug, Clone, Copy, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum OrderType {
    StayIn,   // Position profits if price stays within range
    Breakout, // Position profits if price breaks out of range
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum AssetType {
    BTC,
    ETH,
    BNB,
    GMX,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum OrderStatus {
    Pending,   // Order not yet matched
    Active,    // Order matched and position active
    Completed, // Position settled
    Cancelled, // Order cancelled before matching
}

//--------------------Fix and Refigure out!!!!----------------------------------------------------->

// Helper functions for percentage conversion
pub fn percentage_to_scaled(percentage: f64) -> i64 {
    (percentage * PERCENTAGE_SCALE as f64) as i64
}

pub fn scaled_to_percentage(scaled: i64) -> f64 {
    scaled as f64 / PERCENTAGE_SCALE as f64
} 