"use client";

// components/CLOBVisualization.tsx
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../hooks/useAuth';
import {
  createOrder,
  cancelOrder,
  getOrderBookData,
  getUserOrders,
  OrderSide,
  OrderStatus,
  OrderBookLevel,
  OrderBookData
} from '../services/orderBookService';
import { Order, Trade } from '../lib/database.types';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import SupabaseSetupGuide from './SupabaseSetupGuide';

const CLOBVisualization: React.FC = () => {
  const wallet = useWallet();
  const { user, loading: authLoading, error: authError } = useAuth();
  
  const [orderBook, setOrderBook] = useState<OrderBookLevel[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(!supabaseAdmin);
  
  // New order state
  const [newOrder, setNewOrder] = useState({
    side: OrderSide.LONG,
    points: 3.5 as number | string,
    amount: 1.0 as number | string
  });
  
  // Load order book data
  const loadOrderBookData = async () => {
    try {
      setLoading(true);
      const data = await getOrderBookData();
      setOrderBook(data.orderBook);
      setTrades(data.trades);
      setLoading(false);
    } catch (err) {
      console.error('Error loading order book data:', err);
      setError('Failed to load order book data');
      setLoading(false);
    }
  };
  
  // Load user orders if logged in
  const loadUserOrders = async () => {
    if (!user) {
      setUserOrders([]);
      return;
    }
    
    try {
      const orders = await getUserOrders(user.id);
      setUserOrders(orders);
    } catch (err) {
      console.error('Error loading user orders:', err);
      setError('Failed to load your orders');
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewOrder({
      ...newOrder,
      [name]: name === "points" || name === "amount" 
        ? value === '' ? '' : parseFloat(value) 
        : value
    });
  };
  
  // Create a new order
  const addOrder = async () => {
    if (!user) {
      setError('Please connect your wallet first');
      return;
    }
    
    // Convert string values to numbers
    const pointsValue = typeof newOrder.points === 'string' 
      ? parseFloat(newOrder.points) || 0 
      : newOrder.points;
      
    const amountValue = typeof newOrder.amount === 'string' 
      ? parseFloat(newOrder.amount) || 0 
      : newOrder.amount;
      
    // Validate values
    if (isNaN(pointsValue) || pointsValue <= 0) {
      setError('Points must be a positive number');
      return;
    }
    
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    
    try {
      const order = await createOrder(
        user.id,
        newOrder.side,
        pointsValue,
        amountValue,
        wallet
      );
      
      if (order) {
        // Refresh data
        await loadOrderBookData();
        await loadUserOrders();
        
        setError(null);
      } else {
        setError('Failed to create order');
      }
    } catch (err) {
      console.error('Error adding order:', err);
      setError('Failed to create order');
    }
  };
  
  // Cancel an order
  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    
    try {
      const success = await cancelOrder(orderId, user.id);
      
      if (success) {
        // Refresh data
        await loadOrderBookData();
        await loadUserOrders();
        
        setError(null);
      } else {
        setError('Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError('Failed to cancel order');
    }
  };
  
  // Set up real-time subscription
  useEffect(() => {
    // Initial load
    loadOrderBookData();
    
    const ordersSubscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => {
          loadOrderBookData();
          if (user) loadUserOrders();
        }
      )
      .subscribe();
      
    const tradesSubscription = supabase
      .channel('trades-channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'trades' }, 
        () => {
          loadOrderBookData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(tradesSubscription);
    };
  }, []);
  
  // Load user orders when user changes
  useEffect(() => {
    if (user) {
      loadUserOrders();
    }
  }, [user]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {showSetupGuide && <SupabaseSetupGuide />}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          Solana CLOB Visualization
        </h1>
        
        {/* Wallet Connection */}
        <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-blue-400">Wallet Connection</h2>
              <div className="text-gray-300">
                {wallet.connected ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span>Connected: <span className="text-blue-300 font-mono">{wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-8)}</span></span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>Please connect your Phantom wallet to place orders</span>
                  </div>
                )}
              </div>
              
              {/* Authentication Status */}
              {wallet.connected && (
                <div className="mt-2">
                  {authLoading ? (
                    <div className="flex items-center text-yellow-400">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating your wallet... you may need to sign a message
                    </div>
                  ) : user ? (
                    <div className="text-green-400 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                      </svg>
                      Wallet authenticated
                    </div>
                  ) : (
                    <div className="text-red-400 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                      </svg>
                      Authentication pending - please approve signature request
                    </div>
                  )}
                </div>
              )}
            </div>
            <WalletMultiButton className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg" />
          </div>
          
          {/* Auth Error Message */}
          {authError && (
            <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-bold">Authentication Error</div>
                  <div>{authError}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Order Entry Form */}
        <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">Create New Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-2 text-gray-300 font-medium">Side</label>
              <select 
                name="side" 
                value={newOrder.side} 
                onChange={handleInputChange}
                className={`p-3 rounded-lg w-full focus:ring-2 focus:outline-none transition-all duration-200 ${
                  wallet.connected && user ? 'bg-gray-700 text-white border border-gray-600 focus:ring-blue-500' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!wallet.connected || !user}
              >
                <option value={OrderSide.LONG}>LONG</option>
                <option value={OrderSide.SHORT}>SHORT</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-gray-300 font-medium">Points (Leverage)</label>
              <input 
                type="number" 
                name="points" 
                value={newOrder.points} 
                onChange={handleInputChange}
                step="0.1"
                min="0.1"
                className={`p-3 rounded-lg w-full focus:ring-2 focus:outline-none transition-all duration-200 ${
                  wallet.connected && user ? 'bg-gray-700 text-white border border-gray-600 focus:ring-blue-500' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!wallet.connected || !user}
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-300 font-medium">Amount</label>
              <input 
                type="number" 
                name="amount" 
                value={newOrder.amount} 
                onChange={handleInputChange}
                step="0.1"
                min="0.1"
                className={`p-3 rounded-lg w-full focus:ring-2 focus:outline-none transition-all duration-200 ${
                  wallet.connected && user ? 'bg-gray-700 text-white border border-gray-600 focus:ring-blue-500' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!wallet.connected || !user}
              />
            </div>
          </div>
          <button 
            onClick={addOrder}
            className={`mt-6 px-8 py-3 rounded-lg font-bold transition-all duration-200 ${
              wallet.connected && user
                ? "bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105 shadow-lg" 
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!wallet.connected || !user}
          >
            {!wallet.connected 
              ? 'Connect Wallet to Place Order' 
              : !user 
                ? 'Waiting for Authentication...' 
                : 'Place Order'
            }
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-bold">Error</div>
                  <div>{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Order Book Display */}
        <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-blue-400">OrderBook by Points Level</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 font-bold border-b border-gray-700 pb-4 mb-2 text-gray-300">
                <div>Points Level</div>
                <div className="text-green-400">LONG Orders</div>
                <div className="text-red-400">SHORT Orders</div>
              </div>
              
              {orderBook.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-xl">No orders in the order book</p>
                  <p className="mt-2">Be the first to place an order!</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  {orderBook.map(level => (
                    <div key={level.points} className="grid grid-cols-3 gap-4 py-4 border-b border-gray-700">
                      <div className="font-medium text-blue-300">{level.points}</div>
                      
                      <div>
                        {level.longs.length === 0 ? (
                          <span className="text-gray-500">No orders</span>
                        ) : (
                          <ul className="space-y-2">
                            {level.longs.map(order => (
                              <li key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-all">
                                <span className={`${order.status === OrderStatus.PARTIALLY_FILLED ? "text-yellow-400" : "text-green-400"}`}>
                                  Amount: {parseFloat((order.amount - order.filled_amount).toFixed(4))}/{order.amount}
                                  {order.user_id === user?.id && (
                                    <span className="ml-2 text-xs font-medium px-2 py-1 bg-blue-900 text-blue-300 rounded-full">Yours</span>
                                  )}
                                </span>
                                {order.user_id === user?.id && (
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="ml-2 text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      
                      <div>
                        {level.shorts.length === 0 ? (
                          <span className="text-gray-500">No orders</span>
                        ) : (
                          <ul className="space-y-2">
                            {level.shorts.map(order => (
                              <li key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-all">
                                <span className={`${order.status === OrderStatus.PARTIALLY_FILLED ? "text-yellow-400" : "text-red-400"}`}>
                                  Amount: {parseFloat((order.amount - order.filled_amount).toFixed(4))}/{order.amount}
                                  {order.user_id === user?.id && (
                                    <span className="ml-2 text-xs font-medium px-2 py-1 bg-blue-900 text-blue-300 rounded-full">Yours</span>
                                  )}
                                </span>
                                {order.user_id === user?.id && (
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="ml-2 text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Trade History */}
        <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-blue-400">Trade History</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : trades.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-xl">No trades yet</p>
              <p className="mt-2">Trades will appear here when orders are matched</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 rounded-lg">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700 text-left">
                    <th className="p-3 border-b border-gray-600 text-gray-300">Maker Order ID</th>
                    <th className="p-3 border-b border-gray-600 text-gray-300">Taker Order ID</th>
                    <th className="p-3 border-b border-gray-600 text-gray-300">Points</th>
                    <th className="p-3 border-b border-gray-600 text-gray-300">Amount</th>
                    <th className="p-3 border-b border-gray-600 text-gray-300">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="p-3 font-mono text-gray-300">{trade.maker_order_id.slice(0, 8)}...</td>
                      <td className="p-3 font-mono text-gray-300">{trade.taker_order_id.slice(0, 8)}...</td>
                      <td className="p-3 text-blue-300">{trade.points}</td>
                      <td className="p-3 text-green-300">{trade.amount}</td>
                      <td className="p-3 text-gray-400">
                        {new Date(trade.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* User Orders */}
        {user && (
          <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Your Orders</h2>
            {userOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-xl">You have no active orders</p>
                <p className="mt-2">Place an order to see it here</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-700 text-left">
                      <th className="p-3 border-b border-gray-600 text-gray-300">ID</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Side</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Points</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Amount</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Filled</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Status</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Created</th>
                      <th className="p-3 border-b border-gray-600 text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                        <td className="p-3 font-mono">{order.id.slice(0, 8)}...</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.side === OrderSide.LONG 
                              ? "bg-green-900/40 text-green-400" 
                              : "bg-red-900/40 text-red-400"
                          }`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="p-3 text-blue-300">{order.points}</td>
                        <td className="p-3 text-gray-300">{order.amount}</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-700 rounded-full h-2.5 mr-2">
                              <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ width: `${Math.round(order.filled_amount / order.amount * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-400 whitespace-nowrap">{Math.round(order.filled_amount / order.amount * 100)}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === OrderStatus.OPEN ? "bg-blue-900/40 text-blue-400" :
                            order.status === OrderStatus.PARTIALLY_FILLED ? "bg-yellow-900/40 text-yellow-400" :
                            order.status === OrderStatus.FILLED ? "bg-green-900/40 text-green-400" : 
                            "bg-gray-700 text-gray-400"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="p-3">
                          {(order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED) && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CLOBVisualization;