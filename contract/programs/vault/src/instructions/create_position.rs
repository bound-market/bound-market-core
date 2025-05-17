// Updated create_position.rs
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2, VerificationLevel};
use crate::state::{PositionState, PositionType, TradingPool, VaultState};
use crate::error::ErrorCode;
use crate::constants::{BTC_FEED_ID, MAXIMUM_AGE};

#[derive(Accounts)]
#[instruction(
    position_type: PositionType,
    lower_bound: u64,
    upper_bound: u64,
    order_id: u64,
    amount: u64,
)]
pub struct CreatePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + PositionState::INIT_SPACE,
        seeds = [
            b"position".as_ref(),
            user.key().as_ref(),
            &order_id.to_le_bytes()
        ],
        bump
    )]
    pub position: Account<'info, PositionState>,
    
    // User's personal vault
    #[account(
        mut,
        seeds = [b"vault", user_vault_state.key().as_ref()],
        bump = user_vault_state.vault_bump,
    )]
    pub user_vault: SystemAccount<'info>,
    
    #[account(
        seeds = [b"vault_state", user.key().as_ref()],
        bump = user_vault_state.state_bump
    )]
    pub user_vault_state: Account<'info, VaultState>,
    
    // Trading pool 
    #[account(
        mut,
        seeds = [b"trading_pool"],
        bump = trading_pool.bump,
    )]
    pub trading_pool: Account<'info, TradingPool>,
    
    // Trading pool vault
    #[account(
        mut,
        seeds = [b"trading_pool_vault", trading_pool.key().as_ref()],
        bump = trading_pool.vault_bump
    )]
    pub trading_pool_vault: SystemAccount<'info>,
    
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

        // Check user vault balance
        let user_vault_balance = self.user_vault.lamports();
        require!(
            user_vault_balance >= amount,
            ErrorCode::InsufficientVaultBalance
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

        // Initialize position state
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

        // Transfer funds from user vault to trading pool vault
        let user_vault_seeds = &[
            b"vault".as_ref(),
            self.user_vault_state.to_account_info().key.as_ref(),
            &[self.user_vault_state.vault_bump],
        ];
        let signer_seeds = &[&user_vault_seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            Transfer {
                from: self.user_vault.to_account_info(),
                to: self.trading_pool_vault.to_account_info(),
            },
            signer_seeds,
        );
        
        transfer(cpi_ctx, amount)?;
        
        // Update trading pool amounts
        self.trading_pool.total_active_amount = self.trading_pool.total_active_amount.checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;
        self.trading_pool.total_pool_amount = self.trading_pool.total_pool_amount.checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;
        
        emit!(PositionCreatedEvent {
            position: self.position.key(),
            user: self.position.user,
            position_type: self.position.position_type,
            lower_bound: self.position.lower_bound,
            upper_bound: self.position.upper_bound,
            start_time: self.position.start_time,
            amount: self.position.amount,
            order_id: self.position.order_id,
            trading_pool: self.trading_pool.key(),
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
    pub trading_pool: Pubkey,
}