import pool from '../config/database.js';

function orgScope(user, paramIndex = 1) {
  if (user.organization_id) {
    return { clause: `organization_id = $${paramIndex}`, value: user.organization_id };
  }
  return { clause: `created_by = $${paramIndex}`, value: user.id };
}

// GET /api/templates — list all templates with search and filters
export async function listTemplates(req, res, next) {
  try {
    const { search, category, framework } = req.query;
    const scope = orgScope(req.user, 1);
    const params = [scope.value];
    const conditions = [scope.clause];
    let paramIdx = 2;

    if (search) {
      conditions.push(`(name ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (category) {
      conditions.push(`category = $${paramIdx}`);
      params.push(category);
      paramIdx++;
    }
    if (framework) {
      conditions.push(`framework = $${paramIdx}`);
      params.push(framework);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT * FROM audit_templates WHERE ${whereClause} ORDER BY name ASC`,
      params
    );

    res.json({ templates: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/templates/:id — single template
export async function getTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    const result = await pool.query(
      `SELECT * FROM audit_templates WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/templates — create a template
export async function createTemplate(req, res, next) {
  try {
    const { name, description, category, framework, checklist } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Validate checklist is valid JSON if provided
    let checklistJson = null;
    if (checklist) {
      if (typeof checklist === 'string') {
        try {
          checklistJson = JSON.parse(checklist);
        } catch {
          return res.status(400).json({ error: 'Checklist must be valid JSON' });
        }
      } else {
        checklistJson = checklist;
      }
    }

    const result = await pool.query(
      `INSERT INTO audit_templates (name, description, category, framework, checklist, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name.trim(),
        description || null,
        category || null,
        framework || null,
        checklistJson ? JSON.stringify(checklistJson) : null,
        req.user.organization_id || null,
        req.user.id,
      ]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/templates/:id — update a template
export async function updateTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, category, framework, checklist } = req.body;
    const scope = orgScope(req.user, 7);

    let checklistJson = undefined;
    if (checklist !== undefined) {
      if (typeof checklist === 'string') {
        try {
          checklistJson = JSON.parse(checklist);
        } catch {
          return res.status(400).json({ error: 'Checklist must be valid JSON' });
        }
      } else {
        checklistJson = checklist;
      }
    }

    const result = await pool.query(
      `UPDATE audit_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        framework = COALESCE($4, framework),
        checklist = COALESCE($5, checklist),
        updated_at = NOW()
       WHERE id = $6 AND ${scope.clause}
       RETURNING *`,
      [
        name,
        description,
        category,
        framework,
        checklistJson !== undefined ? JSON.stringify(checklistJson) : null,
        id,
        scope.value,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/templates/:id — delete a template (check not in use)
export async function deleteTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const scope = orgScope(req.user, 2);

    // Verify ownership
    const template = await pool.query(
      `SELECT id FROM audit_templates WHERE id = $1 AND ${scope.clause}`,
      [id, scope.value]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if template is in use by any audit
    const auditsUsing = await pool.query('SELECT COUNT(*) FROM audits WHERE template_id = $1', [id]);
    if (parseInt(auditsUsing.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete template that is in use by existing audits.',
      });
    }

    await pool.query('DELETE FROM audit_templates WHERE id = $1', [id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
}
