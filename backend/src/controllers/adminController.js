import pool from '../config/database.js';

export async function getStats(req, res, next) {
  try {
    const [usersCount, scansCount, recentUsers, planDistribution] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM scans'),
      pool.query('SELECT id, email, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10'),
      pool.query("SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC"),
    ]);

    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalScans: parseInt(scansCount.rows[0].count),
      recentUsers: recentUsers.rows,
      planDistribution: planDistribution.rows,
    });
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
