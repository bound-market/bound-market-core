use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::*;

/// Accounts for matching a position order with existing liquidity
#[derive(Accounts)]
pub struct MatchPositionOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"trader", trader.key().as_ref()],
        bump = trader_state.bump,
        constraint = trader_state.trader == trader.key() @ ErrorCode::NotAuthorized
    )]
    pub trader_state: Account<'info, TraderState>,
    
    #[account(
        mut,
        seeds = [b"trader", funder.key().as_ref()],
        bump = funder_state.bump
    )]
    pub funder_state: Account<'info, TraderState>,
    
    /// The trader who provided liquidity for the matching
    /// CHECK: Account validation handled in the handler
    pub funder: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"orderbook", &[orderbook.asset_type as u8]],
        bump = orderbook.bump
    )]
    pub orderbook: Account<'info, PassageOrderbook>,
    
    #[account(
        mut,
        constraint = liquidity_order.status == OrderStatus::Pending @ ErrorCode::OrderNotActive,
        constraint = liquidity_order.trader == funder.key() @ ErrorCode::NotAuthorized
    )]
    pub liquidity_order: Account<'info, Order>,
    
    #[account(
        init,
        payer = trader,
        space = 8 + std::mem::size_of::<Order>(),
        seeds = [
            b"order", 
            trader.key().as_ref(), 
            &orderbook.next_sequence_number.to_le_bytes()
        ],
        bump
    )]
    pub position_order: Account<'info, Order>,
    
    /// Used to store liquidity orders
    /// CHECK: Validated based on order type
    #[account(mut)]
    pub liquidity_orders: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    
    /// The clock sysvar is used for timestamps
    pub clock: Sysvar<'info, Clock>,
}

/// Match a position order with existing liquidity 
pub fn handler(
    ctx: Context<MatchPositionOrder>,
    order_type: u8,  // 0 = StayIn, 1 = Breakout
    width_percentage: f64,
    amount: u64,
) -> Result<()> {
    let orderbook = &mut ctx.accounts.orderbook;
    let trader_state = &mut ctx.accounts.trader_state;
    let funder_state = &mut ctx.accounts.funder_state;
    let liquidity_order = &mut ctx.accounts.liquidity_order;
    let position_order = &mut ctx.accounts.position_order;
    let current_time = Clock::get()?.unix_timestamp as u64;
    
    // Convert input to OrderType
    let position_type = match order_type {
        0 => OrderType::StayIn,
        1 => OrderType::Breakout,
        _ => return Err(error!(ErrorCode::InvalidOrderType))
    };
    
    // Validate parameters
    if width_percentage < orderbook.min_percentage_width || 
       width_percentage > orderbook.max_percentage_width {
        return Err(error!(ErrorCode::InvalidWidthPercentage));
    }
    
    // Check if trader has sufficient funds
    if trader_state.free_funds < amount {
        return Err(error!(ErrorCode::InsufficientFunds));
    }
    
    // Ensure the liquidity order is compatible with the position type
    // StayIn positions should match with Breakout liquidity and vice versa
    let is_compatible = match position_type {
        OrderType::StayIn => liquidity_order.order_type == OrderType::Breakout,
        OrderType::Breakout => liquidity_order.order_type == OrderType::StayIn,
    };
    
    if !is_compatible {
        return Err(error!(ErrorCode::NoMatchingOrders));
    }
    
    // Ensure the liquidity order amount is sufficient
    if liquidity_order.amount < amount {
        return Err(error!(ErrorCode::InsufficientFunds));
    }
    
    // Check width compatibility
    match position_type {
        OrderType::StayIn => {
            // For StayIn positions, we need narrower or equal width
            if liquidity_order.width_percentage > width_percentage {
                return Err(error!(ErrorCode::NoMatchingOrders));
            }
        },
        OrderType::Breakout => {
            // For Breakout positions, we need wider or equal width
            if liquidity_order.width_percentage < width_percentage {
                return Err(error!(ErrorCode::NoMatchingOrders));
            }
        },
    }
    
    // Calculate expiration time
    let expiration = current_time + POSITION_DURATION_SECONDS;
    
    // Update trader funds
    trader_state.free_funds -= amount;
    trader_state.locked_funds += amount;
    
    // Update liquidity order
    liquidity_order.amount -= amount;
    if liquidity_order.amount == 0 {
        liquidity_order.status = OrderStatus::Completed;
    }
    
    // Generate order ID
    let order_id = orderbook.generate_order_id(width_percentage);
    
    // Initialize the position order
    position_order.id = order_id;
    position_order.order_type = position_type;
    position_order.asset_type = orderbook.asset_type;
    position_order.width_percentage = width_percentage;
    position_order.amount = amount;
    position_order.trader = ctx.accounts.trader.key();
    position_order.base_price = orderbook.base_price;
    position_order.timestamp = current_time;
    position_order.status = OrderStatus::Active;
    position_order.expiration = Some(expiration);
    
    // Add the position order to trader state
    trader_state.add_order(order_id);
    
    msg!("Position order matched and activated!");
    msg!("Order type: {:?}, Width: {}%, Amount: {}, Expiration: {}",
        position_type, width_percentage, amount, expiration);
        
    Ok(())
} 