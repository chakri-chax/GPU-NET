import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useMetaMask } from './useMetaMask';
import { UserPosition,BorrowPosition } from '../lib/supabase';
import MOCK_POOL_ABI from "../../backend/artifacts/contracts/mocks/MockPool.sol/MockPool.json";
import deployments from "../../backend/deployment.json";

const MOCK_POOL_ADDRESS = deployments.mockPool;

interface BorrowingPower {
  borrowableAssets: {
    assetAddress: string;
    assetSymbol: string;
    maxBorrowAmount: number;
    formattedMaxBorrow: string;
  }[];
  totalCollateralValue: number;
  availableBorrowValue: number;
}

export function useContractPositions(marketData: any[]) {
  const { connectedAddress, provider } = useMetaMask();
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [BorrowPosition, setBorrowPositions] = useState<BorrowPosition[]>([]);
  const [borrowingPower, setBorrowingPower] = useState<BorrowingPower>({
    borrowableAssets: [],
    totalCollateralValue: 0,
    availableBorrowValue: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to get asset details from address
  const getAssetDetails = useCallback((address: string) => {
    return marketData.find(a => a.address?.toLowerCase() === address.toLowerCase());
  }, [marketData]);

  // Function to format amount based on token decimals
  const formatAmount = useCallback((amount: bigint, decimals: number = 18) => {
    return parseFloat(ethers.formatUnits(amount, decimals));
  }, []);

  // Fetch borrowing power from contract
  const fetchBorrowingPower = useCallback(async () => {
    if (!connectedAddress || !provider || marketData.length === 0) {
      setBorrowingPower({
        borrowableAssets: [],
        totalCollateralValue: 0,
        availableBorrowValue: 0
      });
      return;
    }

    try {
      const signer = await provider.getSigner();
      const mockPool = new ethers.Contract(MOCK_POOL_ADDRESS, MOCK_POOL_ABI.abi, signer);

      // Call getBorrowableAssets function
      const [assets, maxBorrowAmounts, totalCollateralValue, availableBorrowValue] = 
        await mockPool.getBorrowableAssets(connectedAddress);

      // console.log("Borrowable assets data:", {
    //     assets,
    //     maxBorrowAmounts,
    //     totalCollateralValue,
    //     availableBorrowValue
    //   });

      const borrowableAssets: BorrowingPower['borrowableAssets'] = [];

      for (let i = 0; i < assets.length; i++) {
        const assetAddress = assets[i];
        const maxBorrowAmount = maxBorrowAmounts[i];
        const assetDetails = getAssetDetails(assetAddress);

        if (assetDetails && maxBorrowAmount > 0) {
          const formattedAmount = maxBorrowAmount;
          
          borrowableAssets.push({
            assetAddress,
            assetSymbol: assetDetails.asset_symbol,
            maxBorrowAmount: maxBorrowAmount,
            formattedMaxBorrow: formattedAmount
          });
        }
      }

      setBorrowingPower({
        borrowableAssets,
        totalCollateralValue: formatAmount(totalCollateralValue),
        availableBorrowValue: formatAmount(availableBorrowValue)
      });
    } catch (err) {
      console.error('Error fetching borrowing power:', err);
    }
  }, [connectedAddress, provider, marketData, getAssetDetails, formatAmount]);

  // Fetch positions from contract
  const fetchContractPositions = useCallback(async () => {
    if (!connectedAddress || !provider || marketData.length === 0) {
      setUserPositions([]);
      setBorrowingPower({
        borrowableAssets: [],
        totalCollateralValue: 0,
        availableBorrowValue: 0
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signer = await provider.getSigner();
      const mockPool = new ethers.Contract(MOCK_POOL_ADDRESS, MOCK_POOL_ABI.abi, signer);

      // Get supported assets from contract
      const supportedAssets: string[] = await mockPool.getSupportedAssets();
    
      const positions: UserPosition[] = [];
        const borrowPositions: BorrowPosition[] = [];
      // Fetch positions and borrowing power in parallel
      await Promise.all([
        (async () => {
          for (const assetAddress of supportedAssets) {
            if(assetAddress === "0x0000000000000000000000000000000000000000") continue;
            try {
              
              const suppliedAmount = await mockPool.supplied(assetAddress, connectedAddress);
              const borrowedAmount = await mockPool.borrowed(assetAddress, connectedAddress);
              // console.log("borrowedAmount raw",await borrowedAmount.toString());
              
              const assetDetails = getAssetDetails(assetAddress);

              if (!assetDetails) continue;

              // Add supply position if amount > 0
              if (suppliedAmount > 0) {
                positions.push({
                  id: `${connectedAddress}-${assetDetails.asset_symbol}-supply`,
                  user_address: connectedAddress,
                  asset_symbol: assetDetails.asset_symbol,
                  position_type: 'supply',
                  amount: formatAmount(suppliedAmount, assetDetails.decimals),
                  apy: assetDetails.supply_apy,
                  is_collateral: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }

              // Add borrow position if amount > 0
              // console.log("borrowedAmount", borrowedAmount.toString());
              // console.log("assedt decimals", assetDetails.decimals);
              
              if(borrowedAmount > 0){
               borrowPositions.push({
                  id: `${connectedAddress}-${assetDetails.asset_symbol}-borrow`,
                  user_address: connectedAddress,
                  asset_symbol: assetDetails.asset_symbol,
                  position_type: 'borrow',
                  amount: formatAmount(borrowedAmount, assetDetails.decimals),
                  apy: assetDetails.borrow_apy_variable,
                  is_collateral: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              }
            //   if (borrowedAmount > 0) {
            //     positions.push({
            //       id: `${connectedAddress}-${assetDetails.asset_symbol}-borrow`,
            //       user_address: connectedAddress,
            //       asset_symbol: assetDetails.asset_symbol,
            //       position_type: 'borrow',
            //       amount: formatAmount(borrowedAmount, assetDetails.decimals),
            //       apy: assetDetails.borrow_apy_variable,
            //       is_collateral: false,
            //       created_at: new Date().toISOString(),
            //       updated_at: new Date().toISOString()
            //     });
            //   }
            } catch (err) {
              console.warn(`Error fetching data for asset ${assetAddress}:`, err);
            }
          }
        })(),
        fetchBorrowingPower()
      ]);
      setBorrowPositions(borrowPositions);
      setUserPositions(positions);
    } catch (err) {
      console.error('Error fetching contract positions:', err);
      setError('Failed to fetch positions from contract');
    } finally {
      setLoading(false);
    }
  }, [connectedAddress, provider, marketData, getAssetDetails, formatAmount, fetchBorrowingPower]);

  // Listen to contract events for real-time updates
  const setupEventListeners = useCallback(async () => {
    if (!connectedAddress || !provider) return;

    // try {
    //   const mockPool = new ethers.Contract(MOCK_POOL_ADDRESS, MOCK_POOL_ABI.abi, provider);
      
    //   const eventFilters = [
    //     mockPool.filters.SupplyExecuted(null, null, connectedAddress),
    //     mockPool.filters.WithdrawExecuted(null, null, connectedAddress),
    //     mockPool.filters.BorrowExecuted(null, null, null, connectedAddress),
    //     mockPool.filters.RepayExecuted(null, null, null, connectedAddress)
    //   ];

    //   // Refresh positions when any relevant event occurs
    //   const eventHandler = () => {
    //     fetchContractPositions();
    //   };

    //   eventFilters.forEach(filter => {
    //     mockPool.on(filter, eventHandler);
    //   });

    //   // Cleanup function
    //   return () => {
    //     eventFilters.forEach(filter => {
    //       mockPool.off(filter, eventHandler);
    //     });
    //   };
    // } catch (err) {
    //   console.error('Error setting up event listeners:', err);
    // }
  }, [connectedAddress, provider, fetchContractPositions]);

  // Refresh positions periodically
  useEffect(() => {
    fetchContractPositions();
    
    const interval = setInterval(() => {
      fetchContractPositions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchContractPositions]);

  // Setup event listeners with proper cleanup
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // const setupListeners = async () => {
    //   cleanup = await setupEventListeners();
    // };

    // setupListeners();

    return () => {
      if (cleanup) cleanup();
    };
  }, [setupEventListeners]);

  return {
    userPositions,
    borrowingPower,
    BorrowPosition,
    loading,
    error,
    refetch: fetchContractPositions
  };
}