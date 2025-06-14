# Render Deployment Guide for NebulaChest

This guide will help you deploy NebulaChest to Render.com, which provides a more reliable URL for Telegram's WebApp integration.

## Step 1: Create a Render Account

1. Go to [render.com](https://render.com/) and sign up for an account if you don't have one
2. Verify your email address

## Step 2: Connect Your GitHub Repository

1. In Render dashboard, click on "New" and select "Web Service"
2. Choose "Connect to GitHub" and authorize Render to access your repositories
3. Select the repository containing your NebulaChest project

## Step 3: Configure the Web Service

Fill in the following details:
- **Name**: NebulaChest
- **Region**: Choose the closest to your users
- **Branch**: main (or whatever your main branch is called)
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

## Step 4: Thiết lập cơ sở dữ liệu PostgreSQL

1. Trong Render dashboard, chọn "New" và chọn "PostgreSQL"
2. Điền thông tin sau:
   - **Name**: NebulaChestDB
   - **Region**: Chọn vùng gần người dùng nhất
   - **PostgreSQL Version**: 14
   - **Instance Type**: Free (hoặc loại phù hợp với nhu cầu của bạn)
3. Nhấp vào "Create Database"
4. Sau khi tạo, Render sẽ cung cấp thông tin kết nối (Internal Database URL)

## Step 5: Di chuyển dữ liệu từ Replit sang Render

1. Từ Replit, xuất cơ sở dữ liệu hiện tại:
   ```bash
   pg_dump -Fc $DATABASE_URL > nebulachest_backup.dump
   ```
   
2. Tải tệp xuống máy tính

3. Nhập vào cơ sở dữ liệu Render PostgreSQL:
   ```bash
   pg_restore -d YOUR_RENDER_POSTGRES_URL nebulachest_backup.dump
   ```

## Step 6: Add Environment Variables

Add the following environment variables to your Render Web Service:
- `NODE_ENV`: `production`
- `DATABASE_URL`: Internal Database URL của PostgreSQL đã tạo ở bước 4
- `PORT`: `10000`
- `APP_URL`: Leave this empty for now (you'll fill it in after deployment)

## Step 5: Deploy the Application

1. Click "Create Web Service" to start the deployment
2. Wait for the build and deployment process to complete
3. Once deployed, you'll get a URL like `https://nebula-chest.onrender.com`

## Step 6: Update the Telegram Bot Configuration

1. Copy the deployed URL (e.g., `https://nebula-chest.onrender.com`)
2. Edit `server/telegram-bot.ts` and update the `APP_URL` environment variable in your Render dashboard to this URL
3. Edit `public/tonconnect-manifest.json` and update the `url` field with your Render URL

## Step 7: Redeploy

1. Commit and push your changes to GitHub
2. Render will automatically detect the changes and redeploy your application

## Using Your Deployed App

Your Telegram bot will now use the Render URL for all WebApp links, which should resolve the connection issues.

## Troubleshooting

- If your deployment fails, check the logs in the Render dashboard for errors
- Make sure all environment variables are set correctly
- If you have issues with database connectivity, double-check your `DATABASE_URL` environment variable
- For persistent database, consider using Render's PostgreSQL service