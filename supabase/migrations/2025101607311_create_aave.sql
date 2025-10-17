/*
  # Create Aave V3 Interface Schema

  1. New Tables
    - `user_positions`
      - `id` (uuid, primary key)
      - `user_address` (text, user's wallet address)
      - `asset_symbol` (text, asset symbol like ETH, USDC)
      - `position_type` (text, 'supply' or 'borrow')
      - `amount` (numeric, position amount)
      - `apy` (numeric, current APY)
      - `is_collateral` (boolean, for supply positions)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `market_data`
      - `id` (uuid, primary key)
      - `asset_symbol` (text, unique)
      - `asset_name` (text)
      - `supply_apy` (numeric)
      - `borrow_apy_variable` (numeric)
      - `borrow_apy_stable` (numeric)
      - `total_supplied` (numeric)
      - `total_borrowed` (numeric)
      - `utilization_rate` (numeric)
      - `ltv` (numeric, loan to value ratio)
      - `liquidation_threshold` (numeric)
      - `can_be_collateral` (boolean)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_address` (text)
      - `transaction_type` (text, 'supply', 'withdraw', 'borrow', 'repay')
      - `asset_symbol` (text)
      - `amount` (numeric)
      - `timestamp` (timestamp)
      - `tx_hash` (text)
      - `status` (text, 'pending', 'confirmed', 'failed')

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create user_positions table
CREATE TABLE IF NOT EXISTS user_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  asset_symbol text NOT NULL,
  position_type text NOT NULL CHECK (position_type IN ('supply', 'borrow')),
  amount numeric NOT NULL DEFAULT 0,
  apy numeric NOT NULL DEFAULT 0,
  is_collateral boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON user_positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own positions"
  ON user_positions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own positions"
  ON user_positions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create market_data table
CREATE TABLE IF NOT EXISTS market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol text UNIQUE NOT NULL,
  asset_name text NOT NULL,
  supply_apy numeric NOT NULL DEFAULT 0,
  borrow_apy_variable numeric NOT NULL DEFAULT 0,
  borrow_apy_stable numeric NOT NULL DEFAULT 0,
  total_supplied numeric NOT NULL DEFAULT 0,
  total_borrowed numeric NOT NULL DEFAULT 0,
  utilization_rate numeric NOT NULL DEFAULT 0,
  ltv numeric NOT NULL DEFAULT 0,
  liquidation_threshold numeric NOT NULL DEFAULT 0,
  can_be_collateral boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market data"
  ON market_data FOR SELECT
  TO authenticated
  USING (true);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('supply', 'withdraw', 'borrow', 'repay')),
  asset_symbol text NOT NULL,
  amount numeric NOT NULL,
  timestamp timestamptz DEFAULT now(),
  tx_hash text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed'))
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert sample market data
INSERT INTO market_data (asset_symbol, asset_name, supply_apy, borrow_apy_variable, borrow_apy_stable, total_supplied, total_borrowed, utilization_rate, ltv, liquidation_threshold, can_be_collateral)
VALUES
  ('ETH', 'Ethereum', 0.0, 0.03, 0.05, 125000, 45000, 36, 82.5, 86, true),
  ('WBTC', 'Wrapped BTC', 0.01, 0.03, 0.05, 8500, 3200, 37.6, 70, 75, true),
  ('USDC', 'USD Coin', 89.65, 92.5, 95.0, 450000000, 380000000, 84.4, 80, 85, true),
  ('USDT', 'Tether', 77.87, 89.65, 92.0, 380000000, 310000000, 81.6, 75, 80, true),
  ('DAI', 'Dai', 103.59, 120.34, 125.0, 95000000, 78000000, 82.1, 75, 80, true),
  ('LINK', 'ChainLink', 332.38, 788.84, 825.0, 12500000, 10200000, 81.6, 70, 75, true),
  ('GHO', 'GHO', 0.0, 2.02, 2.5, 25000000, 18000000, 72, 0, 0, false),
  ('AAVE', 'Aave', 1.2, 3.5, 4.2, 8500000, 2100000, 24.7, 50, 65, true),
  ('EURS', 'STASIS EURS', 3.39, 4.8, 5.5, 5200000, 1800000, 34.6, 65, 70, true)
ON CONFLICT (asset_symbol) DO NOTHING;