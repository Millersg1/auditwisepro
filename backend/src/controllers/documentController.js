import pool from '../config/database.js';

export async function listDocuments(req, res, next) {
  try {
    const userId = req.user.id;
    const orgId = req.user.organization_id;
    const { page = 1, limit = 20, category, client_id, audit_id, search } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const conditions = [];
    const params = [];
    let idx = 1;

    if (orgId) {
      conditions.push(`d.organization_id = $${idx++}`);
      params.push(orgId);
    } else {
      conditions.push(`d.uploaded_by = $${idx++}`);
      params.push(userId);
    }

    if (category) {
      conditions.push(`d.category = $${idx++}`);
      params.push(category);
    }
    if (client_id) {
      conditions.push(`d.client_id = $${idx++}`);
      params.push(client_id);
    }
    if (audit_id) {
      conditions.push(`d.audit_id = $${idx++}`);
      params.push(audit_id);
    }
    if (search) {
      conditions.push(`d.name ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM documents d ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(safeLimit, offset);
    const result = await pool.query(
      `SELECT d.*, u.name AS uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      documents: result.rows,
      pagination: { page: parseInt(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.organization_id;

    const result = await pool.query(
      `SELECT d.*, u.name AS uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    if (orgId && doc.organization_id !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!orgId && doc.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ document: doc });
  } catch (err) {
    next(err);
  }
}

export async function createDocument(req, res, next) {
  try {
    const { name, file_url, file_type, file_size, category, tags, client_id, audit_id } = req.body;

    if (!name || !file_url) {
      return res.status(400).json({ error: 'Name and file_url are required' });
    }

    const result = await pool.query(
      `INSERT INTO documents (name, file_url, file_type, file_size, category, tags, client_id, audit_id, uploaded_by, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, file_url, file_type || null, file_size || null, category || null, tags || null, client_id || null, audit_id || null, req.user.id, req.user.organization_id || null]
    );

    res.status(201).json({ document: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.organization_id;

    const check = await pool.query('SELECT id, uploaded_by, organization_id FROM documents WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = check.rows[0];
    if (orgId && doc.organization_id !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!orgId && doc.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentStats(req, res, next) {
  try {
    const userId = req.user.id;
    const orgId = req.user.organization_id;

    let condition, param;
    if (orgId) {
      condition = 'organization_id = $1';
      param = orgId;
    } else {
      condition = 'uploaded_by = $1';
      param = userId;
    }

    const result = await pool.query(
      `SELECT category, COUNT(*) AS count
       FROM documents
       WHERE ${condition}
       GROUP BY category
       ORDER BY count DESC`,
      [param]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM documents WHERE ${condition}`,
      [param]
    );

    res.json({
      stats: result.rows,
      total: parseInt(totalResult.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
}
