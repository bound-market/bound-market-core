use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use crate::state::VaultState;


#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault_state", user.key().as_ref()],
        bump = vault_state.state_bump,
        close = user,
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(  
        mut,  // This needs to be mut
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>
}

impl<'info> Close<'info> {
    pub fn close_vault(&mut self) -> Result<()> {
        // Get the vault balance
        let vault_balance = self.vault.lamports();
        
        // Only try to transfer if there are lamports in the vault
        if vault_balance > 0 {
            let vault_seeds: &[&[u8]; 3] = &[
                b"vault".as_ref(),
                self.vault_state.to_account_info().key.as_ref(),
                &[self.vault_state.vault_bump],
            ];
            
            let signer_seeds: &[&[&[u8]]] = &[vault_seeds];
            
            let cpi_program = self.system_program.to_account_info();
            let cpi_accounts = Transfer {
                from: self.vault.to_account_info(),
                to: self.user.to_account_info()
            };
            
            let cpi_ctx = CpiContext::new_with_signer(
                cpi_program, 
                cpi_accounts,
                signer_seeds
            );
            
            transfer(cpi_ctx, vault_balance)?;
        }
        
        // Return success
        Ok(())
    }
}