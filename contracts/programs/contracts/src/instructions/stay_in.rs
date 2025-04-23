use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::*;
use std::collections::BTreeMap;

/// Accounts for placing a StayIn liquidity order
#[derive(Accounts)]
pub struct PlaceStayInOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"trader", trader.key().as_ref()],
        bump = trader_state.bump,
        constraint = trader_state.trader == trader.key() @ ErrorCode::NotAuthorized
    )]
    pub trader_state: Account<'info, TraderState>,
    
    #[account(
        mut,
        seeds = [b"orderbook", &[orderbook.asset_type as u8]],
        bump = orderbook.bump
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    #[account(
        init,
        payer = trader,
        space = 8 + std::mem::size_of::<Order>(),
        seeds = [
            b"order", 
            trader.key().as_ref(), 
            &orderbook.next_sequence_number.to_le_bytes()
        ],
        bump
    )]
    pub order: Account<'info, Order>,
    
    /// CHECK: Used to store StayIn orders in an ordered way
    #[account(
        mut,
        seeds = [
            b"stay_in_orders",
            orderbook.key().as_ref()
        ],
        bump,
    )]
    pub stay_in_orders: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Place a StayIn liquidity order (by a funder)
pub fn handler(
    ctx: Context<PlaceStayInOrder>,
    width_percentage: f64,
    amount: u64,
) -> Result<()> {
    let orderbook = &mut ctx.accounts.orderbook;
    let trader_state = &mut ctx.accounts.trader_state;
    let order_account = &mut ctx.accounts.order;
    
    // Validate parameters
    if width_percentage < orderbook.min_percentage_width || 
       width_percentage > orderbook.max_percentage_width {
        return Err(error!(ErrorCode::InvalidWidthPercentage));
    }
    
    // Check if trader has sufficient funds
    if trader_state.free_funds < amount {
        return Err(error!(ErrorCode::InsufficientFunds));
    }
    
    // Generate order ID
    let order_id = orderbook.generate_order_id(width_percentage);
    
    // Create the order
    order_account.id = order_id;
    order_account.order_type = OrderType::StayIn;
    order_account.asset_type = orderbook.asset_type;
    order_account.width_percentage = width_percentage;
    order_account.amount = amount;
    order_account.trader = ctx.accounts.trader.key();
    order_account.base_price = orderbook.base_price;
    order_account.timestamp = PassageOrderbook::get_current_timestamp();
    order_account.status = OrderStatus::Pending;
    order_account.expiration = None;
    
    // Lock funds and add order to trader state
    trader_state.lock_funds(amount);
    trader_state.add_order(order_id);
    
    // Store order in the StayIn orders BTreeMap
    // In a real implementation, you would need to store this persistently
    // For example, using a serialized BTreeMap in PDA data
    
    msg!("StayIn order placed with ID: {:?}", order_id);
    Ok(())
}

// Separate handler for calculating payout for StayIn positions
// The payout follows the time-based logic from comments:
// "Base_bet / 24*60*60 = x
// for stay in increment x per second from 0 to 2*base_bet"
pub fn calculate_stay_in_payout(
    base_amount: u64,
    start_time: u64,
    current_time: u64
) -> u64 {
    // Calculate seconds elapsed
    let seconds_elapsed = current_time.saturating_sub(start_time);
    
    // Calculate payout rate per second
    let payout_rate = base_amount / POSITION_DURATION_SECONDS;
    
    // For StayIn positions, payout increases linearly with time
    // from 0 up to 2x the base amount
    let max_payout = 2 * base_amount;
    let payout = payout_rate * seconds_elapsed;
    
    // Cap at maximum payout
    std::cmp::min(payout, max_payout)
} 