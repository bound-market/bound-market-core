"use client";

// services/orderBookService.ts
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { Order, Trade } from '../lib/database.types';
import * as web3 from '@solana/web3.js';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

// Enum for order side
export enum OrderSide {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

// Enum for order status
export enum OrderStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  CANCELLED = 'CANCELLED'
}

// Types for our OrderBook structure
export interface OrderBookLevel {
  points: number;
  longs: Order[];
  shorts: Order[];
}

export interface OrderBookData {
  orderBook: OrderBookLevel[];
  trades: Trade[];
}

// Get the vault address from environment variables
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '';

// Helper function to get the right client based on whether admin is needed and available
function getClient(needsAdmin = false) {
  if (needsAdmin && supabaseAdmin) {
    return supabaseAdmin;
  }
  return supabase;
}

// Create a new order
export async function createOrder(
  userId: string,
  side: OrderSide,
  points: number,
  amount: number,
  wallet: any // Add wallet parameter
): Promise<Order | null> {
  try {
    // Check if wallet is connected
    if (!wallet.connected) {
      throw new Error('Wallet not connected');
    }

    // Transfer funds to vault
    const transferSuccess = await transferFundsToVault(wallet, amount);
    if (!transferSuccess) {
      throw new Error('Failed to transfer funds to vault');
    }
    
    // Use admin client to bypass RLS
    const client = getClient(true);
    
    if (!client) {
      throw new Error('Admin client required but not available. Check your Supabase setup.');
    }
    
    const { data, error } = await client
      .from('orders')
      .insert({
        user_id: userId,
        side,
        points,
        amount,
        filled_amount: 0,
        status: OrderStatus.OPEN
      })
      .select()
      .single();

    if (error) throw error;
    
    // Process matching after creating the order
    await processOrderMatching(data);
    
    return data;
  } catch (err) {
    console.error('Error creating order:', err);
    return null;
  }
}

// Transfer funds from user's wallet to vault
async function transferFundsToVault(wallet: any, amount: number): Promise<boolean> {
  try {
    if (!VAULT_ADDRESS) {
      console.error('Vault address not configured');
      return false;
    }

    // Convert amount to lamports (SOL's smallest unit)
    const lamports = web3.LAMPORTS_PER_SOL * amount;
    
    // Create a connection to the Solana network
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'));
    
    // Create a transaction to send funds
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(VAULT_ADDRESS),
        lamports: lamports,
      })
    );
    
    // Set recent blockhash and fee payer
    transaction.feePayer = wallet.publicKey;
    const blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhashObj.blockhash;
    
    // Sign transaction
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature);
    
    console.log('Fund transfer successful:', signature);
    return true;
  } catch (err) {
    console.error('Error transferring funds:', err);
    return false;
  }
}

// Cancel an existing order
export async function cancelOrder(orderId: string, userId: string): Promise<boolean> {
  try {
    // Use admin client to bypass RLS
    const client = getClient(true);
    
    const { error } = await client
      .from('orders')
      .update({ status: OrderStatus.CANCELLED })
      .eq('id', orderId)
      .eq('user_id', userId)
      .is('status', OrderStatus.OPEN);
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error cancelling order:', err);
    return false;
  }
}

// Get the full order book data
export async function getOrderBookData(): Promise<OrderBookData> {
  try {
    // Use admin client to bypass RLS for fetching orders
    const client = getClient(true);
    
    // Get all open and partially filled orders
    const { data: orders, error: ordersError } = await client
      .from('orders')
      .select('*')
      .in('status', [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED])
      .order('points', { ascending: true });
      
    if (ordersError) throw ordersError;
    
    // Get recent trades
    const { data: trades, error: tradesError } = await client
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (tradesError) throw tradesError;
    
    // Log the fetched orders for debugging
    console.log('Fetched orders:', orders.length, orders);
    
    // Group orders by points level
    const orderBookMap = new Map<number, OrderBookLevel>();
    
    orders.forEach(order => {
      if (!orderBookMap.has(order.points)) {
        orderBookMap.set(order.points, {
          points: order.points,
          longs: [],
          shorts: []
        });
      }
      
      const level = orderBookMap.get(order.points)!;
      
      if (order.side === OrderSide.LONG) {
        level.longs.push(order);
      } else {
        level.shorts.push(order);
      }
    });
    
    // Convert map to array and sort by points
    const orderBook = Array.from(orderBookMap.values())
      .sort((a, b) => a.points - b.points);
    
    return { orderBook, trades };
    
  } catch (err) {
    console.error('Error getting order book data:', err);
    return { orderBook: [], trades: [] };
  }
}

// Process order matching when a new order is created
async function processOrderMatching(newOrder: Order): Promise<void> {
  // Don't process matching for filled or cancelled orders
  if (
    newOrder.status === OrderStatus.FILLED ||
    newOrder.status === OrderStatus.CANCELLED
  ) {
    return;
  }
  
  try {
    // Use admin client for all trade operations which require cross-user updates
    const client = getClient(true);
    
    // Get potential matching orders
    const { data: matchingOrders, error } = await client
      .from('orders')
      .select('*')
      .eq('points', newOrder.points)
      .eq('side', newOrder.side === OrderSide.LONG ? OrderSide.SHORT : OrderSide.LONG)
      .in('status', [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED])
      .neq('user_id', newOrder.user_id)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    if (!matchingOrders || matchingOrders.length === 0) {
      return;
    }
    
    // Process each matching order
    let remainingAmount = newOrder.amount - newOrder.filled_amount;
    let updatedNewOrder = { ...newOrder };
    
    for (const matchingOrder of matchingOrders) {
      if (remainingAmount <= 0) break;
      
      const availableMatchAmount = matchingOrder.amount - matchingOrder.filled_amount;
      const matchAmount = Math.min(remainingAmount, availableMatchAmount);
      
      if (matchAmount <= 0) continue;
      
      // Update the matching order
      const updatedMatchingOrder = {
        ...matchingOrder,
        filled_amount: matchingOrder.filled_amount + matchAmount,
        status: matchingOrder.filled_amount + matchAmount >= matchingOrder.amount
          ? OrderStatus.FILLED
          : OrderStatus.PARTIALLY_FILLED
      };
      
      // Update the new order
      updatedNewOrder = {
        ...updatedNewOrder,
        filled_amount: updatedNewOrder.filled_amount + matchAmount,
        status: updatedNewOrder.filled_amount + matchAmount >= updatedNewOrder.amount
          ? OrderStatus.FILLED
          : OrderStatus.PARTIALLY_FILLED
      };
      
      // Create a trade record
      const tradeRecord = {
        maker_order_id: matchingOrder.id,
        taker_order_id: newOrder.id,
        points: newOrder.points,
        amount: matchAmount
      };
      
      // Execute updates directly instead of using RPC
      // Update matching order
      await client
        .from('orders')
        .update({
          filled_amount: updatedMatchingOrder.filled_amount,
          status: updatedMatchingOrder.status
        })
        .eq('id', matchingOrder.id);
        
      // Update new order
      await client
        .from('orders')
        .update({
          filled_amount: updatedNewOrder.filled_amount,
          status: updatedNewOrder.status
        })
        .eq('id', newOrder.id);
        
      // Create trade
      await client
        .from('trades')
        .insert(tradeRecord);
      
      remainingAmount -= matchAmount;
      
      // Break if the new order is filled
      if (remainingAmount <= 0) break;
    }
    
  } catch (err) {
    console.error('Error processing order matching:', err);
  }
}

// Get orders for a specific user
export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    // Use admin client for user-specific queries
    const client = getClient(true);
    
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error getting user orders:', err);
    return [];
  }
}

// Get trades for a specific user
export async function getUserTrades(userId: string): Promise<Trade[]> {
  try {
    // Use admin client for user-specific queries
    const client = getClient(true);
    
    // We need to get orders first to find associated trades
    const { data: userOrders, error: ordersError } = await client
      .from('orders')
      .select('id')
      .eq('user_id', userId);
      
    if (ordersError) throw ordersError;
    
    if (!userOrders || userOrders.length === 0) {
      return [];
    }
    
    // Get trades where the user is either maker or taker
    const orderIds = userOrders.map(order => order.id);
    const { data: trades, error: tradesError } = await client
      .from('trades')
      .select('*')
      .or(`maker_order_id.in.(${orderIds.join(',')}),taker_order_id.in.(${orderIds.join(',')})`)
      .order('created_at', { ascending: false });
      
    if (tradesError) throw tradesError;
    return trades || [];
  } catch (err) {
    console.error('Error getting user trades:', err);
    return [];
  }
}