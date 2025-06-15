/**
 * Webhook handler cho Telegram Bot
 * File này chứa logic xử lý webhook từ Telegram
 */

import { Router, Request, Response } from 'express';
import { bot } from './telegram-bot';

// Lấy token bot từ biến môi trường hoặc sử dụng giá trị mặc định
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7709528475:AAEfAIRIj56GAZRkTg_or9GEO7uuE_pwHbs';

// Tạo router mới
const webhookRouter = Router();

// Endpoint nhận webhook từ Telegram
webhookRouter.post(`/bot${BOT_TOKEN}`, async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received webhook from Telegram:', JSON.stringify(req.body, null, 2));
    
    // Xử lý cập nhật từ Telegram
    await bot.handleUpdate(req.body);
    
    // Phản hồi thành công
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// API để thiết lập webhook
webhookRouter.get(`/setup-webhook`, async (req: Request, res: Response) => {
  try {
    const baseUrl = req.query.url;
    
    if (!baseUrl) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing URL parameter',
        message: 'Please provide a URL parameter, e.g. /setup-webhook?url=https://your-domain.com'
      });
    }
    
    // Xây dựng webhook URL
    const webhookUrl = `${baseUrl}/bot${BOT_TOKEN}`;
    
    // Gọi API Telegram để thiết lập webhook
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await response.json();
    
    // Type guard for the response from Telegram API
    if (typeof data === 'object' && data !== null && 'ok' in data) {
      const typedData = data as { ok: boolean, [key: string]: any };
      if (typedData.ok) {
        console.log(`[Webhook] Webhook set to ${webhookUrl}`);
        return res.json({
          ok: true,
          result: typedData,
          webhook_url: webhookUrl,
          message: 'Webhook set successfully'
        });
      } else {
        console.error('[Webhook] Failed to set webhook:', typedData);
        return res.status(400).json({
          ok: false,
          error: typedData,
          message: 'Failed to set webhook'
        });
      }
    } else {
      console.error('[Webhook] Invalid response format from Telegram:', data);
      return res.status(500).json({ ok: false, error: 'Invalid response format from Telegram' });
    }
  } catch (error) {
    console.error('[Webhook] Error setting up webhook:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// API để xóa webhook
webhookRouter.get(`/remove-webhook`, async (req: Request, res: Response) => {
  try {
    // Gọi API Telegram để xóa webhook
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const data = await response.json();
    
    // Type guard for the response from Telegram API
    if (typeof data === 'object' && data !== null && 'ok' in data) {
      const typedData = data as { ok: boolean, [key: string]: any };
      if (typedData.ok) {
        console.log('[Webhook] Webhook removed');
        return res.json({
          ok: true,
          result: typedData,
          message: 'Webhook removed successfully'
        });
      } else {
        console.error('[Webhook] Failed to remove webhook:', typedData);
        return res.status(400).json({
          ok: false,
          error: typedData,
          message: 'Failed to remove webhook'
        });
      }
    } else {
      console.error('[Webhook] Invalid response format from Telegram:', data);
      return res.status(500).json({ ok: false, error: 'Invalid response format from Telegram' });
    }
  } catch (error) {
    console.error('[Webhook] Error removing webhook:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// API để lấy thông tin webhook hiện tại
webhookRouter.get(`/webhook-info`, async (req: Request, res: Response) => {
  try {
    // Gọi API Telegram để lấy thông tin webhook
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    // Type guard for the response from Telegram API
    if (typeof data === 'object' && data !== null && 'result' in data) {
      return res.json({
        ok: true,
        webhook_info: (data as { result: any }).result
      });
    } else {
      console.error('[Webhook] Invalid response format from Telegram:', data);
      return res.status(500).json({ ok: false, error: 'Invalid response format from Telegram' });
    }
  } catch (error) {
    console.error('[Webhook] Error getting webhook info:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default webhookRouter;