use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap};
use std::time::{SystemTime, UNIX_EPOCH};

// Simulate Solana's Pubkey for the example
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Pubkey([u8; 32]);

impl Pubkey {
    pub fn new() -> Self {
        Pubkey([0; 32])
    }
}

// Constants
const PERCENTAGE_SCALE: i64 = 10000; // Scale percentages by 10000 (2 decimal precision)

// Enums for order types and asset types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderType {
    StayIn,   // Position profits if price stays within range
    Breakout, // Position profits if price breaks out of range
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssetType {
    BTC,
    ETH,
    BNB,
    GMX,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Pending,  // Order not yet matched
    Active,   // Order matched and position active
    Completed, // Position settled
    Cancelled, // Order cancelled before matching
}

// Standard 24-hour duration for all positions
const POSITION_DURATION_SECONDS: u64 = 24 * 60 * 60;

// Convert f64 percentage to scaled i64
fn percentage_to_scaled(percentage: f64) -> i64 {
    (percentage * PERCENTAGE_SCALE as f64) as i64
}

// Convert scaled i64 back to f64 percentage
fn scaled_to_percentage(scaled: i64) -> f64 {
    scaled as f64 / PERCENTAGE_SCALE as f64
}

// Order ID for sorting and matching
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OrderId {
    // Width percentage of the range (scaled)
    width_percentage_scaled: i64,
    
    // Timestamp for FIFO ordering
    timestamp: u64,
    
    // Unique identifier
    sequence_number: u64,
}

impl Ord for OrderId {
    fn cmp(&self, other: &Self) -> Ordering {
        // For StayIn orders: wider ranges are better (less risky for the funder)
        // For Breakout orders: narrower ranges are better (less risky for the funder)
        // FIFO ordering if widths are equal
        match self.width_percentage_scaled.cmp(&other.width_percentage_scaled) {
            Ordering::Equal => self.timestamp.cmp(&other.timestamp),
            other_ordering => other_ordering,
        }
    }
}

impl PartialOrd for OrderId {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

// The main order struct
#[derive(Debug, Clone)]
pub struct Order {
    // Order identifier
    id: OrderId,
    
    // Order metadata
    order_type: OrderType,
    asset_type: AssetType,
    
    // Width percentage of the range (±X%)
    width_percentage: f64,
    
    // Amount of funds committed
    amount: u64,
    
    // Trader who placed the order
    trader: Pubkey,
    
    // Current base price when order was placed (for reference)
    base_price: u64,
    
    // Creation timestamp
    timestamp: u64,
    
    // Order status
    status: OrderStatus,
    
    // If matched, the expiration timestamp
    expiration: Option<u64>,
    
    // Payoff multiple (calculated based on width) // Not in orderbook
    payoff_multiple: f64,
}

// Trader state to track balances and orders
#[derive(Debug, Clone, Default)]
pub struct TraderState {
    // Locked funds in orders
    locked_funds: u64,
    
    // Free funds available
    free_funds: u64,
    
    // Orders placed by this trader
    orders: Vec<OrderId>,
}

impl TraderState {
    pub fn new(initial_funds: u64) -> Self {
        TraderState {
            locked_funds: 0,
            free_funds: initial_funds,
            orders: Vec::new(),
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

// Result of a matching operation
#[derive(Debug)]
pub struct MatchResult {
    trader_amount: u64,
    funder_amount: u64,
    width_percentage: f64,
    trader: Pubkey,
    funder: Pubkey,
    base_price: u64,
    expiration: u64,
    payoff_multiple: f64,
}

// The main orderbook struct
#[derive(Debug)]
pub struct PassageOrderbook {
    // Separate orderbooks for different order types
    //TODO : Red-Black Tree
    stay_in_orders: BTreeMap<OrderId, Order>,
    breakout_orders: BTreeMap<OrderId, Order>,
    
    // Current base price of the asset
    base_price: u64,
    
    // Registered traders
    traders: HashMap<Pubkey, TraderState>,
    
    // Sequential order ID counter
    next_sequence_number: u64,
    
    // Asset type for this orderbook
    asset_type: AssetType,

    // Market parameters
    // No restriction - remove this
    min_percentage_width: f64,
    max_percentage_width: f64,
}

// try using / rather than floating point
//Minimum compute units

impl PassageOrderbook {
    pub fn new(
        asset_type: AssetType,
        base_price: u64,
        min_percentage_width: f64,
        max_percentage_width: f64,
    ) -> Self {
        PassageOrderbook {
            stay_in_orders: BTreeMap::new(),
            breakout_orders: BTreeMap::new(),
            base_price,
            traders: HashMap::new(),
            next_sequence_number: 1,
            asset_type,
            min_percentage_width,
            max_percentage_width,
        }
    }
        
    // Register a trader or add funds to existing trader
    pub fn register_trader(&mut self, trader: Pubkey, funds: u64) {
        if let Some(trader_state) = self.traders.get_mut(&trader) {
            trader_state.free_funds += funds;
        } else {
            self.traders.insert(trader, TraderState::new(funds));
        }
    }
    
    // Get current timestamp in seconds
    fn get_current_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
    
    // Create a new order ID
    fn generate_order_id(
        &mut self,
        width_percentage: f64,
    ) -> OrderId {
        let timestamp = Self::get_current_timestamp();
        let sequence_number = self.next_sequence_number;
        self.next_sequence_number += 1;
        
        OrderId {
            width_percentage_scaled: percentage_to_scaled(width_percentage),
            timestamp,
            sequence_number,
        }
    }
    
    // Calculate payoff multiple based on width percentage and order type
    // Hata do
    fn calculate_payoff_multiple(width_percentage: f64, order_type: OrderType) -> f64 {
        // For StayIn: tighter width = higher payoff (more risk)
        // For Breakout: wider width = higher payoff (more risk)
        match order_type {
            OrderType::StayIn => {
                // Example formula: 0.5% width = 5x payoff, 5% width = 1.5x payoff
                5.0 / width_percentage.max(0.5)
            },
            OrderType::Breakout => {
                // Example formula: 5% width = 5x payoff, 0.5% width = 1.5x payoff
                1.0 + width_percentage
            },
        }
    }
    
    // Place a new liquidity order (by a funder)
    pub fn place_liquidity_order(
        &mut self,
        trader: Pubkey,
        order_type: OrderType,
        width_percentage: f64,
        amount: u64,
    ) -> Result<OrderId, &'static str> {
        // Validate parameters
        // Hata Do
        if width_percentage < self.min_percentage_width || width_percentage > self.max_percentage_width {
            return Err("Width percentage outside allowed range");
        }
        
        // Check if trader exists and has sufficient funds
        let trader_state = self.traders.get_mut(&trader)
            .ok_or("Trader not registered")?;
            
        if trader_state.free_funds < amount {
            return Err("Insufficient funds");
        }
        
        // Generate order ID
        let order_id = self.generate_order_id(width_percentage);
        
        // Calculate payoff multiple
        let payoff_multiple = Self::calculate_payoff_multiple(width_percentage, order_type);
        
        // Create the order
        let order = Order {
            id: order_id,
            order_type,
            asset_type: self.asset_type,
            width_percentage,
            amount,
            trader,
            base_price: self.base_price,
            timestamp: order_id.timestamp,
            status: OrderStatus::Pending,
            expiration: None,
            payoff_multiple,
        };
        
        // Lock funds and add order to trader state
        // VAULT IMPLL
        trader_state.lock_funds(amount);
        trader_state.add_order(order_id);
        
        // Add order to the appropriate orderbook
        match order_type {
            OrderType::StayIn => {
                self.stay_in_orders.insert(order_id, order);
            },
            OrderType::Breakout => {
                self.breakout_orders.insert(order_id, order);
            },
        }
        
        Ok(order_id)
    }
    
    // Match a position order (by a trader looking to take a position)
    pub fn match_position_order(
        &mut self,
        trader: Pubkey,
        order_type: OrderType,
        width_percentage: f64,
        amount: u64,
    ) -> Result<MatchResult, &'static str> {
        // Validate parameters
        if width_percentage < self.min_percentage_width || width_percentage > self.max_percentage_width {
            return Err("Width percentage outside allowed range");
        }
        
        // Check if trader exists and has sufficient funds
        let trader_state = self.traders.get_mut(&trader)
            .ok_or("Trader not registered")?;
            
        if trader_state.free_funds < amount {
            return Err("Insufficient funds");
        }
        
        // Select the appropriate orderbook based on order type
        // For a position order, we look at the opposite orderbook
        // StayIn position should match with Breakout liquidity and vice versa
        let orders = match order_type {
            OrderType::StayIn => &mut self.breakout_orders,
            OrderType::Breakout => &mut self.stay_in_orders,
        };
        
        // Find matching orders based on width
        // For StayIn positions, we want narrower or equal width
        // For Breakout positions, we want wider or equal width
        let mut matching_order_ids = Vec::new();
        
        match order_type {
            OrderType::StayIn => {
                // Find breakout orders with width <= requested width
                for (id, order) in orders.iter() {
                    if order.width_percentage <= width_percentage && order.amount >= amount {
                        matching_order_ids.push(*id);
                    }
                }
            },
            OrderType::Breakout => {
                // Find stay_in orders with width >= requested width
                for (id, order) in orders.iter() {
                    if order.width_percentage >= width_percentage && order.amount >= amount {
                        matching_order_ids.push(*id);
                    }
                }
            },
        }
        
        // Sort the matching orders by best conditions
        matching_order_ids.sort_by(|a, b| {
            let order_a = orders.get(a).unwrap();
            let order_b = orders.get(b).unwrap();
            
            // For StayIn positions, prefer smaller widths
            // For Breakout positions, prefer larger widths
            match order_type {
                OrderType::StayIn => order_a.width_percentage.partial_cmp(&order_b.width_percentage).unwrap(),
                OrderType::Breakout => order_b.width_percentage.partial_cmp(&order_a.width_percentage).unwrap(),
            }
        });
        
        // Get the best matching order if available
        if let Some(best_id) = matching_order_ids.first() {
            let order = orders.get(best_id).unwrap().clone();
            
            // Create a match
            let funder = order.trader;
            let match_width = order.width_percentage;
            let payoff_multiple = order.payoff_multiple;
            let current_time = Self::get_current_timestamp();
            let expiration = current_time + POSITION_DURATION_SECONDS;
            
            // Update trader funds
            trader_state.free_funds -= amount;
            
            // Update funder's order
            let mut updated_order = order.clone();
            updated_order.amount -= amount;
            
            if updated_order.amount == 0 {
                // Remove the order if fully filled
                orders.remove(best_id);
                if let Some(funder_state) = self.traders.get_mut(&funder) {
                    funder_state.remove_order(*best_id);
                }
            } else {
                // Update the order with reduced amount
                orders.insert(*best_id, updated_order);
            }
            
            // Return match result
            return Ok(MatchResult {
                trader_amount: amount,
                funder_amount: amount,
                width_percentage: match_width,
                trader,
                funder,
                base_price: self.base_price,
                expiration,
                payoff_multiple,
            });
        }
        
        Err("No matching orders found")
    }
    
    // Cancel an order
    pub fn cancel_order(
        &mut self,
        trader: Pubkey,
        order_id: OrderId,
    ) -> Result<(), &'static str> {
        // Check if trader exists
        let trader_state = self.traders.get_mut(&trader)
            .ok_or("Trader not registered")?;
        
        // Find the order in the appropriate orderbook
        if let Some(order) = self.stay_in_orders.remove(&order_id) {
            if order.trader != trader {
                // Put the order back if the trader doesn't match
                self.stay_in_orders.insert(order_id, order);
                return Err("Not authorized to cancel this order");
            }
            
            // Update trader state
            trader_state.unlock_funds(order.amount);
            trader_state.remove_order(order_id);
            return Ok(());
        }
        
        if let Some(order) = self.breakout_orders.remove(&order_id) {
            if order.trader != trader {
                // Put the order back if the trader doesn't match
                self.breakout_orders.insert(order_id, order);
                return Err("Not authorized to cancel this order");
            }
            
            // Update trader state
            trader_state.unlock_funds(order.amount);
            trader_state.remove_order(order_id);
            return Ok(());
        }
        
        Err("Order not found")
    }
    
    // Update base price (e.g., from an oracle)
    pub fn update_base_price(&mut self, new_price: u64) {
        todo!("Pyth Oracle");
        self.base_price = new_price;
    }
    
    // Get all StayIn orders for visualization
    pub fn get_stay_in_orderbook(&self) -> Vec<(&OrderId, &Order)> {
        self.stay_in_orders.iter().collect()
    }
    
    // Get all Breakout orders for visualization
    pub fn get_breakout_orderbook(&self) -> Vec<(&OrderId, &Order)> {
        self.breakout_orders.iter().collect()
    }
    
    // Check if a StayIn position is profitable
    pub fn is_stay_in_profitable(&self, order_id: OrderId, current_price: u64) -> Result<bool, &'static str> {
        let order = self.stay_in_orders.get(&order_id).ok_or("Order not found")?;
        
        if order.status != OrderStatus::Active {
            return Err("Order is not active");
        }
        
        let lower_bound = (order.base_price as f64 * (1.0 - order.width_percentage / 100.0)) as u64;
        let upper_bound = (order.base_price as f64 * (1.0 + order.width_percentage / 100.0)) as u64;
        
        // A StayIn position is profitable if the price stays within the range
        Ok(current_price >= lower_bound && current_price <= upper_bound)
    }
    
    // Check if a Breakout position is profitable
    pub fn is_breakout_profitable(&self, order_id: OrderId, current_price: u64) -> Result<bool, &'static str> {
        let order = self.breakout_orders.get(&order_id).ok_or("Order not found")?;
        
        if order.status != OrderStatus::Active {
            return Err("Order is not active");
        }
        
        let lower_bound = (order.base_price as f64 * (1.0 - order.width_percentage / 100.0)) as u64;
        let upper_bound = (order.base_price as f64 * (1.0 + order.width_percentage / 100.0)) as u64;
        
        // A Breakout position is profitable if the price moves outside the range
        Ok(current_price < lower_bound || current_price > upper_bound)
    }
    
    // call this process_order for each pair
    pub fn process_orders(&mut self) {
        let current_time = Self::get_current_timestamp();
        
        // Process stay_in orders
        let expired_stay_in_orders: Vec<_> = self.stay_in_orders
            .iter()
            .filter(|(_, order)| {
                order.expiration.map_or(false, |expiration| expiration < current_time)
            })
            .map(|(id, _)| *id)
            .collect();
            
        for order_id in expired_stay_in_orders {
            if let Some(order) = self.stay_in_orders.remove(&order_id) {
                if let Some(trader_state) = self.traders.get_mut(&order.trader) {
                    trader_state.unlock_funds(order.amount);
                    trader_state.remove_order(order_id);
                }
            }
        }
        
        // Process breakout orders
        let expired_breakout_orders: Vec<_> = self.breakout_orders
            .iter()
            .filter(|(_, order)| {
                order.expiration.map_or(false, |expiration| expiration < current_time)
            })
            .map(|(id, _)| *id)
            .collect();
            
        for order_id in expired_breakout_orders {
            if let Some(order) = self.breakout_orders.remove(&order_id) {
                if let Some(trader_state) = self.traders.get_mut(&order.trader) {
                    trader_state.unlock_funds(order.amount);
                    trader_state.remove_order(order_id);
                }
            }
        }
    }


    // 1 sec 
    // Base_bet / 24*60*60 = x
    // for stay in increment x per second from 0 to 2*base_bet
    // for breakout decrement x per second from 2*base_bet to 0


    // Aggregate orderbook data for visualization
    pub fn get_aggregated_orderbook(&self, order_type: OrderType) -> Vec<(f64, u64, f64)> {
        // Returns tuples of (width_percentage, total_amount, avg_payoff)
        let orders = match order_type {
            OrderType::StayIn => &self.stay_in_orders,
            OrderType::Breakout => &self.breakout_orders,
        };
        
        // Group by width percentage
        let mut grouped: HashMap<i64, (f64, u64, f64, u64)> = HashMap::new();
        
        for (_, order) in orders {
            let width_scaled = percentage_to_scaled(order.width_percentage);
            
            let entry = grouped.entry(width_scaled).or_insert((
                order.width_percentage,
                0,
                0.0,
                0
            ));
            
            entry.1 += order.amount;
            entry.2 += order.payoff_multiple * (order.amount as f64);
            entry.3 += 1;
        }
        
        // Calculate average payoff and format the result
        let mut result: Vec<(f64, u64, f64)> = grouped
            .into_iter()
            .map(|(_, (width, amount, payoff_sum, count))| {
                let avg_payoff = if count > 0 { payoff_sum / (amount as f64) } else { 0.0 };
                (width, amount, avg_payoff)
            })
            .collect();
        
        // Sort by width percentage
        result.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        
        result
    }
}

// Example usage
fn main() {
    // Create a BTC orderbook with initial price of $100,000
    let mut orderbook = PassageOrderbook::new(
        AssetType::BTC,
        100_000_00, // $100,000 with 2 decimal places
        0.5,        // 0.5% minimum width
        10.0,       // 10% maximum width
    );
    
    // Create some traders
    let funder1 = Pubkey::new();
    let funder2 = Pubkey::new();
    let trader = Pubkey::new();
    
    // Register traders with initial funds
    orderbook.register_trader(funder1, 100_000_00);  // $100,000
    orderbook.register_trader(funder2, 50_000_00);   // $50,000
    orderbook.register_trader(trader, 10_000_00);    // $10,000
    
    // Place some StayIn liquidity orders
    if let Ok(order_id) = orderbook.place_liquidity_order(
        funder1,
        OrderType::StayIn,
        1.0,        // ±1.0% width
        5_000_00,   // $5,000
    ) {
        println!("Placed StayIn liquidity order with ID: {:?}", order_id);
    }
    
    if let Ok(order_id) = orderbook.place_liquidity_order(
        funder1,
        OrderType::StayIn,
        2.0,        // ±2.0% width
        10_000_00,  // $10,000
    ) {
        println!("Placed StayIn liquidity order with ID: {:?}", order_id);
    }
    
    // Place some Breakout liquidity orders
    if let Ok(order_id) = orderbook.place_liquidity_order(
        funder2,
        OrderType::Breakout,
        1.0,        // ±1.0% width
        3_000_00,   // $3,000
    ) {
        println!("Placed Breakout liquidity order with ID: {:?}", order_id);
    }
    
    if let Ok(order_id) = orderbook.place_liquidity_order(
        funder2,
        OrderType::Breakout,
        2.0,        // ±2.0% width
        7_000_00,   // $7,000
    ) {
        println!("Placed Breakout liquidity order with ID: {:?}", order_id);
    }
    
    // Trader takes a StayIn position
    if let Ok(result) = orderbook.match_position_order(
        trader,
        OrderType::StayIn,
        1.0,        // ±1.0% width
        1_000_00,   // $1,000
    ) {
        println!("Matched StayIn position: {:?}", result);
    }
    
    // Trader takes a Breakout position
    if let Ok(result) = orderbook.match_position_order(
        trader,
        OrderType::Breakout,
        2.0,        // ±2.0% width
        2_000_00,   // $2,000
    ) {
        println!("Matched Breakout position: {:?}", result);
    }
    
    // Display the current state of the orderbook
    println!("\nStayIn Orderbook:");
    for (_, order) in orderbook.get_stay_in_orderbook() {
        println!("  Width: ±{}%, Amount: ${:.2}, Payoff Multiple: {:.2}x, Trader: {:?}",
            order.width_percentage,
            order.amount as f64 / 100.0,
            order.payoff_multiple,
            order.trader
        );
    }
    
    println!("\nBreakout Orderbook:");
    for (_, order) in orderbook.get_breakout_orderbook() {
        println!("  Width: ±{}%, Amount: ${:.2}, Payoff Multiple: {:.2}x, Trader: {:?}",
            order.width_percentage,
            order.amount as f64 / 100.0,
            order.payoff_multiple,
            order.trader
        );
    }
    
    // Display aggregated orderbook data
    println!("\nAggregated StayIn Orderbook:");
    for (width, amount, avg_payoff) in orderbook.get_aggregated_orderbook(OrderType::StayIn) {
        println!("  Width: ±{}%, Total Amount: ${:.2}, Avg Payoff: {:.2}x",
            width,
            amount as f64 / 100.0,
            avg_payoff
        );
    }
    
    println!("\nAggregated Breakout Orderbook:");
    for (width, amount, avg_payoff) in orderbook.get_aggregated_orderbook(OrderType::Breakout) {
        println!("  Width: ±{}%, Total Amount: ${:.2}, Avg Payoff: {:.2}x",
            width,
            amount as f64 / 100.0,
            avg_payoff
        );
    }
    
    // Update the base price (e.g., from an oracle feed)
    orderbook.update_base_price(102_000_00);  // $102,000
    println!("\nBase price updated to: ${:.2}", orderbook.base_price as f64 / 100.0);
    
    // Process any expired orders
    orderbook.process_expired_orders();
}




// 1. Segregate this file
// 2. Orderbook ko run krna with sample data (weekend)
// 3. Vault implementation
// 4. Contract 2 alag se
        // Stay In
        // Breakout
// 5. Pyth oracle integration
// 6. INTEGRATION: Orderbook + Vault + 2 contracts



