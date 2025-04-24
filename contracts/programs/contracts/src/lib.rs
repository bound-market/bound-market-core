#![allow(unexpected_cfgs)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
// use crate::error::ErrorCode;
pub use instructions::*;
pub use state::*;


declare_id!("6RxZztEMgGnwza7GL1UsUjd4xWNauqm8zXQt5vbWvNrK");

#[program]
pub mod contracts {
    use super::*;

    // Initialize a new orderbook
    pub fn initialize(ctx: Context<Initialize>, asset_type_input: u8) -> Result<()> {
        instructions::initialize::handler(ctx,asset_type_input)
    }
    
    // Register a new trader or add funds to existing trader
    pub fn register_trader(ctx: Context<RegisterTrader>, initial_funds: u64) -> Result<()> {
        instructions::register_trader::handler(ctx, initial_funds)
    }
    
    // Place a StayIn liquidity order
    pub fn place_stay_in_order(
        ctx: Context<PlaceStayInOrder>,
        width_percentage: f64,
        amount: u64,
    ) -> Result<()> {
        instructions::stay_in::handler(ctx, width_percentage, amount)
    }
    
    // Place a Breakout liquidity order
    pub fn place_breakout_order(
        ctx: Context<PlaceBreakoutOrder>,
        width_percentage: f64,
        amount: u64,
    ) -> Result<()> {
        instructions::breakout::handler(ctx, width_percentage, amount)
    }
    
    // Match a position order with existing liquidity
    pub fn match_position_order(
        ctx: Context<MatchPositionOrder>,
        order_type: u8,
        width_percentage: f64,
        amount: u64,
    ) -> Result<()> {
        instructions::order_matching::handler(ctx, order_type, width_percentage, amount)
    }
    
    // Cancel an existing order
    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        instructions::cancel_order::handler(ctx)
    }
    
    // Process expired orders
    pub fn process_expired_orders(
        ctx: Context<ProcessExpiredOrders>,
        order_accounts: Vec<Pubkey>
    ) -> Result<()> {
        instructions::process_orders::handler(ctx, order_accounts)
    }
    
    // Settle a single order
    pub fn settle_order(
        ctx: Context<SettleOrder>,
        current_price: u64
    ) -> Result<()> {
        instructions::process_orders::settle_order_handler(ctx, current_price)
    }
    
    // Update base price from oracle
    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
        instructions::update_price::handler(ctx, new_price)
    }
}
