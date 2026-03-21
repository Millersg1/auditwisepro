import pool from '../config/database.js';

export async function getOrganization(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function createOrganization(req, res, next) {
  try {
    const { name, industry, logo_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    if (req.user.organization_id) {
      return res.status(400).json({ error: 'You are already part of an organization' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orgResult = await client.query(
        `INSERT INTO organizations (name, industry, logo_url)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, industry || null, logo_url || null]
      );
      const org = orgResult.rows[0];

      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [org.id, req.user.id]
      );

      await client.query(
        'UPDATE users SET organization_id = $1, updated_at = NOW() WHERE id = $2',
        [org.id, req.user.id]
      );

      await client.query('COMMIT');
      res.status(201).json({ organization: org });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export async function updateOrganization(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const { name, industry, logo_url, settings } = req.body;

    const sets = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
    if (industry !== undefined) { sets.push(`industry = $${idx++}`); params.push(industry); }
    if (logo_url !== undefined) { sets.push(`logo_url = $${idx++}`); params.push(logo_url); }
    if (settings !== undefined) { sets.push(`settings = $${idx++}`); params.push(JSON.stringify(settings)); }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    sets.push('updated_at = NOW()');
    params.push(orgId);

    const result = await pool.query(
      `UPDATE organizations SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function listMembers(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const result = await pool.query(
      `SELECT om.id AS member_id, om.role, om.created_at AS joined_at,
              u.id AS user_id, u.email, u.name, u.avatar_url
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1
       ORDER BY om.created_at ASC`,
      [orgId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validRoles = ['admin', 'member', 'viewer'];
    const memberRole = validRoles.includes(role) ? role : 'member';

    // Check if user exists
    const userResult = await pool.query('SELECT id, organization_id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      // Create invitation record
      const inviteResult = await pool.query(
        `INSERT INTO organization_invites (organization_id, email, role, invited_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, email) DO UPDATE SET role = $3, updated_at = NOW()
         RETURNING *`,
        [orgId, email.toLowerCase(), memberRole, req.user.id]
      );
      return res.status(201).json({ message: 'Invitation sent', invite: inviteResult.rows[0] });
    }

    const targetUser = userResult.rows[0];
    if (targetUser.organization_id) {
      return res.status(400).json({ error: 'User is already part of an organization' });
    }

    // Check if already a member
    const existingMember = await pool.query(
      'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, targetUser.id]
    );
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this organization' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)',
        [orgId, targetUser.id, memberRole]
      );
      await client.query(
        'UPDATE users SET organization_id = $1, updated_at = NOW() WHERE id = $2',
        [orgId, targetUser.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({ message: 'Member added successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const { memberId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE organization_members SET role = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3 RETURNING *',
      [role, memberId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ member: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const { memberId } = req.params;

    const member = await pool.query(
      'SELECT user_id FROM organization_members WHERE id = $1 AND organization_id = $2',
      [memberId, orgId]
    );
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.rows[0].user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself from the organization' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM organization_members WHERE id = $1', [memberId]);
      await client.query(
        'UPDATE users SET organization_id = NULL, updated_at = NOW() WHERE id = $1',
        [member.rows[0].user_id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

export async function getSettings(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const result = await pool.query('SELECT settings FROM organizations WHERE id = $1', [orgId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ settings: result.rows[0].settings || {} });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(404).json({ error: 'No organization associated with your account' });
    }

    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const result = await pool.query(
      'UPDATE organizations SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING settings',
      [JSON.stringify(settings), orgId]
    );

    res.json({ settings: result.rows[0].settings });
  } catch (err) {
    next(err);
  }
}
