# Contributing to BlockMaster

Thank you for your interest in contributing to BlockMaster! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project follows a standard code of conduct:
- Be respectful and inclusive
- Focus on constructive feedback
- Accept that different viewpoints exist

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
1. A clear, descriptive title
2. Steps to reproduce the bug
3. Expected behavior
4. Actual behavior
5. Chrome version and OS
6. Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
1. Check if the feature has already been suggested
2. Explain the use case and why it would be useful
3. Provide examples of how it would work

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/my-feature` or `git checkout -b fix/bug-description`
3. Make your changes
4. Test thoroughly on X/Twitter
5. Commit with clear messages: `git commit -m "Add feature: description"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request with:
   - Clear description of changes
   - Screenshots/gifs if UI changes
   - Testing notes

## Development Setup

### Prerequisites

- Chrome or Chromium browser
- Basic knowledge of JavaScript and Chrome Extensions

### Local Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/blockmaster.git
cd blockmaster

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select this folder
```

### Making Changes

1. Edit files in your favorite editor
2. Changes to `content.js` or `styles.css` require page refresh to see
3. Changes to `manifest.json` require extension reload in chrome://extensions/

### Testing Checklist

- [ ] Button appears on posts with analytics
- [ ] Clicking "block" shows confirmation (if enabled)
- [ ] Processing state shows "..."
- [ ] Success shows "blocked" and toast notification
- [ ] Post is removed from timeline
- [ ] Rate limiting is handled gracefully
- [ ] Settings popup works correctly
- [ ] Session stats update correctly

## Code Style

### JavaScript

- Use single quotes for strings
- Use 2-space indentation
- Use camelCase for variables and functions
- Use UPPER_CASE for constants
- Add comments for complex logic
- Prefer `const` and `let` over `var`

Example:
```javascript
const CONFIG = {
  DEBUG: false,
  SELECTORS: {
    article: 'article[data-testid="tweet"]',
  },
};

function getUsername(element) {
  // Extract username from post element
  const link = element.querySelector('a');
  return link?.textContent || null;
}
```

### CSS

- Use kebab-case for class names
- Prefix all classes with `blockmaster-` to avoid conflicts
- Use `!important` sparingly and only when overriding X's styles
- Group related styles together

## Areas for Contribution

### High Priority

- Better username extraction (X changes their DOM frequently)
- Support for X's new layout changes
- Keyboard shortcuts (e.g., press 'B' to block current post)

### Medium Priority

- Bulk block functionality
- Block list import/export
- Statistics dashboard
- Support for additional languages

### Low Priority

- Dark/light theme toggle
- Custom button colors
- Animation speed settings

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
