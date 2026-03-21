import pool from '../config/database.js';

export async function createNotification(userId, orgId, type, title, message, link) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, organization_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, orgId || null, type, title, message || null, link || null]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

export async function listNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, is_read } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const conditions = ['n.user_id = $1'];
    const params = [userId];
    let idx = 2;

    if (is_read !== undefined) {
      conditions.push(`n.is_read = $${idx++}`);
      params.push(is_read === 'true');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM notifications n ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(safeLimit, offset);
    const result = await pool.query(
      `SELECT n.*
       FROM notifications n
       ${where}
       ORDER BY n.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      notifications: result.rows,
      pagination: { page: parseInt(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        preferences: {
          email_notifications: true,
          push_notifications: true,
          audit_updates: true,
          finding_alerts: true,
          compliance_reminders: true,
          team_mentions: true,
          weekly_digest: true,
        },
      });
    }

    res.json({ preferences: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const {
      email_notifications,
      push_notifications,
      audit_updates,
      finding_alerts,
      compliance_reminders,
      team_mentions,
      weekly_digest,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO notification_preferences (user_id, email_notifications, push_notifications, audit_updates, finding_alerts, compliance_reminders, team_mentions, weekly_digest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         email_notifications = COALESCE($2, notification_preferences.email_notifications),
         push_notifications = COALESCE($3, notification_preferences.push_notifications),
         audit_updates = COALESCE($4, notification_preferences.audit_updates),
         finding_alerts = COALESCE($5, notification_preferences.finding_alerts),
         compliance_reminders = COALESCE($6, notification_preferences.compliance_reminders),
         team_mentions = COALESCE($7, notification_preferences.team_mentions),
         weekly_digest = COALESCE($8, notification_preferences.weekly_digest),
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, email_notifications, push_notifications, audit_updates, finding_alerts, compliance_reminders, team_mentions, weekly_digest]
    );

    res.json({ preferences: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
