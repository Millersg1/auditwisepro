import pool from '../config/database.js';

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.job_title, u.department, u.avatar_url, u.role, u.plan,
              u.email_verified, u.organization_id, u.created_at, u.updated_at
       FROM users u WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profileResult = await pool.query(
      'SELECT bio, timezone, language, theme FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    const profile = profileResult.rows.length > 0 ? profileResult.rows[0] : {};

    res.json({ user: { ...user, ...profile } });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, phone, job_title, department, avatar_url, bio, timezone, language, theme } = req.body;

    // Update user fields
    const userSets = [];
    const userParams = [];
    let idx = 1;

    if (name !== undefined) { userSets.push(`name = $${idx++}`); userParams.push(name); }
    if (phone !== undefined) { userSets.push(`phone = $${idx++}`); userParams.push(phone); }
    if (job_title !== undefined) { userSets.push(`job_title = $${idx++}`); userParams.push(job_title); }
    if (department !== undefined) { userSets.push(`department = $${idx++}`); userParams.push(department); }
    if (avatar_url !== undefined) { userSets.push(`avatar_url = $${idx++}`); userParams.push(avatar_url); }

    if (userSets.length > 0) {
      userSets.push('updated_at = NOW()');
      userParams.push(userId);
      await pool.query(
        `UPDATE users SET ${userSets.join(', ')} WHERE id = $${idx}`,
        userParams
      );
    }

    // Upsert profile fields
    const hasProfileFields = bio !== undefined || timezone !== undefined || language !== undefined || theme !== undefined;
    if (hasProfileFields) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, bio, timezone, language, theme)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           bio = COALESCE($2, user_profiles.bio),
           timezone = COALESCE($3, user_profiles.timezone),
           language = COALESCE($4, user_profiles.language),
           theme = COALESCE($5, user_profiles.theme),
           updated_at = NOW()`,
        [userId, bio, timezone, language, theme]
      );
    }

    // Return updated profile
    const updatedUser = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.job_title, u.department, u.avatar_url, u.role, u.plan,
              u.email_verified, u.organization_id, u.created_at, u.updated_at,
              up.bio, up.timezone, up.language, up.theme
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );

    res.json({ user: updatedUser.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT preferences FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );

    const defaults = {
      keyboard_shortcuts: true,
      compact_view: false,
      show_tooltips: true,
      default_dashboard: 'overview',
      items_per_page: 20,
    };

    if (result.rows.length === 0 || !result.rows[0].preferences) {
      return res.json({ preferences: defaults });
    }

    res.json({ preferences: { ...defaults, ...result.rows[0].preferences } });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Preferences object is required' });
    }

    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW()
       RETURNING preferences`,
      [req.user.id, JSON.stringify(preferences)]
    );

    res.json({ preferences: result.rows[0].preferences });
  } catch (err) {
    next(err);
  }
}

export async function getSessions(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, ip_address, user_agent, last_active_at, created_at
       FROM user_sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_active_at DESC`,
      [req.user.id]
    );

    res.json({ sessions: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function terminateSession(req, res, next) {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      'DELETE FROM user_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [sessionId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session terminated' });
  } catch (err) {
    next(err);
  }
}

export async function getSecurityLog(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM audit_logs WHERE user_id = $1 AND action IN ('login', 'logout', 'password_change', 'password_reset', 'email_verified', 'session_terminated', '2fa_enabled', '2fa_disabled')",
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, action, ip_address, user_agent, details, created_at
       FROM audit_logs
       WHERE user_id = $1 AND action IN ('login', 'logout', 'password_change', 'password_reset', 'email_verified', 'session_terminated', '2fa_enabled', '2fa_disabled')
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, safeLimit, offset]
    );

    res.json({
      events: result.rows,
      pagination: { page: parseInt(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
}
