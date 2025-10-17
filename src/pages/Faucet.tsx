import { AssetIcon } from '../components/AssetIcon';
import { MarketData } from '../lib/supabase';
import { getUserTokenBalance } from '../hooks/balances';
import { useMetaMask } from '../hooks/useMetaMask';
import { useState, useEffect } from 'react';

interface FaucetProps {
  assets: MarketData[];
  onClaim: (address: string, symbol: string) => void;
  isConnected?: boolean;
}

interface BalanceMap {
  [symbol: string]: string;
}

export function Faucet({ assets, onClaim }: FaucetProps) {
  const { connectedAddress } = useMetaMask();
  const [balances, setBalances] = useState<BalanceMap>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch balances when connectedAddress or assets change
  useEffect(() => {
    const fetchBalances = async () => {
      if (!connectedAddress || assets.length === 0) return;
      
      setLoading(true);
      const newBalances: BalanceMap = {};
      
      try {
        for (const asset of assets) {
          if(asset.address === '0x0000000000000000000000000000000000000000') {
            newBalances[asset.asset_symbol] = '0';
          }else{
           const balance = await getUserTokenBalance(connectedAddress, asset.address);
          newBalances[asset.asset_symbol] = balance.toString();
          }
         
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

  // Refresh balances after a claim
  const handleClaim = async (address: string, symbol: string) => {
    await onClaim(address, symbol);
    // Refresh the balance for the claimed token
    if (connectedAddress) {
      const newBalance = await getUserTokenBalance(connectedAddress, address);
      setBalances(prev => ({
        ...prev,
        [symbol]: newBalance.toString()
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#16191f]">
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-semibold mb-2">Ethereum Market</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-4xl">
            With testnet Faucet you can get free assets to test the Aave Protocol. Make sure to switch your wallet provider to the
            appropriate testnet network, select desired asset, and click 'Faucet' to get tokens transferred to your wallet. The assets on a
            testnet are not "real," meaning they have no monetary value.{' '}
            <span className="text-blue-400 underline cursor-pointer">Learn more</span>
          </p>
        </div>

        <div className="bg-[#1c1f2e] rounded-[4px] border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-white text-xl font-semibold">Test Assets</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Asset</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-4">Wallet balance</th>
                  <th className="text-right px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.asset_symbol} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <AssetIcon symbol={asset.asset_symbol} size="md" />
                        <div>
                          <div className="text-white font-medium">{asset.asset_name}</div>
                          <div className="text-gray-400 text-sm">{asset.asset_symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="text-white font-medium">
                        {loading ? (
                          <span className="text-gray-400">Loading...</span>
                        ) : (
                          balances[asset.asset_symbol] || '0'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => handleClaim(asset.address, asset.asset_symbol)}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm rounded-lg transition-colors"
                      >
                        Faucet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-gray-500 text-xs">
          <a href="#terms" className="hover:text-gray-400 transition-colors">Terms</a>
          <a href="#privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
          <a href="#docs" className="hover:text-gray-400 transition-colors">Docs</a>
          <a href="#faqs" className="hover:text-gray-400 transition-colors">FAQS</a>
          <a href="#support" className="hover:text-gray-400 transition-colors">Get Support</a>
          <a href="#analytics" className="hover:text-gray-400 transition-colors">Manage analytics</a>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <a href="#discord" className="text-gray-600 hover:text-gray-500 transition-colors">
            <span className="text-lg">💬</span>
          </a>
          <a href="#twitter" className="text-gray-600 hover:text-gray-500 transition-colors">
            <span className="text-lg">🐦</span>
          </a>
          <a href="#discord2" className="text-gray-600 hover:text-gray-500 transition-colors">
            <span className="text-lg">💭</span>
          </a>
          <a href="#github" className="text-gray-600 hover:text-gray-500 transition-colors">
            <span className="text-lg">🔧</span>
          </a>
        </div>
      </div>
    </div>
  );
}