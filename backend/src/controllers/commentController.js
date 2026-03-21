import pool from '../config/database.js';

const VALID_ENTITY_TYPES = ['audit', 'finding', 'risk', 'compliance'];

export async function listComments(req, res, next) {
  try {
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: 'entity_type and entity_id are required' });
    }
    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({ error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
    }

    const result = await pool.query(
      `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = $1 AND c.entity_id = $2
       ORDER BY c.created_at ASC`,
      [entity_type, entity_id]
    );

    res.json({ comments: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function createComment(req, res, next) {
  try {
    const { entity_type, entity_id, content } = req.body;

    if (!entity_type || !entity_id || !content) {
      return res.status(400).json({ error: 'entity_type, entity_id, and content are required' });
    }
    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({ error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO comments (entity_type, entity_id, user_id, content, organization_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [entity_type, entity_id, req.user.id, content, req.user.organization_id || null]
    );

    // Fetch with author info
    const comment = await pool.query(
      `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ comment: comment.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateComment(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await pool.query(
      'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [content, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or you are not the author' });
    }

    res.json({ comment: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or you are not the author' });
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}
