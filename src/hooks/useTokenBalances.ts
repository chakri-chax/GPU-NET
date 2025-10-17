import { useState, useEffect } from 'react';
import { MarketData } from '../lib/supabase';
import { getUserTokenBalance } from './balances';

interface BalanceMap {
  [symbol: string]: string;
}

export function useTokenBalances(assets: MarketData[], connectedAddress: string) {
  const [balances, setBalances] = useState<BalanceMap>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!connectedAddress || assets.length === 0) return;
      
      setLoading(true);
      const newBalances: BalanceMap = {};
      
      try {
        for (const asset of assets) {
          const balance = await getUserTokenBalance(connectedAddress, asset.address);
          newBalances[asset.asset_symbol] = balance.toString();
        }
        setBalances(newBalances);
      } catch (error) {
        console.error('Error fetching balances:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [connectedAddress, assets]);

  const refreshBalance = async (symbol: string, address: string) => {
    if (!connectedAddress) return;
    const newBalance = await getUserTokenBalance(connectedAddress, address);
    setBalances(prev => ({
      ...prev,
      [symbol]: newBalance.toString()
    }));
  };

  return { balances, loading, refreshBalance };
}