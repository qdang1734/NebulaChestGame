import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react';
import GradientButton from "@/components/ui/gradient-button";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import tonLogo from "@assets/ton_symbol_1746668225277.png";
import { formatWalletAddress } from '../lib/ton-helper';
import { tonWallet, tonConnectUI } from './Wallet';

// Define a type for the user data
interface UserData {
  id: number;
  username: string;
  balance: number;
  rank?: string;
  avatar?: string;
  [key: string]: any;
}

interface DepositProps {
  onBack: () => void;
}

const GAME_WALLET_ADDRESS = "UQBoJh_jALLDvekZ-nna3fE-09PEYgAVKq1JRcMvP2KYsHG9"; // Địa chỉ ví game chính thức

const Deposit = ({ onBack }: DepositProps) => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const queryClient = useQueryClient();
  
  // Simulated wallet connection
  useEffect(() => {
    // For the simplified implementation, we'll set a demo wallet address
    setWalletAddress("UQBoJh_jALLDvekZ-nna3fE-09PEYgAVKq1JRcMvP2KYsHG9");
  }, []);
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow only numbers and decimals
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      
      // Validate minimum amount
      if (parseFloat(value) < 0.01 && value !== '') {
        setError('Minimum amount is 0.01 TON');
      } else {
        setError('');
      }
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(GAME_WALLET_ADDRESS);
    setIsCopied(true);
    
    // Reset copy status after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };
  
  const handleGenerateTransaction = async () => {
    if (!amount || parseFloat(amount) < 0.01) {
      setError('Please enter a valid amount (min 0.01 TON)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First check if wallet is connected, if not - prompt to connect
      if (!tonWallet.connected) {
        await tonWallet.connect();
        // If still not connected after prompt, exit early
        if (!tonWallet.connected) {
          setError('Please connect your TON Space wallet first');
          setIsLoading(false);
          return;
        }
      }
      
      // Create a transaction to send TON
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360, // Valid for 5 minutes
        messages: [
          {
            address: GAME_WALLET_ADDRESS,
            amount: (parseFloat(amount) * 1000000000).toString(), // Convert to nanoTON
          },
        ],
      };
      
      // Send the transaction using TON wallet
      const result = await tonWallet.sendTransaction(transaction);
      console.log("Transaction sent:", result);
      
      if (result && result !== "error-tx") {
        // Lấy thông tin user
        const userData = queryClient.getQueryData<UserData>(['/api/user']);
        
        // Đăng ký giao dịch nạp tiền với hệ thống
        try {
          const registerResponse = await fetch('https://pxiltsic.cloudfly.vn/api/deposit/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userData?.id,
              txHash: result,
              amount: parseFloat(amount),
              fromAddress: tonWallet.connected ? tonConnectUI.wallet?.account.address : ''
            }),
          });
          
          const registerData = await registerResponse.json();
          console.log("Deposit registration:", registerData);
          
          // Xử lý ngay lập tức giao dịch với API direct deposit
          const directResponse = await fetch('https://pxiltsic.cloudfly.vn/api/deposit/direct', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userData?.id,
              amount: parseFloat(amount),
              txHash: result
            }),
          });
          
          const directData = await directResponse.json();
          console.log("Direct deposit response:", directData);
        } catch (err) {
          console.error("Error registering deposit:", err);
        }
      }
      
      // Reset form and reload user data after successful transaction
      setAmount('');
      setError('');
      
      // Refresh user balance after deposit (with delay to allow blockchain confirmation)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }, 2000);
      
    } catch (err) {
      console.error('Transaction error:', err);
      setError('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white mr-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-display font-semibold">Deposit TON</h2>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="bg-gray-800/80 rounded-lg p-4">
          <p className="text-sm text-gray-300 mb-4">
            Send TON to the game address below to deposit funds into your game account.
          </p>
          
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Game wallet address</label>
            <div className="bg-gray-900 p-3 rounded-lg text-sm break-all flex items-center justify-between">
              <span className="text-gray-300 text-xs mr-2">{GAME_WALLET_ADDRESS}</span>
              <button 
                onClick={copyToClipboard}
                className="text-gray-400 hover:text-white"
              >
                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm text-gray-400">Amount</label>
            <span className="text-sm text-gray-400">Min 0.01 TON</span>
          </div>
          <div className="relative">
            <input 
              type="text" 
              className={`bg-gray-800 p-4 rounded-lg w-full focus:outline-none focus:ring-2 ${
                error ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-primary'
              }`}
              placeholder="Enter amount"
              value={amount}
              onChange={handleAmountChange}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <img src={tonLogo} alt="TON" className="w-5 h-5 mr-1" />
              <span className="text-gray-300 text-sm">TON</span>
            </div>
          </div>
          {error && (
            <div className="mt-1 flex items-center text-red-500 text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <GradientButton 
          fullWidth
          onClick={handleGenerateTransaction}
          disabled={isLoading || !amount || parseFloat(amount) < 0.01}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Send TON'
          )}
        </GradientButton>
      </div>
    </div>
  );
};

export default Deposit;
