import { useState, useEffect } from 'react';

import { ethers } from 'ethers';
// Add global type for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useMetaMask = () => {
  const [connectedAddress, setConnectedAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = (): boolean => {
    return typeof window && window.ethereum !== 'undefined';
  };

  // Check connection status on component mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async (): Promise<void> => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed');
      return;
    }

    try {
      const accounts = await window.ethereum!.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts.length > 0) {
        setConnectedAddress(accounts[0]);
        setIsConnected(true);
        setProvider(new ethers.BrowserProvider(window.ethereum!));
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      setError('Failed to check connection');
    }
  };

  const handleConnect = async (): Promise<void> => {
    if (!isMetaMaskInstalled()) {
      setError('Please install MetaMask to connect');
      return;
    }

    try {
      setError('');
      
      // Request account access
      const accounts = await window.ethereum!.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setConnectedAddress(accounts[0]);
        setIsConnected(true);
        setProvider(new ethers.BrowserProvider(window.ethereum!));
        
        // Optional: Listen for account changes
        window.ethereum!.on('accountsChanged', handleAccountsChanged);
        
        // Optional: Listen for chain changes
        window.ethereum!.on('chainChanged', handleChainChanged);
      }
    } catch (err: any) {
      console.error('Error connecting to MetaMask:', err);
      if (err.code === 4001) {
        setError('Please connect to MetaMask to continue');
      } else {
        setError('Failed to connect to MetaMask');
      }
    }
  };

  const handleDisconnect = (): void => {
    setConnectedAddress('');
    setIsConnected(false);
    setProvider(null);
    setError('');
    
    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };

  const handleAccountsChanged = (accounts: string[]): void => {
    if (accounts.length === 0) {
      // User disconnected all accounts
      handleDisconnect();
    } else {
      setConnectedAddress(accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string): void => {
    // Reload the page when chain changes
    window.location.reload();
  };

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return {
    connectedAddress,
    isConnected,
    error,
    provider,
    handleConnect,
    handleDisconnect,
    formatAddress,
    isMetaMaskInstalled
  };
};