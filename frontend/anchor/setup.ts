import { Program, AnchorProvider, Idl, setProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import {IDL} from './contracts.json';
import { Contracts} from './idl';

// Program ID from your deployment
export const PROGRAM_ID = new PublicKey('6RxZztEMgGnwza7GL1UsUjd4xWNauqm8zXQt5vbWvNrK');

// Create a connection to the Solana cluster
export const getConnection = () => {
  const commitment: Commitment = 'confirmed';
  return new Connection('https://api.devnet.solana.com', commitment);
};

// Get the program instance
export const getProgram = (wallet: any) => {
  const connection = getConnection();
  
  // Create a provider with the wallet's adapter
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: connection.commitment as Commitment, skipPreflight: true }
  );
  
  setProvider(provider);
  
  // Create the program interface using the IDL
  const program = new Program<ContractsIDL>(
    ContractsIDL,
    PROGRAM_ID.toString(),
    provider
  );
  
  return program;
}; 