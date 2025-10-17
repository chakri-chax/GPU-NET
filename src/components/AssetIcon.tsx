interface AssetIconProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AssetIcon({ symbol, size = 'md' }: AssetIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const colors: Record<string, string> = {
    ETH: 'from-purple-400 to-blue-500',
    WBTC: 'from-orange-400 to-orange-600',
    USDC: 'from-blue-400 to-blue-600',
    USDT: 'from-green-400 to-green-600',
    DAI: 'from-yellow-400 to-orange-500',
    LINK: 'from-blue-500 to-blue-700',
    GHO: 'from-pink-400 to-purple-500',
    AAVE: 'from-purple-500 to-pink-600',
    EURS: 'from-blue-400 to-cyan-500',
  };

  const bgColor = colors[symbol] || 'from-gray-400 to-gray-600';

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${bgColor} flex items-center justify-center font-bold text-white`}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}
