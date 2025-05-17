use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::state::VaultState;


#[derive(Accounts)]
pub struct Withdraw<'info>{
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"vault_state", user.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>

}

impl<'info> Withdraw<'info>{
    pub fn withdraw(&mut self, amount: u64, order_id: u64) -> Result<()>{

    let vault_seeds: &[&[u8]; 3] = &[
    b"vault".as_ref(),
    self.vault_state.to_account_info().key.as_ref(),
    &[self.vault_state.vault_bump],
];

let signer_seeds: &[&[&[u8]]] = &[vault_seeds];
        

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer{
            from: self.vault.to_account_info(),
            to: self.user.to_account_info()
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program,cpi_accounts, signer_seeds);

        transfer(cpi_ctx, amount)?;

        emit!(WithdrawEvent {
            user: self.user.key(),
            order_id,
            withdraw_amount: amount,
        });
        
        Ok(())
        
    }
}


#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub order_id: u64,
    pub withdraw_amount: u64,
   
}