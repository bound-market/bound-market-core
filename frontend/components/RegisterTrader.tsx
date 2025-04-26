'use client';

import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getProgram } from '../anchor/setup';
import * as anchor from '@coral-xyz/anchor';

export default function RegisterTrader() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [initialFunds, setInitialFunds] = useState('1000');
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState('');

  const handleRegister = async () => {
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
      
      // Prepare the transaction
      const tx = await program.methods
        .registerTrader(new anchor.BN(initialFunds))
        .accounts({
          trader: wallet.publicKey,
          traderState: traderStatePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();
      
      // Send the transaction
      const signature = await wallet.signTransaction(tx);
      const txid = await connection.sendRawTransaction(signature.serialize());
      await connection.confirmTransaction(txid, 'confirmed');
      
      setTxSignature(txid);
      console.log('Transaction signature:', txid);
    } catch (error) {
      console.error('Error registering trader:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h2 className="text-xl font-bold mb-2">Register as Trader</h2>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <label className="mr-2 w-32">Initial Funds:</label>
          <input
            type="number"
            value={initialFunds}
            onChange={(e) => setInitialFunds(e.target.value)}
            className="p-2 border rounded"
            min="0"
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={!wallet || isLoading}
          className="bg-blue-500 p-2 rounded text-white disabled:bg-gray-300"
        >
          {isLoading ? 'Processing...' : 'Register Trader'}
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