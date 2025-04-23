use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct RegisterTrader<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = trader,
        space = 8 + std::mem::size_of::<TraderState>() + 512, // Extra space for orders vector
        seeds = [b"trader", trader.key().as_ref()],
        bump
    )]
    pub trader_state: Account<'info, TraderState>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterTrader>, initial_funds: u64) -> Result<()> {
    let trader_state = &mut ctx.accounts.trader_state;
    
    // If trader already exists, just add funds
    if trader_state.trader == ctx.accounts.trader.key() {
        trader_state.free_funds += initial_funds;
        msg!("Added {} funds to existing trader", initial_funds);
    } else {
        // Initialize trader state
        trader_state.trader = ctx.accounts.trader.key();
        trader_state.free_funds = initial_funds;
        trader_state.locked_funds = 0;
        trader_state.orders = Vec::new();
        trader_state.bump = ctx.bumps.trader_state;
        
        msg!("Registered new trader with {} initial funds", initial_funds);
    }
    
    Ok(())
} 