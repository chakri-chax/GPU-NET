import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MarketData {
  id: string;
  address: string;
  decimals: number;
  asset_symbol: string;
  asset_name: string;
  supply_apy: number;
  borrow_apy_variable: number;
  borrow_apy_stable: number;
  total_supplied: number;
  total_borrowed: number;
  utilization_rate: number;
  ltv: number;
  liquidation_threshold: number;
  can_be_collateral: boolean;
  updated_at: string;
}

export interface UserPosition {
  id: string;
  user_address: string;
  asset_symbol: string;
  position_type: 'supply' | 'borrow';
  amount: number;
  apy: number;
  is_collateral: boolean;
  created_at: string;
  updated_at: string;
}
export interface BorrowPosition{
  id: string;
  user_address: string;
  asset_symbol: string;
  position_type: 'supply' | 'borrow';
  amount: number;
  apy: number;
  is_collateral: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_address: string;
  transaction_type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  asset_symbol: string;
  amount: number;
  timestamp: string;
  tx_hash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}
