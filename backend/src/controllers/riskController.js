import pool from '../config/database.js';

function orgScope(user, paramIndex = 1) {
  if (user.organization_id) {
    return { clause: `organization_id = $${paramIndex}`, value: user.organization_id };
  }
  return { clause: `created_by = $${paramIndex}`, value: user.id };
}

// GET /api/risks — paginated list with search and filters
export async function listRisks(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { search, category, status, client_id, audit_id, sort_by, sort_order } = req.query;

    const scope = orgScope(req.user, 1);
    const params = [scope.value];
    const conditions = [`r.${scope.clause}`];
    let paramIdx = 2;

    if (search) {
      conditions.push(`(r.title ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (category) {
      conditions.push(`r.category = $${paramIdx}`);
      params.push(category);
      paramIdx++;
    }
    if (status) {
      conditions.push(`r.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (client_id) {
      conditions.push(`r.client_id = $${paramIdx}`);
      params.push(parseInt(client_id));
      paramIdx++;
    }
    if (audit_id) {
      conditions.push(`r.audit_id = $${paramIdx}`);
      params.push(parseInt(audit_id));
      paramIdx++;
    }

    const allowedSorts = ['title', 'category', 'status', 'likelihood', 'impact', 'risk_score', 'created_at'];
    const orderCol = allowedSorts.includes(sort_by) ? `r.${sort_by}` : 'r.created_at';
    const orderDir = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT r.*, c.name as client_name, a.title as audit_title
         FROM risk_assessments r
         LEFT JOIN clients c ON r.client_id = c.id
         LEFT JOIN audits a ON r.audit_id = a.id
         WHERE ${whereClause}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM risk_assessments r WHERE ${whereClause}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      risks: rows.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/risks/:id — single risk with client and audit info
export async function getRisk(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `SELECT r.*, c.name as client_name, c.company as client_company,
              a.title as audit_title
       FROM risk_assessments r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN audits a ON r.audit_id = a.id
       WHERE r.id = $1 AND r.${scope.clause}`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    res.json({ risk: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/risks — create a risk assessment
export async function createRisk(req, res, next) {
  try {
    const { title, description, category, likelihood, impact, status, mitigation, client_id, audit_id, owner, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Risk title is required' });
    }

    const likelihoodVal = parseInt(likelihood);
    const impactVal = parseInt(impact);

    if (!likelihoodVal || likelihoodVal < 1 || likelihoodVal > 5) {
      return res.status(400).json({ error: 'Likelihood must be between 1 and 5' });
    }
    if (!impactVal || impactVal < 1 || impactVal > 5) {
      return res.status(400).json({ error: 'Impact must be between 1 and 5' });
    }

    const riskScore = likelihoodVal * impactVal;

    const result = await pool.query(
      `INSERT INTO risk_assessments (title, description, category, likelihood, impact, risk_score, status, mitigation, client_id, audit_id, owner, notes, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        category || null,
        likelihoodVal,
        impactVal,
        riskScore,
        status || 'identified',
        mitigation || null,
        client_id || null,
        audit_id || null,
        owner || null,
        notes || null,
        req.user.organization_id || null,
        req.user.id,
      ]
    );

    res.status(201).json({ risk: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/risks/:id — update a risk assessment
export async function updateRisk(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, category, likelihood, impact, status, mitigation, client_id, audit_id, owner, notes } = req.body;
    const scope = orgScope(req.user, 2);

    // Validate likelihood/impact if provided
    if (likelihood !== undefined) {
      const val = parseInt(likelihood);
      if (!val || val < 1 || val > 5) {
        return res.status(400).json({ error: 'Likelihood must be between 1 and 5' });
      }
    }
    if (impact !== undefined) {
      const val = parseInt(impact);
      if (!val || val < 1 || val > 5) {
        return res.status(400).json({ error: 'Impact must be between 1 and 5' });
      }
    }

    // Fetch current values to recalculate risk_score
    const current = await pool.query(
      `SELECT likelihood, impact FROM risk_assessments WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    const newLikelihood = likelihood !== undefined ? parseInt(likelihood) : current.rows[0].likelihood;
    const newImpact = impact !== undefined ? parseInt(impact) : current.rows[0].impact;
    const newRiskScore = newLikelihood * newImpact;

    const result = await pool.query(
      `UPDATE risk_assessments SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        likelihood = $4,
        impact = $5,
        risk_score = $6,
        status = COALESCE($7, status),
        mitigation = COALESCE($8, mitigation),
        client_id = COALESCE($9, client_id),
        audit_id = COALESCE($10, audit_id),
        owner = COALESCE($11, owner),
        notes = COALESCE($12, notes),
        updated_at = NOW()
       WHERE id = $13 AND ${orgScope(req.user, 14).clause}
       RETURNING *`,
      [title, description, category, newLikelihood, newImpact, newRiskScore, status, mitigation, client_id, audit_id, owner, notes, id, orgScope(req.user, 14).value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    res.json({ risk: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/risks/:id
export async function deleteRisk(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `DELETE FROM risk_assessments WHERE id = $1 AND ${scope.clause} RETURNING id`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk assessment not found' });
    }

    res.json({ message: 'Risk assessment deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/risks/stats — aggregate stats
export async function getRiskStats(req, res, next) {
  try {
    const scope = orgScope(req.user, 1);

    const [totalResult, categoryResult, levelResult, statusResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM risk_assessments WHERE ${scope.clause}`, [scope.value]),
      pool.query(
        `SELECT category, COUNT(*) as count FROM risk_assessments WHERE ${scope.clause} AND category IS NOT NULL GROUP BY category ORDER BY count DESC`,
        [scope.value]
      ),
      pool.query(
        `SELECT
           CASE
             WHEN risk_score >= 20 THEN 'critical'
             WHEN risk_score >= 12 THEN 'high'
             WHEN risk_score >= 6 THEN 'medium'
             ELSE 'low'
           END as risk_level,
           COUNT(*) as count
         FROM risk_assessments WHERE ${scope.clause}
         GROUP BY risk_level
         ORDER BY count DESC`,
        [scope.value]
      ),
      pool.query(
        `SELECT status, COUNT(*) as count FROM risk_assessments WHERE ${scope.clause} GROUP BY status ORDER BY count DESC`,
        [scope.value]
      ),
    ]);

    res.json({
      stats: {
        total: parseInt(totalResult.rows[0].count),
        by_category: categoryResult.rows.map(r => ({ category: r.category, count: parseInt(r.count) })),
        by_risk_level: levelResult.rows.map(r => ({ risk_level: r.risk_level, count: parseInt(r.count) })),
        by_status: statusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/risks/matrix — risk matrix visualization data (likelihood x impact)
export async function getRiskMatrix(req, res, next) {
  try {
    const scope = orgScope(req.user, 1);

    const result = await pool.query(
      `SELECT likelihood, impact, COUNT(*) as count,
              json_agg(json_build_object('id', id, 'title', title, 'status', status, 'category', category)) as risks
       FROM risk_assessments
       WHERE ${scope.clause}
       GROUP BY likelihood, impact
       ORDER BY likelihood, impact`,
      [scope.value]
    );

    // Build a 5x5 matrix
    const matrix = [];
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        const cell = result.rows.find(r => r.likelihood === l && r.impact === i);
        matrix.push({
          likelihood: l,
          impact: i,
          risk_score: l * i,
          count: cell ? parseInt(cell.count) : 0,
          risks: cell ? cell.risks : [],
        });
      }
    }

    res.json({ matrix });
  } catch (err) {
    next(err);
  }
}
