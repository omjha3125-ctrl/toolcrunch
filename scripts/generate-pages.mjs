import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const templatePath = path.join(root, 'index.html');
const appPath = path.join(root, 'assets', 'app.js');
const template = fs.readFileSync(templatePath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const toolPattern = /^tool\('([^']+)','([^']+)','([^']+)',(?:true|false),'([^']+)'/gm;
const tools = [...app.matchAll(toolPattern)].map((m) => ({
  slug: m[1],
  title: m[2],
  category: m[3],
  description: m[4],
}));

if (tools.length !== 46) {
  throw new Error(`Expected 46 tool registrations, found ${tools.length}. Update the generator if the tool() declaration format changed.`);
}

const staticPages = {
  privacy: {
    title: 'Privacy Policy',
    description: 'Privacy Policy for toolcrunch.app. Files never leave your device because tools run locally in your browser.',
    body: `<h1>Privacy Policy</h1><p>ToolCrunch does not collect, store, or transmit files you use with our browser-based tools. File processing happens locally in your browser.</p><h2>Advertising</h2><p>ToolCrunch may use Google AdSense. Google may use cookies or similar technologies to serve and measure ads where permitted.</p><h2>Cookies and local storage</h2><p>ToolCrunch stores your theme preference in localStorage. Advertising and consent providers may use their own storage subject to applicable consent requirements.</p><h2>Contact</h2><p>Questions: <a href="mailto:contact@toolcrunch.app">contact@toolcrunch.app</a></p>`,
  },
  about: {
    title: 'About ToolCrunch',
    description: 'About toolcrunch.app, a collection of free private browser-based utility tools.',
    body: `<h1>About ToolCrunch</h1><p>ToolCrunch is a collection of 46 free online tools for image compression, PDF editing, developer utilities, text tools, converters, QR codes, and calculators.</p><p>Most file tools run directly in your browser, so your files do not need to be uploaded to ToolCrunch servers.</p><h2>Why ToolCrunch exists</h2><p>The goal is simple: useful tools that are fast, private, easy to use, and available without an account.</p>`,
  },
  contact: {
    title: 'Contact',
    description: 'Contact toolcrunch.app for bug reports, feature requests, and questions.',
    body: `<h1>Contact</h1><p>Email: <a href="mailto:contact@toolcrunch.app">contact@toolcrunch.app</a></p><p>Use this address for bug reports, feature requests, or general ToolCrunch questions.</p>`,
  },
};

function seoHead({ title, description, pathname, type = 'website' }) {
  const fullTitle = title === 'ToolCrunch — 46 free online tools. No upload, no login.'
    ? title
    : `${title} — ToolCrunch`;
  const url = `https://toolcrunch.app${pathname}`;
  return `  <!-- SEO_HEAD_START -->\n  <title>${escapeHtml(fullTitle)}</title>\n  <meta name="description" content="${escapeHtml(description)}">\n  <link rel="canonical" href="${url}">\n  <meta property="og:title" content="${escapeHtml(fullTitle)}">\n  <meta property="og:description" content="${escapeHtml(description)}">\n  <meta property="og:type" content="${type}">\n  <meta property="og:url" content="${url}">\n  <!-- SEO_HEAD_END -->`;
}

function replaceMarked(source, marker, replacement) {
  const start = `  <!-- ${marker}_START -->`;
  const end = `  <!-- ${marker}_END -->`;
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  if (from === -1 || to === -1 || to < from) throw new Error(`Missing ${marker} markers in index.html`);
  return source.slice(0, from) + replacement + source.slice(to + end.length);
}

function toolContent(tool) {
  return `  <!-- ROUTE_CONTENT_START -->\n  <main id="home" hidden></main>\n  <main id="tool-page">\n    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span class="breadcrumb-sep" aria-hidden="true">/</span><span>${escapeHtml(tool.title)}</span></nav>\n    <div class="tool-header"><div class="eyebrow">${escapeHtml(tool.category)}</div><h1>${escapeHtml(tool.title)}</h1><p class="tool-desc">${escapeHtml(tool.description)}</p></div>\n    <section class="seo-content"><h2>Free browser-based tool</h2><p class="tool-desc">Use this ToolCrunch utility directly in your browser. Most processing stays on your device and no ToolCrunch account is required.</p></section>\n    <div class="privacy-note"><i class="ti ti-lock" aria-hidden="true"></i>Files never leave your device — all processing runs in your browser</div>\n  </main>\n  <!-- ROUTE_CONTENT_END -->`;
}

function staticContent(page) {
  return `  <!-- ROUTE_CONTENT_START -->\n  <main id="home" hidden></main>\n  <main id="tool-page"><div class="static-page"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span class="breadcrumb-sep" aria-hidden="true">/</span><span>${escapeHtml(page.title)}</span></nav>${page.body}</div></main>\n  <!-- ROUTE_CONTENT_END -->`;
}

function writePage(relativeDir, head, content) {
  let out = replaceMarked(template, 'SEO_HEAD', head);
  out = replaceMarked(out, 'ROUTE_CONTENT', content);
  const dir = path.join(root, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), out);
}

for (const tool of tools) {
  const pathname = `/tool/${tool.slug}/`;
  writePage(
    path.join('tool', tool.slug),
    seoHead({ title: tool.title, description: tool.description, pathname }),
    toolContent(tool),
  );
}

for (const [slug, page] of Object.entries(staticPages)) {
  const pathname = `/${slug}/`;
  writePage(
    slug,
    seoHead({ title: page.title, description: page.description, pathname }),
    staticContent(page),
  );
}

const sitemapUrls = [
  { pathname: '/', priority: '1.0', changefreq: 'weekly' },
  ...tools.map((tool) => ({ pathname: `/tool/${tool.slug}/`, priority: '0.8' })),
  ...Object.keys(staticPages).map((slug) => ({ pathname: `/${slug}/`, priority: '0.5' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((u) => `  <url><loc>https://toolcrunch.app${u.pathname}</loc><priority>${u.priority}</priority>${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}</url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);

console.log(`Generated ${tools.length} tool pages, ${Object.keys(staticPages).length} static pages, and sitemap.xml`);
