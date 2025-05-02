use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};


use crate::state::VaultState;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        seeds = [b"vault_state", user.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    pub fn deposit(&mut self, amount: u64, order_id: u64) -> Result<()> {
        
        // Validate deposit amount
        require!(
            amount >= VaultState::MIN_ORDER_AMOUNT,
            ErrorCode::AmountTooSmall
        );
        
        // Transfer funds from user to vault
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.user.to_account_info(),
            to: self.vault.to_account_info()
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, amount)?;
        
        emit!(DepositEvent {
            user: self.user.key(),
            order_id,
            amount,
        });
        
        Ok(())
    }
}



// Event emitted when a deposit is made
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub order_id: u64,
    pub amount: u64,
}