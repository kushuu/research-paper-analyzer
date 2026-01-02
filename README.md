# Research Paper Analyzer

A small browser extension that helps analyze and summarize research papers. It provides a popup UI and background/content scripts to interact with web pages and process text.

## Features
- Summarize selected text or a page's content.
- Lightweight UI accessible via the browser toolbar popup.

## Files
- `manifest.json`: Extension manifest (permissions, background, popup, etc.).
- `popup.html` / `popup.js`: The popup UI and its frontend logic.
- `settings.html` / `settings.js`: Settings UI for the extension.
- `background.js`: Background script for long-running tasks or event listeners.
- `content.js`: Content script injected into pages to collect/transform content.
- `config.js`: Configuration constants used by the extension.

## Installation (Developer)
1. Open Chrome or a Chromium-based browser.
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and choose this repository folder.

## Usage
- Click the extension icon to open the popup. Use available controls to analyze or summarize page text.

## Development
- This project is plain JavaScript and static HTML — no build step required unless you add tooling.
- To iterate quickly, load the unpacked extension as above and reload it after edits.

## Debugging tips
- Open the popup then press `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS) to open DevTools for the popup.
- For content script logs, open the page where the content script runs and inspect the page console.

## Contributing
Feel free to open issues or submit pull requests. Keep changes focused and include testing steps.

## License
Add a license file if you want to specify terms (e.g., `LICENSE`).