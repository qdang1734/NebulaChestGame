// Helper functions for TON blockchain interactions

import { tonConnectUI } from "../pages/Wallet";

export interface SendTransactionParams {
  value: string; // amount in nanoTON (1 TON = 1,000,000,000 nanoTON)
  to: string; // destination address
  message?: string; // optional message to attach to transaction
}

// Convert TON to nanoTON
export const tonToNano = (amount: number | string): string => {
  if (typeof amount === 'string') {
    amount = parseFloat(amount);
  }
  return (amount * 1_000_000_000).toString();
};

// Convert nanoTON to TON
export const nanoToTon = (amount: number | string): number => {
  if (typeof amount === 'string') {
    amount = parseInt(amount);
  }
  return amount / 1_000_000_000;
};

// Format TON amount for display (with 4 decimal places)
export const formatTonAmount = (amount: number): string => {
  return amount.toFixed(4);
};

// Send TON transaction using TonConnect
export const sendTransaction = async (params: SendTransactionParams): Promise<string> => {
  try {
    // Check if wallet is connected
    if (!tonConnectUI.connected) {
      throw new Error('Wallet not connected');
    }
    
    // Prepare transaction
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      messages: [
        {
          address: params.to,
          amount: params.value,
          payload: params.message ? btoa(params.message) : '',
        },
      ],
    };
    
    // Send transaction
    const result = await tonConnectUI.sendTransaction(transaction);
    
    // Return transaction ID
    return result.boc;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

// Format wallet address for display
export const formatWalletAddress = (address?: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Validate TON address
export const isValidTonAddress = (address: string): boolean => {
  // This is a simplified validation, in a real app you would use TON SDK
  return address.length >= 48 && /^[0-9a-zA-Z_-]{48,}$/.test(address);
};