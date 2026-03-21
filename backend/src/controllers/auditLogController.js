import pool from '../config/database.js';

export async function logActivity(userId, orgId, action, entityType, entityId, details, req) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null;
    const userAgent = req ? (req.headers['user-agent'] || null) : null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, organization_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, orgId || null, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

export async function listLogs(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { page = 1, limit = 50, action, entity_type, user_id, start_date, end_date } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit)));

    const conditions = [];
    const params = [];
    let idx = 1;

    if (orgId) {
      conditions.push(`al.organization_id = $${idx++}`);
      params.push(orgId);
    } else {
      conditions.push(`al.user_id = $${idx++}`);
      params.push(req.user.id);
    }

    if (action) {
      conditions.push(`al.action = $${idx++}`);
      params.push(action);
    }
    if (entity_type) {
      conditions.push(`al.entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (user_id) {
      conditions.push(`al.user_id = $${idx++}`);
      params.push(user_id);
    }
    if (start_date) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(start_date);
    }
    if (end_date) {
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(end_date);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(safeLimit, offset);
    const result = await pool.query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      logs: result.rows,
      pagination: { page: parseInt(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getLogStats(req, res, next) {
  try {
    const orgId = req.user.organization_id;

    let condition, param;
    if (orgId) {
      condition = 'organization_id = $1';
      param = orgId;
    } else {
      condition = 'user_id = $1';
      param = req.user.id;
    }

    const result = await pool.query(
      `SELECT DATE(created_at) AS date, action, COUNT(*) AS count
       FROM audit_logs
       WHERE ${condition} AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at), action
       ORDER BY date DESC`,
      [param]
    );

    // Also get action totals
    const totals = await pool.query(
      `SELECT action, COUNT(*) AS count
       FROM audit_logs
       WHERE ${condition} AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY action
       ORDER BY count DESC`,
      [param]
    );

    res.json({
      daily: result.rows,
      totals: totals.rows,
    });
  } catch (err) {
    next(err);
  }
}
