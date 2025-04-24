# Obsidian Markdown Viewer Extension

This Chrome/Edge extension renders Obsidian Markdown notes directly in the browser. When you open a `.md` file, it will be displayed with Obsidian-style formatting and enhanced features.

## Features
- Detects and renders Markdown files (`.md`, `.markdown`) in the browser
- Displays the file name as the main title
- Beautifully renders YAML front matter (properties section) as a styled table
- Supports Obsidian image wikilinks, including:
  - Relative paths
  - Aliases (alt text)
  - Image size syntax (e.g., `![[image.png|500x240]]`)
  - Local file URLs for images
- Renders images as block elements for correct layout
- Supports Obsidian callouts (e.g., `> [!note] Title`)
- Converts Obsidian internal links (`[[Page Name#Section|Alias]]`) to clickable Markdown links
- Handles checklists and standard Markdown lists
- Improved CSS for an Obsidian-like appearance
- Compatible with both Chrome and Microsoft Edge

## Installation
1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked" and select this project folder

## Usage
- Open any Markdown file in your browser. The extension will automatically render it with Obsidian-style formatting and features.

## Development
- `manifest.json`: Extension configuration
- `contentScript.js`: Injects Markdown rendering logic and handles Obsidian-specific syntax
- `marked.min.js`: Markdown parser
- `background.js`: (Optional) Background logic
- `popup.html`: Popup UI
- `icon16.png`, `icon48.png`, `icon128.png`: Extension icons

## Notes
- The Obsidian CSS used is a placeholder. For best results, replace it with the official Obsidian CSS or a close alternative.
- Some advanced Obsidian plugins or custom syntax may not be fully supported.

---

For more details or to request features, please open an issue or contribute to the project.
