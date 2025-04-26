'use client';

import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '../anchor/setup';
import * as anchor from '@coral-xyz/anchor';

const OrderType = {
  STAY_IN: 0,
  BREAKOUT: 1,
};

const AssetType = {
  BTC: 0,
  ETH: 1,
  BNB: 2,
  GMX: 3,
};

export default function PlaceOrder() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [orderType, setOrderType] = useState(OrderType.STAY_IN);
  const [assetType, setAssetType] = useState(AssetType.BTC);
  const [widthPercentage, setWidthPercentage] = useState('5');
  const [amount, setAmount] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState('');

  const findOrderbookPDA = (assetType: number) => {
    const program = getProgram(wallet!);
    const [orderbookPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('orderbook'), Buffer.from([assetType])],
      program.programId
    );
    return orderbookPDA;
  };

  const handlePlaceOrder = async () => {
    if (!wallet) return;
    
    setIsLoading(true);
    setTxSignature('');
    
    try {
      const program = getProgram(wallet);
      
      // Find the PDA for the trader state
      const [traderStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('trader'), wallet.publicKey.toBuffer()],
        program.programId
      );
      
      // Find the orderbook PDA
      const orderbookPDA = findOrderbookPDA(assetType);
      
      // Prepare the transaction based on order type
      let tx;
      
      if (orderType === OrderType.STAY_IN) {
        // Find the stay_in_orders PDA
        const [stayInOrdersPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('stay_in_orders'), orderbookPDA.toBuffer()],
          program.programId
        );
        
        // Find the order PDA (need to get next sequence number first)
        const orderbookAccount = await program.account.passageOrderbook.fetch(orderbookPDA);
        const nextSequenceNumber = orderbookAccount.nextSequenceNumber;
        
        const [orderPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('order'),
            wallet.publicKey.toBuffer(),
            nextSequenceNumber.toArrayLike(Buffer, 'le', 8)
          ],
          program.programId
        );
        
        tx = await program.methods
          .placeStayInOrder(
            parseFloat(widthPercentage),
            new anchor.BN(amount)
          )
          .accounts({
            trader: wallet.publicKey,
            traderState: traderStatePDA,
            orderbook: orderbookPDA,
            order: orderPDA,
            stayInOrders: stayInOrdersPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .transaction();
      } else {
        // Find the breakout_orders PDA
        const [breakoutOrdersPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('breakout_orders'), orderbookPDA.toBuffer()],
          program.programId
        );
        
        // Find the order PDA (need to get next sequence number first)
        const orderbookAccount = await program.account.passageOrderbook.fetch(orderbookPDA);
        const nextSequenceNumber = orderbookAccount.nextSequenceNumber;
        
        const [orderPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('order'),
            wallet.publicKey.toBuffer(),
            nextSequenceNumber.toArrayLike(Buffer, 'le', 8)
          ],
          program.programId
        );
        
        tx = await program.methods
          .placeBreakoutOrder(
            parseFloat(widthPercentage),
            new anchor.BN(amount)
          )
          .accounts({
            trader: wallet.publicKey,
            traderState: traderStatePDA,
            orderbook: orderbookPDA,
            order: orderPDA,
            breakoutOrders: breakoutOrdersPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .transaction();
      }
      
      // Send the transaction
      const signature = await wallet.signTransaction(tx);
      const txid = await connection.sendRawTransaction(signature.serialize());
      await connection.confirmTransaction(txid, 'confirmed');
      
      setTxSignature(txid);
      console.log('Transaction signature:', txid);
    } catch (error) {
      console.error('Error placing order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h2 className="text-xl font-bold mb-2">Place Order</h2>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <label className="mr-2 w-32">Order Type:</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(Number(e.target.value))}
            className="p-2 border rounded"
          >
            <option value={OrderType.STAY_IN}>Stay In</option>
            <option value={OrderType.BREAKOUT}>Breakout</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 w-32">Asset Type:</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(Number(e.target.value))}
            className="p-2 border rounded"
          >
            <option value={AssetType.BTC}>BTC</option>
            <option value={AssetType.ETH}>ETH</option>
            <option value={AssetType.BNB}>BNB</option>
            <option value={AssetType.GMX}>GMX</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 w-32">Width Percentage:</label>
          <input
            type="number"
            value={widthPercentage}
            onChange={(e) => setWidthPercentage(e.target.value)}
            className="p-2 border rounded"
            min="0.1"
            step="0.1"
          />
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 w-32">Amount:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="p-2 border rounded"
            min="1"
          />
        </div>
        
        <button
          onClick={handlePlaceOrder}
          disabled={!wallet || isLoading}
          className="bg-blue-500 p-2 rounded text-white disabled:bg-gray-300"
        >
          {isLoading ? 'Processing...' : 'Place Order'}
        </button>
        
        {txSignature && (
          <div className="mt-2">
            <p>Transaction Successful!</p>
            <a 
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              View on Solana Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 