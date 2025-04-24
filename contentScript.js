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
  let html = `<div class='md-frontmatter' style="background:#f6f6f6;border:1px solid #ddd;padding:1em;margin-bottom:1.5em;border-radius:8px;font-size:0.95em;">
    <b>Properties</b><table style='width:100%;margin-top:0.5em;'>`;
  for (const key in yaml) {
    const value = Array.isArray(yaml[key]) ? yaml[key].join(', ') : yaml[key];
    html += `<tr><td style='color:#7c3aed;width:120px;'><b>${key}</b></td><td>${value}</td></tr>`;
  }
  html += '</table></div>';
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
.markdown-preview-view {
  font-family: 'Segoe UI', 'Arial', sans-serif;
  background: #f8f9fb;
  color: #222;
  padding: 2em 10vw;
  min-height: 100vh;
}
.markdown-preview-view h1, .markdown-preview-view h2, .markdown-preview-view h3 {
  font-weight: 700;
  color: #4c1d95;
  margin-top: 1.5em;
}
.markdown-preview-view pre, .markdown-preview-view code {
  background: #f3f0ff;
  color: #3b0764;
  border-radius: 6px;
  padding: 0.2em 0.4em;
  font-size: 1em;
}
.markdown-preview-view blockquote {
  border-left: 4px solid #a78bfa;
  background: #f3f0ff;
  color: #4c1d95;
  margin: 1em 0;
  padding: 0.5em 1em;
}
.markdown-preview-view table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
.markdown-preview-view th, .markdown-preview-view td {
  border: 1px solid #e5e7eb;
  padding: 0.5em 1em;
}
.markdown-preview-view img {
  max-width: 100%;
  border-radius: 6px;
  margin: 1em 0;
}
/* Callout support */
.markdown-preview-view .callout {
  border-left: 6px solid #7c3aed;
  background: #f6f6ff;
  padding: 1em;
  margin: 1.5em 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px #7c3aed22;
}
.markdown-preview-view .callout-title {
  font-weight: bold;
  color: #7c3aed;
  margin-bottom: 0.5em;
}
`;
  document.head.appendChild(customStyle);

  // Render markdown using local marked
  if (typeof marked !== 'undefined') {
    document.body.innerHTML = `<div class='md-main-title' style="font-size:2.2em;font-weight:bold;color:#4c1d95;margin-bottom:0.5em;">${fileName}</div>${frontHTML}<div class='markdown-preview-view'>${marked.parse(md)}</div>`;
    console.log('[Obsidian Markdown Viewer] Markdown rendered.');
  } else {
    console.error('[Obsidian Markdown Viewer] marked.js not loaded.');
  }
})();