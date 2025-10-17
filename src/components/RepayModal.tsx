import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { AssetIcon } from './AssetIcon';
import { MarketData } from '../lib/supabase';
import { useMetaMask } from '../hooks/useMetaMask';
import { ethers } from 'ethers';
import ERC20ABI from "../../backend/artifacts/contracts/mocks/MockERC20.sol/MockERC20.json";
import deployment from "../../backend/deployment.json"
import WrapperABI from "../../backend/artifacts/contracts/gpuAaveContracts/AaveExpertWrapper.sol/AaveExpertWrapper.json";
import OracleABI from "../../backend/artifacts/contracts/gpuAaveContracts/SimplePriceOracle.sol/SimplePriceOracle.json";
interface RepayModalProps {
  asset: MarketData;
  borrowedAmount: number;
  walletBalance: number;
  onClose: () => void;
  onRepay: (amount: number) => void;
}

export function RepayModal({ asset, borrowedAmount, walletBalance, onClose, onRepay }: RepayModalProps) {
  const [amount, setAmount] = useState('');
  const {provider, connectedAddress} = useMetaMask();
  const numAmount = parseFloat(amount) || 0;
  const usdValue = numAmount * 138.60;
  const maxRepayable = Math.min(borrowedAmount, walletBalance);

  const handlePercentage = (percent: number) => {
    const value = (maxRepayable * percent) / 100;
    setAmount(value.toFixed(2));
  };
const handleApprove = async () => {
  
      if (!provider) {
        console.log("no provider");
        return;
      }
      const signer = await provider.getSigner();
      const token = new ethers.Contract(asset.address, ERC20ABI.abi, signer);
  
      const decimals = await token.decimals();
  
      const tx = await token.approve(deployment.wrapper, ethers.parseUnits(amount, decimals));
      await tx.wait();
      // setApproval(false);
  
  
    }
  const handleRepay = async() => {
     if (!provider) {
          console.log("no provider");
          return;
        }
        const signer = await provider.getSigner();
        const token = new ethers.Contract(asset.address, ERC20ABI.abi, signer);
    
        const decimals = await token.decimals();
        const allowance = await token.allowance(connectedAddress, deployment.wrapper);
    
        
        if (allowance < ethers.parseUnits(amount, decimals)) {
          await handleApprove();
        }
        const wrapper = new ethers.Contract(deployment.wrapper, WrapperABI.abi, signer);
    
        const tx = await wrapper.repay(asset.address, ethers.parseUnits(amount, decimals),2, connectedAddress);
        await tx.wait();
        onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2d3f] rounded-2xl max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-white text-xl font-semibold">Repay {asset.asset_symbol}</h2>
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
                placeholder="0"
                className="bg-transparent text-white text-3xl font-semibold outline-none w-full"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-gray-400 text-sm">${usdValue.toFixed(2)}</div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Wallet balance {walletBalance.toFixed(2)}</span>
                  <button
                    onClick={() => setAmount(maxRepayable.toString())}
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
                <span className="text-gray-400">Borrowed amount</span>
                <span className="text-white">{borrowedAmount.toFixed(2)} {asset.asset_symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Remaining debt</span>
                <span className="text-white">{(borrowedAmount - numAmount).toFixed(2)} {asset.asset_symbol}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-gray-400 text-xs leading-relaxed">
              <span className="text-xs">💰</span> &lt;$0.01
            </div>
          </div>

          <div className="space-y-2">
            <button
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors flex items-center justify-center gap-2"
              onClick={handleApprove}
            >
              Approve {asset.asset_symbol} to continue
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={handleRepay}
              disabled={numAmount === 0 || numAmount > maxRepayable}
              className="w-full py-3 bg-[#383b4d] text-gray-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Repay {asset.asset_symbol}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
