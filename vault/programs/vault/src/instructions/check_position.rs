use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2, VerificationLevel};
use crate::state::{PositionState, PositionStatus};
use crate::error::ErrorCode;
use crate::constants::{BTC_FEED_ID,MAXIMUM_AGE};

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CheckPosition<'info> {
    /// CHECK: Only used for seed and validation
    pub user: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"position".as_ref(),
            user.key().as_ref(),
            &order_id.to_le_bytes()
        ],
        bump = position.bump,
        constraint = position.user == user.key() && position.order_id == order_id
    )]
    pub position: Account<'info, PositionState>,

    #[account(
        owner = pyth_solana_receiver_sdk::ID,
        constraint = price_update.verification_level == VerificationLevel::Full,
    )]
    pub price_update: Account<'info, PriceUpdateV2>,
}

impl<'info> CheckPosition<'info> {
    pub fn check_position(&mut self, _bumps: &CheckPositionBumps) -> Result<()> {
        let position = &mut self.position;

        if position.status != PositionStatus::Active {
            return Ok(());
        }

        let clock = Clock::get()?;

        
        require!(
            self.price_update.verification_level == VerificationLevel::Full,
            ErrorCode::UnverifiedPriceUpdate
        );
        let price_data = self.price_update.get_price_no_older_than(
            &clock,
            MAXIMUM_AGE,
            &get_feed_id_from_hex(BTC_FEED_ID)?,
        ).map_err(|_| error!(ErrorCode::StalePriceFeed))?;

        let current_price = price_data.price as u64;
        let current_time = clock.unix_timestamp;
        
        let is_expired = position.is_expired(current_time);
        let is_outside_range = position.is_outside_range(current_price);
        let should_settle = is_expired || is_outside_range;

        if should_settle {
            let payout_percentage = position.calculate_payout(current_time, current_price);

            position.settle(current_time, current_price, payout_percentage)?;

            emit!(PositionSettledEvent {
                position: position.key(),
                user: position.user,
                settlement_time: current_time,
                settlement_price: current_price,
                payout_percentage,
                is_winner: payout_percentage > 100,
            });
        }

        Ok(())
    }
}

#[event]
pub struct PositionSettledEvent {
    pub position: Pubkey,
    pub user: Pubkey,
    pub settlement_time: i64,
    pub settlement_price: u64,
    pub payout_percentage: u8,
    pub is_winner: bool,
}
