import { useState, useEffect } from 'react';
import { Check, MoreVertical, Info } from 'lucide-react';
import { AssetIcon } from '../components/AssetIcon';
import { SupplyModal } from '../components/SupplyModal';
import { BorrowModal } from '../components/BorrowModal';
import { WithdrawModal } from '../components/WithdrawModal';
import { RepayModal } from '../components/RepayModal';
import { MarketData, UserPosition } from '../lib/supabase';
import { getUserTokenBalance, useAssetPrices } from '../hooks/balances';
import { useMetaMask } from '../hooks/useMetaMask';
import { useContractPositions } from "../hooks/useContractPositions";
import { arrayBuffer } from 'stream/consumers';
import { ethers } from 'ethers';
interface DashboardProps {
    marketData: MarketData[];
    userPositions: UserPosition[];
    borrowPositions: UserPosition[];
    onSupply: (symbol: string, amount: number, enableCollateral: boolean) => void;
    onBorrow: (symbol: string, amount: number) => void;
    onWithdraw: (symbol: string, amount: number) => void;
    onRepay: (symbol: string, amount: number) => void;
    onToggleCollateral: (positionId: string) => void;
    isConnected?: boolean;
}

interface ModalState {
    type: 'supply' | 'borrow' | 'withdraw' | 'repay' | null;
    asset: MarketData | null;
    position?: UserPosition;
}

interface BalanceMap {
    [symbol: string]: string;
}

export function Dashboard({
    marketData,
    userPositions,
    borrowPositions,
    onSupply,
    onBorrow,
    onWithdraw,
    onRepay,
    onToggleCollateral,
}: DashboardProps) {
    const [modalState, setModalState] = useState<ModalState>({ type: null, asset: null });
    const [showZeroBalance, setShowZeroBalance] = useState(false);
    const [supplyCategory, setSupplyCategory] = useState('All Categories');
    const [borrowCategory, setBorrowCategory] = useState('All Categories');
    const [balances, setBalances] = useState<BalanceMap>({});
    const [loadingBalances, setLoadingBalances] = useState<boolean>(false);
    // const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [borrowableAsset,setBorrowableAsset] = useState<any>(null);
    const { connectedAddress, provider } = useMetaMask();

    const suppliedPositions = userPositions.filter((p) => p.position_type === 'supply');
    const borrowedPositions = borrowPositions.filter((p) => p.position_type === 'borrow');

    // Fetch wallet balances when connectedAddress or marketData changes
    useEffect(() => {
        const fetchBalances = async () => {
            if (!connectedAddress || marketData.length === 0) return;

            setLoadingBalances(true);
            const newBalances: BalanceMap = {};

            try {
                for (const asset of marketData) {
                    const balance = await getUserTokenBalance(connectedAddress, asset.address);
                    newBalances[asset.asset_symbol] = balance.toString();
                }
                setBalances(newBalances);
            } catch (error) {
                console.error('Error fetching wallet balances:', error);
            } finally {
                setLoadingBalances(false);
            }
        };

        fetchBalances();
    }, [connectedAddress, marketData]);

    const getWalletBalance = (symbol: string) => {
        return balances[symbol] || '0';
    };




    const openModal = (type: 'supply' | 'borrow' | 'withdraw' | 'repay', asset: MarketData, position?: UserPosition) => {
        setModalState({ type, asset, position });
    };

    const closeModal = () => {
        setModalState({ type: null, asset: null });
    };


    const handleSupply = (amount: number, enableCollateral: boolean) => {
        if (modalState.asset) {
            onSupply(modalState.asset.asset_symbol, amount, enableCollateral);
        }

    };

    const handleBorrow = (amount: number) => {
        console.log("handleBorrow done");
        if (modalState.asset) {
            onBorrow(modalState.asset.asset_symbol, amount);
        }


    };

    const handleWithdraw = (amount: number) => {
        if (modalState.asset) {
            onWithdraw(modalState.asset.asset_symbol, amount);
        }
    };

    const handleRepay = (amount: number) => {
        if (modalState.asset) {
            onRepay(modalState.asset.asset_symbol, amount);
        }
    };

    const assetsToSupply = marketData.filter((asset) => {
        const position = suppliedPositions.find((p) => p.asset_symbol === asset.asset_symbol);
        const balance = parseFloat(getWalletBalance(asset.asset_symbol));
        return showZeroBalance || balance > 0 || (position && position.amount > 0);
    });

    const {

        borrowingPower,

    } = useContractPositions(marketData);

    const assetsToBorrow = marketData.filter(asset =>
        borrowingPower.borrowableAssets.some(borrowable =>
            borrowable.assetSymbol === asset.asset_symbol
        )

    );
    const formatBorrowAmount = (borrowableAsset: any, asset: any) => {
        if (!borrowableAsset) return 0;

        // Get the maxBorrowAmount (which is the raw BigInt value)
        const rawAmount = borrowableAsset.maxBorrowAmount;

        // Determine decimals based on asset symbol
        const getAssetDecimals = (symbol: string) => {
            const decimals: { [key: string]: number } = {
                'WETH': 18,
                'USDC': 6,
                'USDT': 6,
                'DAI': 18,
                'WBTC': 8
            };
            return decimals[symbol] || 18;
        };

        const decimals = getAssetDecimals(asset.asset_symbol);
        return parseFloat(ethers.formatUnits(rawAmount, decimals));
    };
    const assetAddresses = marketData.map(asset => asset.address);
    const { prices: oraclePrices, loading: pricesLoading } = useAssetPrices(assetAddresses);



    // Helper function to get asset price
    const getAssetPrice = (assetAddress: string) => {
        const price = oraclePrices[assetAddress.toLowerCase()];
        // console.log("oraclePrice for", assetAddress, price);
        return price || 1;
    };


    return (
        <div className="min-h-screen bg-[#16191f]">
            <div className="max-w-[1800px] mx-auto p-[0.75rem_3rem]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-[#1c1f2e] rounded-[4px] border border-gray-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-white text-lg font-semibold">Your supplies</h2>
                            {/* <button className="text-gray-400 hover:text-white text-sm">Hide —</button> */}
                        </div>
                        {suppliedPositions.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-400">
                                Nothing supplied yet
                            </div>
                        ) : (
                            <div>
                                <div className="px-6 py-3 border-b border-gray-800 bg-[#1a1d28]">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="text-gray-400">
                                            Balance <span className="text-white font-semibold">$6,000.00</span>
                                        </div>
                                        <div className="text-gray-400">
                                            APY <span className="text-white font-semibold">-0.01%</span>
                                            <Info className="w-3 h-3 inline ml-1" />
                                        </div>
                                        <div className="text-gray-400">
                                            Collateral <span className="text-white font-semibold">$6,000.00</span>
                                            <Info className="w-3 h-3 inline ml-1" />
                                        </div>
                                    </div>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-800">
                                            <th className="text-left text-gray-400 text-xs font-medium px-6 py-3">Asset</th>
                                            <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">Balance</th>
                                            <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">APY</th>
                                            <th className="text-center text-gray-400 text-xs font-medium px-6 py-3">Collateral</th>
                                            <th className="text-right px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suppliedPositions.map((position) => {
                                            const asset = marketData.find((a) => a.asset_symbol === position.asset_symbol)!;
                                            // const assetPrice = getAssetPrice(position.address);
                                            return (
                                                <tr key={position.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <AssetIcon symbol={position.asset_symbol} size="sm" />
                                                            <span className="text-white font-medium text-sm">{position.asset_symbol}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-white text-sm">{position.amount.toFixed(6)}</div>
                                                        <div className="text-gray-400 text-xs">${(position.amount * 6000).toFixed(2)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-white text-sm">{position.apy.toFixed(2)}%</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => onToggleCollateral(position.id)}
                                                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${position.is_collateral
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-700 text-gray-500'
                                                                }`}
                                                        >
                                                            {position.is_collateral && <Check className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* <button
                                                                onClick={() => openModal('supply', asset, position)}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium rounded transition-colors"
                                                            >
                                                                Supply
                                                            </button> */}
                                                            <button
                                                                onClick={() => openModal('withdraw', asset, position)}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium rounded transition-colors"
                                                            >
                                                                Withdraw
                                                            </button>
                                                            <button className="p-1 text-gray-400 hover:text-white">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1c1f2e] rounded-[4px] border border-gray-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-white text-lg font-semibold">Your borrows</h2>
                            <button className="text-gray-400 hover:text-white text-sm">Hide —</button>
                        </div>
                        {borrowedPositions.length === 0 ? (
                            <div className="px-6 py-12">
                                <div className="text-center text-gray-400 mb-4">Nothing borrowed yet</div>
                            </div>
                        ) : (
                            <div>
                                <div className="px-6 py-3 border-b border-gray-800 bg-[#1a1d28]">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="text-gray-400">
                                            Balance <span className="text-white font-semibold">$0</span>
                                        </div>
                                        <div className="text-gray-400">
                                            APY <span className="text-white font-semibold">0%</span>
                                            <Info className="w-3 h-3 inline ml-1" />
                                        </div>
                                    </div>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-800">
                                            <th className="text-left text-gray-400 text-xs font-medium px-6 py-3">Asset</th>
                                            <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">Debt</th>
                                            <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">APY</th>
                                            <th className="text-right px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {borrowedPositions.map((position) => {
                                            const asset = marketData.find((a) => a.asset_symbol === position.asset_symbol)!;
                                            return (
                                                <tr key={position.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <AssetIcon symbol={position.asset_symbol} size="sm" />
                                                            <span className="text-white font-medium text-sm">{position.asset_symbol}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-white text-sm">{position.amount.toFixed(2)}</div>
                                                        <div className="text-gray-400 text-xs">${(position.amount * 138.6).toFixed(2)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-white text-sm">{position.apy.toFixed(2)}%</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => openModal('repay', asset, position)}
                                                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium rounded transition-colors"
                                                            >
                                                                Repay
                                                            </button>
                                                            <button
                                                                onClick={() => openModal('borrow', asset, position)}
                                                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
                                                            >
                                                                Borrow
                                                            </button>
                                                            <button className="p-1 text-gray-400 hover:text-white">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#1c1f2e] rounded-[4px] border border-gray-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-white text-lg font-semibold">Assets to supply</h2>
                            <div className="flex items-center gap-3">
                                <select
                                    value={supplyCategory}
                                    onChange={(e) => setSupplyCategory(e.target.value)}
                                    className="bg-gray-800 text-gray-300 text-sm rounded px-3 py-1.5 border border-gray-700 outline-none"
                                >
                                    <option>All Categories</option>
                                    <option>Stablecoins</option>
                                    <option>ETH</option>
                                </select>
                                <button className="text-gray-400 hover:text-white text-sm">Hide —</button>
                            </div>
                        </div>

                        <div className="px-6 py-3 border-b border-gray-800">
                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showZeroBalance}
                                    onChange={(e) => setShowZeroBalance(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                Show assets with 0 balance
                                <a href="#faucet" className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1">
                                    <span>💧</span>
                                    GANchain SEPOLIA FAUCET
                                    <span className="text-xs">↗</span>
                                </a>
                            </label>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="text-left text-gray-400 text-xs font-medium px-6 py-3">Assets</th>
                                    <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">Wallet balance</th>
                                    <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">APY</th>
                                    <th className="text-center text-gray-400 text-xs font-medium px-6 py-3">
                                        Can be collateral <Info className="w-3 h-3 inline" />
                                    </th>
                                    <th className="text-right px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {assetsToSupply.map((asset) => {
                                    const balance = parseFloat(getWalletBalance(asset.asset_symbol));
                                    const hasBalance = balance > 0;

                                    return (
                                        <tr key={asset.asset_symbol} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <AssetIcon symbol={asset.asset_symbol} size="sm" />
                                                    <span className="text-white font-medium text-sm">{asset.asset_symbol}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {loadingBalances ? (
                                                    <div className="text-gray-400 text-sm">Loading...</div>
                                                ) : (
                                                    <>
                                                        <div className="text-white text-sm">{balance.toFixed(6)}</div>
                                                        {!hasBalance && (
                                                            <div className="text-red-400 text-xs flex items-center justify-end gap-1">
                                                                0 <span className="text-xs">⚠</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-white text-sm">{asset.supply_apy.toFixed(2)}%</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {asset.can_be_collateral ? (
                                                    <span className="text-green-400">
                                                        <Check className="w-4 h-4 mx-auto" />
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openModal('supply', asset)}
                                                        disabled={!hasBalance}
                                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Supply
                                                    </button>
                                                    <button className="p-1 text-gray-400 hover:text-white">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-[#1c1f2e] rounded-[4px] border border-gray-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-white text-lg font-semibold">Assets to borrow</h2>
                            <div className="flex items-center gap-3">
                                <select
                                    value={borrowCategory}
                                    onChange={(e) => setBorrowCategory(e.target.value)}
                                    className="bg-gray-800 text-gray-300 text-sm rounded px-3 py-1.5 border border-gray-700 outline-none"
                                >
                                    <option>All Categories</option>
                                    <option>Stablecoins</option>
                                    <option>ETH</option>
                                </select>
                                <button className="text-gray-400 hover:text-white text-sm">Hide —</button>
                            </div>
                        </div>

                        {suppliedPositions.length === 0 ? (
                            <div className="px-6 py-6">
                                <div className="flex items-start gap-2 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                                    <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-cyan-300 text-xs leading-relaxed">
                                        To borrow you need to supply any asset to be used as collateral.
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="text-left text-gray-400 text-xs font-medium px-6 py-3">Asset</th>
                                    <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">
                                        Available <Info className="w-3 h-3 inline" />
                                    </th>
                                    <th className="text-right text-gray-400 text-xs font-medium px-6 py-3">
                                        APY, variable <Info className="w-3 h-3 inline" />
                                    </th>
                                    <th className="text-right px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {assetsToBorrow.map((asset) => {
                                    const borrowableAsset = borrowingPower.borrowableAssets.find(
                                        borrowable => borrowable.assetSymbol === asset.asset_symbol
                                    );

                                    // Use the helper function to properly format the amount
                                    const available = formatBorrowAmount(borrowableAsset, asset);
                                    const assetPrice = getAssetPrice(asset.address);
                                    const usdValue = available * assetPrice;
                                    return (
                                        <tr key={asset.asset_symbol} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <AssetIcon symbol={asset.asset_symbol} size="sm" />
                                                    <span className="text-white font-medium text-sm">{asset.asset_symbol}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-white text-sm">{available.toFixed(6)}</div>
                                                <div className="text-gray-400 text-xs">${usdValue.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-white text-sm">{asset.borrow_apy_variable.toFixed(4)}%</div>
                                                <Info className="w-3 h-3 inline ml-1 text-gray-400" />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {openModal('borrow', asset)
                                                            setBorrowableAsset(borrowableAsset);
                                                        }}
                                                        disabled={suppliedPositions.length === 0 || available === 0}
                                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Borrow
                                                    </button>
                                                    <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded transition-colors">
                                                        Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {modalState.type === 'supply' && modalState.asset && (
                <SupplyModal
                    asset={modalState.asset}
                    walletBalance={parseFloat(getWalletBalance(modalState.asset.asset_symbol))}
                    currentHealthFactor={0}
                    onClose={closeModal}
                    onSupply={handleSupply}
                />
            )}
           
            {modalState.type === 'borrow' && modalState.asset && (
                <BorrowModal
                    asset={modalState.asset}
                    availableToBorrow={(formatBorrowAmount(borrowableAsset, modalState.asset))}
                    currentHealthFactor={2.0}
                    onClose={closeModal}
                    onBorrow={handleBorrow}
                />
            )}

            {modalState.type === 'withdraw' && modalState.asset && modalState.position && (
                <WithdrawModal
                    asset={modalState.asset}
                    suppliedAmount={modalState.position.amount}
                    onClose={closeModal}
                    onWithdraw={handleWithdraw}
                />
            )}

            {modalState.type === 'repay' && modalState.asset && modalState.position && (
                <RepayModal
                    asset={modalState.asset}
                    borrowedAmount={modalState.position.amount}
                    walletBalance={parseFloat(getWalletBalance(modalState.asset.asset_symbol))}
                    onClose={closeModal}
                    onRepay={handleRepay}
                />
            )}
        </div>
    );
}