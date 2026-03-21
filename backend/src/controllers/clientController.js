import pool from '../config/database.js';

/**
 * Helper: returns the org-scoping WHERE clause and params.
 * If user has an organization_id, scope to that; otherwise scope to created_by.
 */
function orgScope(user, paramIndex = 1) {
  if (user.organization_id) {
    return { clause: `organization_id = $${paramIndex}`, value: user.organization_id };
  }
  return { clause: `created_by = $${paramIndex}`, value: user.id };
}

// GET /api/clients — paginated list with search, filter, sort
export async function listClients(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { search, status, sort_by, sort_order } = req.query;

    const scope = orgScope(req.user, 1);
    const params = [scope.value];
    const conditions = [scope.clause];
    let paramIdx = 2;

    if (search) {
      conditions.push(`(name ILIKE $${paramIdx} OR company ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status) {
      conditions.push(`status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const allowedSorts = ['name', 'company', 'status', 'created_at', 'updated_at'];
    const orderCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
    const orderDir = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM clients WHERE ${whereClause} ORDER BY ${orderCol} ${orderDir} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM clients WHERE ${whereClause}`,
        params
      ),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      clients: rows.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/clients/:id — single client with related counts
export async function getClient(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `SELECT * FROM clients WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const [auditsCount, risksCount, complianceCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM audits WHERE client_id = $1', [id]),
      pool.query('SELECT COUNT(*) FROM risk_assessments WHERE client_id = $1', [id]),
      pool.query('SELECT COUNT(*) FROM compliance_records WHERE client_id = $1', [id]),
    ]);

    res.json({
      client: {
        ...result.rows[0],
        audits_count: parseInt(auditsCount.rows[0].count),
        risks_count: parseInt(risksCount.rows[0].count),
        compliance_records_count: parseInt(complianceCount.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/clients — create a new client
export async function createClient(req, res, next) {
  try {
    const { name, company, email, phone, address, website, industry, status, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const result = await pool.query(
      `INSERT INTO clients (name, company, email, phone, address, website, industry, status, notes, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name.trim(),
        company || null,
        email || null,
        phone || null,
        address || null,
        website || null,
        industry || null,
        status || 'active',
        notes || null,
        req.user.organization_id || null,
        req.user.id,
      ]
    );

    res.status(201).json({ client: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/clients/:id — update a client
export async function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, website, industry, status, notes } = req.body;
    const scope = orgScope(req.user, 11);

    const result = await pool.query(
      `UPDATE clients SET
        name = COALESCE($1, name),
        company = COALESCE($2, company),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        website = COALESCE($6, website),
        industry = COALESCE($7, industry),
        status = COALESCE($8, status),
        notes = COALESCE($9, notes),
        updated_at = NOW()
       WHERE id = $10 AND ${scope.clause}
       RETURNING *`,
      [name, company, email, phone, address, website, industry, status, notes, id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/clients/:id — delete a client (soft-check for audits)
export async function deleteClient(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    // Verify ownership
    const client = await pool.query(
      `SELECT id FROM clients WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (client.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check for associated audits
    const audits = await pool.query('SELECT COUNT(*) FROM audits WHERE client_id = $1', [id]);
    if (parseInt(audits.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete client with associated audits. Remove or reassign audits first.',
      });
    }

    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/clients/stats — aggregate stats for dashboard
export async function getClientStats(req, res, next) {
  try {
    const scope = orgScope(req.user, 1);

    const [totalResult, statusResult, recentResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM clients WHERE ${scope.clause}`, [scope.value]),
      pool.query(
        `SELECT status, COUNT(*) as count FROM clients WHERE ${scope.clause} GROUP BY status ORDER BY count DESC`,
        [scope.value]
      ),
      pool.query(
        `SELECT COUNT(*) FROM clients WHERE ${scope.clause} AND created_at >= NOW() - INTERVAL '30 days'`,
        [scope.value]
      ),
    ]);

    res.json({
      stats: {
        total: parseInt(totalResult.rows[0].count),
        by_status: statusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
        new_last_30_days: parseInt(recentResult.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
}
