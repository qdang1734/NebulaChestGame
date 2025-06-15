import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { eggTypes, kitties, userCollections, eggs, users } from "./schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import withdrawalApi from "./withdrawal-api";
import depositApi from "./deposit-api";
import { authenticateToken, type AuthRequest } from "./api/middleware";




// Functions from user.model.ts are now implemented directly using Drizzle

export async function registerRoutes(app: Express): Promise<Server> {


  // TON Connect manifest handlers - support both paths for compatibility
  const publicBaseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || `https://nebulachestgame.onrender.com`;
  const tonConnectManifest = {
    url: publicBaseUrl,
    name: "NebulaChest",
    iconUrl: "/icon.png",
    termsOfUseUrl: "/terms.html",
    privacyPolicyUrl: "/privacy.html"
  };

  // Route theo cấu hình trong client (Wallet.tsx)
  app.get("/tonconnect-manifest.json", (req: Request, res: Response) => {
    res.json(tonConnectManifest);
  });

  // Route theo chuẩn TON Connect cho các ví khác
  app.get("/.well-known/ton-connect-manifest.json", (req: Request, res: Response) => {
    res.json(tonConnectManifest);
  });

  // Telegram redirect handler
  app.get("/telegram", async (req: Request, res: Response) => {
    const { token } = req.query;

    // HTML template for redirection page
    const frontEndUrl = process.env.FRONTEND_URL || 'https://nebulachestgame.onrender.com';

    const redirectHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NebulaChest</title>

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
            }
            .container {
                text-align: center;
                background-color: rgba(0, 0, 0, 0.5);
                padding: 2rem;
                border-radius: 10px;
                max-width: 600px;
                width: 90%;
            }
            h1 {
                color: #00b4d8;
            }
            p {
                margin: 1rem 0;
                line-height: 1.5;
            }
            .redirect-btn {
                display: inline-block;
                background-color: #00b4d8;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                margin-top: 1rem;
                font-weight: bold;
                transition: background-color 0.3s;
            }
            .redirect-btn:hover {
                background-color: #0077b6;
            }
            .loader {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #00b4d8;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>NebulaChest</h1>
            <div class="loader"></div>
            <p>Đang chuyển hướng đến NebulaChest Game...</p>
            <a href="${frontEndUrl}/?token=${token}" class="redirect-btn">Nhấn vào đây nếu không tự động chuyển hướng</a>
        </div>
        <script>
            // Tự động chuyển hướng sau 2 giây
            setTimeout(() => {
                window.location.href = "${frontEndUrl}/?token=${token}";
            }, 2000);
        </script>
    </body>
    </html>
    `;

    res.send(redirectHtml);
  });

  // For demo purposes, let's create some mock user data

  // Handle withdrawals
  app.post("/api/withdraw", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, address } = req.body;
      const userId = req.user?.id; // Get user ID from JWT token

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!amount || !address) {
        return res.status(400).json({ error: "Amount and address are required" });
      }

      if (amount < 0.1) {
        return res.status(400).json({ error: "Minimum withdrawal amount is 0.1 TON" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.balance || user.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const { processWithdrawal, isValidTonAddress } = await import("./ton-utils");

      if (!isValidTonAddress(address)) {
        return res.status(400).json({ error: "Invalid TON address format" });
      }

      const result = await processWithdrawal({
        amount,
        toAddress: address,
        userId
      });

      if (result.success) {
        await db.update(users)
          .set({ balance: user.balance - amount })
          .where(eq(users.id, userId));

        console.log(`Withdrawal processed for user ${userId}: ${amount} TON to ${address}`);
        console.log(`Transaction hash: ${result.txHash}`);

        res.json({ 
          success: true, 
          withdrawalAmount: amount,
          newBalance: user.balance - amount,
          transactionHash: result.txHash
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      res.status(500).json({ error: "Failed to process withdrawal" });
    }
  });

  // =================================================================
  //                AUTHENTICATED USER API ROUTES
  // =================================================================

  // API to get current user info
  app.get("/api/user", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // API to get user's kitties
  app.get("/api/user-kitties", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const userKitties = await storage.getUserCollections(userId);
      res.json(userKitties);
    } catch (error) {
      console.error("Error fetching user kitties:", error);
      res.status(500).json({ error: "Failed to fetch user kitties" });
    }
  });

  // API to get user's eggs
  app.get("/api/eggs", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const userEggs = await storage.getUserEggs(userId);
      res.json(userEggs);
    } catch (error) {
      console.error("Error fetching user eggs:", error);
      res.status(500).json({ error: "Failed to fetch user eggs" });
    }
  });

  // API to open an egg
  app.post("/api/open-egg", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
            const { eggTypeId } = req.body;
      if (eggTypeId === undefined) {
        return res.status(400).json({ error: "Egg Type ID is required" });
      }

      // 1. Get user and egg type details
      const user = await storage.getUser(userId);
      const [eggType] = await db.select().from(eggTypes).where(eq(eggTypes.id, eggTypeId));

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      if (!eggType) {
        return res.status(404).json({ error: "Egg type not found." });
      }

      // 2. Check if user has enough balance
      const price = eggType.price || 0;
      const userBalance = user.balance || 0;
      if (userBalance < price) {
        return res.status(400).json({ error: "Insufficient balance." });
      }

      // 3. Deduct balance
      const newBalance = userBalance - price;
      await db.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

      // 4. Get all possible kitties from this egg type
      const possibleKitties = await db.select().from(kitties).where(eq(kitties.eggTypeId, eggTypeId));
      if (possibleKitties.length === 0) {
        return res.status(500).json({ error: "No kitties found for this egg type." });
      }

      // 5. Randomly select a kitty based on drop rates
      const totalDropRate = possibleKitties.reduce((sum, kitty) => sum + (kitty.dropRate || 0), 0);
      let random = Math.random() * totalDropRate;
      let selectedKitty = null;

      for (const kitty of possibleKitties) {
        random -= (kitty.dropRate || 0);
        if (random <= 0) {
          selectedKitty = kitty;
          break;
        }
      }

      if (!selectedKitty) { // Fallback
        selectedKitty = possibleKitties[0];
      }

      // 6. Create a record for the opened egg
      await storage.createEgg({
        userId: userId,
        eggTypeId: eggTypeId,
        isOpened: true,
        openedAt: new Date(),
        kittyId: selectedKitty.id,
      });

      // 7. Find the collection for the kitty
      const collection = await storage.getCollectionByKittyId(selectedKitty.id);
      if (!collection) {
        // This is a server-side data integrity issue
        return res.status(500).json({ error: "Could not find collection for the awarded kitty." });
      }

      // 8. Check if the user already has this collection item and update/create
      const [existingUserCollection] = await db.select()
        .from(userCollections)
        .where(and(
            eq(userCollections.userId, userId),
            eq(userCollections.collectionId, collection.id)
        ));

      if (existingUserCollection) {
        // If yes, increment the count
        const newCount = (existingUserCollection.count || 0) + 1;
        await db.update(userCollections)
            .set({ count: newCount })
            .where(eq(userCollections.id, existingUserCollection.id));
      } else {
        // If no, create a new entry
        await storage.addUserCollection({
            userId: userId,
            collectionId: collection.id,
            count: 1
        });
      }

      // 9. Return the kitty that was "hatched"
      res.json(selectedKitty);

    } catch (error) {
      console.error("Error opening egg:", error);
      res.status(500).json({ error: "Failed to open egg" });
    }
  });

  // API to get user's login history and streak
  app.get("/api/login-history", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const loginHistoryData = await storage.getUserLoginHistory(userId);
      const currentStreak = await storage.getUserCurrentStreak(userId);
      res.json({
        currentStreak,
        history: loginHistoryData,
        nextRewardAmount: storage.getDailyRewardForStreak(currentStreak + 1)
      });
    } catch (error) {
      console.error("Error fetching login history:", error);
      res.status(500).json({ error: "Failed to fetch login history" });
    }
  });

  // API to claim daily login reward
  app.post("/api/claim-login-reward", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { loginHistoryId } = req.body;
      if (!loginHistoryId) {
        return res.status(400).json({ error: "Login history ID is required" });
      }
      const result = await storage.claimDailyReward(userId, loginHistoryId);
      if (!result.success) {
        return res.status(400).json({ error: "Failed to claim reward, it may have already been claimed" });
      }
      res.json({
        success: true,
        rewardAmount: result.amount,
        message: `You've received ${result.amount} TON as a login reward!`
      });
    } catch (error) {
      console.error("Error claiming login reward:", error);
      res.status(500).json({ error: "Failed to claim login reward" });
    }
  });

  // Initialize data (for development only)pes and kitties  
  app.post("/api/initialize-data", async (req: Request, res: Response) => {
    try {
      // Check if data already exists
      const existingEggTypes = await db.select().from(eggTypes);
      if (existingEggTypes.length > 0) {
        return res.json({ message: "Data already initialized", eggTypes: existingEggTypes });
      }

      // Initialize egg types
      const eggTypeData = [
        {
          name: "Mini Egg",
          price: 0.1,
          minEarnPerDay: 0.0001,
          maxEarnPerDay: 0.1,
          description: "The cheapest egg with basic rewards",
          color: "#A7D7C9"
        },
        {
          name: "Starter Egg",
          price: 1,
          minEarnPerDay: 0.001,
          maxEarnPerDay: 0.5,
          description: "A balanced egg with medium rewards", 
          color: "#F2C879"
        },
        {
          name: "Mega Egg",
          price: 10,
          minEarnPerDay: 0.01,
          maxEarnPerDay: 1,
          description: "Premium egg with high rewards",
          color: "#EF959C"
        },
        {
          name: "Genesis Egg",
          price: 100,
          minEarnPerDay: 0.1,
          maxEarnPerDay: 10,
          description: "The ultimate egg with exceptional rewards",
          color: "#69A2B0"
        }
      ];

      // Insert egg types and save IDs
      const eggTypeIds: Record<string, number> = {}; // Đảm bảo đúng kiểu number

      for (const eggType of eggTypeData) {
        const [insertedEggType] = await db.insert(eggTypes).values(eggType).returning();
        eggTypeIds[insertedEggType.name] = Number(insertedEggType.id);
      }

      // Initialize kitties for each egg type
      const kittyData = [
        // Mini Egg Kitties
        {
          name: "Fluffy",
          rarity: "Common",
          earnPerDay: 0.0002,
          dropRate: 40,
          eggTypeId: eggTypeIds["Mini Egg"],
          color: "#E8D7F1",
          spotColor: "#A167A5"
        },
        {
          name: "Meowster",
          rarity: "Common",
          earnPerDay: 0.0005,
          dropRate: 35,
          eggTypeId: eggTypeIds["Mini Egg"],
          color: "#BEA8E1",
          spotColor: "#8559A5"
        },
        {
          name: "Stripey",
          rarity: "Rare",
          earnPerDay: 0.0035,
          dropRate: 15,
          eggTypeId: eggTypeIds["Mini Egg"],
          color: "#9479CF",
          spotColor: "#6B43C9"
        },
        {
          name: "Luna",
          rarity: "Epic",
          earnPerDay: 0.01,
          dropRate: 7,
          eggTypeId: eggTypeIds["Mini Egg"],
          color: "#6A5ACD",
          spotColor: "#483D8B"
        },
        {
          name: "Glitch",
          rarity: "Epic",
          earnPerDay: 0.02,
          dropRate: 2,
          eggTypeId: eggTypeIds["Mini Egg"],
          color: "#5A4FCF",
          spotColor: "#4338CA"
        },
        {
          name: "Phantom",
          rarity: "Legendary",
          earnPerDay: 0.1,
          dropRate: 1,
          eggTypeId: eggTypeIds["Mini Egg"],
          color: "#4338CA",
          spotColor: "#3730A3"
        },

        // Starter Egg Kitties
        {
          name: "Tofu",
          rarity: "Common",
          earnPerDay: 0.002,
          dropRate: 35,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#F8E8A6",
          spotColor: "#F2C879"
        },
        {
          name: "Boba",
          rarity: "Common",
          earnPerDay: 0.005,
          dropRate: 30,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#F8DA7F",
          spotColor: "#F4C14F"
        },
        {
          name: "Ash",
          rarity: "Rare",
          earnPerDay: 0.035,
          dropRate: 15,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#F5C759",
          spotColor: "#E8AE2D"
        },
        {
          name: "Miso",
          rarity: "Epic",
          earnPerDay: 0.1,
          dropRate: 10,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#F4BC36",
          spotColor: "#E8A317"
        },
        {
          name: "Orion",
          rarity: "Epic",
          earnPerDay: 0.2,
          dropRate: 5,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#F0B014",
          spotColor: "#E09204"
        },
        {
          name: "Phantom",
          rarity: "Legendary",
          earnPerDay: 0.1,
          dropRate: 3,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#4338CA",
          spotColor: "#3730A3"
        },
        {
          name: "Crystal",
          rarity: "Legendary",
          earnPerDay: 0.35,
          dropRate: 2,
          eggTypeId: eggTypeIds["Starter Egg"],
          color: "#D1A517",
          spotColor: "#C69214"
        },

        // Mega Egg Kitties
        {
          name: "Biscuit",
          rarity: "Common",
          earnPerDay: 0.015,
          dropRate: 30,
          eggTypeId: eggTypeIds["Mega Egg"],
          color: "#F9C6C6",
          spotColor: "#F08080"
        },
        {
          name: "Mochi",
          rarity: "Common",
          earnPerDay: 0.025,
          dropRate: 25,
          eggTypeId: eggTypeIds["Mega Egg"],
          color: "#F7B1B1",
          spotColor: "#E76A6A"
        },
        {
          name: "Onyx",
          rarity: "Rare",
          earnPerDay: 0.075,
          dropRate: 20,
          eggTypeId: eggTypeIds["Mega Egg"],
          color: "#F59A9A",
          spotColor: "#E05858"
        },
        {
          name: "Salem",
          rarity: "Rare",
          earnPerDay: 0.05,
          dropRate: 15,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#F48282",
          spotColor: "#D84545"
        },
        {
          name: "Vega",
          rarity: "Epic",
          earnPerDay: 0.35,
          dropRate: 5,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#F26B6B",
          spotColor: "#D13030"
        },
        {
          name: "Ghost",
          rarity: "Epic",
          earnPerDay: 0.2,
          dropRate: 3,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#EF5050",
          spotColor: "#CB2020"
        },
        {
          name: "Solar",
          rarity: "Legendary",
          earnPerDay: 0.75,
          dropRate: 1.5,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#E84040",
          spotColor: "#BF1E1E"
        },
        {
          name: "Eclipse",
          rarity: "Mythic",
          earnPerDay: 1.0,
          dropRate: 0.5,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#DF2020",
          spotColor: "#B50E0E"
        },

        // Genesis Egg Kitties
        {
          name: "Nebula",
          rarity: "Common",
          earnPerDay: 0.15,
          dropRate: 30,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#A7C4E5",
          spotColor: "#6D97C9"
        },
        {
          name: "Jade",
          rarity: "Common",
          earnPerDay: 0.25,
          dropRate: 25,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#8FB6E0",
          spotColor: "#5389CA"
        },
        {
          name: "Blaze",
          rarity: "Rare",
          earnPerDay: 0.6,
          dropRate: 20,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#78A8DA",
          spotColor: "#3D7AC2"
        },
        {
          name: "Aqua",
          rarity: "Rare",
          earnPerDay: 0.85,
          dropRate: 15,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#619AD5",
          spotColor: "#2A6DBB"
        },
        {
          name: "Storm",
          rarity: "Epic",
          earnPerDay: 2.0,
          dropRate: 5,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#4A8BCE",
          spotColor: "#1B5EB0"
        },
        {
          name: "Nova",
          rarity: "Epic",
          earnPerDay: 3.5,
          dropRate: 3,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#3D7DCB",
          spotColor: "#1551A3"
        },
        {
          name: "Dragon",
          rarity: "Legendary",
          earnPerDay: 6.0,
          dropRate: 1.5,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#306FC8",
          spotColor: "#0F4595"
        },
        {
          name: "Chronos",
          rarity: "Mythic",
          earnPerDay: 10.0,
          dropRate: 0.5,
          eggTypeId: eggTypeIds["Genesis Egg"],
          color: "#2561C0",
          spotColor: "#0A3984"
        }
      ];

      // Insert all kitties
      const insertedKitties = [];
      for (const kitty of kittyData) {
        // Đảm bảo eggTypeId là number và không có property sai schema
        const kittyInsert = {
          ...kitty,
          eggTypeId: Number(kitty.eggTypeId),
          color: kitty.color ?? '',
          spotColor: kitty.spotColor ?? '',
        };
        const [insertedKitty] = await db.insert(kitties).values(kittyInsert).returning();
        insertedKitties.push(insertedKitty);
      }

      res.status(201).json({
        message: "Data initialized successfully",
        eggTypes: await db.select().from(eggTypes),
        kitties: insertedKitties
      });
    } catch (error) {
      console.error("Error initializing data:", error);
      res.status(500).json({ error: "Failed to initialize data" });
    }
  });

  // API endpoints for withdrawal
  app.post("/api/withdraw", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      req.body.userId = userId;
      await withdrawalApi.handleWithdrawalRequest(req, res);
    } catch (error) {
      console.error("Error in withdrawal request:", error);
      res.status(500).json({ success: false, error: "Lỗi khi xử lý yêu cầu rút tiền" });
    }
  });

  // API endpoints for deposit
  app.post("/api/deposit/register", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Cần đăng nhập để nạp tiền" });
      }
      req.body.userId = userId;
      await depositApi.registerDeposit(req, res);
    } catch (error) {
      console.error("Error in deposit register:", error);
      res.status(500).json({ success: false, error: "Lỗi khi xử lý yêu cầu nạp tiền" });
    }
  });

  app.post("/api/deposit/verify", async (req: Request, res: Response) => {
    await depositApi.verifyDeposit(req, res);
  });

  app.post("/api/deposit/direct", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Cần đăng nhập để nạp tiền" });
      }
      req.body.userId = userId;
      await depositApi.handleDirectDeposit(req, res);
    } catch (error) {
      console.error("Error in direct deposit:", error);
      res.status(500).json({ success: false, error: "Lỗi khi xử lý yêu cầu nạp tiền" });

    }
  });

  // API endpoint để thêm/trừ số dư cho người chơi (chỉ dành cho admin/dev)
  app.post("/api/admin/adjust-balance", async (req: Request, res: Response) => {
    try {
      const { userId, amount, reason } = req.body;

      if (!userId || typeof userId !== 'number') {
        return res.status(400).json({ 
          success: false, 
          error: "Cần cung cấp ID người chơi hợp lệ" 
        });
      }

      if (!amount || typeof amount !== 'number') {
        return res.status(400).json({ 
          success: false, 
          error: "Cần cung cấp số lượng TON hợp lệ" 
        });
      }

      // Kiểm tra xem người chơi có tồn tại không
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "Không tìm thấy người chơi với ID này" 
        });
      }

      // Cập nhật số dư người chơi
      const [updatedUser] = await db
        .update(users)
        .set({
          balance: user.balance ? user.balance + amount : amount
        })
        .where(eq(users.id, userId))
        .returning();

      return res.json({
        success: true,
        userId: userId,
        oldBalance: user.balance || 0,
        newBalance: updatedUser.balance || 0,
        adjustmentAmount: amount,
        reason: reason || "Admin adjustment"
      });
    } catch (error) {
      console.error("Error adjusting user balance:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Lỗi khi cập nhật số dư người chơi" 
      });
    }
  });

  // Khởi động hệ thống theo dõi giao dịch nạp tự động



  const httpServer = createServer(app);

  return httpServer;
}