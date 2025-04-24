use anchor_lang::prelude::*;
use std::collections::BTreeMap;
use super::order::{Order, OrderId};
use super::types::*;

// Result of a matching operation
#[derive(Debug)]
pub struct MatchResult {
    pub trader_amount: u64,
    pub funder_amount: u64,
    pub width_percentage: f64,
    pub trader: Pubkey,
    pub funder: Pubkey,
    pub base_price: u64,
    pub expiration: u64,
}

// The main orderbook account
#[account]
#[derive(Debug)]
pub struct PassageOrderbook {
    // Asset type for this orderbook
    pub asset_type: AssetType,
    
    // Current base price of the asset
    pub base_price: u64,
    
    // Sequential order ID counter
    pub next_sequence_number: u64,
    
    // Market parameters
    pub min_percentage_width: f64,
    pub max_percentage_width: f64,
    
    // Authority of the orderbook
    pub authority: Pubkey,
    
    // Bump for PDA
    pub bump: u8,
}

impl PassageOrderbook {
    pub fn new(
        asset_type: AssetType,
        base_price: u64,
        min_percentage_width: f64,
        max_percentage_width: f64,
        authority: Pubkey,
        bump: u8,
    ) -> Self {
        PassageOrderbook {
            asset_type,
            base_price,
            next_sequence_number: 1,
            min_percentage_width,
            max_percentage_width,
            authority,
            bump,
        }
    }
    
    // Get current timestamp in seconds
    pub fn get_current_timestamp() -> u64 {
        Clock::get().unwrap().unix_timestamp as u64
    }
    
    // Generate a new order ID
    pub fn generate_order_id(
        &mut self,
        width_percentage: f64,
    ) -> OrderId {
        let timestamp = Self::get_current_timestamp();
        let sequence_number = self.next_sequence_number;
        self.next_sequence_number += 1;

        
        OrderId {
            width_percentage_scaled: percentage_to_scaled(width_percentage),
            timestamp,
            sequence_number,
        }
    }
    
    // Update base price (e.g., from an oracle)
    pub fn update_base_price(&mut self, new_price: u64) {
        self.base_price = new_price;
    }
} 