import pool from '../config/database.js';

export async function listReports(req, res, next) {
  try {
    const userId = req.user.id;
    const orgId = req.user.organization_id;
    const { page = 1, limit = 20, type, audit_id, client_id } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const conditions = [];
    const params = [];
    let idx = 1;

    if (orgId) {
      conditions.push(`r.organization_id = $${idx++}`);
      params.push(orgId);
    } else {
      conditions.push(`r.created_by = $${idx++}`);
      params.push(userId);
    }

    if (type) {
      conditions.push(`r.type = $${idx++}`);
      params.push(type);
    }
    if (audit_id) {
      conditions.push(`r.audit_id = $${idx++}`);
      params.push(audit_id);
    }
    if (client_id) {
      conditions.push(`r.client_id = $${idx++}`);
      params.push(client_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM reports r ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(safeLimit, offset);
    const result = await pool.query(
      `SELECT r.*, u.name AS created_by_name
       FROM reports r
       LEFT JOIN users u ON r.created_by = u.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      reports: result.rows,
      pagination: { page: parseInt(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.organization_id;

    const result = await pool.query(
      `SELECT r.*, u.name AS created_by_name
       FROM reports r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];
    if (orgId && report.organization_id !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!orgId && report.created_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function generateReport(req, res, next) {
  try {
    const { type, audit_id, client_id } = req.body;
    const validTypes = ['audit_report', 'compliance_report', 'risk_report', 'executive_summary'];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }
    if (!audit_id && !client_id) {
      return res.status(400).json({ error: 'Either audit_id or client_id is required' });
    }

    const reportData = {};

    if (audit_id) {
      const auditResult = await pool.query('SELECT * FROM audits WHERE id = $1', [audit_id]);
      if (auditResult.rows.length === 0) {
        return res.status(404).json({ error: 'Audit not found' });
      }
      reportData.audit = auditResult.rows[0];

      const findingsResult = await pool.query(
        'SELECT * FROM audit_findings WHERE audit_id = $1 ORDER BY severity DESC',
        [audit_id]
      );
      reportData.findings = findingsResult.rows;

      const risksResult = await pool.query(
        'SELECT * FROM risk_assessments WHERE audit_id = $1 ORDER BY risk_score DESC',
        [audit_id]
      );
      reportData.risks = risksResult.rows;
    }

    if (client_id) {
      const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [client_id]);
      if (clientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      reportData.client = clientResult.rows[0];

      const auditsResult = await pool.query(
        'SELECT * FROM audits WHERE client_id = $1 ORDER BY created_at DESC',
        [client_id]
      );
      reportData.audits = auditsResult.rows;
    }

    if (type === 'compliance_report') {
      const complianceResult = await pool.query(
        `SELECT * FROM compliance_records WHERE ${audit_id ? 'audit_id = $1' : 'client_id = $1'} ORDER BY created_at DESC`,
        [audit_id || client_id]
      );
      reportData.compliance = complianceResult.rows;
    }

    reportData.generated_at = new Date().toISOString();
    reportData.type = type;

    const title = `${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - ${new Date().toLocaleDateString()}`;

    const result = await pool.query(
      `INSERT INTO reports (title, type, data, audit_id, client_id, created_by, organization_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
       RETURNING *`,
      [title, type, JSON.stringify(reportData), audit_id || null, client_id || null, req.user.id, req.user.organization_id || null]
    );

    res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteReport(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.organization_id;

    const check = await pool.query('SELECT id, created_by, organization_id FROM reports WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = check.rows[0];
    if (orgId && report.organization_id !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!orgId && report.created_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    next(err);
  }
}
