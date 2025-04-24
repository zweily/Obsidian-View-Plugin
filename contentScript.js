console.log('[Obsidian Markdown Viewer] Content script loaded.');
// importScripts removed; marked is now loaded globally by manifest.json
console.log('[Obsidian Markdown Viewer] marked.js loaded:', typeof marked);

// Helper: Parse YAML front matter
function parseYAMLFrontMatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    // Simple YAML parser for key: value pairs and arrays
    const yaml = {};
    const lines = match[1].split(/\r?\n/);
    let currentKey = null;
    for (let line of lines) {
      if (/^\s*- /.test(line) && currentKey) {
        // Array value
        yaml[currentKey] = yaml[currentKey] || [];
        yaml[currentKey].push(line.replace(/^\s*- /, '').replace(/^"|"$/g, ''));
      } else if (/^([\w-]+):\s*(.*)/.test(line)) {
        const [, key, value] = line.match(/^([\w-]+):\s*(.*)/);
        currentKey = key;
        if (value.startsWith('[')) {
          // Inline array
          yaml[key] = value.replace(/\[|\]|"/g, '').split(',').map(s => s.trim()).filter(Boolean);
        } else if (value) {
          yaml[key] = value.replace(/^"|"$/g, '');
        } else {
          yaml[key] = [];
        }
      }
    }
    return { yaml, raw: match[0] };
  } catch (e) {
    return null;
  }
}

// Helper: Render YAML as a table
function renderYAMLBox(yaml) {
  // Helper to linkify URLs
  function linkify(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/(https?:\/\/[^\s,;]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
  let html = `<div class='md-frontmatter md-frontmatter-collapsed'>
    <div class='md-frontmatter-title' tabindex="0" role="button" aria-expanded="false">Properties <span class="md-frontmatter-toggle">▼</span></div>
    <div class='md-frontmatter-content'>
      <table class='md-frontmatter-table'>`;
  for (const key in yaml) {
    let value = Array.isArray(yaml[key]) ? yaml[key].map(linkify).join(', ') : linkify(yaml[key]);
    html += `<tr><td class='md-frontmatter-key'>${key}</td><td>${value}</td></tr>`;
  }
  html += '</table></div></div>';
  return html;
}

// Helper: Replace Obsidian image wikilinks with standard markdown
function replaceObsidianImages(md, basePath) {
  const isLocal = location.protocol === 'file:';
  return md.replace(/!\[\[([^\]]+)\]\]/g, (m, relPath) => {
    let [imgPath, afterPipe] = relPath.split('|').map(s => s.trim());
    let imgSrc = imgPath;
    if (!/^([a-z]+:)?\//i.test(imgPath)) {
      imgSrc = basePath + '/' + imgPath;
    }
    // If local file, convert to file:// URL
    if (isLocal) {
      let absPath = imgSrc.replace(/\\/g, '/');
      if (!absPath.startsWith('/')) absPath = '/' + absPath;
      imgSrc = 'file://' + absPath.replace(/ /g, '%20');
    }
    let alt = imgPath.split('/').pop();
    let sizeAttr = '';
    if (afterPipe) {
      const sizeMatch = afterPipe.match(/^(\d+)x(\d+)$/);
      if (sizeMatch) {
        sizeAttr = ` width="${sizeMatch[1]}" height="${sizeMatch[2]}"`;
      } else {
        alt = afterPipe;
      }
    }
    // Always render as block element
    return `<div class="md-img-block"><img src="${imgSrc}" alt="${alt}"${sizeAttr} /></div>`;
  });
}

// Helper: Preprocess Obsidian markdown for better compatibility with marked.js
function preprocessObsidianMarkdown(md) {
  // Ensure lists after images are separated by a blank line
  md = md.replace(/(<\/div>)(\n)(- )/g, '$1\n\n$3');
  // Convert Obsidian internal links [[Page Name#Section|Alias]] to Markdown links
  md = md.replace(/\[\[([^\]|#]+)(#[^\]|]+)?(\|([^\]]+))?\]\]/g, (m, page, section, _alias, alias) => {
    let text = alias || page;
    let href = page.replace(/ /g, '%20') + (section || '');
    return `[${text}](${href}.md)`;
  });
  // Convert checklists - [ ] and - [x] to standard markdown
  md = md.replace(/^- \[ \]/gm, '- [ ]');
  md = md.replace(/^- \[x\]/gim, '- [x]');
  return md;
}

// Helper: Add callout support (Obsidian style)
function replaceCallouts(md) {
  // Matches "> [!type] Title\n> content..."
  return md.replace(/^> \[!([a-zA-Z0-9_-]+)\](.*)\n((?:^> .*(?:\n|$))+)/gm, (m, type, title, content) => {
    const calloutTitle = title.trim() ? `<div class='callout-title'>${title.trim()}</div>` : '';
    const calloutContent = content.replace(/^> ?/gm, '');
    return `<div class='callout callout-${type.toLowerCase()}'>${calloutTitle}${marked.parse(calloutContent)}</div>`;
  });
}

(function() {
  if (document.contentType !== 'text/markdown' && !location.pathname.endsWith('.md') && !location.pathname.endsWith('.markdown')) {
    console.log('[Obsidian Markdown Viewer] Not a markdown file. contentType:', document.contentType, 'pathname:', location.pathname);
    return;
  }
  
  // Get the file name (without extension) for the title
  const fileName = decodeURIComponent(location.pathname.split('/').pop() || '').replace(/\.[^.]+$/, '');
  
  // Fetch the raw markdown
  const raw = document.body.innerText;
  console.log('[Obsidian Markdown Viewer] Raw markdown detected:', raw.slice(0, 100));
  
  // Get base path for relative images
  let basePath = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
  
  // Parse YAML front matter
  const front = parseYAMLFrontMatter(raw);
  let md = raw;
  let frontHTML = '';
  if (front) {
    frontHTML = renderYAMLBox(front.yaml);
    md = raw.replace(front.raw, '').trim();
  }
  
  // Replace Obsidian image wikilinks
  md = replaceObsidianImages(md, basePath);
  
  // Preprocess for lists, internal links, checkboxes, etc.
  md = preprocessObsidianMarkdown(md);
  
  // Add callout support
  md = replaceCallouts(md);
  
  // Load a markdown renderer (using CDN for marked.js and a basic CSS for Obsidian style)
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://cdn.jsdelivr.net/npm/obsidian.css@latest/dist/obsidian.min.css'; // Placeholder, replace with actual Obsidian-like CSS
  document.head.appendChild(style);

  // Inject better CSS for Obsidian-like appearance and callouts
  const customStyle = document.createElement('style');
  customStyle.textContent = `
body {
  background: linear-gradient(135deg, #f8fafc 0%, #f3f0ff 100%);
}
.md-main-title {
  font-family: 'Segoe UI', 'Arial', sans-serif;
  background: #fff;
  box-shadow: 0 2px 16px #7c3aed11;
  border-radius: 12px;
  padding: 1.2em 1.5em 0.8em 1.5em;
  margin: 2em auto 1.5em auto;
  max-width: 900px;
  letter-spacing: -0.01em;
}
.markdown-preview-view {
  font-family: 'Segoe UI', 'Arial', 'Inter', 'Helvetica Neue', sans-serif;
  background: #fff;
  color: #222;
  padding: 2.5em 2em 2em 2em;
  margin: 0 auto 3em auto;
  border-radius: 16px;
  box-shadow: 0 4px 32px #7c3aed0a;
  min-height: 80vh;
  max-width: 900px;
  line-height: 1.7;
  font-size: 1.08em;
}
.markdown-preview-view h1, .markdown-preview-view h2, .markdown-preview-view h3 {
  font-weight: 700;
  color: #4c1d95;
  margin-top: 2em;
  margin-bottom: 0.7em;
  letter-spacing: -0.01em;
}
.markdown-preview-view h4, .markdown-preview-view h5, .markdown-preview-view h6 {
  color: #6d28d9;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
.markdown-preview-view p {
  margin: 1.1em 0;
}
.markdown-preview-view ul, .markdown-preview-view ol {
  margin: 1.2em 0 1.2em 2em;
  padding-left: 1.2em;
}
.markdown-preview-view li {
  margin: 0.4em 0;
}
.markdown-preview-view input[type="checkbox"] {
  accent-color: #7c3aed;
  width: 1.1em;
  height: 1.1em;
  margin-right: 0.5em;
  vertical-align: middle;
}
.markdown-preview-view pre, .markdown-preview-view code {
  background: #f3f0ff;
  color: #3b0764;
  border-radius: 6px;
  padding: 0.2em 0.4em;
  font-size: 1em;
}
.markdown-preview-view pre {
  padding: 1em;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 1.02em;
}
.markdown-preview-view code {
  background: #f3f0ff;
  color: #7c3aed;
  font-size: 0.98em;
}
.markdown-preview-view blockquote {
  border-left: 4px solid #a78bfa;
  background: #f3f0ff;
  color: #4c1d95;
  margin: 1.5em 0;
  padding: 0.7em 1.2em;
  border-radius: 8px;
  font-style: italic;
}
.markdown-preview-view table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5em 0;
  background: #fafaff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px #7c3aed11;
}
.markdown-preview-view th, .markdown-preview-view td {
  border: 1px solid #e5e7eb;
  padding: 0.7em 1.2em;
  text-align: left;
}
.markdown-preview-view th {
  background: #ede9fe;
  color: #4c1d95;
  font-weight: 600;
}
.markdown-preview-view img {
  max-width: 100%;
  border-radius: 8px;
  margin: 1.2em 0;
  box-shadow: 0 2px 8px #7c3aed22;
}
/* Callout support */
.markdown-preview-view .callout {
  border-left: 6px solid #7c3aed;
  background: #f6f6ff;
  padding: 1.2em 1.2em 1.2em 1.5em;
  margin: 2em 0;
  border-radius: 10px;
  box-shadow: 0 2px 12px #7c3aed18;
}
.markdown-preview-view .callout-title {
  font-weight: bold;
  color: #7c3aed;
  margin-bottom: 0.5em;
  font-size: 1.08em;
}
/* Tag support */
.markdown-preview-view .md-tag {
  display: inline-block;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 6px;
  padding: 0.1em 0.7em;
  margin: 0 0.2em;
  font-size: 0.97em;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 2px #7c3aed11;
  cursor: pointer;
  transition: background 0.2s;
}
.markdown-preview-view .md-tag:hover {
  background: #c7d2fe;
}
/* Highlight support */
.markdown-preview-view mark, .markdown-preview-view .md-highlight {
  background: #fef08a;
  color: #92400e;
  border-radius: 4px;
  padding: 0.1em 0.3em;
}
/* Block reference */
.markdown-preview-view .md-blockref {
  color: #a21caf;
  background: #f3e8ff;
  border-radius: 4px;
  padding: 0.1em 0.3em;
  font-size: 0.95em;
  margin-left: 0.2em;
}
.markdown-preview-view a {
  color: #7c3aed;
  text-decoration: underline dotted;
  transition: color 0.2s;
}
.markdown-preview-view a:hover {
  color: #4c1d95;
}
.md-frontmatter {
  background: #fff;
  box-shadow: 0 2px 16px #7c3aed11;
  border-radius: 12px;
  padding: 1.2em 1.5em 1.2em 1.5em;
  margin: 0 auto 2em auto;
  max-width: 900px;
  font-size: 0.98em;
  color: #222;
  display: block;
}
.md-frontmatter-title {
  font-weight: bold;
  color: #7c3aed;
  font-size: 1.1em;
  margin-bottom: 0.7em;
}
.md-frontmatter-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.2em;
}
.md-frontmatter-key {
  color: #7c3aed;
  width: 120px;
  font-weight: 500;
  padding-right: 1em;
}
.md-frontmatter-table td {
  padding: 0.4em 0.7em;
  border-bottom: 1px solid #ede9fe;
}
.md-frontmatter-table tr:last-child td {
  border-bottom: none;
}
.md-frontmatter-collapsed .md-frontmatter-content {
  display: none;
}
.md-frontmatter-title {
  cursor: pointer;
  user-select: none;
}
.md-frontmatter-toggle {
  font-size: 0.8em;
  margin-left: 0.5em;
}
`;
  document.head.appendChild(customStyle);

  // Post-process for tags, highlights, and block references
  function enhanceObsidianElements() {
    const container = document.querySelector('.markdown-preview-view');
    if (!container) return;
    // Tags: #tag
    container.innerHTML = container.innerHTML.replace(/(\s|^)(#\w[\w-]*)/g, (m, pre, tag) => `${pre}<span class="md-tag">${tag}</span>`);
    // Highlights: ==highlight==
    container.innerHTML = container.innerHTML.replace(/==([^=]+)==/g, '<mark class="md-highlight">$1</mark>');
    // Block references: ^block-id
    container.innerHTML = container.innerHTML.replace(/\^(\w[\w-]*)/g, '<span class="md-blockref">^$1</span>');
  }

  // Render markdown using local marked
  if (typeof marked !== 'undefined') {
    document.body.innerHTML = `<div class='md-main-title' style="font-size:2.2em;font-weight:bold;color:#4c1d95;margin-bottom:0.5em;">${fileName}</div>${frontHTML}<div class='markdown-preview-view'>${marked.parse(md)}</div>`;
    enhanceObsidianElements();
    // Add collapse/expand logic for properties section
    const frontmatter = document.querySelector('.md-frontmatter');
    if (frontmatter) {
      const title = frontmatter.querySelector('.md-frontmatter-title');
      const content = frontmatter.querySelector('.md-frontmatter-content');
      const toggle = frontmatter.querySelector('.md-frontmatter-toggle');
      if (title && content && toggle) {
        function setCollapsed(collapsed) {
          if (collapsed) {
            frontmatter.classList.add('md-frontmatter-collapsed');
            frontmatter.classList.remove('md-frontmatter-expanded');
            content.style.display = 'none';
            title.setAttribute('aria-expanded', 'false');
            toggle.textContent = '▼';
          } else {
            frontmatter.classList.remove('md-frontmatter-collapsed');
            frontmatter.classList.add('md-frontmatter-expanded');
            content.style.display = '';
            title.setAttribute('aria-expanded', 'true');
            toggle.textContent = '▲';
          }
        }
        setCollapsed(true);
        title.addEventListener('click', () => setCollapsed(frontmatter.classList.contains('md-frontmatter-expanded')));
        title.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed(frontmatter.classList.contains('md-frontmatter-expanded'));
          }
        });
      }
    }
    console.log('[Obsidian Markdown Viewer] Markdown rendered.');
  } else {
    console.error('[Obsidian Markdown Viewer] marked.js not loaded.');
  }
})();