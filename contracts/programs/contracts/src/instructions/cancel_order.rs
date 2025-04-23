use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::*;

/// Accounts for cancelling an order
#[derive(Accounts)]
pub struct CancelOrder<'info> {
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
        constraint = order.trader == trader.key() @ ErrorCode::NotAuthorized,
        constraint = order.status == OrderStatus::Pending @ ErrorCode::OrderNotActive,
        close = trader
    )]
    pub order: Account<'info, Order>,
    
    #[account(
        mut,
        seeds = [b"orderbook", &[orderbook.asset_type as u8]],
        bump = orderbook.bump
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    /// Used to store orders of the appropriate type
    /// CHECK: Only used to find and remove the order
    #[account(mut)]
    pub orders_pda: UncheckedAccount<'info>,
}

/// Cancel an existing order and refund the trader
pub fn handler(ctx: Context<CancelOrder>) -> Result<()> {
    let trader_state = &mut ctx.accounts.trader_state;
    let order = &ctx.accounts.order;
    
    // Unlock funds
    trader_state.unlock_funds(order.amount);
    
    // Remove the order from trader state
    trader_state.remove_order(order.id);
    
    // In a real implementation, you would also need to remove the order
    // from the appropriate BTreeMap stored in the orders_pda
    
    msg!("Order cancelled and funds returned to trader");
    Ok(())
} 