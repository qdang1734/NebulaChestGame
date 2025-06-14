"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertLoginHistorySchema = exports.insertUserTaskSchema = exports.insertUserCollectionSchema = exports.insertTaskSchema = exports.insertCollectionSchema = exports.insertEggSchema = exports.insertKittySchema = exports.insertEggTypeSchema = exports.insertUserSchema = exports.userTasksRelations = exports.userTasks = exports.tasks = exports.loginHistoryRelations = exports.loginHistory = exports.userCollectionsRelations = exports.userCollections = exports.collections = exports.eggsRelations = exports.eggs = exports.kittiesRelations = exports.kitties = exports.eggTypesRelations = exports.eggTypes = exports.usersRelations = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
// Users table
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password"),
    rank: (0, pg_core_1.text)("rank"),
    avatar: (0, pg_core_1.text)("avatar"),
    balance: (0, pg_core_1.doublePrecision)("balance").notNull().default(0),
    totalReward: (0, pg_core_1.doublePrecision)("total_reward").notNull().default(0),
    lastRewardAt: (0, pg_core_1.timestamp)("last_reward_at").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    // Telegram integration
    telegramId: (0, pg_core_1.bigint)("telegram_id", { mode: 'number' }),
    authToken: (0, pg_core_1.text)("auth_token"),
    // Login streak tracking
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at").defaultNow(),
    loginStreak: (0, pg_core_1.integer)("login_streak").notNull().default(0),
    totalLogins: (0, pg_core_1.integer)("total_logins").notNull().default(0),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    eggs: many(exports.eggs),
    collections: many(exports.userCollections),
    tasks: many(exports.userTasks),
}));
// Egg types table (Mini, Starter, Pro, Genesis)
exports.eggTypes = (0, pg_core_1.pgTable)("egg_types", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    price: (0, pg_core_1.doublePrecision)("price").notNull(),
    minEarnPerDay: (0, pg_core_1.doublePrecision)("min_earn_per_day").notNull(),
    maxEarnPerDay: (0, pg_core_1.doublePrecision)("max_earn_per_day").notNull(),
    description: (0, pg_core_1.text)("description"),
    color: (0, pg_core_1.text)("color"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.eggTypesRelations = (0, drizzle_orm_1.relations)(exports.eggTypes, ({ many }) => ({
    possibleKitties: many(exports.kitties),
}));
// Kitties table (possible outcomes from eggs)
exports.kitties = (0, pg_core_1.pgTable)("kitties", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    rarity: (0, pg_core_1.text)("rarity").notNull(), // Common, Rare, Epic, Legendary, Mythic
    earnPerDay: (0, pg_core_1.doublePrecision)("earn_per_day").notNull(),
    dropRate: (0, pg_core_1.doublePrecision)("drop_rate").notNull(), // Percentage (e.g., 40.0 for 40%)
    eggTypeId: (0, pg_core_1.integer)("egg_type_id").references(() => exports.eggTypes.id).notNull(),
    color: (0, pg_core_1.text)("color"),
    spotColor: (0, pg_core_1.text)("spot_color"),
    imageUrl: (0, pg_core_1.text)("image_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.kittiesRelations = (0, drizzle_orm_1.relations)(exports.kitties, ({ one }) => ({
    eggType: one(exports.eggTypes, {
        fields: [exports.kitties.eggTypeId],
        references: [exports.eggTypes.id],
    }),
}));
// User's eggs (the actual eggs owned by users)
exports.eggs = (0, pg_core_1.pgTable)("eggs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id),
    eggTypeId: (0, pg_core_1.integer)("egg_type_id").references(() => exports.eggTypes.id).notNull(),
    isOpened: (0, pg_core_1.boolean)("is_opened").default(false),
    kittyId: (0, pg_core_1.integer)("kitty_id").references(() => exports.kitties.id),
    purchasedAt: (0, pg_core_1.timestamp)("purchased_at").defaultNow(),
    openedAt: (0, pg_core_1.timestamp)("opened_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.eggsRelations = (0, drizzle_orm_1.relations)(exports.eggs, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.eggs.userId],
        references: [exports.users.id],
    }),
    eggType: one(exports.eggTypes, {
        fields: [exports.eggs.eggTypeId],
        references: [exports.eggTypes.id],
    }),
    kitty: one(exports.kitties, {
        fields: [exports.eggs.kittyId],
        references: [exports.kitties.id],
    }),
}));
// Collections table
exports.collections = (0, pg_core_1.pgTable)("collections", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    icon: (0, pg_core_1.text)("icon").notNull(),
    color: (0, pg_core_1.text)("color").notNull(),
    rewardAmount: (0, pg_core_1.doublePrecision)("reward_amount").notNull(),
    rewardCurrency: (0, pg_core_1.text)("reward_currency").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// User Collections junction table
exports.userCollections = (0, pg_core_1.pgTable)("user_collections", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    collectionId: (0, pg_core_1.integer)("collection_id").notNull().references(() => exports.collections.id),
    count: (0, pg_core_1.integer)("count").notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.userCollectionsRelations = (0, drizzle_orm_1.relations)(exports.userCollections, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userCollections.userId],
        references: [exports.users.id],
    }),
    collection: one(exports.collections, {
        fields: [exports.userCollections.collectionId],
        references: [exports.collections.id],
    }),
}));
// User login history table - track login streak
exports.loginHistory = (0, pg_core_1.pgTable)("login_history", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    loginDate: (0, pg_core_1.timestamp)("login_date").notNull().defaultNow(),
    dayNumber: (0, pg_core_1.integer)("day_number").notNull(), // Which day in the streak (1-7)
    streakComplete: (0, pg_core_1.boolean)("streak_complete").notNull().default(false),
    rewardAmount: (0, pg_core_1.doublePrecision)("reward_amount").notNull().default(0),
    claimed: (0, pg_core_1.boolean)("claimed").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.loginHistoryRelations = (0, drizzle_orm_1.relations)(exports.loginHistory, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.loginHistory.userId],
        references: [exports.users.id],
    }),
}));
// Tasks table
exports.tasks = (0, pg_core_1.pgTable)("tasks", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    platform: (0, pg_core_1.text)("platform").notNull(), // twitter, telegram, etc.
    reward: (0, pg_core_1.integer)("reward").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// User Tasks junction table
exports.userTasks = (0, pg_core_1.pgTable)("user_tasks", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    taskId: (0, pg_core_1.integer)("task_id").notNull().references(() => exports.tasks.id),
    completed: (0, pg_core_1.boolean)("completed").notNull().default(false),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.userTasksRelations = (0, drizzle_orm_1.relations)(exports.userTasks, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userTasks.userId],
        references: [exports.users.id],
    }),
    task: one(exports.tasks, {
        fields: [exports.userTasks.taskId],
        references: [exports.tasks.id],
    }),
}));
// Type definitions and schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    username: true,
    password: true,
    rank: true,
    avatar: true,
    telegramId: true,
    authToken: true,
});
exports.insertEggTypeSchema = (0, drizzle_zod_1.createInsertSchema)(exports.eggTypes).pick({
    name: true,
    price: true,
    minEarnPerDay: true,
    maxEarnPerDay: true,
    description: true,
    color: true,
});
exports.insertKittySchema = (0, drizzle_zod_1.createInsertSchema)(exports.kitties).pick({
    name: true,
    rarity: true,
    earnPerDay: true,
    dropRate: true,
    eggTypeId: true,
    color: true,
    spotColor: true,
    imageUrl: true,
});
exports.insertEggSchema = (0, drizzle_zod_1.createInsertSchema)(exports.eggs).pick({
    userId: true,
    eggTypeId: true,
    isOpened: true,
    kittyId: true,
});
exports.insertCollectionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.collections).pick({
    name: true,
    icon: true,
    color: true,
    rewardAmount: true,
    rewardCurrency: true,
});
exports.insertTaskSchema = (0, drizzle_zod_1.createInsertSchema)(exports.tasks).pick({
    title: true,
    platform: true,
    reward: true,
});
exports.insertUserCollectionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userCollections).pick({
    userId: true,
    collectionId: true,
    count: true,
});
exports.insertUserTaskSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userTasks).pick({
    userId: true,
    taskId: true,
    completed: true,
});
exports.insertLoginHistorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.loginHistory).pick({
    userId: true,
    loginDate: true,
    dayNumber: true,
    streakComplete: true,
    rewardAmount: true,
    claimed: true,
});
