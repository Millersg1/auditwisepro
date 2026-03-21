import pool from '../config/database.js';

export async function getStats(req, res, next) {
  try {
    const orgId = req.user.organization_id;

    const queries = [
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM scans'),
      pool.query('SELECT id, email, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10'),
      pool.query("SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC"),
    ];

    // Add org-specific metrics if admin belongs to an org
    if (orgId) {
      queries.push(
        pool.query('SELECT COUNT(*) FROM users WHERE organization_id = $1', [orgId]),
        pool.query('SELECT COUNT(*) FROM audits WHERE organization_id = $1', [orgId]),
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE cr.status = 'compliant') as compliant,
            COUNT(*) as total
          FROM compliance_records cr
          WHERE cr.organization_id = $1
        `, [orgId]),
      );
    }

    const results = await Promise.all(queries);
    const [usersCount, scansCount, recentUsers, planDistribution] = results;

    const response = {
      totalUsers: parseInt(usersCount.rows[0].count),
      totalScans: parseInt(scansCount.rows[0].count),
      recentUsers: recentUsers.rows,
      planDistribution: planDistribution.rows,
    };

    if (orgId && results.length > 4) {
      const orgMembers = results[4];
      const orgAudits = results[5];
      const orgCompliance = results[6];
      const compliant = parseInt(orgCompliance.rows[0].compliant);
      const total = parseInt(orgCompliance.rows[0].total);

      response.organization = {
        memberCount: parseInt(orgMembers.rows[0].count),
        auditCount: parseInt(orgAudits.rows[0].count),
        compliancePercent: total > 0 ? parseFloat(((compliant / total) * 100).toFixed(1)) : 0,
      };
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = 'SELECT id, email, name, company, role, plan, scans_used, scans_limit, email_verified, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' WHERE email ILIKE $1 OR name ILIKE $1';
      countQuery += ' WHERE email ILIKE $1 OR name ILIKE $1';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

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

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { plan, scans_limit, role } = req.body;

    // Admins cannot set superadmin role
    if (role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot assign superadmin role' });
    }

    const result = await pool.query(
      `UPDATE users SET
        plan = COALESCE($1, plan),
        scans_limit = COALESCE($2, scans_limit),
        role = COALESCE($3, role),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, email, name, company, role, plan, scans_used, scans_limit, email_verified`,
      [plan || null, scans_limit != null ? scans_limit : null, role || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getOrgUsers(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'You are not part of an organization' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT u.id, u.email, u.name, u.company, u.role, u.plan, u.scans_used, u.scans_limit,
             u.email_verified, u.last_login_at, u.created_at,
             om.role as org_role, om.joined_at
      FROM users u
      LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = $1
      WHERE u.organization_id = $1
    `;
    let countQuery = 'SELECT COUNT(*) FROM users WHERE organization_id = $1';
    const params = [orgId];
    const countParams = [orgId];

    if (search) {
      query += ' AND (u.email ILIKE $2 OR u.name ILIKE $2)';
      countQuery += ' AND (email ILIKE $2 OR name ILIKE $2)';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

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

export async function updateOrgUser(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'You are not part of an organization' });
    }

    const { id } = req.params;
    const { role, plan, scans_limit } = req.body;

    // Admins cannot set superadmin role
    if (role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot assign superadmin role' });
    }

    // Verify the target user belongs to this org
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [id, orgId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your organization' });
    }

    const result = await pool.query(
      `UPDATE users SET
        role = COALESCE($1, role),
        plan = COALESCE($2::user_plan, plan),
        scans_limit = COALESCE($3, scans_limit),
        updated_at = NOW()
      WHERE id = $4 AND organization_id = $5
      RETURNING id, email, name, company, role, plan, scans_used, scans_limit, email_verified`,
      [role || null, plan || null, scans_limit != null ? scans_limit : null, id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your organization' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
