import { useState, useEffect } from "react";
import { Wallet as WalletIcon, ClipboardList, RefreshCw, Loader2, LogOut } from "lucide-react";
import GradientButton from "@/components/ui/gradient-button";
import { ActiveScreen } from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import tonLogo from "@assets/ton_symbol_1746668225277.png";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import axios from 'axios';
import { sendTransaction as sendTonTransaction } from '../lib/ton-helper';

interface WalletProps {
  onScreenChange: (screen: ActiveScreen) => void;
}

// Define a type for the user data to avoid TypeScript errors
interface UserData {
  id: number;
  username: string;
  balance: number;
}

const TON_TO_USD_RATE = 3.01; // 1 TON = 3.01 USD

// TON Wallet integration - connects to user's personal wallet via TON Space
import { TonConnectUI } from "@tonconnect/ui";

// Create proper connection to TON Connect
// We don't need a buttonRootId since we're using custom buttons
export const tonConnectUI = new TonConnectUI({
  manifestUrl: "https://nebulachestgame.onrender.com/tonconnect-manifest.json",
});

// Create a wrapper with error handling
export const tonWallet = {
  // Show wallet connection dialog
  connect() {
    try {
      return tonConnectUI.openModal();
    } catch (error) {
      console.error("Error connecting to TON wallet:", error);
      return Promise.resolve();
    }
  },
  
  // Disconnect wallet
  disconnect() {
    try {
      return tonConnectUI.disconnect();
    } catch (error) {
      console.error("Error disconnecting TON wallet:", error);
      return Promise.resolve();
    }
  },
  
  // Send a transaction
  sendTransaction(params: any) {
    try {
      return tonConnectUI.sendTransaction(params);
    } catch (error) {
      console.error("Error sending transaction:", error);
      return Promise.resolve("error-tx");
    }
  },
  
  // Check if wallet is connected
  get connected() {
    try {
      return tonConnectUI.connected;
    } catch (error) {
      console.error("Error checking wallet connection:", error);
      return false;
    }
  }
};

const GAME_WALLET_ADDRESS = "UQDf_BlFDdYBVUudGOVCJ846issTL-mLpW6QfC93lg5MrbiY";
const MIN_DEPOSIT = 0.01;
const MAX_DEPOSIT = 10000;

const Wallet = ({ onScreenChange }: WalletProps) => {
  const { data: userData, isLoading } = useQuery<UserData>({
    queryKey: ['/api/user'],
  });
  
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0.1);
  const [depositStep, setDepositStep] = useState<'input'|'sending'|'waiting'|'success'|'error'>("input");
  const [depositError, setDepositError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  
  // Thay thế các biến số dư demo
  const tonBalance = userData?.balance ?? 0;
  const usdBalance = (tonBalance * TON_TO_USD_RATE).toFixed(2);
  const walletUsdBalance = (walletBalance * TON_TO_USD_RATE).toFixed(2);
  
  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkWalletConnection = () => {
      try {
        if (tonWallet.connected && tonConnectUI.wallet) {
          const address = tonConnectUI.wallet.account.address;
          if (address) {
            setWalletAddress(`${address.slice(0, 6)}...${address.slice(-4)}`);
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error("Error checking wallet connection:", err);
      }
    };
    
    checkWalletConnection();
    
    // Set up wallet connection status listener
    const unsubscribe = tonConnectUI.onStatusChange((wallet: any) => {
      if (wallet) {
        const address = wallet.account.address;
        setWalletAddress(address ? 
          `${address.slice(0, 6)}...${address.slice(-4)}` : 
          "Connected"
        );
        setIsConnected(true);
      } else {
        setWalletAddress('');
        setIsConnected(false);
      }
    });
    
    // Cleanup when component unmounts
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
  
  // Handle wallet connection through TON Space
  const handleConnectWallet = async () => {
    const isTelegramWebApp = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
    if (isTelegramWebApp) {
      await tonWallet.connect();
    } else {
      window.open('https://app.tonkeeper.com/ton-connect?manifestUrl=https://nebulachestgame.onrender.com/tonconnect-manifest.json', '_blank');
    }
  };
  
  const handleDeposit = async () => {
    if (!isConnected) {
      await handleConnectWallet();
      return;
    }
    setDepositModalOpen(true);
    setDepositStep('input');
    setDepositError(null);
    setDepositAmount(0.1);
    setTxHash(null);
  };
  
  const sendDepositTx = async () => {
    setDepositStep('sending');
    setDepositError(null);
    try {
      // Gửi transaction qua TON Connect
      const amountNano = BigInt(Math.floor(depositAmount * 1e9)).toString();
      const params = {
        value: amountNano,
        to: GAME_WALLET_ADDRESS
      };
      // Gửi transaction và lấy txHash (boc)
      const result = await sendTonTransaction(params);
      if (!result) {
        setDepositStep('error');
        setDepositError('Không lấy được txHash từ ví.');
        return;
      }
      setTxHash(result);
      setDepositStep('waiting');
      // Gọi API backend để đăng ký giao dịch
      const userId = userData?.id;
      const fromAddress = tonConnectUI.wallet?.account?.address;
      const token = localStorage.getItem('authToken');

      if (!token) {
        setDepositStep('error');
        setDepositError('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        return;
      }

      await axios.post('/api/deposit/register', {
        userId,
        txHash: result,
        amount: depositAmount,
        fromAddress
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPolling(true);
    } catch (err: any) {
      setDepositStep('error');
      setDepositError(err?.message || 'Gửi giao dịch thất bại.');
    }
  };
  
  useEffect(() => {
    let interval: any;
    if (depositStep === 'waiting' && txHash && polling) {
      interval = setInterval(async () => {
        try {
          const res = await axios.post('/api/deposit/verify', { txHash });
          if (res.data?.success && res.data?.status === 'confirmed') {
            setDepositStep('success');
            setPolling(false);
            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          }
        } catch {}
      }, 4000);
    }
    return () => interval && clearInterval(interval);
  }, [depositStep, txHash, polling]);
  
  const handleWithdraw = async () => {
    if (!isConnected) {
      // Prompt to connect wallet first
      handleConnectWallet();
      return;
    }
    
    // Navigate to withdraw screen
    onScreenChange("withdraw");
  };
  
  const handleDisconnect = async () => {
    setIsConnected(false);
    setWalletAddress('');
    setWalletBalance(0);
    
    tonWallet.disconnect();
  };
  
  return (
    <div className="p-4">
      <h2 className="text-center text-xl font-display font-semibold mb-2">Wallet</h2>
      <p className="text-center text-gray-400 text-sm mb-6">Stay connected and earn reward</p>
      
      <div className="bg-gray-800/80 rounded-lg p-4 mb-6 flex justify-between items-center">
        <div>
          <div className="text-gray-400 text-sm">Total assets</div>
          <div className="text-amber-500 text-2xl font-display font-bold">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin inline" />
            ) : (
              `$ ${usdBalance}`
            )}
          </div>
        </div>
        <button className="text-gray-400 hover:text-white">
          <ClipboardList className="w-5 h-5" />
        </button>
      </div>
      
      {/* Wallet Connect Button */}
      <div className="mb-6">
        {!isConnected ? (
          <div className="flex justify-center">
            <div className="w-full max-w-xs">
              <GradientButton 
                fullWidth 
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Connecting...</>
                ) : (
                  "Connect TON Space"
                )}
              </GradientButton>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-gray-800/80 rounded-lg p-3 mb-2">
            <div className="flex items-center">
              <WalletIcon className="w-5 h-5 mr-2 text-blue-400" />
              <span className="text-sm font-medium">{walletAddress}</span>
            </div>
            <button 
              className="text-gray-400 hover:text-red-400"
              onClick={handleDisconnect}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex justify-between gap-4 mb-6">
        <GradientButton 
          variant="outline" 
          fullWidth
          onClick={handleDeposit}
        >
          Deposit
        </GradientButton>
        <GradientButton 
          variant="outline" 
          fullWidth
          onClick={handleWithdraw}
        >
          Withdraw
        </GradientButton>
      </div>
      
      <div className="mb-2 flex justify-between items-center">
        <h3 className="font-medium">Assets</h3>
        <button 
          className="text-gray-400 hover:text-white flex items-center"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/user'] })}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>
      
      {/* Asset Items */}
      <div className="space-y-3">
        {/* Game TON Token */}
        <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
              <img src={tonLogo} alt="TON" className="w-6 h-6" />
            </div>
            <div>
              <div className="font-medium">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  `${tonBalance.toFixed(4)} TON`
                )}
              </div>
              <div className="text-xs text-gray-400">Game Balance</div>
            </div>
          </div>
          <div className="text-amber-500 font-medium">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              `$ ${usdBalance}`
            )}
          </div>
        </div>
        
        {/* Wallet TON Token (only shown when connected) */}
        {isConnected && (
          <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                <img src={tonLogo} alt="TON" className="w-6 h-6" />
              </div>
              <div>
                <div className="font-medium">
                  {`${walletBalance.toFixed(4)} TON`}
                </div>
                <div className="text-xs text-gray-400">TON Space Wallet</div>
              </div>
            </div>
            <div className="text-amber-500 font-medium">
              {`$ ${walletUsdBalance}`}
            </div>
          </div>
        )}
      </div>
      
      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nạp TON vào game</DialogTitle>
            <DialogDescription>
              Nạp tối thiểu {MIN_DEPOSIT} TON, tối đa {MAX_DEPOSIT} TON.<br/>
              Tiền sẽ được cộng vào tài khoản game sau khi xác nhận giao dịch trên blockchain.
            </DialogDescription>
          </DialogHeader>
          {depositStep === 'input' && (
            <div className="space-y-4">
              <input
                type="number"
                min={MIN_DEPOSIT}
                max={MAX_DEPOSIT}
                step="0.01"
                value={depositAmount}
                onChange={e => setDepositAmount(Math.max(MIN_DEPOSIT, Math.min(MAX_DEPOSIT, Number(e.target.value))))}
                className="w-full rounded border px-3 py-2 bg-gray-900 text-white"
              />
              <GradientButton fullWidth onClick={sendDepositTx}>
                Xác nhận nạp
              </GradientButton>
            </div>
          )}
          {depositStep === 'sending' && <div>Đang gửi giao dịch đến ví TON...</div>}
          {depositStep === 'waiting' && <div>Đang chờ xác nhận giao dịch trên blockchain...</div>}
          {depositStep === 'success' && <div className="text-green-500">Nạp thành công! Số dư sẽ được cập nhật sau ít phút.</div>}
          {depositStep === 'error' && <div className="text-red-500">{depositError}</div>}
          <DialogFooter>
            <DialogClose asChild>
              <GradientButton variant="outline">Đóng</GradientButton>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;