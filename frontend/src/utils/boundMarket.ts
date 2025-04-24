'use client';

import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { BN } from 'bn.js';
import { IDL, BoundMarket } from '../idl/bound_market';

// The program ID from your deployed contract
export const PROGRAM_ID = new PublicKey('6RxZztEMgGnwza7GL1UsUjd4xWNauqm8zXQt5vbWvNrK');

export enum AssetType {
  BTC = 0,
  ETH = 1, 
  BNB = 2,
  GMX = 3
}

export enum OrderType {
  StayIn = 0,
  Breakout = 1
}

// Create a program instance
export const getBoundMarketProgram = (connection: Connection, wallet: anchor.Wallet) => {
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: 'processed' }
  );
  return new anchor.Program<BoundMarket>(IDL, PROGRAM_ID, provider);
};

// Derive the orderbook PDA
export const getOrderbookPDA = (assetType: AssetType) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('orderbook'), Buffer.from([assetType])],
    PROGRAM_ID
  )[0];
};

// Derive the trader state PDA
export const getTraderStatePDA = (trader: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('trader'), trader.toBuffer()],
    PROGRAM_ID
  )[0];
};

// Initialize a new orderbook
export const initializeOrderbook = async (
  program: anchor.Program<BoundMarket>,
  authority: PublicKey,
  assetType: AssetType
) => {
  const orderbook = getOrderbookPDA(assetType);

  const tx = await program.methods
    .initialize(assetType)
    .accounts({
      authority,
      orderbook,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, orderbook };
};

// Update the price in the orderbook
export const updatePrice = async (
  program: anchor.Program<BoundMarket>,
  authority: PublicKey,
  assetType: AssetType,
  newPrice: BN
) => {
  const orderbook = getOrderbookPDA(assetType);
  const oracle = PublicKey.default; // Mock oracle

  const tx = await program.methods
    .updatePrice(newPrice)
    .accounts({
      authority,
      orderbook,
      oracle,
    })
    .rpc();

  return { tx, orderbook };
};

// Register a trader or add funds
export const registerTrader = async (
  program: anchor.Program<BoundMarket>,
  trader: PublicKey,
  assetType: AssetType,
  initialFunds: BN
) => {
  const orderbook = getOrderbookPDA(assetType);
  const traderState = getTraderStatePDA(trader);

  const tx = await program.methods
    .registerTrader(initialFunds)
    .accounts({
      orderbook,
      trader,
      traderState,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, traderState };
};

// Create a StayIn order 
export const placeStayInOrder = async (
  program: anchor.Program<BoundMarket>,
  trader: PublicKey,
  assetType: AssetType,
  widthPercentage: number,
  amount: BN
) => {
  const orderbook = getOrderbookPDA(assetType);
  const traderState = getTraderStatePDA(trader);

  // Get the next sequence number from the orderbook
  const orderbookAccount = await program.account.passageOrderbook.fetch(orderbook);
  const nextSequenceNumber = orderbookAccount.nextSequenceNumber;
  
  // Derive the order PDA
  const [order] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('order'),
      trader.toBuffer(),
      new BN(nextSequenceNumber).toArrayLike(Buffer, 'le', 8)
    ],
    PROGRAM_ID
  );

  // Derive the stay-in orders collection PDA
  const [stayInOrders] = PublicKey.findProgramAddressSync(
    [Buffer.from('stay_in_orders'), orderbook.toBuffer()],
    PROGRAM_ID
  );

  const tx = await program.methods
    .placeStayInOrder(widthPercentage, amount)
    .accounts({
      orderbook,
      trader,
      traderState,
      order,
      stayInOrders,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, order };
};

// Create a Breakout order
export const placeBreakoutOrder = async (
  program: anchor.Program<BoundMarket>,
  trader: PublicKey,
  assetType: AssetType,
  widthPercentage: number,
  amount: BN
) => {
  const orderbook = getOrderbookPDA(assetType);
  const traderState = getTraderStatePDA(trader);

  // Get the next sequence number from the orderbook
  const orderbookAccount = await program.account.passageOrderbook.fetch(orderbook);
  const nextSequenceNumber = orderbookAccount.nextSequenceNumber;
  
  // Derive the order PDA
  const [order] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('order'),
      trader.toBuffer(),
      new BN(nextSequenceNumber).toArrayLike(Buffer, 'le', 8)
    ],
    PROGRAM_ID
  );

  // Derive the breakout orders collection PDA
  const [breakoutOrders] = PublicKey.findProgramAddressSync(
    [Buffer.from('breakout_orders'), orderbook.toBuffer()],
    PROGRAM_ID
  );

  const tx = await program.methods
    .placeBreakoutOrder(widthPercentage, amount)
    .accounts({
      orderbook,
      trader,
      traderState,
      order,
      breakoutOrders,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, order };
};

// Cancel an order
export const cancelOrder = async (
  program: anchor.Program<BoundMarket>,
  trader: PublicKey,
  assetType: AssetType,
  order: PublicKey,
  isStayInOrder: boolean
) => {
  const orderbook = getOrderbookPDA(assetType);
  const traderState = getTraderStatePDA(trader);

  // Derive the appropriate orders collection PDA
  const [ordersPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(isStayInOrder ? 'stay_in_orders' : 'breakout_orders'),
      orderbook.toBuffer()
    ],
    PROGRAM_ID
  );

  const tx = await program.methods
    .cancelOrder()
    .accounts({
      orderbook,
      trader,
      traderState,
      order,
      ordersPda,
    })
    .rpc();

  return { tx };
};

// Fetch all trader data
export const getTraderData = async (
  program: anchor.Program<BoundMarket>,
  trader: PublicKey
) => {
  const traderState = getTraderStatePDA(trader);
  try {
    const traderData = await program.account.traderState.fetch(traderState);
    return traderData;
  } catch (e) {
    // Trader not registered yet
    return null;
  }
};

// Fetch orderbook data
export const getOrderbookData = async (
  program: anchor.Program<BoundMarket>,
  assetType: AssetType
) => {
  const orderbook = getOrderbookPDA(assetType);
  try {
    const orderbookData = await program.account.passageOrderbook.fetch(orderbook);
    return orderbookData;
  } catch (e) {
    // Orderbook not initialized yet
    return null;
  }
}; 