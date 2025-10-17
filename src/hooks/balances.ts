import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import ERC20ABI from "../../backend/artifacts/contracts/mocks/MockERC20.sol/MockERC20.json";
import deployment from "../../backend/deployment.json";
import MockPoolABI from "../../backend/artifacts/contracts/mocks/MockPool.sol/MockPool.json";
import OracleABI from "../../backend/artifacts/contracts/gpuAaveContracts/SimplePriceOracle.sol/SimplePriceOracle.json";
export const getUserTokenBalance = async (user: string, token: string) => {
    if (!user) return 0;
    const provider = new ethers.BrowserProvider(window.ethereum);
    if(token == '0x0000000000000000000000000000000000000000') return '0'
    const contract = new ethers.Contract(token, ERC20ABI.abi, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(user);
    return ethers.formatUnits(balance, decimals);
  }

export const borrowingPower = async(user:string) => {

  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(deployment.mockPool, MockPoolABI.abi, provider);

  console.log("factor",await contract.owner());
  const borrowList  = await contract.getBorrowableAssets(user);
  console.log(borrowList);
  
  // send borrowlist in for of market data 
}

export const useAssetPrices = (assetAddresses: string[]) => {
  const [prices, setPrices] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(deployment.priceOracle, OracleABI.abi, provider);
        
        const pricePromises = assetAddresses.map(async (address) => {
          if (address === "0x0000000000000000000000000000000000000000") return null;
          try {
            const price = await contract.getAssetPrice(address);
            // Convert from 8 decimals (typical oracle format) to normal number
            return { address, price: parseFloat(ethers.formatUnits(price, 8)) };
          } catch (error) {
            console.warn(`Failed to fetch price for ${address}:`, error);
            return null;
          }
        });

        const priceResults = await Promise.all(pricePromises);
        const priceMap: {[key: string]: number} = {};
        
        priceResults.forEach(result => {
          if (result) {
            priceMap[result.address.toLowerCase()] = result.price;
          }
        });

        setPrices(priceMap);
      } catch (error) {
        console.error('Error fetching asset prices:', error);
      } finally {
        setLoading(false);
      }
    };

    if (assetAddresses.length > 0) {
      fetchPrices();
    }
  }, [assetAddresses]);

  return { prices, loading };
};