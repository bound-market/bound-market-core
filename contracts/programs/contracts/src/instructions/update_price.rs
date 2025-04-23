use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Accounts for updating price from oracle
#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"orderbook", &[orderbook.asset_type as u8]],
        bump = orderbook.bump,
        constraint = orderbook.authority == authority.key() @ ErrorCode::NotAuthorized
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    /// CHECK: This would normally be Pyth oracle accounts
    /// For now, we just take the price as a parameter
    pub oracle: UncheckedAccount<'info>,
}

/// Update the base price from oracle data
pub fn handler(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
    let orderbook = &mut ctx.accounts.orderbook;
    
    // In a production implementation, you would:
    // 1. Parse price from Pyth oracle account
    // 2. Validate the price feed is fresh and reliable
    // 3. Apply appropriate scaling if needed
    
    // Update base price
    orderbook.update_base_price(new_price);
    
    msg!("Base price updated to: {}", new_price);
    Ok(())
} 