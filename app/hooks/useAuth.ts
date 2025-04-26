"use client";

// hooks/useAuth.ts
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { User } from '../lib/database.types';

export function useAuth() {
  const { connected, publicKey, signMessage, disconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false); // Track authentication process
  
  // Check if user exists in Supabase and get user data
  const fetchUserData = async (publicKeyStr: string) => {
    try {
      // First try with admin client to bypass any RLS issues
      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('public_key', publicKeyStr)
          .single();
          
        if (!error) {
          return data;
        }
        // If not a "not found" error, try with regular client
        if (error.code !== 'PGRST116') {
          console.log('Admin client query failed, trying regular client:', error);
        }
      }
      
      // Regular client as fallback
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('public_key', publicKeyStr)
        .single();
        
      if (error) {
        // If it's a "not found" error, this is expected for new users
        if (error.code === 'PGRST116') {
          return null; // User doesn't exist yet, will create in the next step
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  };
  
  // Create a new user in Supabase
  const createUser = async (publicKeyStr: string) => {
    try {
      // Check if admin client is available
      if (!supabaseAdmin) {
        const errorMsg = 'Admin access not available. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY to use this app.';
        console.error(errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Use the admin client to bypass RLS policies
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{ public_key: publicKeyStr }])
        .select()
        .single();
        
      if (error) {
        // Handle duplicate key error specifically
        if (error.code === '23505' && error.message.includes('users_public_key_key')) {
          console.log('User already exists, fetching instead of creating');
          // Try fetching again in case of race condition
          const existingUser = await fetchUserData(publicKeyStr);
          if (existingUser) {
            return existingUser;
          }
          throw new Error('User exists but could not be fetched');
        }
        
        // Handle RLS error specifically
        if (error.code === '42501' && error.message.includes('row-level security')) {
          const rlsErrorMsg = 'Row Level Security blocked user creation. Please check your Supabase setup and make sure you\'ve provided the service role key.';
          console.error(rlsErrorMsg, error);
          setError(rlsErrorMsg);
          throw new Error(rlsErrorMsg);
        }
        throw error;
      }
      
      console.log('Successfully created new user:', data);
      return data;
    } catch (err: any) {
      console.error('Error creating user:', err);
      // If we haven't set a specific error already
      if (!error) {
        setError(err.message || 'Failed to create user account');
      }
      return null;
    }
  };
  
  // Update last login timestamp
  const updateLastLogin = async (userId: string) => {
    try {
      // Use admin client to update user as regular client might be restricted by RLS
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
      } else {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
      }
    } catch (err) {
      console.error('Error updating last login:', err);
    }
  };
  
  // Generate a random nonce for signature
  const generateNonce = (): string => {
    return Array.from(
      { length: 32 },
      () => Math.floor(Math.random() * 36).toString(36)
    ).join('');
  };
  
  // Verify wallet ownership with signature
  const verifyWallet = async (publicKeyStr: string): Promise<boolean> => {
    if (!signMessage) {
      setError('Wallet does not support message signing');
      return false;
    }
    
    try {
      const nonce = generateNonce();
      const message = `Sign this message to verify your wallet ownership: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      const signature = await signMessage(encodedMessage);
      
      // Verify the signature
      const publicKeyBytes = bs58.decode(publicKeyStr);
      const signatureValid = nacl.sign.detached.verify(
        encodedMessage,
        signature,
        publicKeyBytes
      );
      
      return signatureValid;
    } catch (err: any) {
      // Handle user rejection specifically
      if (err.message && err.message.includes('rejected')) {
        setError('You need to approve the signature request to continue');
        console.log('User rejected the signature request - this is normal if the user clicked Cancel');
      } else {
        console.error('Error verifying wallet:', err);
        setError('Failed to verify wallet ownership');
      }
      return false;
    }
  };
  
  // Handle wallet login and authentication
  const login = async () => {
    if (!publicKey || isAuthenticating) return; // Prevent multiple simultaneous auth attempts
    
    setIsAuthenticating(true);
    setLoading(true);
    setError(null);
    
    try {
      const publicKeyStr = publicKey.toString();
      
      // Verify wallet ownership
      const isVerified = await verifyWallet(publicKeyStr);
      if (!isVerified) {
        // Error is already set in verifyWallet
        setLoading(false);
        setIsAuthenticating(false);
        return;
      }
      
      // Check if user exists
      let userData = await fetchUserData(publicKeyStr);
      
      // Create user if not exists
      if (!userData) {
        console.log('New user detected, creating account...');
        userData = await createUser(publicKeyStr);
        if (!userData) {
          setLoading(false);
          setIsAuthenticating(false);
          return;
        }
      }
      
      // Update last login
      await updateLastLogin(userData.id);
      
      setUser(userData);
    } catch (err) {
      console.error('Error during login:', err);
      setError('Login failed');
    } finally {
      setLoading(false);
      setIsAuthenticating(false);
    }
  };
  
  // Handle logout
  const logout = async () => {
    try {
      await disconnect();
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
      setError('Logout failed');
    }
  };
  
  // Effect to handle wallet connection changes - only trigger authentication once
  useEffect(() => {
    if (connected && publicKey && !user && !isAuthenticating) {
      login();
    } else if (!connected && user) {
      setUser(null);
    }
  }, [connected, publicKey, user, isAuthenticating]);
  
  return {
    user,
    connected,
    publicKey,
    loading,
    error,
    login,
    logout
  };
}