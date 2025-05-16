use anchor_lang::prelude::*;
use anchor_lang::system_program::{ Transfer, transfer};
use crate::state::{PositionState, PositionStatus, VaultState};
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

    /// PDA that holds SOL (vault), derived from vault_state
    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    /// CHECK: This PDA holds SOL; system program will validate
    pub vault: AccountInfo<'info>,

    #[account(
        seeds = [b"vault_state", user.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl<'info> ClaimPosition<'info> {
    pub fn claim(&mut self, _bumps: &ClaimPositionBumps) -> Result<()> {
        let position = &mut self.position;
        let user = &self.user;
        let vault = &self.vault;
        
        // Mark position as claimed
        position.claim()?;
        
        // Get the payout amount based on settlement data
        let percentage = position.settlement_data.as_ref().unwrap().payout_percentage;
        
        // Calculate payout amount based on percentage
        // 100 = full refund, 200 = 2x payout, etc.
        let payout_amount = (position.amount as u128 * percentage as u128 / 100) as u64;
        
        // Skip transfer if payout is 0
        if payout_amount == 0 {
            emit!(PositionClaimedEvent {
                position: position.key(),
                user: position.user,
                payout_amount: 0
            });
            return Ok(());
        }
        
        // Transfer payout from vault to user
        let seeds = &[
            b"vault",
            self.vault_state.to_account_info().key.as_ref(),
            &[self.vault_state.vault_bump]
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: user.to_account_info()
            },
            signer
        );

        transfer(cpi_ctx, payout_amount)?;
        
        emit!(PositionClaimedEvent {
            position: position.key(),
            user: position.user,
            payout_amount
        });
        
        Ok(())
    }
}

#[event]
pub struct PositionClaimedEvent {
    pub position: Pubkey,
    pub user: Pubkey,
    pub payout_amount: u64,
}
