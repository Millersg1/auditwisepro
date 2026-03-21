import pool from '../config/database.js';
import { generateAccessToken } from '../utils/jwtUtils.js';
import os from 'os';

// ============================================================
// System Stats
// ============================================================
export async function getSystemStats(req, res, next) {
  try {
    const [
      usersCount,
      orgsCount,
      auditsCount,
      scansCount,
      revenueResult,
      usersByPlan,
      activeSubscriptions,
      newUsersDaily,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM organizations'),
      pool.query('SELECT COUNT(*) FROM audits'),
      pool.query('SELECT COUNT(*) FROM scans'),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM subscription_history WHERE action = 'payment'"),
      pool.query('SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC'),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'"),
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
    ]);

    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalOrganizations: parseInt(orgsCount.rows[0].count),
      totalAudits: parseInt(auditsCount.rows[0].count),
      totalScans: parseInt(scansCount.rows[0].count),
      totalRevenue: parseInt(revenueResult.rows[0].total),
      usersByPlan: usersByPlan.rows,
      activeSubscriptions: parseInt(activeSubscriptions.rows[0].count),
      newUsersLast30Days: newUsersDaily.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// All Users (paginated, searchable, filterable)
// ============================================================
export async function getAllUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const roleFilter = req.query.role || '';
    const planFilter = req.query.plan || '';
    const statusFilter = req.query.status || '';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (roleFilter) {
      conditions.push(`u.role = $${paramIdx}`);
      params.push(roleFilter);
      paramIdx++;
    }
    if (planFilter) {
      conditions.push(`u.plan = $${paramIdx}::user_plan`);
      params.push(planFilter);
      paramIdx++;
    }
    if (statusFilter === 'verified') {
      conditions.push('u.email_verified = true');
    } else if (statusFilter === 'unverified') {
      conditions.push('u.email_verified = false');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT u.id, u.email, u.name, u.company, u.role, u.plan, u.scans_used, u.scans_limit,
             u.email_verified, u.organization_id, u.last_login_at, u.created_at,
             o.name as organization_name,
             s.status as subscription_status, s.stripe_subscription_id
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
    const countParams = params.slice(0, params.length - 2);

    const [users, count] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(count.rows[0].count);

    res.json({
      users: users.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// User Detail
// ============================================================
export async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;

    const [userResult, audits, scans, subHistory, securityLog] = await Promise.all([
      pool.query(`
        SELECT u.*, o.name as organization_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.id = $1
      `, [id]),
      pool.query('SELECT id, title, status, priority, created_at FROM audits WHERE assigned_to = $1 OR created_by = $1 ORDER BY created_at DESC LIMIT 50', [id]),
      pool.query('SELECT id, url, status, overall_score, created_at FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
      pool.query('SELECT * FROM subscription_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
      pool.query('SELECT * FROM user_security_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    delete user.password_hash;
    delete user.verification_token;
    delete user.reset_token;
    delete user.reset_token_expires;
    delete user.two_factor_secret;

    res.json({
      user,
      audits: audits.rows,
      scans: scans.rows,
      subscriptionHistory: subHistory.rows,
      securityLog: securityLog.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Update User
// ============================================================
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, plan, scans_limit, email_verified, organization_id } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        role = COALESCE($1, role),
        plan = COALESCE($2::user_plan, plan),
        scans_limit = COALESCE($3, scans_limit),
        email_verified = COALESCE($4, email_verified),
        organization_id = COALESCE($5, organization_id),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, name, company, role, plan, scans_used, scans_limit, email_verified, organization_id`,
      [role || null, plan || null, scans_limit != null ? scans_limit : null, email_verified != null ? email_verified : null, organization_id != null ? organization_id : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Delete User
// ============================================================
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted', user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Impersonate User
// ============================================================
export async function impersonateUser(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateAccessToken(parseInt(id));

    res.json({
      token,
      user: result.rows[0],
      message: `Impersonating ${result.rows[0].email}`,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// All Organizations
// ============================================================
export async function getAllOrganizations(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [orgs, count] = await Promise.all([
      pool.query(`
        SELECT o.*,
          (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id) as member_count,
          (SELECT COUNT(*) FROM audits a WHERE a.organization_id = o.id) as audit_count
        FROM organizations o
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM organizations'),
    ]);

    const total = parseInt(count.rows[0].count);

    res.json({
      organizations: orgs.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Organization Detail
// ============================================================
export async function getOrganizationDetail(req, res, next) {
  try {
    const { id } = req.params;

    const [orgResult, members, audits, settings] = await Promise.all([
      pool.query('SELECT * FROM organizations WHERE id = $1', [id]),
      pool.query(`
        SELECT u.id, u.email, u.name, u.role, u.plan, om.role as org_role, om.joined_at
        FROM organization_members om
        JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = $1
        ORDER BY om.joined_at ASC
      `, [id]),
      pool.query('SELECT id, title, status, priority, created_at FROM audits WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
      pool.query('SELECT * FROM organization_settings WHERE organization_id = $1', [id]),
    ]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      organization: orgResult.rows[0],
      members: members.rows,
      audits: audits.rows,
      settings: settings.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Update Organization
// ============================================================
export async function updateOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const { name, industry, logo_url, settings } = req.body;

    const result = await pool.query(
      `UPDATE organizations SET
        name = COALESCE($1, name),
        industry = COALESCE($2, industry),
        logo_url = COALESCE($3, logo_url),
        settings = COALESCE($4, settings),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [name || null, industry || null, logo_url || null, settings ? JSON.stringify(settings) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Delete Organization
// ============================================================
export async function deleteOrganization(req, res, next) {
  try {
    const { id } = req.params;

    // Disassociate users from the org before deleting
    await pool.query('UPDATE users SET organization_id = NULL WHERE organization_id = $1', [id]);

    const result = await pool.query('DELETE FROM organizations WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ message: 'Organization deleted', organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// System Settings
// ============================================================
export async function getSystemSettings(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY key ASC');
    res.json({ settings: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function updateSystemSetting(req, res, next) {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Setting key is required' });
    }

    const result = await pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), req.user.id]
    );

    res.json({ setting: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Revenue Stats
// ============================================================
export async function getRevenueStats(req, res, next) {
  try {
    const [monthlyRevenue, revenueByPlan, activeCount, canceledCount] = await Promise.all([
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM subscription_history
        WHERE action = 'payment'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `),
      pool.query(`
        SELECT plan, SUM(amount) as revenue, COUNT(*) as count
        FROM subscription_history
        WHERE action = 'payment'
        GROUP BY plan
        ORDER BY revenue DESC
      `),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'canceled'"),
    ]);

    const active = parseInt(activeCount.rows[0].count);
    const canceled = parseInt(canceledCount.rows[0].count);
    const churnRate = (active + canceled) > 0 ? ((canceled / (active + canceled)) * 100).toFixed(2) : 0;

    // Calculate MRR from the latest month
    const mrr = monthlyRevenue.rows.length > 0 ? parseInt(monthlyRevenue.rows[0].revenue) : 0;

    res.json({
      monthlyRevenue: monthlyRevenue.rows,
      revenueByPlan: revenueByPlan.rows,
      mrr,
      churnRate: parseFloat(churnRate),
      activeSubscriptions: active,
      canceledSubscriptions: canceled,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Audit Log (system-wide activity)
// ============================================================
export async function getAuditLog(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const userFilter = req.query.user_id || '';
    const actionFilter = req.query.action || '';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (userFilter) {
      conditions.push(`al.user_id = $${paramIdx}`);
      params.push(parseInt(userFilter));
      paramIdx++;
    }
    if (actionFilter) {
      conditions.push(`al.action ILIKE $${paramIdx}`);
      params.push(`%${actionFilter}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT al.*, u.email as user_email, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM audit_logs al ${whereClause}`;
    const countParams = params.slice(0, params.length - 2);

    const [logs, count] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(count.rows[0].count);

    res.json({
      logs: logs.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Send Bulk Email (stub - logs and returns count)
// ============================================================
export async function sendBulkEmail(req, res, next) {
  try {
    const { subject, message, filter } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Build recipient query based on filter
    let query = 'SELECT COUNT(*) FROM users WHERE email_verified = true';
    const params = [];

    if (filter && filter.plan) {
      query += ' AND plan = $1::user_plan';
      params.push(filter.plan);
    }
    if (filter && filter.role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(filter.role);
    }

    const result = await pool.query(query, params);
    const recipientCount = parseInt(result.rows[0].count);

    // Log the bulk email action
    console.log(`[BULK EMAIL] Subject: "${subject}" | Recipients: ${recipientCount} | Filter: ${JSON.stringify(filter || 'all')} | Sent by: ${req.user.email}`);

    res.json({
      message: 'Bulk email queued',
      recipientCount,
      subject,
      filter: filter || 'all',
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Toggle Maintenance Mode
// ============================================================
export async function toggleMaintenance(req, res, next) {
  try {
    const { enabled } = req.body;
    const value = enabled === true || enabled === 'true';

    const result = await pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ('maintenance_mode', $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()
       RETURNING *`,
      [JSON.stringify(value), req.user.id]
    );

    res.json({
      maintenanceMode: value,
      setting: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Health Check
// ============================================================
export async function getHealthCheck(req, res, next) {
  try {
    // DB connection check
    let dbStatus = 'ok';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await pool.query('SELECT 1');
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Uptime
    const uptimeSeconds = process.uptime();

    res.json({
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      process: {
        uptimeSeconds: Math.floor(uptimeSeconds),
        uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
        memoryUsage: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        },
        nodeVersion: process.version,
        pid: process.pid,
      },
      system: {
        totalMemory: `${Math.round(totalMem / 1024 / 1024)}MB`,
        freeMemory: `${Math.round(freeMem / 1024 / 1024)}MB`,
        memoryUsagePercent: ((1 - freeMem / totalMem) * 100).toFixed(1),
        cpus: os.cpus().length,
        platform: os.platform(),
        hostname: os.hostname(),
      },
    });
  } catch (err) {
    next(err);
  }
}
