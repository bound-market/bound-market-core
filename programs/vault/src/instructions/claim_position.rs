// Updated claim_position.rs
use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};
use crate::state::{PositionState, PositionStatus, VaultState, TradingPool};
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct ClaimPosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"position".as_ref(),
            user.key().as_ref(),
            &order_id.to_le_bytes()
        ],
        bump = position.bump,
        constraint = position.user == user.key(),
        constraint = position.order_id == order_id,
        constraint = position.status == PositionStatus::Settled @ ErrorCode::PositionNotSettled,
    )]
    pub position: Account<'info, PositionState>,

    // User's personal vault where funds will be transferred to
    #[account(
        mut,
        seeds = [b"vault", user_vault_state.key().as_ref()],
        bump = user_vault_state.vault_bump
    )]
    pub user_vault: SystemAccount<'info>,

    #[account(
        seeds = [b"vault_state", user.key().as_ref()],
        bump = user_vault_state.state_bump
    )]
    pub user_vault_state: Account<'info, VaultState>,
    
    // Trading pool for this asset
    #[account(
        mut,
        seeds = [b"trading_pool"],
        bump = trading_pool.bump,
    )]
    pub trading_pool: Account<'info, TradingPool>,
    
    // Trading pool vault where funds come from
    #[account(
        mut,
        seeds = [b"trading_pool_vault", trading_pool.key().as_ref()],
        bump = trading_pool.vault_bump
    )]
    pub trading_pool_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> ClaimPosition<'info> {
    pub fn claim(&mut self, _bumps: &ClaimPositionBumps) -> Result<()> {
        let position = &mut self.position;
        
        // Get settlement data
        let settlement_data = position
            .settlement_data
            .ok_or(ErrorCode::PositionNotSettled)?;

        // Calculate payout amount based on percentage
        // 100 = full refund, 200 = 2x payout, etc.
        let payout_amount =
            (position.amount as u128 * settlement_data.payout_percentage as u128 / 100) as u64;

        // Update trading pool accounting before marking position as claimed
        // Reduce the active amount regardless of payout
        self.trading_pool.total_active_amount = self.trading_pool.total_active_amount
            .checked_sub(position.amount)
            .ok_or(ErrorCode::MathOverflow)?;
            
        // If payout is greater than original amount, it's a win (profit)
        // If less, it's a loss (some funds stay in the pool)
        if payout_amount > position.amount {
            // Winner: reduce total pool by payout amount
            self.trading_pool.total_pool_amount = self.trading_pool.total_pool_amount
                .checked_sub(payout_amount)
                .ok_or(ErrorCode::MathOverflow)?;
        } else {
            // Loser or break-even: reduce total pool by the payout amount
            self.trading_pool.total_pool_amount = self.trading_pool.total_pool_amount
                .checked_sub(payout_amount)
                .ok_or(ErrorCode::MathOverflow)?;
        }
            
        // Mark position as claimed
        position.claim()?;

        // Skip transfer if payout is 0
        if payout_amount == 0 {
            emit!(PositionClaimedEvent {
                position: position.key(),
                user: position.user,
                payout_amount: 0,
                trading_pool: self.trading_pool.key(),
            });
            return Ok(());
        }
        
        // Check if trading pool vault has enough funds
        let pool_vault_balance = self.trading_pool_vault.lamports();
        require!(
            pool_vault_balance >= payout_amount,
            ErrorCode::InsufficientPoolBalance
        );

        // Transfer payout from trading pool vault to user's vault
        let pool_vault_seeds = &[
            b"trading_pool_vault",
            self.trading_pool.to_account_info().key.as_ref(),
            &[self.trading_pool.vault_bump],
        ];
        let signer_seeds = &[&pool_vault_seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            Transfer {
                from: self.trading_pool_vault.to_account_info(),
                to: self.user_vault.to_account_info(),
            },
            signer_seeds,
        );

        transfer(cpi_ctx, payout_amount)?;
        
        emit!(PositionClaimedEvent {
            position: position.key(),
            user: position.user,
            payout_amount,
            trading_pool: self.trading_pool.key(),
        });
        
        Ok(())
    }
}

#[event]
pub struct PositionClaimedEvent {
    pub position: Pubkey,
    pub user: Pubkey,
    pub payout_amount: u64,
    pub trading_pool: Pubkey,
}