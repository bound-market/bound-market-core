#![allow(unexpected_cfgs)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("88xpy9nAw9KhW2Zp5DyE5qpohxWniHLDX8Sv2E1cBcnM");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize_vault(&ctx.bumps)?;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, order_id: u64) -> Result<()> {
        ctx.accounts.deposit(amount, order_id)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, order_id: u64) -> Result<()> {
        ctx.accounts.withdraw(amount, order_id)?;
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> Result<()>{
        ctx.accounts.close_vault()?;
        Ok(())
    }
}
