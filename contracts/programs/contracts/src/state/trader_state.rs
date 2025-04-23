use anchor_lang::prelude::*;
use super::order::OrderId;

#[account]
#[derive(Debug, Default)]
pub struct TraderState {
    // Trader's wallet address
    pub trader: Pubkey,
    
    // Locked funds in orders
    pub locked_funds: u64,
    
    // Free funds available
    pub free_funds: u64,
    
    // Orders placed by this trader (array with fixed max size)
    pub orders: Vec<OrderId>,
    
    // Reserved space for future upgrades
    pub bump: u8,
}

impl TraderState {
    pub fn new(trader: Pubkey, initial_funds: u64, bump: u8) -> Self {
        TraderState {
            trader,
            locked_funds: 0,
            free_funds: initial_funds,
            orders: Vec::new(),
            bump,
        }
    }
    
    pub fn lock_funds(&mut self, amount: u64) -> bool {
        if self.free_funds >= amount {
            self.free_funds -= amount;
            self.locked_funds += amount;
            true
        } else {
            false
        }
    }
    
    pub fn unlock_funds(&mut self, amount: u64) {
        self.locked_funds -= amount;
        self.free_funds += amount;
    }
    
    pub fn add_order(&mut self, order_id: OrderId) {
        self.orders.push(order_id);
    }
    
    pub fn remove_order(&mut self, order_id: OrderId) {
        self.orders.retain(|id| id != &order_id);
    }
} 