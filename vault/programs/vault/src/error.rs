use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Program is currently paused")]
    ProgramPaused,
    
    #[msg("Deposit amount is below minimum allowed")]
    AmountTooSmall,
    
    #[msg("Only the authority can perform this action")]
    UnauthorizedAccess,
    
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    
    #[msg("Withdrawal not authorized")]
    UnauthorizedWithdrawal,
}