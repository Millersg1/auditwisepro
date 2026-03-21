import { Router } from 'express';
import pool from '../config/database.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { sendContactNotification } from '../utils/emailUtils.js';

const router = Router();

router.post('/', authLimiter, async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    await pool.query(
      'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );

    try {
      await sendContactNotification(name, email, message);
    } catch (emailErr) {
      console.error('Failed to send contact notification:', emailErr.message);
    }

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
