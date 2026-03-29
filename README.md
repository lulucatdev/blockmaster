# BlockMaster

A Chrome extension that replaces the "views/analytics" button on X (Twitter) posts with a one-click "block" button.

![BlockMaster Screenshot](docs/screenshot.png)

## Features

- **One-Click Block**: Replace the analytics/views button with a simple "block" button on every post
- **Confirmation Dialog**: Optional confirmation before blocking to prevent accidental blocks
- **Smart Feedback**: Toast notifications for success/error states with rate limiting detection
- **Auto-Remove**: Posts fade out and are removed from the timeline immediately after blocking
- **Session Stats**: Popup shows how many users you've blocked in the current session
- **Persistent Settings**: User preferences are saved to Chrome storage

## Installation

### Load in Developer Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in the top right corner
3. Click "Load unpacked"
4. Select the `blockmaster-ext` folder
5. The extension is now loaded and active

### Chrome Web Store (Coming Soon)

The extension will be published to the Chrome Web Store for easy one-click installation.

## Usage

### Basic Flow

1. Navigate to [x.com](https://x.com) or [twitter.com](https://twitter.com)
2. Each post will have a red "block" button where the analytics button used to be
3. Click the "block" button
4. If enabled, a confirmation dialog appears: "确定要屏蔽 @username 吗？"
5. The button text changes to "..." while processing
6. On success:
   - Button shows "blocked"
   - Toast notification appears: "已屏蔽 @username"
   - The post fades out and is removed from the timeline

### Button States

| State | Text | Description |
|-------|------|-------------|
| Default | **block** | Ready to block the user |
| Processing | **...** | Sending block request |
| Blocked | **blocked** | User successfully blocked |

### Settings

Click the BlockMaster icon in the Chrome toolbar to open the settings popup:

| Setting | Description | Default |
|---------|-------------|---------|
| **Confirmation Dialog** | Show confirmation before blocking | Enabled |
| **Remove After Block** | Automatically remove post after blocking | Enabled |
| **Show Notifications** | Display success/error toast messages | Enabled |

## How It Works

### Technical Overview

```
┌─────────────────────────────────────────────────────────────┐
│  X.com Timeline                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Post @someuser                                       │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │  │
│  │  │ Reply  │ │ Retweet│ │ Like   │ │ block  │ ←──────┼──┤
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │  │
│  │                      (replaced from analytics)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Architecture

**File Structure**
```
blockmaster-ext/
├── manifest.json          # Extension manifest (MV3)
├── content.js             # Content script - DOM manipulation & API calls
├── styles.css             # Button styling & animations
├── popup.html             # Settings popup UI
├── popup.js               # Settings popup logic
├── README.md              # This file
└── icons/                 # Extension icons (16, 48, 128px)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Core Mechanism

1. **DOM Detection**: Uses `MutationObserver` to detect new posts as you scroll
2. **Username Extraction**: Extracts the author's username from the post's DOM structure
3. **Button Replacement**: Replaces the analytics link with a custom block button
4. **API Integration**: Calls X's internal `blocks/create.json` endpoint
5. **Rate Limiting**: Detects HTTP 429 responses and implements retry delays
6. **Post Removal**: Fades out and removes the post immediately after blocking

### Security Considerations

- **XSS Protection**: Usernames are inserted using `textContent`, not `innerHTML`
- **No Credential Storage**: Extension uses the page's existing session cookies
- **Isolated Execution**: Content script runs in isolated world with limited privileges
- **User Confirmation**: Optional confirmation dialog prevents accidental blocks

### Performance Optimizations

- **Batch Processing**: New posts are queued and processed in batches (50ms window)
- **Quick Tag Filtering**: Checks `tagName` and `data-testid` before expensive queries
- **Memory Management**: Uses DOM attributes for state tracking
- **Resource Cleanup**: Observer disconnects on page unload or extension disable

## Configuration

### Default Config (in `content.js`)

```javascript
const CONFIG = {
  DEBUG: false,                    // Enable console logging
  SELECTORS: {
    article: 'article[data-testid="tweet"]',
    analyticsButton: 'a[href*="/analytics"]',
    userNameLink: 'a[role="link"][href^="/"]',
    userNameContainer: '[data-testid="User-Name"]',
  },
  // ... other config
};
```

### API Endpoint

The extension uses X's internal API:
```
POST https://x.com/i/api/1.1/blocks/create.json
Body: screen_name={username}&skip_status=1
```

This is the same endpoint used by X's web interface, accessed via the user's active session.

## Limitations

1. **Rate Limiting**: X imposes rate limits on block operations. The extension detects HTTP 429 and shows appropriate messages.

2. **DOM Changes**: X frequently updates their frontend. If the extension stops working, the CSS selectors may need updating.

3. **Login Required**: User must be logged into X for the block API to work.

4. **Bearer Token**: The hardcoded bearer token is X's public web client token. If X rotates this, the extension will need an update.

5. **React Virtual DOM**: X uses React's virtualized list. The extension handles this by immediately removing posts rather than hiding them.

## Troubleshooting

### Extension Not Working

1. **Check Login**: Ensure you're logged into X
2. **Reload Extension**: Go to `chrome://extensions/` and click the reload icon on BlockMaster
3. **Check Console**: Open DevTools (F12) and look for `[BlockMaster]` logs
4. **Enable Debug**: Set `CONFIG.DEBUG = true` in `content.js` for verbose logging

### Rate Limited

If you see "操作过于频繁，请稍后再试":
- X has rate-limited your account
- Wait 1-2 minutes before blocking again
- The extension will automatically calculate the retry time

### Button Not Appearing

1. X may have changed their DOM structure
2. Check if the analytics button exists (it may be hidden for some posts)
3. Try scrolling to load more posts and trigger the observer

## Development

### Local Development

1. Clone the repository
2. Make changes to files
3. Go to `chrome://extensions/` and reload the extension
4. Refresh the X page to see changes

### Building Icons

Icons are generated from SVG using ImageMagick:

```bash
cd icons
# Requires: brew install librsvg
rsvg-convert -w 16 -h 16 icon.svg -o icon16.png
rsvg-convert -w 48 -h 48 icon.svg -o icon48.png
rsvg-convert -w 128 -h 128 icon.svg -o icon128.png
```

### Icon License

The ban/prohibition symbol icon is from [Tabler Icons](https://tabler.io/icons), licensed under MIT.

## Privacy Policy

BlockMaster does not collect, store, or transmit any user data:

- No analytics or telemetry
- No data sent to external servers
- Only communicates with X's official API endpoints
- Settings stored locally in Chrome's sync storage
- Source code is fully open for inspection

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- Better username extraction logic
- Support for additional languages
- Keyboard shortcuts for blocking
- Bulk block functionality
- Block list import/export

## Changelog

### v1.1.0
- Simplified button text to just "block"
- Removed post placeholder, now removes immediately
- Removed profile page popup
- Added batch processing for MutationObserver
- Fixed isolated world context issues
- Improved username extraction with query param stripping
- Added comprehensive error handling

### v1.0.0
- Initial release
- Basic block functionality
- Settings popup with toggles
- Toast notifications
- Session statistics

## License

MIT License

Copyright (c) 2024 BlockMaster Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

- Icon by [Tabler Icons](https://tabler.io/icons) (MIT License)
- Built with Manifest V3 and modern JavaScript
- Inspired by the need for faster blocking on X

## Contact

- GitHub Issues: [github.com/yourusername/blockmaster/issues](https://github.com/yourusername/blockmaster/issues)
- Email: your.email@example.com

---

**Disclaimer**: This extension is not affiliated with X Corp. Use at your own risk. Blocking users is irreversible through this extension interface.
