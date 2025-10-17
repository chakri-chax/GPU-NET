import { ethers } from 'ethers';

export interface UseMetaMaskReturn {
  connectedAddress: string;
  isConnected: boolean;
  error: string;
  provider: ethers.BrowserProvider | null;
  handleConnect: () => Promise<void>;
  handleDisconnect: () => void;
  formatAddress: (address: string) => string;
  isMetaMaskInstalled: () => boolean;
}

export declare const useMetaMask: () => UseMetaMaskReturn;