// init_trading_pool.rs - Add this to your instructions folder
use anchor_lang::prelude::*;
use crate::state::TradingPool;


#[derive(Accounts)]
pub struct InitTradingPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + TradingPool::INIT_SPACE,
        seeds = [b"trading_pool"],
        bump
    )]
    pub trading_pool: Account<'info, TradingPool>,

    #[account(
        seeds = [b"trading_pool_vault", trading_pool.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA that will hold SOL
    pub trading_pool_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitTradingPool<'info> {
    pub fn initialize(&mut self, bumps: &InitTradingPoolBumps) -> Result<()> {
        
        self.trading_pool.authority = self.admin.key();
        self.trading_pool.total_active_amount = 0;
        self.trading_pool.total_pool_amount = 0;
        self.trading_pool.bump = bumps.trading_pool;
        self.trading_pool.vault_bump = bumps.trading_pool_vault;

        emit!(TradingPoolCreatedEvent {
            pool: self.trading_pool.key(),
            authority: self.trading_pool.authority,
        });
        
        Ok(())
    }
}

#[event]
pub struct TradingPoolCreatedEvent {
    pub pool: Pubkey,
    pub authority: Pubkey,
}