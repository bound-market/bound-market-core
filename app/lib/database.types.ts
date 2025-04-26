// lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Export the specific table row types
export type User = Database['public']['Tables']['users']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Trade = Database['public']['Tables']['trades']['Row'];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          public_key: string
          created_at: string
          last_login: string
        }
        Insert: {
          id?: string
          public_key: string
          created_at?: string
          last_login?: string
        }
        Update: {
          id?: string
          public_key?: string
          created_at?: string
          last_login?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          side: 'LONG' | 'SHORT'
          points: number
          amount: number
          filled_amount: number
          status: 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          side: 'LONG' | 'SHORT'
          points: number
          amount: number
          filled_amount?: number
          status: 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          side?: 'LONG' | 'SHORT'
          points?: number
          amount?: number
          filled_amount?: number
          status?: 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED'
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          maker_order_id: string
          taker_order_id: string
          points: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          maker_order_id: string
          taker_order_id: string
          points: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          maker_order_id?: string
          taker_order_id?: string
          points?: number
          amount?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}