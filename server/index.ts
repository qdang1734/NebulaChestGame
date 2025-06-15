import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// import path from 'path'; // Removed, was duplicated and unused in this context
import { setupVite, log } from "./vite";
import { startBot, bot } from "./telegram-bot";
import { startTransactionMonitor } from "./transaction-monitor";
import cors from 'cors';

// import fs from 'fs'; // Removed, unused in this context
import webhookRouter from "./webhook";
import authRouter from "./api/auth";
import chestRouter from "./api/chest";
import inviteRouter from "./api/invite";
import eggTypesRouter from "./api/egg-types";
import kittiesRouter from "./api/kitties";
import eggsRouter from "./api/eggs";
import openEggRouter from "./api/open-egg";
import userKittiesRouter from "./api/user-kitties";
import rewardsRouter from "./api/rewards";

// Ensure Express runs in production mode on Render when NODE_ENV may be undefined
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const app = express();

// Trust the first proxy for secure cookies in production (e.g., on Render)
// This must be set before any middleware that relies on it, like express-session.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS so frontend hosted on different origin can call the API
// CORS configuration with a whitelist
const allowedOrigins = [
  'http://localhost:5173', // For local development
  'https://nebulachestgame.onrender.com' // For production frontend
];

app.use(cors({
  origin: allowedOrigins,

}));

// Session-related middleware has been removed in favor of JWT authentication.

// Đăng ký các router API mới
app.use('/api', authRouter);
app.use('/api', chestRouter);
app.use('/api', inviteRouter);
app.use('/api', eggTypesRouter);
app.use('/api', kittiesRouter);
app.use('/api', eggsRouter);
app.use('/api', openEggRouter);
app.use('/api', userKittiesRouter);
app.use('/api', rewardsRouter);

// Sử dụng webhook router cho các endpoints Telegram
// Generate a secret path for the webhook
const secretPath = `/telegraf/${bot.secretPathComponent()}`;

// Use webhook router for Telegram updates
app.use(bot.webhookCallback(secretPath));

// Webhook router for other services (e.g., payment provider)
app.use('/webhook', webhookRouter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Global Error Handler] Caught error:', err); // Log the error
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Check if headers have already been sent before trying to send a response
    if (res.headersSent) {
      console.error('[Global Error Handler] Headers already sent, cannot send error response.');
      // If headers are sent, delegate to the default Express error handler
      // which will close the connection and possibly log the error.
      return _next(err);
    }

    res.status(status).json({ message });
    // Do NOT throw err; here or call _next(err) if you've handled the response.
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  }

  // Use PORT from environment variable if available, otherwise use 5000
  // In Render, we'll use the PORT provided by the environment
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    // reusePort: true, // Removed for Windows compatibility
  }, () => {
    log(`serving on port ${port}`);
    
    // Start Telegram bot and transaction monitor
    startBot(secretPath);
    startTransactionMonitor();
  });
})();
