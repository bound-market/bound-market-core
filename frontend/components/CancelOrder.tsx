'use client';

import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '../anchor/setup';

export default function CancelOrder() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [orderAddress, setOrderAddress] = useState('');
  const [orderbookAddress, setOrderbookAddress] = useState('');
  const [ordersPdaAddress, setOrdersPdaAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState('');
  const [error, setError] = useState('');

  const handleCancelOrder = async () => {
    if (!wallet) return;
    
    setIsLoading(true);
    setTxSignature('');
    setError('');
    
    try {
      const program = getProgram(wallet);
      
      // Find the PDA for the trader state
      const [traderStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('trader'), wallet.publicKey.toBuffer()],
        program.programId
      );
      
      // Prepare the transaction
      const tx = await program.methods
        .cancelOrder()
        .accounts({
          trader: wallet.publicKey,
          traderState: traderStatePDA,
          order: new PublicKey(orderAddress),
          orderbook: new PublicKey(orderbookAddress),
          ordersPda: new PublicKey(ordersPdaAddress),
        })
        .transaction();
      
      // Send the transaction
      const signature = await wallet.signTransaction(tx);
      const txid = await connection.sendRawTransaction(signature.serialize());
      await connection.confirmTransaction(txid, 'confirmed');
      
      setTxSignature(txid);
      console.log('Transaction signature:', txid);
    } catch (error) {
      console.error('Error canceling order:', error);
      setError('Failed to cancel order: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h2 className="text-xl font-bold mb-2">Cancel Order</h2>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <label className="mr-2 w-32">Order Address:</label>
          <input
            type="text"
            value={orderAddress}
            onChange={(e) => setOrderAddress(e.target.value)}
            className="p-2 border rounded w-full"
            placeholder="Order public key"
          />
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 w-32">Orderbook:</label>
          <input
            type="text"
            value={orderbookAddress}
            onChange={(e) => setOrderbookAddress(e.target.value)}
            className="p-2 border rounded w-full"
            placeholder="Orderbook public key"
          />
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 w-32">Orders PDA:</label>
          <input
            type="text"
            value={ordersPdaAddress}
            onChange={(e) => setOrdersPdaAddress(e.target.value)}
            className="p-2 border rounded w-full"
            placeholder="Orders PDA public key"
          />
        </div>
        
        <button
          onClick={handleCancelOrder}
          disabled={!wallet || isLoading || !orderAddress || !orderbookAddress || !ordersPdaAddress}
          className="bg-blue-500 p-2 rounded text-white disabled:bg-gray-300"
        >
          {isLoading ? 'Processing...' : 'Cancel Order'}
        </button>
        
        {error && (
          <div className="mt-2 text-red-500">
            {error}
          </div>
        )}
        
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