use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Accounts for processing expired orders
#[derive(Accounts)]
pub struct ProcessExpiredOrders<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"orderbook", &[orderbook.asset_type as u8]],
        bump = orderbook.bump,
        constraint = orderbook.authority == authority.key() @ ErrorCode::NotAuthorized
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    /// CHECK: This will be a vector accounts to process
    pub orders: UncheckedAccount<'info>,
    
    /// The clock sysvar is used for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Process expired orders and clean up the orderbook
pub fn handler(ctx: Context<ProcessExpiredOrders>, order_accounts: Vec<Pubkey>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp as u64;
    
    // In a real implementation, you would:
    // 1. Fetch each order account from order_accounts
    // 2. Check if the order has expired
    // 3. If expired, mark it as completed
    // 4. Return funds to the trader
    // 5. Remove it from the appropriate orderbook
    
    msg!("Processing {} orders for expiration", order_accounts.len());
    
    // Placeholder implementation
    for _order_pubkey in order_accounts {
        // Process each order
        // logic would be implemented here
    }
    
    msg!("Expired orders processed");
    Ok(())
}

/// Accounts for settling a single order
#[derive(Accounts)]
pub struct SettleOrder<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"orderbook", &[orderbook.asset_type as u8]],
        bump = orderbook.bump,
        constraint = orderbook.authority == authority.key() @ ErrorCode::NotAuthorized
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    #[account(
        mut,
        constraint = order.status == OrderStatus::Active @ ErrorCode::OrderNotActive,
        close = trader 
    )]
    pub order: Account<'info, Order>,
    
    /// The owner of the order
    /// CHECK: Owner of the order
    #[account(mut)]
    pub trader: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"trader", trader.key().as_ref()],
        bump = trader_state.bump
    )]
    pub trader_state: Account<'info, TraderState>,
    
    /// The clock sysvar is used for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Settle a single order based on current price
pub fn settle_order_handler(ctx: Context<SettleOrder>, current_price: u64) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let trader_state = &mut ctx.accounts.trader_state;
    let current_time = Clock::get()?.unix_timestamp as u64;
    
    // Calculate if the position is profitable based on order type
    let is_profitable = match order.order_type {
        OrderType::StayIn => {
            // Calculate if price is within range
            let lower_bound = (order.base_price as f64 * (1.0 - order.width_percentage / 100.0)) as u64;
            let upper_bound = (order.base_price as f64 * (1.0 + order.width_percentage / 100.0)) as u64;
            current_price >= lower_bound && current_price <= upper_bound
        },
        OrderType::Breakout => {
            // Calculate if price is outside range
            let lower_bound = (order.base_price as f64 * (1.0 - order.width_percentage / 100.0)) as u64;
            let upper_bound = (order.base_price as f64 * (1.0 + order.width_percentage / 100.0)) as u64;
            current_price < lower_bound || current_price > upper_bound
        },
    };
    
    // Calculate payout based on position type and time elapsed
    let start_time = order.timestamp;
    let base_amount = order.amount;
    let payout = if is_profitable {
        match order.order_type {
            OrderType::StayIn => {
                crate::instructions::stay_in::calculate_stay_in_payout(
                    base_amount, start_time, current_time
                )
            },
            OrderType::Breakout => {
                crate::instructions::breakout::calculate_breakout_payout(
                    base_amount, start_time, current_time
                )
            },
        }
    } else {
        0 // No payout if not profitable
    };
    
    // Return funds to trader (base amount + payout if profitable)
    trader_state.unlock_funds(order.amount);
    trader_state.free_funds += payout;
    
    // Remove order from trader state
    trader_state.remove_order(order.id);
    
    msg!("Order settled, payout: {}", payout);
    Ok(())
} 