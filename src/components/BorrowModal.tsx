import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { AssetIcon } from './AssetIcon';
import { MarketData } from '../lib/supabase';
import { useMetaMask } from '../hooks/useMetaMask';
import { ethers } from 'ethers';
import ERC20ABI from "../../backend/artifacts/contracts/mocks/MockERC20.sol/MockERC20.json";
import deployment from "../../backend/deployment.json"
import PoolABI from "../../backend/artifacts/contracts/mocks/MockPool.sol/MockPool.json";
interface BorrowModalProps {
  asset: MarketData;
  availableToBorrow: number;
  currentHealthFactor: number;
  onClose: () => void;
  onBorrow: (amount: number) => void;
}

export function BorrowModal({ asset, availableToBorrow, currentHealthFactor, onClose, onBorrow }: BorrowModalProps) {
  const [amount, setAmount] = useState('');
  
  const numAmount = parseFloat(amount) || 0;
  const usdValue = numAmount * 138.60;
  const newHealthFactor = currentHealthFactor > 0 ? Math.max(0, currentHealthFactor - (numAmount * 0.05)) : 0;

  const handlePercentage = (percent: number) => {
    const value = (availableToBorrow * percent) / 100;
    setAmount(value.toFixed(2));
  };
   
const {provider, connectedAddress} = useMetaMask();
  const handleBorrow = async() => {
   
      if (!provider) {
           console.log("no provider");
           return;
         }
         const signer = await provider.getSigner();
         const token = new ethers.Contract(asset.address, ERC20ABI.abi, signer);
     
         const decimals = await token.decimals();
         const allowance = await token.allowance(connectedAddress, deployment.wrapper);
     
         
         const mockPool = new ethers.Contract(deployment.mockPool, PoolABI.abi, signer);

        //  address asset,
        // uint256 amount,
        // uint256 interestRateMode,
        // uint16 referralCode,
        // address onBehalfOf
        
         const tx = await mockPool.borrow(asset.address, ethers.parseUnits(amount, decimals), 2,0,connectedAddress);
         await tx.wait();

    onBorrow(numAmount);
     onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2d3f] rounded-2xl max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-white text-xl font-semibold">Borrow {asset.asset_symbol}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-gray-400 text-sm mb-2 flex items-center gap-1">
              Amount
              <Info className="w-3 h-3" />
            </div>
            <div className="bg-[#1c1f2e] rounded-lg p-4 border border-gray-700">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="75"
                className="bg-transparent text-white text-3xl font-semibold outline-none w-full"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-gray-400 text-sm">${usdValue.toFixed(2)}K</div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Available {availableToBorrow.toFixed(2)}</span>
                  <button
                    onClick={() => setAmount(availableToBorrow.toString())}
                    className="text-blue-400 text-sm font-medium hover:text-blue-300"
                  >
                    MAX
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    <AssetIcon symbol={asset.asset_symbol} size="sm" />
                    <span className="text-white font-medium">{asset.asset_symbol}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handlePercentage(25)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  25%
                </button>
                <button onClick={() => handlePercentage(50)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  50%
                </button>
                <button onClick={() => handlePercentage(75)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  75%
                </button>
                <button onClick={() => handlePercentage(100)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  100%
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1f2e] rounded-lg p-4 border border-gray-700">
            <div className="text-white font-medium mb-3">Transaction overview</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Health factor</span>
                <div className="text-right">
                  <span className="text-gray-500">∞ → </span>
                  <span className={`font-semibold ${newHealthFactor < 1.5 ? 'text-orange-400' : 'text-white'}`}>
                    {newHealthFactor.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Liquidation at</span>
                <span className="text-white">&lt;1.0</span>
              </div>
            </div>
          </div>

          {newHealthFactor < 2 && (
            <div className="flex items-start gap-2 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-cyan-300 text-xs leading-relaxed">
                <span className="font-semibold">Attention:</span> Parameter changes via  governance can alter your account health factor and risk of liquidation. Follow the{' '}
                <span className="text-cyan-400 underline cursor-pointer">Aave governance forum</span> for updates.
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-gray-400 text-xs leading-relaxed">
              <span className="text-xs">💰</span> &lt;$0.01
            </div>
          </div>
          <button
            onClick={handleBorrow}
            // disabled={numAmount === 0 }
            className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            Borrow {asset.asset_symbol}
          </button>
        </div>
      </div>
    </div>
  );
}
