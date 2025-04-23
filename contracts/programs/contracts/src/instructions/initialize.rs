use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub asset_type_input: u8, // Input for asset type (0 = BTC, 1 = ETH, etc.)
    
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<PassageOrderbook>(),
        seeds = [b"orderbook", &[asset_type_input]],
        bump
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let orderbook = &mut ctx.accounts.orderbook;
    
    // Convert input to AssetType
    let asset_type = match ctx.accounts.asset_type_input {
        0 => AssetType::BTC,
        1 => AssetType::ETH,
        2 => AssetType::BNB,
        3 => AssetType::GMX,
        _ => return Err(error!(ErrorCode::InvalidAssetType))
    };
    
    // Initialize the orderbook
    orderbook.asset_type = asset_type;
    orderbook.base_price = 0; // Will be updated with oracle
    orderbook.next_sequence_number = 1;
    orderbook.min_percentage_width = 0.5;
    orderbook.max_percentage_width = 10.0;
    orderbook.authority = ctx.accounts.authority.key();
    orderbook.bump = *ctx.bumps.get("orderbook").unwrap();
    
    msg!("Orderbook initialized for asset type: {:?}", asset_type);
    Ok(())
}

