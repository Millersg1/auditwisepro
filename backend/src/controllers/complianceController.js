import pool from '../config/database.js';

function orgScope(user, paramIndex = 1) {
  if (user.organization_id) {
    return { clause: `organization_id = $${paramIndex}`, value: user.organization_id };
  }
  return { clause: `created_by = $${paramIndex}`, value: user.id };
}

// GET /api/compliance/frameworks — list all frameworks
export async function listFrameworks(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM compliance_frameworks ORDER BY name ASC'
    );
    res.json({ frameworks: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/compliance — paginated compliance records with filters
export async function listRecords(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { framework_id, status, client_id, search, sort_by, sort_order } = req.query;

    const scope = orgScope(req.user, 1);
    const params = [scope.value];
    const conditions = [`cr.${scope.clause}`];
    let paramIdx = 2;

    if (framework_id) {
      conditions.push(`cr.framework_id = $${paramIdx}`);
      params.push(parseInt(framework_id));
      paramIdx++;
    }
    if (status) {
      conditions.push(`cr.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (client_id) {
      conditions.push(`cr.client_id = $${paramIdx}`);
      params.push(parseInt(client_id));
      paramIdx++;
    }
    if (search) {
      conditions.push(`(cr.title ILIKE $${paramIdx} OR cr.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const allowedSorts = ['title', 'status', 'due_date', 'created_at', 'updated_at'];
    const orderCol = allowedSorts.includes(sort_by) ? `cr.${sort_by}` : 'cr.created_at';
    const orderDir = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT cr.*, cf.name as framework_name, cf.version as framework_version,
                c.name as client_name
         FROM compliance_records cr
         LEFT JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         LEFT JOIN clients c ON cr.client_id = c.id
         WHERE ${whereClause}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM compliance_records cr WHERE ${whereClause}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      records: rows.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/compliance/:id — single compliance record with framework info
export async function getRecord(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `SELECT cr.*, cf.name as framework_name, cf.version as framework_version, cf.description as framework_description,
              c.name as client_name
       FROM compliance_records cr
       LEFT JOIN compliance_frameworks cf ON cr.framework_id = cf.id
       LEFT JOIN clients c ON cr.client_id = c.id
       WHERE cr.id = $1 AND cr.${scope.clause}`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/compliance — create a compliance record
export async function createRecord(req, res, next) {
  try {
    const { title, description, framework_id, client_id, status, control_ref, due_date, evidence, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Compliance record title is required' });
    }

    const result = await pool.query(
      `INSERT INTO compliance_records (title, description, framework_id, client_id, status, control_ref, due_date, evidence, notes, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        framework_id || null,
        client_id || null,
        status || 'not_started',
        control_ref || null,
        due_date || null,
        evidence || null,
        notes || null,
        req.user.organization_id || null,
        req.user.id,
      ]
    );

    res.status(201).json({ record: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/compliance/:id — update a compliance record
export async function updateRecord(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, framework_id, client_id, status, control_ref, due_date, evidence, notes } = req.body;
    const scope = orgScope(req.user, 11);

    const result = await pool.query(
      `UPDATE compliance_records SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        framework_id = COALESCE($3, framework_id),
        client_id = COALESCE($4, client_id),
        status = COALESCE($5, status),
        control_ref = COALESCE($6, control_ref),
        due_date = COALESCE($7, due_date),
        evidence = COALESCE($8, evidence),
        notes = COALESCE($9, notes),
        updated_at = NOW()
       WHERE id = $10 AND ${scope.clause}
       RETURNING *`,
      [title, description, framework_id, client_id, status, control_ref, due_date, evidence, notes, id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/compliance/:id
export async function deleteRecord(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `DELETE FROM compliance_records WHERE id = $1 AND ${scope.clause} RETURNING id`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ message: 'Compliance record deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/compliance/stats — aggregate stats
export async function getComplianceStats(req, res, next) {
  try {
    const scope = orgScope(req.user, 1);

    const [totalResult, frameworkResult, statusResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM compliance_records WHERE ${scope.clause}`, [scope.value]),
      pool.query(
        `SELECT cf.name as framework_name, cf.id as framework_id, COUNT(cr.id) as count
         FROM compliance_records cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         WHERE cr.${scope.clause}
         GROUP BY cf.id, cf.name
         ORDER BY count DESC`,
        [scope.value]
      ),
      pool.query(
        `SELECT status, COUNT(*) as count FROM compliance_records WHERE ${scope.clause} GROUP BY status ORDER BY count DESC`,
        [scope.value]
      ),
    ]);

    const total = parseInt(totalResult.rows[0].count);
    const compliantCount = statusResult.rows.find(r => r.status === 'compliant');
    const compliancePercentage = total > 0 && compliantCount
      ? Math.round((parseInt(compliantCount.count) / total) * 100)
      : 0;

    res.json({
      stats: {
        total,
        compliance_percentage: compliancePercentage,
        by_framework: frameworkResult.rows.map(r => ({
          framework_id: r.framework_id,
          framework_name: r.framework_name,
          count: parseInt(r.count),
        })),
        by_status: statusResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/compliance/dashboard — summary across all frameworks
export async function getComplianceDashboard(req, res, next) {
  try {
    const scope = orgScope(req.user, 1);

    const result = await pool.query(
      `SELECT
        cf.id as framework_id,
        cf.name as framework_name,
        cf.version as framework_version,
        COUNT(cr.id) as total_records,
        COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END) as compliant_count,
        COUNT(CASE WHEN cr.status = 'non_compliant' THEN 1 END) as non_compliant_count,
        COUNT(CASE WHEN cr.status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN cr.status = 'not_started' THEN 1 END) as not_started_count,
        CASE WHEN COUNT(cr.id) > 0
          THEN ROUND((COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END)::numeric / COUNT(cr.id)) * 100)
          ELSE 0
        END as compliance_percentage
       FROM compliance_frameworks cf
       LEFT JOIN compliance_records cr ON cf.id = cr.framework_id AND cr.${scope.clause}
       GROUP BY cf.id, cf.name, cf.version
       ORDER BY cf.name ASC`,
      [scope.value]
    );

    // Overall compliance across all frameworks
    const totalRecords = result.rows.reduce((sum, r) => sum + parseInt(r.total_records), 0);
    const totalCompliant = result.rows.reduce((sum, r) => sum + parseInt(r.compliant_count), 0);
    const overallPercentage = totalRecords > 0 ? Math.round((totalCompliant / totalRecords) * 100) : 0;

    res.json({
      dashboard: {
        overall_compliance_percentage: overallPercentage,
        total_records: totalRecords,
        total_compliant: totalCompliant,
        frameworks: result.rows.map(r => ({
          framework_id: r.framework_id,
          framework_name: r.framework_name,
          framework_version: r.framework_version,
          total_records: parseInt(r.total_records),
          compliant_count: parseInt(r.compliant_count),
          non_compliant_count: parseInt(r.non_compliant_count),
          in_progress_count: parseInt(r.in_progress_count),
          not_started_count: parseInt(r.not_started_count),
          compliance_percentage: parseInt(r.compliance_percentage),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
