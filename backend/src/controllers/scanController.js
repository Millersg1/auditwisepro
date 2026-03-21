import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/database.js';
import { sendScanCompleteEmail } from '../utils/emailUtils.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

const PLAN_LIMITS = { free: 5, starter: 50, pro: 200, agency: 1000 };

// ─── Route handlers ─────────────────────────────────────────────────────────

export async function createScan(req, res, next) {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    url = normalizeUrl(url.trim());
    if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL format' });

    let userId = null;
    if (req.user) {
      userId = req.user.id;
      const limit = PLAN_LIMITS[req.user.plan] || 5;
      if (req.user.scans_used >= limit) {
        return res.status(403).json({ error: 'Scan limit reached. Upgrade your plan for more scans.' });
      }
    }

    const result = await pool.query(
      'INSERT INTO scans (user_id, url, status) VALUES ($1, $2, $3) RETURNING id, url, status, created_at',
      [userId, url, 'pending']
    );
    const scan = result.rows[0];

    if (userId) {
      await pool.query('UPDATE users SET scans_used = scans_used + 1, updated_at = NOW() WHERE id = $1', [userId]);
    }

    // Fire-and-forget async scan
    runScan(scan.id, url, userId).catch(err => console.error(`Scan ${scan.id} failed:`, err));

    res.status(201).json({ scan });
  } catch (err) {
    next(err);
  }
}

export async function getScan(req, res, next) {
  try {
    const { id } = req.params;
    const scan = await pool.query('SELECT * FROM scans WHERE id = $1', [id]);
    if (scan.rows.length === 0) return res.status(404).json({ error: 'Scan not found' });

    const row = scan.rows[0];
    if (row.user_id && (!req.user || req.user.id !== row.user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const issues = await pool.query('SELECT * FROM scan_issues WHERE scan_id = $1 ORDER BY CASE severity WHEN \'critical\' THEN 1 WHEN \'warning\' THEN 2 WHEN \'info\' THEN 3 WHEN \'pass\' THEN 4 END', [id]);

    res.json({ scan: row, issues: issues.rows });
  } catch (err) {
    next(err);
  }
}

export async function getUserScans(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [scans, countResult] = await Promise.all([
      pool.query(
        'SELECT id, url, status, overall_score, seo_score, security_score, performance_score, accessibility_score, created_at, completed_at FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [req.user.id, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM scans WHERE user_id = $1', [req.user.id]),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      scans: scans.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPublicScan(req, res, next) {
  try {
    const { id } = req.params;
    const scan = await pool.query(
      'SELECT id, url, status, overall_score, seo_score, security_score, performance_score, accessibility_score, created_at, completed_at FROM scans WHERE id = $1',
      [id]
    );
    if (scan.rows.length === 0) return res.status(404).json({ error: 'Scan not found' });

    // Public view: limited issues (only critical + warning, no recommendations)
    const issues = await pool.query(
      "SELECT id, category, severity, title, description FROM scan_issues WHERE scan_id = $1 AND severity IN ('critical','warning') ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 END",
      [id]
    );

    res.json({ scan: scan.rows[0], issues: issues.rows });
  } catch (err) {
    next(err);
  }
}

export async function deleteScan(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM scans WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Scan not found or access denied' });
    res.json({ message: 'Scan deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Core Scan Engine ───────────────────────────────────────────────────────

async function runScan(scanId, url, userId) {
  try {
    await pool.query("UPDATE scans SET status = 'running' WHERE id = $1", [scanId]);

    // Fetch the page
    let html, response, fetchError;
    try {
      response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'AuditWisePro/1.0 (Website Auditor)' },
        validateStatus: () => true,
      });
      html = response.data;
    } catch (err) {
      fetchError = err.message;
    }

    if (fetchError || typeof html !== 'string') {
      await pool.query(
        "UPDATE scans SET status = 'failed', results = $1, completed_at = NOW() WHERE id = $2",
        [JSON.stringify({ error: fetchError || 'Failed to fetch page content' }), scanId]
      );
      return;
    }

    const $ = cheerio.load(html);
    const headers = response.headers;
    const issues = [];

    // ── SEO Checks ──────────────────────────────────────────────────────
    // Title
    const title = $('title').first().text().trim();
    if (!title) {
      issues.push({ category: 'seo', severity: 'critical', title: 'Missing Page Title', description: 'The page does not have a <title> tag.', recommendation: 'Add a descriptive <title> tag between 50-60 characters.' });
    } else if (title.length < 30) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Page Title Too Short', description: `Title is ${title.length} characters ("${title}").`, recommendation: 'Aim for 50-60 characters for optimal SEO.' });
    } else if (title.length > 70) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Page Title Too Long', description: `Title is ${title.length} characters and may be truncated in search results.`, recommendation: 'Keep the title under 60 characters.' });
    } else {
      issues.push({ category: 'seo', severity: 'pass', title: 'Page Title Present', description: `Title is ${title.length} characters: "${title}".`, recommendation: '' });
    }

    // Meta description
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    if (!metaDesc) {
      issues.push({ category: 'seo', severity: 'critical', title: 'Missing Meta Description', description: 'No meta description tag found.', recommendation: 'Add a meta description between 150-160 characters summarizing the page.' });
    } else if (metaDesc.length < 70) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Meta Description Too Short', description: `Meta description is ${metaDesc.length} characters.`, recommendation: 'Aim for 150-160 characters for best results.' });
    } else if (metaDesc.length > 170) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Meta Description Too Long', description: `Meta description is ${metaDesc.length} characters and may be truncated.`, recommendation: 'Keep the description under 160 characters.' });
    } else {
      issues.push({ category: 'seo', severity: 'pass', title: 'Meta Description Present', description: `Meta description is ${metaDesc.length} characters.`, recommendation: '' });
    }

    // H1
    const h1s = $('h1');
    if (h1s.length === 0) {
      issues.push({ category: 'seo', severity: 'critical', title: 'Missing H1 Tag', description: 'No H1 heading found on the page.', recommendation: 'Add a single, descriptive H1 tag to define the main topic of the page.' });
    } else if (h1s.length > 1) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Multiple H1 Tags', description: `Found ${h1s.length} H1 tags. Best practice is to have exactly one.`, recommendation: 'Use a single H1 tag and use H2-H6 for subheadings.' });
    } else {
      issues.push({ category: 'seo', severity: 'pass', title: 'H1 Tag Present', description: `H1: "${h1s.first().text().trim().substring(0, 80)}".`, recommendation: '' });
    }

    // Image alt tags
    const images = $('img');
    const imagesWithoutAlt = images.filter((_, el) => !$(el).attr('alt')).length;
    if (images.length === 0) {
      issues.push({ category: 'seo', severity: 'info', title: 'No Images Found', description: 'The page has no images.', recommendation: 'Consider adding relevant images to improve engagement.' });
    } else if (imagesWithoutAlt > 0) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Images Missing Alt Text', description: `${imagesWithoutAlt} of ${images.length} images are missing alt attributes.`, recommendation: 'Add descriptive alt text to all images for SEO and accessibility.' });
    } else {
      issues.push({ category: 'seo', severity: 'pass', title: 'All Images Have Alt Text', description: `All ${images.length} images have alt attributes.`, recommendation: '' });
    }

    // Canonical
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Missing Canonical Tag', description: 'No canonical link tag found.', recommendation: 'Add <link rel="canonical"> to prevent duplicate content issues.' });
    } else {
      issues.push({ category: 'seo', severity: 'pass', title: 'Canonical Tag Present', description: `Canonical URL: ${canonical}`, recommendation: '' });
    }

    // Robots.txt
    try {
      const parsedUrl = new URL(url);
      const robotsRes = await axios.get(`${parsedUrl.origin}/robots.txt`, { timeout: 5000, validateStatus: () => true });
      if (robotsRes.status === 200) {
        issues.push({ category: 'seo', severity: 'pass', title: 'Robots.txt Found', description: 'The site has a robots.txt file.', recommendation: '' });
      } else {
        issues.push({ category: 'seo', severity: 'warning', title: 'Missing Robots.txt', description: 'No robots.txt file found.', recommendation: 'Create a robots.txt to guide search engine crawlers.' });
      }
    } catch {
      issues.push({ category: 'seo', severity: 'warning', title: 'Robots.txt Inaccessible', description: 'Could not access robots.txt.', recommendation: 'Ensure robots.txt is accessible at the site root.' });
    }

    // Sitemap
    try {
      const parsedUrl = new URL(url);
      const sitemapRes = await axios.get(`${parsedUrl.origin}/sitemap.xml`, { timeout: 5000, validateStatus: () => true });
      if (sitemapRes.status === 200 && typeof sitemapRes.data === 'string' && sitemapRes.data.includes('<urlset')) {
        issues.push({ category: 'seo', severity: 'pass', title: 'Sitemap.xml Found', description: 'The site has an XML sitemap.', recommendation: '' });
      } else {
        issues.push({ category: 'seo', severity: 'warning', title: 'Missing Sitemap.xml', description: 'No valid XML sitemap found.', recommendation: 'Create a sitemap.xml to help search engines discover all pages.' });
      }
    } catch {
      issues.push({ category: 'seo', severity: 'warning', title: 'Sitemap.xml Inaccessible', description: 'Could not access sitemap.xml.', recommendation: 'Create and submit an XML sitemap.' });
    }

    // Open Graph
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (!ogTitle && !ogDesc && !ogImage) {
      issues.push({ category: 'seo', severity: 'warning', title: 'Missing Open Graph Tags', description: 'No Open Graph meta tags found.', recommendation: 'Add og:title, og:description, and og:image for better social media sharing.' });
    } else if (!ogTitle || !ogDesc || !ogImage) {
      issues.push({ category: 'seo', severity: 'info', title: 'Incomplete Open Graph Tags', description: 'Some Open Graph tags are missing.', recommendation: 'Ensure og:title, og:description, and og:image are all present.' });
    } else {
      issues.push({ category: 'seo', severity: 'pass', title: 'Open Graph Tags Present', description: 'Open Graph tags are properly configured.', recommendation: '' });
    }

    // Structured data
    const jsonLd = $('script[type="application/ld+json"]');
    if (jsonLd.length > 0) {
      issues.push({ category: 'seo', severity: 'pass', title: 'Structured Data Found', description: `Found ${jsonLd.length} JSON-LD structured data block(s).`, recommendation: '' });
    } else {
      issues.push({ category: 'seo', severity: 'info', title: 'No Structured Data', description: 'No JSON-LD structured data found.', recommendation: 'Add structured data (Schema.org) to improve rich snippet eligibility.' });
    }

    // Internal / External links
    const links = $('a[href]');
    let internalLinks = 0, externalLinks = 0;
    const parsedOrigin = new URL(url).origin;
    links.each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.origin === parsedOrigin) internalLinks++;
        else externalLinks++;
      } catch { /* skip invalid */ }
    });
    issues.push({ category: 'seo', severity: 'info', title: 'Link Analysis', description: `Found ${internalLinks} internal and ${externalLinks} external links.`, recommendation: internalLinks < 3 ? 'Consider adding more internal links to improve site navigation.' : '' });

    // ── Security Checks ─────────────────────────────────────────────────
    // SSL
    const isHttps = url.startsWith('https://');
    if (isHttps) {
      issues.push({ category: 'security', severity: 'pass', title: 'SSL/HTTPS Enabled', description: 'The site is served over HTTPS.', recommendation: '' });
    } else {
      issues.push({ category: 'security', severity: 'critical', title: 'No HTTPS', description: 'The site is not served over HTTPS.', recommendation: 'Install an SSL certificate and redirect HTTP to HTTPS.' });
    }

    // HTTP to HTTPS redirect
    if (isHttps) {
      try {
        const httpUrl = url.replace('https://', 'http://');
        const redirectRes = await axios.get(httpUrl, { timeout: 5000, maxRedirects: 0, validateStatus: () => true });
        if ([301, 302, 307, 308].includes(redirectRes.status) && redirectRes.headers.location?.startsWith('https')) {
          issues.push({ category: 'security', severity: 'pass', title: 'HTTP to HTTPS Redirect', description: 'HTTP requests redirect to HTTPS.', recommendation: '' });
        } else {
          issues.push({ category: 'security', severity: 'warning', title: 'No HTTP to HTTPS Redirect', description: 'HTTP requests do not redirect to HTTPS.', recommendation: 'Configure your server to redirect all HTTP traffic to HTTPS.' });
        }
      } catch {
        issues.push({ category: 'security', severity: 'info', title: 'HTTP Redirect Check Inconclusive', description: 'Could not test HTTP to HTTPS redirect.', recommendation: '' });
      }
    }

    // Security headers
    const securityHeaders = {
      'x-frame-options': { name: 'X-Frame-Options', severity: 'warning', rec: 'Add X-Frame-Options header (DENY or SAMEORIGIN) to prevent clickjacking.' },
      'x-content-type-options': { name: 'X-Content-Type-Options', severity: 'warning', rec: 'Add X-Content-Type-Options: nosniff to prevent MIME-type sniffing.' },
      'strict-transport-security': { name: 'Strict-Transport-Security', severity: 'warning', rec: 'Add HSTS header to enforce HTTPS (e.g., max-age=31536000; includeSubDomains).' },
      'content-security-policy': { name: 'Content-Security-Policy', severity: 'warning', rec: 'Add a Content-Security-Policy to mitigate XSS and data injection attacks.' },
      'x-xss-protection': { name: 'X-XSS-Protection', severity: 'info', rec: 'Add X-XSS-Protection: 1; mode=block (though modern CSP is preferred).' },
      'referrer-policy': { name: 'Referrer-Policy', severity: 'info', rec: 'Add a Referrer-Policy header to control referrer information.' },
      'permissions-policy': { name: 'Permissions-Policy', severity: 'info', rec: 'Add a Permissions-Policy header to control browser features.' },
    };

    for (const [header, config] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        issues.push({ category: 'security', severity: 'pass', title: `${config.name} Present`, description: `${config.name}: ${headers[header]}`, recommendation: '' });
      } else {
        issues.push({ category: 'security', severity: config.severity, title: `Missing ${config.name}`, description: `The ${config.name} header is not set.`, recommendation: config.rec });
      }
    }

    // Mixed content
    if (isHttps) {
      let mixedCount = 0;
      $('script[src], link[href], img[src], iframe[src], video[src], audio[src], source[src]').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('href');
        if (src && src.startsWith('http://')) mixedCount++;
      });
      if (mixedCount > 0) {
        issues.push({ category: 'security', severity: 'critical', title: 'Mixed Content Detected', description: `Found ${mixedCount} resource(s) loaded over HTTP on an HTTPS page.`, recommendation: 'Update all resource URLs to use HTTPS.' });
      } else {
        issues.push({ category: 'security', severity: 'pass', title: 'No Mixed Content', description: 'All resources are loaded over HTTPS.', recommendation: '' });
      }
    }

    // Server header exposure
    const serverHeader = headers['server'];
    if (serverHeader) {
      issues.push({ category: 'security', severity: 'info', title: 'Server Header Exposed', description: `Server header reveals: "${serverHeader}".`, recommendation: 'Consider removing or obscuring the Server header to reduce information leakage.' });
    } else {
      issues.push({ category: 'security', severity: 'pass', title: 'Server Header Hidden', description: 'Server header is not exposed.', recommendation: '' });
    }

    // ── Performance Checks ──────────────────────────────────────────────
    // Page size
    const pageSize = Buffer.byteLength(html, 'utf8');
    const pageSizeKB = Math.round(pageSize / 1024);
    if (pageSizeKB > 500) {
      issues.push({ category: 'performance', severity: 'critical', title: 'Large Page Size', description: `HTML document is ${pageSizeKB}KB.`, recommendation: 'Reduce HTML size by removing unnecessary code, inline styles, or comments.' });
    } else if (pageSizeKB > 200) {
      issues.push({ category: 'performance', severity: 'warning', title: 'Moderate Page Size', description: `HTML document is ${pageSizeKB}KB.`, recommendation: 'Consider optimizing the HTML to reduce payload.' });
    } else {
      issues.push({ category: 'performance', severity: 'pass', title: 'Page Size OK', description: `HTML document is ${pageSizeKB}KB.`, recommendation: '' });
    }

    // External resources count
    const scripts = $('script[src]').length;
    const stylesheets = $('link[rel="stylesheet"]').length;
    const totalExternal = scripts + stylesheets + images.length;
    if (totalExternal > 50) {
      issues.push({ category: 'performance', severity: 'warning', title: 'High Resource Count', description: `Page references ${totalExternal} external resources (${scripts} scripts, ${stylesheets} stylesheets, ${images.length} images).`, recommendation: 'Combine and minimize external requests. Use lazy loading for images.' });
    } else {
      issues.push({ category: 'performance', severity: 'pass', title: 'Resource Count OK', description: `Page references ${totalExternal} external resources.`, recommendation: '' });
    }

    // Image optimization hints
    const largeImageFormats = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (/\.(bmp|tiff?)$/i.test(src)) largeImageFormats.push(src);
    });
    if (largeImageFormats.length > 0) {
      issues.push({ category: 'performance', severity: 'warning', title: 'Unoptimized Image Formats', description: `Found ${largeImageFormats.length} images in unoptimized formats (BMP/TIFF).`, recommendation: 'Convert images to modern formats like WebP or AVIF.' });
    } else if (images.length > 0) {
      const hasModern = $('img[src*=".webp"], img[src*=".avif"], picture source[type*="webp"], picture source[type*="avif"]').length > 0;
      if (hasModern) {
        issues.push({ category: 'performance', severity: 'pass', title: 'Modern Image Formats Used', description: 'Site uses modern image formats (WebP/AVIF).', recommendation: '' });
      } else {
        issues.push({ category: 'performance', severity: 'info', title: 'Consider Modern Image Formats', description: 'No WebP or AVIF images detected.', recommendation: 'Consider using WebP or AVIF for better compression.' });
      }
    }

    // Minification hints
    const inlineStyles = $('style').text();
    const inlineScripts = $('script:not([src])').text();
    const hasExcessWhitespace = (str) => str.length > 500 && (str.match(/\n\s*\n/g)?.length || 0) > 5;
    if (hasExcessWhitespace(inlineStyles)) {
      issues.push({ category: 'performance', severity: 'warning', title: 'Unminified Inline CSS', description: 'Inline CSS appears to be unminified.', recommendation: 'Minify inline CSS to reduce page size.' });
    }
    if (hasExcessWhitespace(inlineScripts)) {
      issues.push({ category: 'performance', severity: 'warning', title: 'Unminified Inline JavaScript', description: 'Inline JavaScript appears to be unminified.', recommendation: 'Minify inline JavaScript to reduce page size.' });
    }

    // Compression
    const contentEncoding = headers['content-encoding'];
    if (contentEncoding && /gzip|br|deflate/i.test(contentEncoding)) {
      issues.push({ category: 'performance', severity: 'pass', title: 'Compression Enabled', description: `Content-Encoding: ${contentEncoding}`, recommendation: '' });
    } else {
      issues.push({ category: 'performance', severity: 'warning', title: 'No Compression Detected', description: 'Response does not appear to be gzip or brotli compressed.', recommendation: 'Enable gzip or brotli compression on your server.' });
    }

    // Cache headers
    const cacheControl = headers['cache-control'];
    if (cacheControl && !cacheControl.includes('no-store')) {
      issues.push({ category: 'performance', severity: 'pass', title: 'Cache Headers Present', description: `Cache-Control: ${cacheControl}`, recommendation: '' });
    } else {
      issues.push({ category: 'performance', severity: 'warning', title: 'Missing Cache Headers', description: 'No effective caching headers found.', recommendation: 'Set Cache-Control headers to enable browser caching for static assets.' });
    }

    // Render-blocking resources
    const renderBlocking = $('link[rel="stylesheet"]:not([media="print"]):not([rel="preload"])').length
      + $('script[src]:not([async]):not([defer]):not([type="module"])').length;
    if (renderBlocking > 5) {
      issues.push({ category: 'performance', severity: 'warning', title: 'Render-Blocking Resources', description: `Found ${renderBlocking} potentially render-blocking resources.`, recommendation: 'Use async/defer for scripts and preload critical CSS.' });
    } else if (renderBlocking > 0) {
      issues.push({ category: 'performance', severity: 'info', title: 'Some Render-Blocking Resources', description: `Found ${renderBlocking} potentially render-blocking resource(s).`, recommendation: 'Consider using async/defer for non-critical scripts.' });
    } else {
      issues.push({ category: 'performance', severity: 'pass', title: 'No Render-Blocking Resources', description: 'No render-blocking resources detected.', recommendation: '' });
    }

    // ── Accessibility Checks ────────────────────────────────────────────
    // Lang attribute
    const lang = $('html').attr('lang');
    if (!lang) {
      issues.push({ category: 'accessibility', severity: 'critical', title: 'Missing Lang Attribute', description: 'The <html> element does not have a lang attribute.', recommendation: 'Add lang="en" (or appropriate language) to the <html> tag.' });
    } else {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'Lang Attribute Present', description: `Language set to "${lang}".`, recommendation: '' });
    }

    // Viewport
    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport) {
      issues.push({ category: 'accessibility', severity: 'critical', title: 'Missing Viewport Meta Tag', description: 'No viewport meta tag found.', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for responsive design.' });
    } else {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'Viewport Meta Tag Present', description: `Viewport: ${viewport}`, recommendation: '' });
    }

    // Image alt (accessibility perspective)
    if (imagesWithoutAlt > 0) {
      issues.push({ category: 'accessibility', severity: 'critical', title: 'Images Missing Alt Text (A11y)', description: `${imagesWithoutAlt} image(s) lack alt attributes, making them inaccessible to screen readers.`, recommendation: 'Provide descriptive alt text for all meaningful images. Use alt="" for decorative images.' });
    } else if (images.length > 0) {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'Image Alt Text Complete', description: 'All images have alt attributes.', recommendation: '' });
    }

    // Form labels
    const inputs = $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
    let unlabeledInputs = 0;
    inputs.each((_, el) => {
      const id = $(el).attr('id');
      const ariaLabel = $(el).attr('aria-label') || $(el).attr('aria-labelledby');
      const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
      if (!ariaLabel && !hasLabel) unlabeledInputs++;
    });
    if (inputs.length === 0) {
      issues.push({ category: 'accessibility', severity: 'info', title: 'No Form Inputs Found', description: 'No form inputs on this page.', recommendation: '' });
    } else if (unlabeledInputs > 0) {
      issues.push({ category: 'accessibility', severity: 'warning', title: 'Form Inputs Missing Labels', description: `${unlabeledInputs} of ${inputs.length} form inputs are missing associated labels.`, recommendation: 'Associate labels with inputs using <label for="id"> or aria-label attributes.' });
    } else {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'Form Labels Complete', description: 'All form inputs have associated labels.', recommendation: '' });
    }

    // ARIA landmarks
    const landmarks = $('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], header, nav, main, footer');
    if (landmarks.length >= 2) {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'ARIA Landmarks Present', description: `Found ${landmarks.length} landmark elements.`, recommendation: '' });
    } else {
      issues.push({ category: 'accessibility', severity: 'warning', title: 'Few ARIA Landmarks', description: `Only ${landmarks.length} landmark element(s) found.`, recommendation: 'Use semantic HTML5 elements (header, nav, main, footer) or ARIA roles for page structure.' });
    }

    // Skip navigation
    const skipNav = $('a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-nav, .skip-link, [class*="skip"]');
    if (skipNav.length > 0) {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'Skip Navigation Link', description: 'Skip navigation link found.', recommendation: '' });
    } else {
      issues.push({ category: 'accessibility', severity: 'info', title: 'No Skip Navigation Link', description: 'No skip navigation link detected.', recommendation: 'Add a "Skip to content" link for keyboard users.' });
    }

    // Heading hierarchy
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      headings.push(parseInt(el.tagName.replace('h', '')));
    });
    let hierarchyBroken = false;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) { hierarchyBroken = true; break; }
    }
    if (headings.length === 0) {
      issues.push({ category: 'accessibility', severity: 'warning', title: 'No Headings Found', description: 'The page has no heading elements.', recommendation: 'Add headings (H1-H6) to structure your content.' });
    } else if (hierarchyBroken) {
      issues.push({ category: 'accessibility', severity: 'warning', title: 'Heading Hierarchy Broken', description: 'Headings skip levels (e.g., H1 to H3 without H2).', recommendation: 'Maintain a logical heading hierarchy without skipping levels.' });
    } else {
      issues.push({ category: 'accessibility', severity: 'pass', title: 'Heading Hierarchy OK', description: `${headings.length} headings in correct hierarchy.`, recommendation: '' });
    }

    // ── Calculate Scores ────────────────────────────────────────────────
    const scores = calculateScores(issues);

    // ── Save Results ────────────────────────────────────────────────────
    const resultsJson = {
      url,
      fetchedAt: new Date().toISOString(),
      httpStatus: response.status,
      pageSize: pageSizeKB,
      totalResources: totalExternal,
      internalLinks,
      externalLinks,
    };

    await pool.query(
      `UPDATE scans SET status = 'completed', overall_score = $1, seo_score = $2, security_score = $3,
       performance_score = $4, accessibility_score = $5, results = $6, completed_at = NOW() WHERE id = $7`,
      [scores.overall, scores.seo, scores.security, scores.performance, scores.accessibility, JSON.stringify(resultsJson), scanId]
    );

    // Insert issues
    for (const issue of issues) {
      await pool.query(
        'INSERT INTO scan_issues (scan_id, category, severity, title, description, recommendation) VALUES ($1, $2, $3, $4, $5, $6)',
        [scanId, issue.category, issue.severity, issue.title, issue.description, issue.recommendation]
      );
    }

    // Send email notification if user exists
    if (userId) {
      try {
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
          await sendScanCompleteEmail(userResult.rows[0].email, url, scores.overall);
        }
      } catch (emailErr) {
        console.error('Failed to send scan complete email:', emailErr.message);
      }
    }
  } catch (err) {
    console.error(`Scan ${scanId} error:`, err);
    await pool.query(
      "UPDATE scans SET status = 'failed', results = $1, completed_at = NOW() WHERE id = $2",
      [JSON.stringify({ error: err.message }), scanId]
    );
  }
}

function calculateScores(issues) {
  const categories = ['seo', 'security', 'performance', 'accessibility'];
  const weights = { critical: 3, warning: 1.5, info: 0.5, pass: 0 };
  const categoryWeights = { seo: 0.3, security: 0.25, performance: 0.25, accessibility: 0.2 };
  const scores = {};

  for (const cat of categories) {
    const catIssues = issues.filter(i => i.category === cat);
    if (catIssues.length === 0) { scores[cat] = 50; continue; }

    let totalWeight = 0;
    let deductions = 0;
    for (const issue of catIssues) {
      const w = weights[issue.severity] || 0;
      totalWeight += w || 1;
      if (issue.severity !== 'pass') deductions += w;
    }

    const score = totalWeight > 0 ? Math.round(Math.max(0, Math.min(100, (1 - deductions / totalWeight) * 100))) : 50;
    scores[cat] = score;
  }

  scores.overall = Math.round(
    scores.seo * categoryWeights.seo +
    scores.security * categoryWeights.security +
    scores.performance * categoryWeights.performance +
    scores.accessibility * categoryWeights.accessibility
  );

  return scores;
}
