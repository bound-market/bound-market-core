use anchor_lang::prelude::*;
use std::cmp::Ordering;
use super::types::*;

// Order ID for sorting and matching
#[derive(Debug, Clone, Copy, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct OrderId {
    // Width percentage of the range (scaled)
    pub width_percentage_scaled: i64,
    
    // Timestamp for FIFO ordering
    pub timestamp: u64,
    
    // Unique identifier
    pub sequence_number: u64,
}

impl Ord for OrderId {
    fn cmp(&self, other: &Self) -> Ordering {
        // For StayIn orders: wider ranges are better (less risky for the funder)
        // For Breakout orders: narrower ranges are better (less risky for the funder)
        // FIFO ordering if widths are equal
        match self.width_percentage_scaled.cmp(&other.width_percentage_scaled) {
            Ordering::Equal => self.timestamp.cmp(&other.timestamp),
            other_ordering => other_ordering,
        }
    }
}

// @dev: overlook 

impl PartialOrd for OrderId {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[account]
#[derive(Debug)]
pub struct Order {
    // Order identifier
    pub id: OrderId,
    
    // Order metadata
    pub order_type: OrderType,
    pub asset_type: AssetType,
    
    // Width percentage of the range (±X%)
    pub width_percentage: f64,
    
    // Amount of funds committed
    pub amount: u64,
    
    // Trader who placed the order
    pub trader: Pubkey,
    
    // Current base price when order was placed (for reference)
    // need to remove this
    pub base_price: u64,
    
    // Creation timestamp
    pub timestamp: u64,
    
    // Order status
    pub status: OrderStatus,
    
    // If matched, the expiration timestamp
    pub expiration: Option<u64>, // 24 hrs ???
}