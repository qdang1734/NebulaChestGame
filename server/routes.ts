import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEggTypeSchema, insertKittySchema } from "./schema";
import { db } from "./db";
import { eggTypes, kitties, userCollections, eggs, users, chestOpenings } from "./schema";
import { eq, and, desc, gt, sql } from "drizzle-orm";
import withdrawalApi from "./withdrawal-api";
import depositApi from "./deposit-api";


// Một hàm trợ giúp để lấy ID người dùng từ token xác thực
async function getUserIdFromAuth(req: Request): Promise<number | null> {
  try {
    // Kiểm tra token trong header
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Loại bỏ tiền tố 'Bearer '
    } else if (req.query.token) {
      // Kiểm tra token trong query params
      token = req.query.token as string;
    } else if (req.body && req.body.token) {
      // Kiểm tra token trong body
      token = req.body.token;
    }

    if (!token) {
      return null;
    }

    const { validateAuthToken } = await import('./telegram-bot');
    const userSession = validateAuthToken(token);

    if (userSession) {
      return userSession.userId;
    }

    return null;
  } catch (error) {
    console.error("Error getting user ID from auth:", error);
    return null;
  }
}

// ID người dùng mặc định để fallback khi không có xác thực
const mockUserId = 1;

// Functions from user.model.ts are now implemented directly using Drizzle

export async function registerRoutes(app: Express): Promise<Server> {
  // Đăng nhập hoặc khởi tạo user mới qua Telegram
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      // Accept both camelCase and snake_case telegram ID from client
      const { username, avatar } = req.body;
      const telegramId = (req.body.telegramId ?? req.body.telegram_id)?.toString();
      if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

      await db.insert(users)
        .values({
          telegramId: telegramId,
          username: username,
          avatar: avatar,

        })
        .onConflictDoUpdate({
          target: users.telegramId,
          set: {
            username: username,
            avatar: avatar,
          }
        });

      const userResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
      const user = userResult[0];

      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(500).json({ error: 'Failed to login or create user' });
      }
    } catch (err) {
      console.error("Error in /api/login:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API mở rương: cộng thưởng cho inviter nếu là lần đầu mở
  app.post('/api/open-chest', async (req: Request, res: Response) => {
    try {
      // Accept both camelCase and snake_case telegram ID from client
      const rawTelegramId = req.body.telegramId ?? req.body.telegram_id;
      const telegramId = rawTelegramId?.toString();
      const { chestValue } = req.body;
      if (!telegramId || !chestValue) return res.status(400).json({ error: 'Missing parameters' });
      
      // Lấy user hiện tại
      const userResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
      const user = userResult[0];

      if (!user) return res.status(404).json({ error: 'User not found' });

      // Kiểm tra xem user có đủ tiền không
      if (user.balance < chestValue) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Trừ tiền user
      await db.update(users).set({ balance: sql`${users.balance} - ${chestValue}` }).where(eq(users.telegramId, telegramId));

      // Inviter reward logic disabled (inviteBy column removed)
      const inviterReward = 0;

      // Ghi lại lịch sử mở rương
      await db.insert(chestOpenings).values({
        telegramId: telegramId,
        chestValue: chestValue,
        inviterId: null,
        inviterReward: inviterReward
      });

      const updatedUserResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
      res.json({ success: true, user: updatedUserResult[0] });
    } catch (err) {
      console.error("Error in /api/open-chest:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API lấy lịch sử mở rương của user
  app.get('/api/chest-history', async (req: Request, res: Response) => {
    try {
      const telegramId = req.query.telegramId as string;
      if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

      const rows = await db.select({
        chestValue: chestOpenings.chestValue,
        openedAt: chestOpenings.openedAt,
        inviterId: chestOpenings.inviterId,
        inviterReward: chestOpenings.inviterReward
      }).from(chestOpenings)
        .where(eq(chestOpenings.telegramId, telegramId))
        .orderBy(desc(chestOpenings.openedAt))
        .limit(50);
      res.json({ history: rows });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API lấy lịch sử invite reward của user
  app.get('/api/invite-rewards-history', async (req: Request, res: Response) => {
    try {
      const telegramId = req.query.telegramId as string;
      if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

      const rows = await db.select({
        chestValue: chestOpenings.chestValue,
        openedAt: chestOpenings.openedAt,
        inviterReward: chestOpenings.inviterReward,
        inviteeId: chestOpenings.telegramId
      }).from(chestOpenings)
        .where(
          and(
            eq(chestOpenings.inviterId, telegramId),
            gt(chestOpenings.inviterReward, 0)
          )
        )
        .orderBy(desc(chestOpenings.openedAt))
        .limit(50);
      res.json({ history: rows });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // TON Connect manifest handlers - support both paths for compatibility
  const tonConnectManifest = {
    url: "https://0df6e7a7-b20d-4f26-a61c-195fdadf8818-00-3t7u5xjgmjgwx.pike.replit.dev",
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

  // Egg Types API
  app.get("/api/egg-types", async (req: Request, res: Response) => {
    try {
      const allEggTypes = await storage.getAllEggTypes();
      res.json(allEggTypes);
    } catch (error) {
      console.error("Error fetching egg types:", error);
      res.status(500).json({ error: "Failed to fetch egg types" });
    }
  });

  app.post("/api/egg-types", async (req: Request, res: Response) => {
    try {
      const parsed = insertEggTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid egg type data" });
      }

      const newEggType = await storage.createEggType(parsed.data);
      res.status(201).json(newEggType);
    } catch (error) {
      console.error("Error creating egg type:", error);
      res.status(500).json({ error: "Failed to create egg type" });
    }
  });

  // Kitties API
  app.get("/api/kitties", async (req: Request, res: Response) => {
    try {
      const eggTypeId = req.query.eggTypeId ? Number(req.query.eggTypeId) : undefined;

      let kittyList;
      if (eggTypeId) {
        kittyList = await storage.getKittiesByEggType(eggTypeId);
      } else {
        kittyList = await db.select().from(kitties);
      }

      res.json(kittyList);
    } catch (error) {
      console.error("Error fetching kitties:", error);
      res.status(500).json({ error: "Failed to fetch kitties" });
    }
  });

  app.post("/api/kitties", async (req: Request, res: Response) => {
    try {
      const parsed = insertKittySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid kitty data" });
      }

      const newKitty = await storage.createKitty(parsed.data);
      res.status(201).json(newKitty);
    } catch (error) {
      console.error("Error creating kitty:", error);
      res.status(500).json({ error: "Failed to create kitty" });
    }
  });

  // Eggs API
  app.get("/api/eggs", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;

      let eggsList;
      if (userId) {
        eggsList = await storage.getUserEggs(userId);
      } else {
        eggsList = await db.select().from(eggTypes);
      }

      res.json(eggsList);
    } catch (error) {
      console.error("Error fetching eggs:", error);
      res.status(500).json({ error: "Failed to fetch eggs" });
    }
  });

app.post("/api/egg-types", async (req: Request, res: Response) => {
  try {
    const parsed = insertEggTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid egg type data" });
    }

    const newEggType = await storage.createEggType(parsed.data);
    res.status(201).json(newEggType);
  } catch (error) {
    console.error("Error creating egg type:", error);
    res.status(500).json({ error: "Failed to create egg type" });
  }
});

// Kitties API
app.get("/api/kitties", async (req: Request, res: Response) => {
  try {
    const eggTypeId = req.query.eggTypeId ? Number(req.query.eggTypeId) : undefined;

    let kittyList;
    if (eggTypeId) {
      kittyList = await storage.getKittiesByEggType(eggTypeId);
    } else {
      kittyList = await db.select().from(kitties);
    }

    res.json(kittyList);
  } catch (error) {
    console.error("Error fetching kitties:", error);
    res.status(500).json({ error: "Failed to fetch kitties" });
  }
});

app.post("/api/kitties", async (req: Request, res: Response) => {
  try {
    const parsed = insertKittySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid kitty data" });
    }

    const newKitty = await storage.createKitty(parsed.data);
    res.status(201).json(newKitty);
  } catch (error) {
    console.error("Error creating kitty:", error);
    res.status(500).json({ error: "Failed to create kitty" });
  }
});

// Eggs API
app.get("/api/eggs", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;

    let eggsList;
    if (userId) {
      eggsList = await storage.getUserEggs(userId);
    } else {
      eggsList = await db.select().from(eggTypes);
    }

    res.json(eggsList);
  } catch (error) {
    console.error("Error fetching eggs:", error);
    res.status(500).json({ error: "Failed to fetch eggs" });
  }
});

// Recent Openings API - Get last 20 opened kitties
app.get("/api/recent-openings", async (req: Request, res: Response) => {
  try {
    // Get last 20 eggs that were opened, order by most recent
    const recentOpenings = await db
      .select({
        kittyId: eggs.kittyId,
        openedAt: eggs.openedAt,
        userId: eggs.userId,
      })
      .from(eggs)
      .where(eq(eggs.isOpened, true))
      .orderBy(desc(eggs.openedAt))
      .limit(20);

    // Get details for each opening
    const openingsWithDetails = await Promise.all(
      recentOpenings.map(async (opening) => {
        let kitty = null;
        if (opening.kittyId !== null && opening.kittyId !== undefined) {
          kitty = await db
            .select()
            .from(kitties)
            .where(eq(kitties.id, opening.kittyId))
            .then(rows => rows[0]);
        }

        let user = null;
        if (opening.userId !== null && opening.userId !== undefined) {
          user = await db
            .select()
            .from(users)
            .where(eq(users.id, opening.userId))
            .then(rows => rows[0]);
        }

        return {
          ...opening,
          kitty,
          user,
        };
      })
    );

    res.json({ openings: openingsWithDetails });
  } catch (error) {
    console.error("Error fetching recent openings:", error);
    res.status(500).json({ error: "Failed to fetch recent openings" });
  }
});

// For demo purposes, let's create some mock user data
// Egg Types API
app.get("/api/egg-types", async (req: Request, res: Response) => {
  try {
    const allEggTypes = await storage.getAllEggTypes();
    res.json(allEggTypes);
  } catch (error) {
    console.error("Error fetching egg types:", error);
    res.status(500).json({ error: "Failed to fetch egg types" });
  }
});

app.post("/api/egg-types", async (req: Request, res: Response) => {
  try {
    const parsed = insertEggTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid egg type data" });
    }

    const newEggType = await storage.createEggType(parsed.data);
    res.status(201).json(newEggType);
  } catch (error) {
    console.error("Error creating egg type:", error);
    res.status(500).json({ error: "Failed to create egg type" });
  }
});

// Kitties API
app.get("/api/kitties", async (req: Request, res: Response) => {
  try {
    const eggTypeId = req.query.eggTypeId ? Number(req.query.eggTypeId) : undefined;

    let kittyList;
    if (eggTypeId) {
      kittyList = await storage.getKittiesByEggType(eggTypeId);
    } else {
      kittyList = await db.select().from(kitties);
    }

    res.json(kittyList);
  } catch (error) {
    console.error("Error fetching kitties:", error);
    res.status(500).json({ error: "Failed to fetch kitties" });
  }
});

app.post("/api/kitties", async (req: Request, res: Response) => {
  try {
    const parsed = insertKittySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid kitty data" });
    }

    const newKitty = await storage.createKitty(parsed.data);
    res.status(201).json(newKitty);
  } catch (error) {
    console.error("Error creating kitty:", error);
    res.status(500).json({ error: "Failed to create kitty" });
  }
});

// Eggs API
app.get("/api/eggs", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;

    let eggsList;
    if (userId) {
      eggsList = await storage.getUserEggs(userId);
    } else {
      eggsList = await db.select().from(eggTypes);
    }

    res.json(eggsList);
  } catch (error) {
    console.error("Error fetching eggs:", error);
    res.status(500).json({ error: "Failed to fetch eggs" });
  }
});

// Buy and Open an Egg API endpoint
app.post("/api/open-egg", async (req: Request, res: Response) => {
  try {
    console.log("Received open egg request:", req.body);
    const { eggTypeId } = req.body;

    // Lấy ID người dùng từ token xác thực
    const userId = await getUserIdFromAuth(req) || mockUserId;

    // Kiểm tra người dùng có tồn tại không
    let user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found, please login again" });
    }

    if (!eggTypeId) {
      console.log("Missing eggTypeId in request");
      return res.status(400).json({ error: "Egg type ID is required" });
    }

    // Get egg type price
    const eggType = await db.select().from(eggTypes).where(eq(eggTypes.id, eggTypeId)).then(rows => rows[0]);
    if (!eggType) {
      return res.status(404).json({ error: "Egg type not found" });
    }

    // Check user balance
    const currentUser = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);
    if (!currentUser || currentUser.balance < eggType.price) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance
    await db.update(users)
      .set({ balance: currentUser.balance - eggType.price })
      .where(eq(users.id, userId));

    console.log("Looking for kitties with eggTypeId:", eggTypeId);

    // Get kitties for this egg type from storage  
    const kittyList = await storage.getKittiesByEggType(eggTypeId);

    if (kittyList.length === 0) {
      console.log("No kitties found");
      return res.status(404).json({ error: "No kitties found for this egg type" });
    }

    // Select a random kitty based on drop rates
    const totalWeight = kittyList.reduce((sum, kitty) => sum + kitty.dropRate, 0);
    let random = Math.random() * totalWeight;

    let selectedKitty = kittyList[0];
    for (const kitty of kittyList) {
      random -= kitty.dropRate;
      if (random <= 0) {
        selectedKitty = kitty;
        break;
      }
    }

    console.log("Selected kitty:", selectedKitty);

    // Get or create collection for this kitty
    let collection = await storage.getCollectionByKittyId(selectedKitty.id);
    if (!collection) {
      collection = await storage.createCollection({
        name: selectedKitty.name,
        icon: "🐱",
        color: selectedKitty.color ?? '',
        rewardAmount: selectedKitty.earnPerDay,
        rewardCurrency: "TON"
      });
    }

    // Check if user already has this kitty
    const existingCollection = await db
      .select()
      .from(userCollections)
      .where(and(
        eq(userCollections.userId, userId),
        eq(userCollections.collectionId, collection.id)
      ));

    if (existingCollection.length > 0) {
      // Update count
      await db
        .update(userCollections)
        .set({ count: existingCollection[0].count + 1 })
        .where(and(
          eq(userCollections.userId, userId),
          eq(userCollections.collectionId, collection.id)
        ));
    } else {
      // Add new collection
      await storage.addUserCollection({
        userId: userId,
        collectionId: collection.id,
        count: 1
      });
    }

    // Create egg record
    const egg = await db.insert(eggs).values({
      userId: userId,
      eggTypeId: eggTypeId,
      isOpened: true,
      kittyId: selectedKitty.id,
      openedAt: new Date()
    });

    // Return the selected kitty as if it was opened from the egg
    res.json({
      success: true,
      kitty: selectedKitty,
      message: `You got a ${selectedKitty.rarity} ${selectedKitty.name}!`
    });
  } catch (error) {
    console.error("Error opening egg:", error);
    res.status(500).json({ error: "Failed to open egg" });
  }
});

  // Claim daily rewards
  // Get current user data
  app.get("/api/user", async (req: Request, res: Response) => {
    try {
      let userId;

      // Check if there's an authorization token in the header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Import and use the validateAuthToken function
        const { validateAuthToken } = await import('./telegram-bot');
        const userSession = validateAuthToken(token);

        if (userSession) {
          userId = userSession.userId;
        } else {
          // If the token is invalid, check query parameter as a fallback
          const queryToken = req.query.token as string;
          if (queryToken) {
            const userSessionFromQuery = validateAuthToken(queryToken);
            if (userSessionFromQuery) {
              userId = userSessionFromQuery.userId;
            }
          }
        }
      } else {
        // Check if there's a token in the query parameters
        const queryToken = req.query.token as string;
        if (queryToken) {
          const { validateAuthToken } = await import('./telegram-bot');
          const userSession = validateAuthToken(queryToken);
          if (userSession) {
            userId = userSession.userId;
          }
        }
      }

      // Fallback to mockUserId if no valid token is found
      if (!userId) {
        userId = mockUserId;
      }

      // Record login - this will handle the 7-day streak
      const { streak, isNewDay } = await storage.recordLogin(userId);

      const user = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get the count of opened eggs
      const openedEggsCount = await db
        .select()
        .from(eggs)
        .where(and(
          eq(eggs.userId, userId),
          eq(eggs.isOpened, true)
        ))
        .then(rows => rows.length);

      // Don't return sensitive data like password
      const { password, ...userData } = user;
      res.json({
        ...userData,
        openedEggsCount,
        loginStreak: streak,
        hasNewLoginReward: isNewDay
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  app.post("/api/claim-rewards", async (req: Request, res: Response) => {
    try {
      // Lấy ID người dùng từ token xác thực
      const userId = await getUserIdFromAuth(req) || mockUserId;

      // Get user and collection data
      const user = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);

      if (!user) {
        return res.status(404).json({ error: "User not found, please login again" });
      }

      const userKitties = await db
        .select({
          earnPerDay: kitties.earnPerDay,
          count: userCollections.count,
        })
        .from(userCollections)
        .innerJoin(kitties, eq(userCollections.collectionId, kitties.id))
        .where(eq(userCollections.userId, userId));

      // Calculate daily reward
      const dailyReward = userKitties.reduce((sum, kitty) => 
        sum + (kitty.earnPerDay * kitty.count), 0
      );

      // Check if 24 hours have passed
      const now = new Date();
      const lastReward = user.lastRewardAt ? new Date(user.lastRewardAt) : new Date(0);
      const hoursPassed = (now.getTime() - lastReward.getTime()) / (1000 * 60 * 60);

      if (hoursPassed < 24) {
        return res.status(400).json({ 
          error: "Too early to claim rewards",
          nextClaimIn: Math.ceil(24 - hoursPassed)
        });
      }

      // Update user balance and reward data
      await db.update(users)
        .set({ 
          balance: user.balance + dailyReward,
          totalReward: user.totalReward + dailyReward,
          lastRewardAt: now
        })
        .where(eq(users.id, userId));

      res.json({ success: true, reward: dailyReward });

    } catch (error) {
      console.error("Error claiming rewards:", error);
      res.status(500).json({ error: "Failed to claim rewards" });
    }
  });

  // API để lấy lịch sử đăng nhập của người dùng
  app.get("/api/login-history", async (req: Request, res: Response) => {
    try {
      // Get the user ID from query or headers
      let userId;

      // Check if there's an authorization token in the header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Import and use the validateAuthToken function
        const { validateAuthToken } = await import('./telegram-bot');
        const userSession = validateAuthToken(token);

        if (userSession) {
          userId = userSession.userId;
        } else {
          const queryToken = req.query.token as string;
          if (queryToken) {
            const userSessionFromQuery = validateAuthToken(queryToken);
            if (userSessionFromQuery) {
              userId = userSessionFromQuery.userId;
            }
          }
        }
      } else {
        const queryToken = req.query.token as string;
        if (queryToken) {
          const { validateAuthToken } = await import('./telegram-bot');
          const userSession = validateAuthToken(queryToken);
          if (userSession) {
            userId = userSession.userId;
          }
        }
      }

      // Fallback to mockUserId if no valid token is found
      if (!userId) {
        userId = mockUserId;
      }

      // Get the user's login history
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

  // API để nhận phần thưởng đăng nhập hàng ngày
  app.post("/api/claim-login-reward", async (req: Request, res: Response) => {
    try {
      // Get the user ID from query or headers
      let userId;

      // Check if there's an authorization token in the header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Import and use the validateAuthToken function
        const { validateAuthToken } = await import('./telegram-bot');
        const userSession = validateAuthToken(token);

        if (userSession) {
          userId = userSession.userId;
        } else {
          const queryToken = req.query.token as string;
          if (queryToken) {
            const userSessionFromQuery = validateAuthToken(queryToken);
            if (userSessionFromQuery) {
              userId = userSessionFromQuery.userId;
            }
          }
        }
      } else {
        const queryToken = req.query.token as string;
        if (queryToken) {
          const { validateAuthToken } = await import('./telegram-bot');
          const userSession = validateAuthToken(queryToken);
          if (userSession) {
            userId = userSession.userId;
          }
        }
      }

      // Fallback to mockUserId if no valid token is found
      if (!userId) {
        userId = mockUserId;
      }

      const { loginHistoryId } = req.body;

      if (!loginHistoryId) {
        return res.status(400).json({ error: "Login history ID is required" });
      }

      // Claim the reward
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

  // Handle withdrawals
  app.post("/api/withdraw", async (req: Request, res: Response) => {
    try {
      const { amount, address } = req.body;

      if (!amount || !address) {
        return res.status(400).json({ error: "Amount and address are required" });
      }

      // Minimum withdrawal amount
      if (amount < 0.1) {
        return res.status(400).json({ error: "Minimum withdrawal amount is 0.1 TON" });
      }

      // Lấy ID người dùng từ token xác thực
      const userId = await getUserIdFromAuth(req) || mockUserId;

      // Get the user
      const user = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);
      if (!user) {
        return res.status(404).json({ error: "User not found, please login again" });
      }

      // Check if the user has enough balance
      if (!user.balance || user.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Import ton-utils module for secure transaction processing
      const { processWithdrawal, isValidTonAddress } = await import("./ton-utils");

      // Validate TON address format
      if (!isValidTonAddress(address)) {
        return res.status(400).json({ error: "Invalid TON address format" });
      }

      // Process withdrawal using the secured method with private key from env variables
      const result = await processWithdrawal({
        amount,
        toAddress: address,
        userId
      });

      if (result.success) {
        // Update user balance only if transaction was successful
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
        // Return error from the transaction processing
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      res.status(500).json({ error: "Failed to process withdrawal" });
    }
  });

  // Initialize database with egg types and kitties  
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
  app.post("/api/withdraw", async (req: Request, res: Response) => {
    // Thay user id trong req.session bằng mockUserId cho mục đích demo
    req.body.userId = mockUserId;
    await withdrawalApi.handleWithdrawalRequest(req, res);
  });

  app.get("/api/transaction-history/:userId", async (req: Request, res: Response) => {
    await withdrawalApi.getTransactionHistory(req, res);
  });

  // API endpoints for deposit
  app.post("/api/deposit/register", async (req: Request, res: Response) => {
    try {
      // Lấy ID người dùng từ token xác thực
      const userId = await getUserIdFromAuth(req);

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: "Cần đăng nhập để nạp tiền" 
        });
      }

      // Thêm userId vào body để xử lý
      req.body.userId = userId;
      await depositApi.registerDeposit(req, res);
    } catch (error) {
      console.error("Error in deposit register:", error);
      res.status(500).json({ 
        success: false, 
        error: "Lỗi khi xử lý yêu cầu nạp tiền" 
      });
    }
  });

  app.post("/api/deposit/verify", async (req: Request, res: Response) => {
    await depositApi.verifyDeposit(req, res);
  });

  app.post("/api/deposit/direct", async (req: Request, res: Response) => {
    try {
      // Lấy ID người dùng từ token xác thực
      const userId = await getUserIdFromAuth(req);

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: "Cần đăng nhập để nạp tiền" 
        });
      }

      // Thêm userId vào body để xử lý
      req.body.userId = userId;
      await depositApi.handleDirectDeposit(req, res);
    } catch (error) {
      console.error("Error in direct deposit:", error);
      res.status(500).json({ 
        success: false, 
        error: "Lỗi khi xử lý yêu cầu nạp tiền" 
      });
    }
  });

  // Validate Telegram auth token
  app.get("/api/validate-token", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      let token = '';

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      } else if (req.query.token) {
        token = req.query.token as string;
      }

      if (!token) {
        return res.status(401).json({ 
          valid: false, 
          error: "No authentication token provided" 
        });
      }

      const { validateAuthToken } = await import('./telegram-bot');
      const userSession = validateAuthToken(token);

      if (!userSession) {
        return res.status(401).json({ 
          valid: false, 
          error: "Invalid or expired token" 
        });
      }

      // Get user details from database
      const user = await storage.getUser(userSession.userId);

      if (!user) {
        return res.status(404).json({ 
          valid: false, 
          error: "User not found" 
        });
      }

      // Don't return sensitive data like password
      const { password, ...userData } = user;

      return res.json({ 
        valid: true, 
        user: userData,
        telegramId: userSession.telegramId,
        telegramUsername: userSession.username
      });
    } catch (error) {
      console.error("Error validating token:", error);
      return res.status(500).json({ 
        valid: false, 
        error: "Failed to validate token" 
      });
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