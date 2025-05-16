use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2, VerificationLevel};
use crate::state::{PositionState, PositionType};
use crate::state::VaultState;
use crate::error::ErrorCode;
use crate::constants::{BTC_FEED_ID, MAXIMUM_AGE};

#[derive(Accounts)]
#[instruction(
    position_type: PositionType,
    lower_bound: u64,
    upper_bound: u64,
    order_id: u64,
    amount: u64
)]
pub struct CreatePosition<'info> {
    // This can be a signer (user creating position) or just an account reference (backend creating position)
    /// CHECK: User account is just used for seeds and to identify the position owner
    pub user: UncheckedAccount<'info>,
    
    // The admin must be a signer
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + PositionState::INIT_SPACE,
        seeds = [
            b"position".as_ref(),
            user.key().as_ref(),
            &order_id.to_le_bytes()
        ],
        bump
    )]
    pub position: Account<'info, PositionState>,
    
    // Vault account where SOL is stored
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
    
    // Pyth price update
    #[account(
        owner = pyth_solana_receiver_sdk::ID,
        constraint = price_update.verification_level == VerificationLevel::Full,
    )]
    pub price_update: Account<'info, PriceUpdateV2>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePosition<'info> {
    pub fn create_position(
        &mut self, 
        position_type: PositionType,
        lower_bound: u64,
        upper_bound: u64,
        order_id: u64,
        amount: u64, 
        bumps: &CreatePositionBumps
    ) -> Result<()> {
        require!(lower_bound < upper_bound, ErrorCode::InvalidRange);
        require!(
            amount >= VaultState::MIN_ORDER_AMOUNT,
            ErrorCode::AmountTooSmall
        );

        // Additional security check: ensure either user is signer or admin knows the user
        require!(
            self.user.is_signer || self.admin.is_signer,
            ErrorCode::UnauthorizedAccess
        );

        // Verify price update is valid
        let clock = Clock::get()?;
        require!(
            self.price_update.verification_level == VerificationLevel::Full,
            ErrorCode::UnverifiedPriceUpdate
        );
        
        // Validate BTC price feed - this ensures the feed ID matches BTC
        let _price_data = self.price_update.get_price_no_older_than(
            &clock,
            MAXIMUM_AGE,
            &get_feed_id_from_hex(BTC_FEED_ID)?,
        ).map_err(|_| error!(ErrorCode::StalePriceFeed))?;
        
        let start_time = clock.unix_timestamp;

        self.position.initialize(
            self.user.key(),
            position_type,
            lower_bound,
            upper_bound,
            start_time,
            order_id,
            amount,
            bumps.position,
        )?;

        // Only transfer funds if the user is the signer (direct deposit)
        // Otherwise, assume funds were already deposited via the deposit instruction
        if self.user.is_signer {
            // Transfer SOL from user to vault
            let cpi_ctx = CpiContext::new(
                self.system_program.to_account_info(),
                Transfer {
                    from: self.user.to_account_info(),
                    to: self.vault.to_account_info(),
                },
            );
            transfer(cpi_ctx, amount)?;
        }
        
        emit!(PositionCreatedEvent {
            position: self.position.key(),
            user: self.position.user,
            position_type: self.position.position_type,
            lower_bound: self.position.lower_bound,
            upper_bound: self.position.upper_bound,
            start_time: self.position.start_time,
            amount: self.position.amount,
            order_id: self.position.order_id,
        });

        Ok(())
    }
}

#[event]
pub struct PositionCreatedEvent {
    pub position: Pubkey,
    pub user: Pubkey,
    pub position_type: PositionType,
    pub lower_bound: u64,
    pub upper_bound: u64,
    pub start_time: i64,
    pub amount: u64,
    pub order_id: u64,
}