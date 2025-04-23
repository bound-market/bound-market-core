use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid asset type provided")]
    InvalidAssetType,
    
    #[msg("Width percentage outside allowed range")]
    InvalidWidthPercentage,
    
    #[msg("Trader not registered")]
    TraderNotRegistered,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("No matching orders found")]
    NoMatchingOrders,
    
    #[msg("Not authorized to cancel this order")]
    NotAuthorized,
    
    #[msg("Order not found")]
    OrderNotFound,
    
    #[msg("Order is not active")]
    OrderNotActive,
    
    #[msg("Invalid oracle price feed")]
    InvalidOracleFeed,
    
    #[msg("Invalid order type")]
    InvalidOrderType,
}
