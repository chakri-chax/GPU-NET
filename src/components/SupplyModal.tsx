import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { AssetIcon } from './AssetIcon.tsx';
import { MarketData } from '../lib/supabase';

import { useMetaMask } from '../hooks/useMetaMask';
import { ethers } from 'ethers';
import ERC20ABI from "../../backend/artifacts/contracts/mocks/MockERC20.sol/MockERC20.json";
import deployment from "../../backend/deployment.json"
import WrapperABI from "../../backend/artifacts/contracts/gpuAaveContracts/AaveExpertWrapper.sol/AaveExpertWrapper.json";
interface SupplyModalProps {
  asset: MarketData;
  walletBalance: number;
  currentHealthFactor: number;
  onClose: () => void;
  onSupply: (amount: number, enableCollateral: boolean) => void;
}

export function SupplyModal({ asset, walletBalance, currentHealthFactor, onClose, onSupply }: SupplyModalProps) {
  const [amount, setAmount] = useState('');
  const [enableCollateral, setEnableCollateral] = useState(true);
  const [approval, setApproval] = useState(true);
  const numAmount = parseFloat(amount) || 0;
  const usdValue = numAmount * 6000;
  const newHealthFactor = currentHealthFactor > 0 ? currentHealthFactor + (numAmount * 0.1) : 0;

  const { provider, connectedAddress } = useMetaMask();
  const handlePercentage = (percent: number) => {
    const value = (walletBalance * percent) / 100;
    setAmount(value.toFixed(4));
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
    setApproval(false);


  }
  const handleSupply = async () => {
   
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

    const tx = await wrapper.supply(asset.address, ethers.parseUnits(amount, decimals), connectedAddress);
    await tx.wait();
    onClose();

  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2a2d3f] rounded-2xl max-w-md w-full border border-gray-700 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-[#2a2d3f]">
          <h2 className="text-white text-lg font-semibold">Supply {asset.asset_symbol}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-gray-400 text-sm mb-2 flex items-center gap-1">
              Amount
              <Info className="w-3 h-3" />
            </div>
            <div className="bg-[#1c1f2e] rounded-lg p-3 border border-gray-700">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent text-white text-2xl font-semibold outline-none w-full"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-gray-400 text-xs">${usdValue.toFixed(2)}</div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">Balance {walletBalance.toFixed(2)}</span>
                  <button
                    onClick={() => setAmount(walletBalance.toString())}
                    className="text-blue-400 text-xs font-medium hover:text-blue-300"
                  >
                    MAX
                  </button>
                  <div className="flex items-center gap-1 ml-1">
                    <AssetIcon symbol={asset.asset_symbol} size="sm" />
                    <span className="text-white text-sm font-medium">{asset.asset_symbol}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => handlePercentage(25)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  25%
                </button>
                <button onClick={() => handlePercentage(50)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  50%
                </button>
                <button onClick={() => handlePercentage(75)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  75%
                </button>
                <button onClick={() => handlePercentage(100)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                  100%
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1f2e] rounded-lg p-3 border border-gray-700">
            <div className="text-white font-medium mb-2 text-sm">Transaction overview</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Supply APY</span>
                <span className="text-white">{asset.supply_apy.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-400">Collateralization</span>
                <button
                  onClick={() => setEnableCollateral(!enableCollateral)}
                  className={`px-2 py-1 rounded text-xs font-medium ${enableCollateral ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}
                >
                  {enableCollateral ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {currentHealthFactor > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Health factor</span>
                  <span className="text-white">
                    <span className="text-gray-500">∞ → </span>
                    {newHealthFactor.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
            <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-gray-400 text-xs leading-relaxed">
              <span className="text-xs">💰</span> &lt;$0.01
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400 text-center mb-1">
              Approve with <span className="text-blue-400">Signed message ⚙</span>
            </div>
            <button
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
              onClick={handleApprove}
            >
              Approve {asset.asset_symbol} to continue
              <Info className="w-3 h-3" />
            </button>

            <button
              onClick={handleSupply}
              disabled={numAmount === 0 || numAmount > walletBalance}
              className="w-full py-2 bg-[#383b4d] text-gray-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Supply {asset.asset_symbol}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
