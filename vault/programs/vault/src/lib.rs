#![allow(unexpected_cfgs)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("YyVBCibDa4RY91ViZRHNdKe1MKKLqtfXhvYxufSSkWW");

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

    //<------------------Position functions--------------------->

    pub fn create_position(ctx: Context<CreatePosition>, position_type: PositionType, lower_bound: u64, upper_bound: u64, order_id: u64, amount: u64) -> Result<()>{
        ctx.accounts.create_position(position_type, lower_bound, upper_bound, order_id, amount, &ctx.bumps)?;
        Ok(())
    }

    pub fn check_position(ctx: Context<CheckPosition>) -> Result<()>{
        ctx.accounts.check_position(&ctx.bumps)?;
        Ok(())
    }

    pub fn claim_position(ctx: Context<ClaimPosition>) -> Result<()> {
        ctx.accounts.claim(&ctx.bumps)?;        
        Ok(())
    }
}
