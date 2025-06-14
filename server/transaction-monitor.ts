/*
 * Hệ thống theo dõi giao dịch TON tự động
 * Xử lý việc xác nhận nạp tiền và cập nhật số dư người chơi
 */

import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { GAME_WALLET_ADDRESS, isValidTonAddress, nanoToTon } from './ton-utils';

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
    // Trong môi trường thực tế, đây là nơi sẽ gọi API của TON để xác minh giao dịch
    console.log(`Verifying transaction: ${txHash}`);
    
    // Vì đây là phiên bản demo, giả định mọi giao dịch đều hợp lệ
    // Trong triển khai thực tế, sẽ kiểm tra chi tiết bằng API của TON
    
    // Tìm kiếm trong danh sách giao dịch đang chờ xử lý
    const pendingTx = pendingTransactions.find(tx => tx.txHash === txHash);
    
    if (pendingTx) {
      return {
        txHash,
        fromAddress: "User Address", // Trong thực tế sẽ lấy từ blockchain
        toAddress: GAME_WALLET_ADDRESS,
        amount: pendingTx.amount,
        timestamp: pendingTx.timestamp,
        confirmed: true
      };
    }
    
    // Mô phỏng kết quả từ API (để kiểm tra chức năng)
    // Trong thực tế, dữ liệu này sẽ đến từ blockchain
    return {
      txHash,
      fromAddress: "EQABCDEfghi...", // Địa chỉ ví người gửi 
      toAddress: GAME_WALLET_ADDRESS, // Địa chỉ ví game (phải khớp)
      amount: 0.1, // TON (mặc định nếu không tìm thấy)
      timestamp: Date.now(),
      confirmed: true
    };
  } catch (error) {
    console.error("Error verifying transaction:", error);
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