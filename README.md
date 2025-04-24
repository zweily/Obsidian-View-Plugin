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

## Development & Automation
This project supports automated build, packaging, changelog, version bumping, and GitHub release for both Windows and Linux/macOS.

### Requirements
- Node.js and npm
- (For releases) GitHub CLI (`gh`) authenticated to your account
- (For Linux/macOS) `zip` utility (or Node.js fallback will be used)

### Scripts (npm)
- `npm run build` – No-op for plain JS extension
- `npm run package` – Create a distributable zip file for release
- `npm run clean` – Remove all zip files
- `npm run bump-version` – Bump the patch version in `package.json` and `manifest.json`
- `npm run changelog` – Generate a `CHANGELOG.md` from recent git commits
- `npm run publish` – Bump version, generate changelog, and package the extension
- `node scripts/release.js` – Create a GitHub release with the zip and changelog (requires `gh` CLI)

### Makefile (alternative)
- `make build` – No-op for plain JS extension
- `make package` – Create a distributable zip file for release
- `make clean` – Remove all zip files
- `make bump-version` – Bump the patch version
- `make changelog` – Generate a `CHANGELOG.md` from recent git commits
- `make publish` – Bump version, generate changelog, and package the extension
- `make release` – All of the above plus automated GitHub release

### Example Release Workflow
1. Make your code changes and commit them.
2. Run `npm run publish` or `make publish` to bump the version, generate the changelog, and package the extension.
3. Run `node scripts/release.js` or `make release` to create a GitHub release with the zip and changelog.
4. Upload the zip file to the Chrome Web Store or Edge Add-ons as needed.

## Project Structure
- `manifest.json`: Extension configuration
- `contentScript.js`: Injects Markdown rendering logic and handles Obsidian-specific syntax
- `marked.min.js`: Markdown parser
- `background.js`: (Optional) Background logic
- `popup.html`: Popup UI
- `icon16.png`, `icon48.png`, `icon128.png`: Extension icons
- `scripts/`: Automation scripts for packaging, cleaning, changelog, and release
- `Makefile`: Cross-platform automation for build, package, changelog, version bump, and release
- `package.json`: npm scripts for automation

## Notes
- The Obsidian CSS used is a placeholder. For best results, replace it with the official Obsidian CSS or a close alternative.
- Some advanced Obsidian plugins or custom syntax may not be fully supported.

---

For more details or to request features, please open an issue or contribute to the project.
