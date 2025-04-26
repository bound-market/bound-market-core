"use client";

// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Client-side (limited access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// Create client-side client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create admin client with service role (for user creation)
// Note: Exposing service role to the client is generally not recommended for production
// In a real app, you would use a serverless function or API route for this
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Export database types
export type Tables = Database['public']['Tables'];