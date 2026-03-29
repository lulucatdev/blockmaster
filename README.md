# BlockMaster 🔨

> **Block an X user as easy as liking a post.**

Tired of seeing tweets from people you'd rather not? BlockMaster turns the useless "analytics" button into a **one-click nuke button**. No confirmation dialogs. No extra clicks. Just **block** and move on.

## Why BlockMaster?

X's native block flow is annoying:
1. Click the three dots
2. Scroll through a menu
3. Click "Block"
4. Confirm
5. Why so many steps???

**BlockMaster:** See a post → Click "block" → Gone. That's it.

## Features That slap

| Feature | What it does |
|---------|--------------|
| ⚡ **Instant Block** | One click. No dialogs. No friction. |
| 🎯 **Smart Focus** | Press `B` to block whatever post is centered on your screen |
| 🗑️ **Auto-Vanish** | Blocked posts immediately fade out and disappear |
| 🔗 **Quick View** | Toast notification has a "View" button to visit their profile (for unblock) |
| 📊 **Stats** | See how many people you've yeeted this session |
| 🧠 **Rate Limit Aware** | Detects X's "slow down" messages and shows retry time |

## Get It Running

### Developer Mode (Right Now)

1. Open Chrome → `chrome://extensions/`
2. Flip the **Developer mode** switch (top right)
3. Click **"Load unpacked"**
4. Select this folder
5. Done. Go block some people.

### Chrome Web Store (Soon™)

We're working on it. For now, use the manual method above.

## How to Use This Thing

### The Classic Way

1. Scroll X like normal
2. See someone you don't vibe with? 
3. Click the **red "block" button** (replaces the useless analytics button)
4. They disappear instantly. Poof. Gone.

### Button States Explained

| State | What it means |
|-------|---------------|
| 🔴 **block** | Ready to yeet this user |
| ⏳ **...** | Nuking them from orbit... |
| ✅ **blocked** | Successfully removed from your life |

### The Lazy Way (Keyboard Shortcut)

Too lazy to move your mouse?

1. Scroll so the annoying post is in the middle of your screen
2. Press **`B`**
3. Post deleted. User blocked. Timeline cleaned.

Works great when speed-running your block list.

### Settings You Can Tweak

Click the BlockMaster icon in Chrome toolbar:

| Setting | What it does | Default |
|---------|--------------|---------|
| **Remove After Block** | Make posts disappear immediately | ✅ On |
| **Show Notifications** | Toast messages for success/fails | ✅ On |
| **Keyboard Shortcut (B)** | Enable the 'B' key for blocking | ✅ On |

**Pro tip:** Disable notifications if you're blocking a *lot* of people at once. Less noise, more blocking.

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

## Known Quirks

### The Boring Technical Stuff

1. **Rate Limiting**: X gets mad if you block too fast. The extension handles this gracefully with retry timers.

2. **DOM Changes**: X updates their code frequently. If buttons disappear, they probably changed their HTML structure. File an issue.

3. **Must Be Logged In**: Obviously. You can't block people if you're not logged in.

4. **Bearer Token**: That long string of gibberish is X's public web client token. Everyone using x.com has the same one. It's fine.

## When Things Break

### "It's not working!"

Try this checklist:

1. **Are you logged into X?** No? Log in.
2. **Reload the extension**: `chrome://extensions/` → click the 🔄 icon on BlockMaster
3. **Check the console**: F12 → Console → search for `[BlockMaster]`
4. **Still broken?**: [Open an issue](https://github.com/lulucatdev/blockmaster/issues)

### "Rate limited. Please try again later"

X is telling you to chill. You blocked too many people too fast.

- Wait a minute or two
- The toast will show you exactly how long to wait
- Go grab a coffee, come back, continue your crusade

### "I don't see the block button"

Some posts don't have analytics buttons (replies, promoted tweets, etc.). BlockMaster only appears where the analytics button would be.

Also, try scrolling. The extension needs to "see" the post first.

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
