/*
 * Hệ thống theo dõi giao dịch TON tự động
 * Xử lý việc xác nhận nạp tiền và cập nhật số dư người chơi
 */

import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { GAME_WALLET_ADDRESS, isValidTonAddress, nanoToTon } from './ton-utils';

// Toncenter API URL (Mainnet)
const TONCENTER_API_URL = "https://toncenter.com/api/v2/jsonRPC";
const TONCENTER_API_KEY_MAINNET = process.env.TONCENTER_API_KEY_MAINNET;

interface ToncenterTxResult {
  transaction_id: { hash: string; lt: string; };
  in_msg: { msg_type: string; value: string; source: string; destination: string; };
  utime: number;
}

interface ToncenterResponse {
  ok: boolean;
  result?: ToncenterTxResult[];
  error?: string;
}

interface DepositTransaction {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  timestamp: number;
  confirmed: boolean;
}

interface MonitoredTransaction {
  txHash: string;
  userId: number;
  amount: number;
  timestamp: number;
  processed: boolean;
}

// Bộ nhớ tạm thời để lưu trữ giao dịch đang xử lý
// Trong môi trường sản xuất thực tế, bạn sẽ lưu thông tin này vào cơ sở dữ liệu
const pendingTransactions: MonitoredTransaction[] = [];

/**
 * Đăng ký một giao dịch nạp mới cần theo dõi
 */
export function registerDepositTransaction(txHash: string, userId: number, amount: number): void {
  pendingTransactions.push({
    txHash,
    userId,
    amount,
    timestamp: Date.now(),
    processed: false
  });
  
  console.log(`[DEPOSIT] Registered new transaction ${txHash} for user ${userId} with amount ${amount} TON`);
}

/**
 * Xác minh một giao dịch nạp tiền trên blockchain
 * Trong môi trường thực tế, đây sẽ sử dụng API của TON để kiểm tra giao dịch
 */
export async function verifyTransaction(txHash: string): Promise<DepositTransaction | null> {
  try {
    console.log(`Verifying transaction: ${txHash} using Toncenter API`);

    if (!TONCENTER_API_KEY_MAINNET) {
      console.error("TONCENTER_API_KEY_MAINNET is not set.");
      return null;
    }

    // Call Toncenter API to get transaction details
    const response = await fetch(TONCENTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TONCENTER_API_KEY_MAINNET
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransactions",
        params: {
          address: GAME_WALLET_ADDRESS,
          limit: 10, // Check last 10 transactions of game wallet
          hash: txHash, // Look for specific transaction hash
          // Lt: "", // Optional: for pagination
          // archival: false
        }
      })
    });

    const data: ToncenterResponse = await response.json() as ToncenterResponse;

    if (data.error) {
      console.error("Toncenter API Error:", data.error);
      return null;
    }

    const transactions = data.result;

    if (!transactions || transactions.length === 0) {
      console.log(`Transaction ${txHash} not found on blockchain or not for game wallet.`);
      return null;
    }

    const targetTx = transactions.find((tx: ToncenterTxResult) => tx.transaction_id.hash === txHash);

    if (!targetTx) {
      console.log(`Transaction ${txHash} found in list but hash mismatch.`);
      return null;
    }

    const inMsg = targetTx.in_msg;
    if (!inMsg || inMsg.msg_type !== 'external') { // Should be external in case of deposit
      console.log(`Transaction ${txHash} is not a valid incoming message.`);
      return null;
    }

    const amountNano = inMsg.value;
    const amountTon = nanoToTon(amountNano);
    const fromAddress = inMsg.source;
    const toAddress = inMsg.destination;
    const timestamp = targetTx.utime * 1000; // Convert to milliseconds

    // Verify destination address and amount (optional but recommended)
    if (toAddress !== GAME_WALLET_ADDRESS) {
      console.error(`Transaction ${txHash} destination address mismatch. Expected ${GAME_WALLET_ADDRESS}, got ${toAddress}`);
      return null;
    }

    // For now, consider any found transaction confirmed if it matches. 
    // In a real scenario, you might check if the transaction is final.
    return {
      txHash: txHash,
      fromAddress: fromAddress,
      toAddress: toAddress,
      amount: amountTon,
      timestamp: timestamp,
      confirmed: true // Assume confirmed if found
    };

  } catch (error) {
    console.error("Error verifying transaction with Toncenter:", error);
    return null;
  }
}

/**
 * Xử lý việc nạp tiền cho người dùng
 */
export async function processDeposit(userId: number, amount: number, txHash: string): Promise<boolean> {
  try {
    console.log(`[DEPOSIT] Processing deposit of ${amount} TON for user ${userId}, txHash: ${txHash}`);
    
    // Lấy thông tin người dùng
    const user = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);
    
    if (!user) {
      console.error(`User ${userId} not found`);
      return false;
    }
    
    // Cập nhật số dư người dùng
    await db.update(users)
      .set({ 
        balance: (user.balance || 0) + amount
      })
      .where(eq(users.id, userId));
    
    console.log(`[DEPOSIT] Successfully credited ${amount} TON to user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error processing deposit:", error);
    return false;
  }
}

/**
 * Chạy chu kỳ kiểm tra các giao dịch đang chờ xử lý
 */
export async function processPendingTransactions(): Promise<void> {
  console.log(`[DEPOSIT] Processing ${pendingTransactions.length} pending transactions`);
  
  for (const tx of pendingTransactions) {
    if (tx.processed) continue;
    
    // Xác minh giao dịch trên blockchain
    const verifiedTx = await verifyTransaction(tx.txHash);
    
    if (verifiedTx && verifiedTx.confirmed) {
      // Kiểm tra địa chỉ đích phải là ví game
      if (verifiedTx.toAddress !== GAME_WALLET_ADDRESS) {
        console.error(`[DEPOSIT] Transaction ${tx.txHash} is not sent to game wallet`);
        continue;
      }
      
      // Xử lý việc nạp tiền cho người dùng
      const success = await processDeposit(tx.userId, verifiedTx.amount, tx.txHash);
      
      if (success) {
        // Đánh dấu giao dịch đã được xử lý
        tx.processed = true;
        console.log(`[DEPOSIT] Transaction ${tx.txHash} processed successfully`);
      }
    }
  }
  
  // Xóa các giao dịch đã xử lý khỏi danh sách (hoặc đánh dấu trong DB trong triển khai thực tế)
  const newPendingTransactions = pendingTransactions.filter(tx => !tx.processed);
  pendingTransactions.length = 0;
  pendingTransactions.push(...newPendingTransactions);
}

/**
 * Hàm này sẽ được gọi để bắt đầu giám sát giao dịch định kỳ (mỗi 1 phút)
 */
export function startTransactionMonitor(): NodeJS.Timeout {
  console.log("[DEPOSIT] Starting transaction monitor");
  
  // Chạy kiểm tra mỗi 60 giây (1 phút)
  return setInterval(async () => {
    try {
      await processPendingTransactions();
    } catch (error) {
      console.error("Error in transaction monitor:", error);
    }
  }, 60 * 1000);
}

// Export các hàm cần thiết
export default {
  registerDepositTransaction,
  verifyTransaction,
  processDeposit,
  startTransactionMonitor
};