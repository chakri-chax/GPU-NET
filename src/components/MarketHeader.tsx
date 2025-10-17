interface MarketHeaderProps {
  netWorth: number;
  netApy: number;
  availableRewards: number;
  isConnected?: boolean;
}

export function MarketHeader({ netWorth, netApy, availableRewards, isConnected }: MarketHeaderProps) {
  return (
    <div className=" border-b border-gray-800 mx-[3rem] py-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center">
              <span className="text-black font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-semibold flex items-center gap-2">
                GANchain L1
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                  V3
                </span>
                <span className="text-gray-500 text-lg">▼</span>
              </h1>
              {!isConnected && (
                <p className="text-yellow-400 text-sm mt-1">
                  Connect your wallet to view personalized data
                </p>
              )}
            </div>
          </div>

          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors border border-gray-700">
            VIEW TRANSACTIONS
          </button>
        </div>

        <div className="flex items-center gap-8 mt-6">
          <div>
            <div className="text-gray-400 text-sm mb-1">Net worth</div>
            <div className="text-white text-2xl font-semibold">
              ${isConnected ? netWorth.toLocaleString() : '0.00'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
              Net APY
              <span className="text-xs cursor-help">ⓘ</span>
            </div>
            <div className="text-white text-2xl font-semibold">
              {isConnected ? (
                <>
                  {netApy < 0 ? '-' : ''}&lt;{Math.abs(netApy).toFixed(2)}%
                </>
              ) : (
                '0.00%'
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Available rewards</div>
            <div className="text-white text-2xl font-semibold flex items-center gap-2">
              ${isConnected ? availableRewards : '0.00'}
              {isConnected && (
                <span className="px-2 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded font-medium">
                  CLAIM
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}