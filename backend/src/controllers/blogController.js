import pool from '../config/database.js';

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function listPosts(req, res, next) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`bp.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`bp.title ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM blog_posts bp ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(safeLimit, offset);
    const result = await pool.query(
      `SELECT bp.*, u.name AS author_name
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       ${where}
       ORDER BY bp.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      posts: result.rows,
      pagination: { page: parseInt(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPost(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT bp.*, u.name AS author_name
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       WHERE bp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getPostBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT bp.*, u.name AS author_name
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       WHERE bp.slug = $1 AND bp.status = 'published'`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    await pool.query('UPDATE blog_posts SET views = COALESCE(views, 0) + 1 WHERE id = $1', [result.rows[0].id]);

    res.json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function createPost(req, res, next) {
  try {
    const { title, content, excerpt, tags, meta_title, meta_description, featured_image } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let slug = generateSlug(title);
    // Ensure unique slug
    const existing = await pool.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const result = await pool.query(
      `INSERT INTO blog_posts (title, slug, content, excerpt, tags, meta_title, meta_description, featured_image, author_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
       RETURNING *`,
      [title, slug, content, excerpt || null, tags || null, meta_title || null, meta_description || null, featured_image || null, req.user.id]
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updatePost(req, res, next) {
  try {
    const { id } = req.params;
    const { title, content, excerpt, tags, meta_title, meta_description, featured_image, status } = req.body;

    const check = await pool.query('SELECT id FROM blog_posts WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let slugUpdate = '';
    const params = [];
    let idx = 1;
    const sets = [];

    if (title !== undefined) {
      sets.push(`title = $${idx++}`);
      params.push(title);
      const slug = generateSlug(title);
      const existing = await pool.query('SELECT id FROM blog_posts WHERE slug = $1 AND id != $2', [slug, id]);
      const finalSlug = existing.rows.length > 0 ? `${slug}-${Date.now()}` : slug;
      sets.push(`slug = $${idx++}`);
      params.push(finalSlug);
    }
    if (content !== undefined) { sets.push(`content = $${idx++}`); params.push(content); }
    if (excerpt !== undefined) { sets.push(`excerpt = $${idx++}`); params.push(excerpt); }
    if (tags !== undefined) { sets.push(`tags = $${idx++}`); params.push(tags); }
    if (meta_title !== undefined) { sets.push(`meta_title = $${idx++}`); params.push(meta_title); }
    if (meta_description !== undefined) { sets.push(`meta_description = $${idx++}`); params.push(meta_description); }
    if (featured_image !== undefined) { sets.push(`featured_image = $${idx++}`); params.push(featured_image); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); params.push(status); }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    sets.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE blog_posts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req, res, next) {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM blog_posts WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
}

export async function publishPost(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE blog_posts SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function auditPostSEO(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.rows[0];
    const issues = [];
    let score = 100;

    // Title length check (30-60 chars ideal)
    if (!post.title) {
      issues.push({ type: 'error', field: 'title', message: 'Title is missing' });
      score -= 20;
    } else if (post.title.length < 30) {
      issues.push({ type: 'warning', field: 'title', message: 'Title is too short (under 30 characters)' });
      score -= 10;
    } else if (post.title.length > 60) {
      issues.push({ type: 'warning', field: 'title', message: 'Title is too long (over 60 characters)' });
      score -= 5;
    }

    // Meta description check (120-160 chars ideal)
    if (!post.meta_description) {
      issues.push({ type: 'error', field: 'meta_description', message: 'Meta description is missing' });
      score -= 15;
    } else if (post.meta_description.length < 120) {
      issues.push({ type: 'warning', field: 'meta_description', message: 'Meta description is too short (under 120 characters)' });
      score -= 5;
    } else if (post.meta_description.length > 160) {
      issues.push({ type: 'warning', field: 'meta_description', message: 'Meta description is too long (over 160 characters)' });
      score -= 5;
    }

    // Content length check (at least 300 words)
    const content = post.content || '';
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 300) {
      issues.push({ type: 'warning', field: 'content', message: `Content is too short (${wordCount} words, aim for 300+)` });
      score -= 10;
    }

    // Heading structure (check for h1, h2)
    const hasH1 = /<h1/i.test(content) || /^#\s/m.test(content);
    const hasH2 = /<h2/i.test(content) || /^##\s/m.test(content);
    if (!hasH1) {
      issues.push({ type: 'warning', field: 'headings', message: 'No H1 heading found in content' });
      score -= 10;
    }
    if (!hasH2) {
      issues.push({ type: 'info', field: 'headings', message: 'No H2 subheadings found - consider adding structure' });
      score -= 5;
    }

    // Image alt tags
    const images = content.match(/<img[^>]*>/gi) || [];
    const imagesWithoutAlt = images.filter(img => !/alt\s*=\s*["'][^"']+["']/i.test(img));
    if (imagesWithoutAlt.length > 0) {
      issues.push({ type: 'warning', field: 'images', message: `${imagesWithoutAlt.length} image(s) missing alt text` });
      score -= 5 * imagesWithoutAlt.length;
    }

    // Internal links check
    const links = content.match(/<a[^>]*href/gi) || [];
    if (links.length === 0) {
      issues.push({ type: 'info', field: 'links', message: 'No links found in content - consider adding internal links' });
      score -= 5;
    }

    // Featured image
    if (!post.featured_image) {
      issues.push({ type: 'info', field: 'featured_image', message: 'No featured image set' });
      score -= 5;
    }

    // Excerpt check
    if (!post.excerpt) {
      issues.push({ type: 'info', field: 'excerpt', message: 'No excerpt provided' });
      score -= 5;
    }

    score = Math.max(0, Math.min(100, score));

    await pool.query(
      'UPDATE blog_posts SET seo_score = $1, seo_issues = $2, updated_at = NOW() WHERE id = $3',
      [score, JSON.stringify(issues), id]
    );

    res.json({ seo_score: score, issues });
  } catch (err) {
    next(err);
  }
}

export async function generatePostAI(req, res, next) {
  try {
    const { topic, prompt } = req.body;

    if (!topic && !prompt) {
      return res.status(400).json({ error: 'A topic or prompt is required' });
    }

    const subject = topic || prompt;

    const title = `The Complete Guide to ${subject}`;
    const tags = [subject.toLowerCase().replace(/\s+/g, '-'), 'guide', 'best-practices'];

    const content = `# The Complete Guide to ${subject}

## Introduction

${subject} is a critical topic that every organization should understand. In this comprehensive guide, we explore the key aspects, best practices, and actionable strategies for ${subject.toLowerCase()}.

## Why ${subject} Matters

Understanding ${subject.toLowerCase()} is essential for maintaining organizational integrity and compliance. Organizations that prioritize this area see measurable improvements in their overall governance and risk management.

## Key Components

### 1. Assessment and Planning

Before implementing any changes, it is important to conduct a thorough assessment of your current state. This includes:

- Evaluating existing processes and controls
- Identifying gaps and areas for improvement
- Setting clear objectives and timelines
- Allocating appropriate resources

### 2. Implementation Best Practices

Successful implementation requires a structured approach:

- Start with a pilot program to test your approach
- Document all processes and procedures
- Provide comprehensive training to all stakeholders
- Establish clear roles and responsibilities

### 3. Monitoring and Continuous Improvement

Ongoing monitoring ensures sustained effectiveness:

- Regular audits and reviews
- Performance metrics and KPIs
- Feedback loops for continuous improvement
- Periodic reassessment of objectives

## Common Challenges

Organizations often face several challenges when working with ${subject.toLowerCase()}:

1. **Resource constraints** - Limited budget and personnel
2. **Resistance to change** - Organizational inertia
3. **Complexity** - Navigating regulatory requirements
4. **Technology gaps** - Outdated systems and tools

## Conclusion

${subject} is not a one-time effort but an ongoing commitment. By following the best practices outlined in this guide, organizations can build a robust framework that supports long-term success.

## Next Steps

Ready to take action? Start by assessing your current state and identifying your highest-priority areas for improvement.`;

    const excerpt = `A comprehensive guide to ${subject.toLowerCase()}, covering key components, best practices, common challenges, and actionable strategies for success.`;

    res.json({
      title,
      content,
      excerpt,
      tags,
    });
  } catch (err) {
    next(err);
  }
}
