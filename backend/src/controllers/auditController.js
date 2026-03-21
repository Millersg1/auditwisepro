import pool from '../config/database.js';

function orgScope(user, paramIndex = 1) {
  if (user.organization_id) {
    return { clause: `organization_id = $${paramIndex}`, value: user.organization_id };
  }
  return { clause: `created_by = $${paramIndex}`, value: user.id };
}

// GET /api/audits — paginated list with search and filters
export async function listAudits(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { search, status, priority, assigned_to, client_id, sort_by, sort_order } = req.query;

    const scope = orgScope(req.user, 1);
    const params = [scope.value];
    const conditions = [`a.${scope.clause.replace('$1', '$1')}`];
    let paramIdx = 2;

    if (search) {
      conditions.push(`(a.title ILIKE $${paramIdx} OR a.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (status) {
      conditions.push(`a.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (priority) {
      conditions.push(`a.priority = $${paramIdx}`);
      params.push(priority);
      paramIdx++;
    }
    if (assigned_to) {
      conditions.push(`a.assigned_to = $${paramIdx}`);
      params.push(parseInt(assigned_to));
      paramIdx++;
    }
    if (client_id) {
      conditions.push(`a.client_id = $${paramIdx}`);
      params.push(parseInt(client_id));
      paramIdx++;
    }

    const allowedSorts = ['title', 'status', 'priority', 'due_date', 'created_at', 'updated_at'];
    const orderCol = allowedSorts.includes(sort_by) ? `a.${sort_by}` : 'a.created_at';
    const orderDir = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT a.*, c.name as client_name, u.name as assigned_to_name
         FROM audits a
         LEFT JOIN clients c ON a.client_id = c.id
         LEFT JOIN users u ON a.assigned_to = u.id
         WHERE ${whereClause}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM audits a WHERE ${whereClause}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      audits: rows.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/audits/:id — single audit with findings, client, template, assigned user
export async function getAudit(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `SELECT a.*, c.name as client_name, c.company as client_company,
              t.name as template_name, t.framework as template_framework,
              u.name as assigned_to_name, u.email as assigned_to_email
       FROM audits a
       LEFT JOIN clients c ON a.client_id = c.id
       LEFT JOIN audit_templates t ON a.template_id = t.id
       LEFT JOIN users u ON a.assigned_to = u.id
       WHERE a.id = $1 AND a.${scope.clause}`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const findings = await pool.query(
      `SELECT * FROM audit_findings WHERE audit_id = $1
       ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, created_at DESC`,
      [id]
    );

    res.json({
      audit: result.rows[0],
      findings: findings.rows,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/audits — create a new audit
export async function createAudit(req, res, next) {
  try {
    const { title, description, client_id, template_id, assigned_to, priority, due_date, status, scope: auditScope } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Audit title is required' });
    }

    const result = await pool.query(
      `INSERT INTO audits (title, description, client_id, template_id, assigned_to, priority, due_date, status, scope, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        client_id || null,
        template_id || null,
        assigned_to || null,
        priority || 'medium',
        due_date || null,
        status || 'planned',
        auditScope || null,
        req.user.organization_id || null,
        req.user.id,
      ]
    );

    res.status(201).json({ audit: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/audits/:id — update an audit
export async function updateAudit(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, client_id, template_id, assigned_to, priority, due_date, status, scope: auditScope } = req.body;
    const orgSc = orgScope(req.user, 11);

    const result = await pool.query(
      `UPDATE audits SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        client_id = COALESCE($3, client_id),
        template_id = COALESCE($4, template_id),
        assigned_to = COALESCE($5, assigned_to),
        priority = COALESCE($6, priority),
        due_date = COALESCE($7, due_date),
        status = COALESCE($8, status),
        scope = COALESCE($9, scope),
        updated_at = NOW()
       WHERE id = $10 AND ${orgSc.clause}
       RETURNING *`,
      [title, description, client_id, template_id, assigned_to, priority, due_date, status, auditScope, id, orgSc.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json({ audit: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/audits/:id
export async function deleteAudit(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `DELETE FROM audits WHERE id = $1 AND ${scope.clause} RETURNING id`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json({ message: 'Audit deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/audits/stats — aggregate stats
export async function getAuditStats(req, res, next) {
  try {
    const scope = orgScope(req.user, 1);

    const [totalResult, statusResult, priorityResult, recentResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM audits WHERE ${scope.clause}`, [scope.value]),
      pool.query(
        `SELECT status, COUNT(*) as count FROM audits WHERE ${scope.clause} GROUP BY status ORDER BY count DESC`,
        [scope.value]
      ),
      pool.query(
        `SELECT priority, COUNT(*) as count FROM audits WHERE ${scope.clause} GROUP BY priority ORDER BY count DESC`,
        [scope.value]
      ),
      pool.query(
        `SELECT COUNT(*) FROM audits WHERE ${scope.clause} AND created_at >= NOW() - INTERVAL '30 days'`,
        [scope.value]
      ),
    ]);

    res.json({
      stats: {
        total: parseInt(totalResult.rows[0].count),
        by_status: statusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
        by_priority: priorityResult.rows.map(r => ({ priority: r.priority, count: parseInt(r.count) })),
        new_last_30_days: parseInt(recentResult.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Findings ──────────────────────────────────────────────────────────────

// GET /api/audits/:id/findings — list findings for an audit
export async function listFindings(req, res, next) {
  try {
    const { id } = req.params;
    const { severity, status } = req.query;
    const scope = orgScope(req.user, 2);

    // Verify the audit belongs to the user/org
    const audit = await pool.query(
      `SELECT id FROM audits WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (audit.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const params = [id];
    const conditions = ['audit_id = $1'];
    let paramIdx = 2;

    if (severity) {
      conditions.push(`severity = $${paramIdx}`);
      params.push(severity);
      paramIdx++;
    }
    if (status) {
      conditions.push(`status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    const result = await pool.query(
      `SELECT * FROM audit_findings WHERE ${conditions.join(' AND ')}
       ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, created_at DESC`,
      params
    );

    res.json({ findings: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/audits/:id/findings — create a finding
export async function createFinding(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, severity, status, recommendation, evidence, category } = req.body;
    const scope = orgScope(req.user, 2);

    // Verify audit ownership
    const audit = await pool.query(
      `SELECT id FROM audits WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (audit.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Finding title is required' });
    }

    const result = await pool.query(
      `INSERT INTO audit_findings (audit_id, title, description, severity, status, recommendation, evidence, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        title.trim(),
        description || null,
        severity || 'medium',
        status || 'open',
        recommendation || null,
        evidence || null,
        category || null,
        req.user.id,
      ]
    );

    // Update findings_count on the audit
    await pool.query(
      'UPDATE audits SET findings_count = (SELECT COUNT(*) FROM audit_findings WHERE audit_id = $1), updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.status(201).json({ finding: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/audits/:id/findings/:findingId — update a finding
export async function updateFinding(req, res, next) {
  try {
    const { id, findingId } = req.params;
    const { title, description, severity, status, recommendation, evidence, category } = req.body;
    const scope = orgScope(req.user, 2);

    // Verify audit ownership
    const audit = await pool.query(
      `SELECT id FROM audits WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (audit.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const result = await pool.query(
      `UPDATE audit_findings SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        severity = COALESCE($3, severity),
        status = COALESCE($4, status),
        recommendation = COALESCE($5, recommendation),
        evidence = COALESCE($6, evidence),
        category = COALESCE($7, category),
        updated_at = NOW()
       WHERE id = $8 AND audit_id = $9
       RETURNING *`,
      [title, description, severity, status, recommendation, evidence, category, findingId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    res.json({ finding: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/audits/:id/findings/:findingId — delete a finding
export async function deleteFinding(req, res, next) {
  try {
    const { id, findingId } = req.params;
    const scope = orgScope(req.user, 2);

    // Verify audit ownership
    const audit = await pool.query(
      `SELECT id FROM audits WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (audit.rows.length === 0) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const result = await pool.query(
      'DELETE FROM audit_findings WHERE id = $1 AND audit_id = $2 RETURNING id',
      [findingId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    // Update findings_count
    await pool.query(
      'UPDATE audits SET findings_count = (SELECT COUNT(*) FROM audit_findings WHERE audit_id = $1), updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ message: 'Finding deleted successfully' });
  } catch (err) {
    next(err);
  }
}
