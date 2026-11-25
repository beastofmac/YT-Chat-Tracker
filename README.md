# YouTube Live Chat Read Tracker

A lightweight, plug-and-play Chromium browser extension that allows YouTube streamers to mark individual Live Chat messages as read.

## Download

[**Download the Chrome extension package**](dist/YTChatCheck.zip)

After downloading, extract the ZIP. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.

## Features

- **Checkbox Integration**: Small, unobtrusive checkbox beside every chat message
- **Read Styling**: Strikethrough on message text, reduced opacity when marked read
- **Persistent Storage**: Read status survives page refreshes, navigation, and browser restarts
- **Automatic Detection**: New messages get checkboxes instantly via MutationObserver
- **Multi-Session Support**: Separate tracking per live stream (by video ID)
- **No External Dependencies**: Works entirely offline, no accounts or servers needed
- **Privacy-First**: No analytics, tracking, or data collection

## Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. **Download/Clone** this repository to a local folder
2. **Open Chrome/Edge/Brave** and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** button
5. **Select the project folder** (`YTChatCheck` directory containing `manifest.json`)
6. **Extension installed!** You'll see the extension icon in your toolbar

### Method 2: Pack and Install (for distribution)

```bash
# In Chrome/Edge extensions page, click "Pack extension"
# Select the project folder as "Extension root directory"
# This creates a .crx file you can drag to install
```

## Usage

1. **Open any YouTube Live Chat**:
   - Regular: `youtube.com/live_chat?v=VIDEO_ID`
   - Popout: `youtube.com/live_chat?is_popout=1&v=VIDEO_ID`
   - Replay: `youtube.com/live_chat_replay?v=VIDEO_ID`

2. **See checkboxes** appear automatically beside each message

3. **Click a checkbox** to mark a message as read:
   - Message text gets strikethrough
   - Text opacity reduces
   - Checkbox shows checked state

4. **Click again** to mark as unread (restores original appearance)

5. **Refresh or navigate away** - read status persists!

## Supported Message Types

| Message Type | Support | Notes |
|-------------|---------|-------|
| Regular text messages | ✅ Full | Primary use case |
| Super Chats | ✅ Full | Amount chip preserved |
| Super Stickers | ✅ Full | Sticker image preserved |
| Member messages | ✅ Full | Badge preserved |
| Deleted/hidden messages | ❌ Skipped | Not processed |
| System messages | ❌ Skipped | Not user messages |

## Project Structure

```
YTChatCheck/
├── manifest.json          # Manifest V3 configuration
├── content.js             # Main content script entry point
├── background.js          # Service worker for cleanup/lifecycle
├── storage.js             # chrome.storage.local wrapper
├── message-manager.js     # DOM manipulation & message ID logic
├── styles.css             # All styling (checkbox, read state)
├── icons/
│   ├── icon.svg           # Source icon (128x128)
│   ├── icon16.png         # 16x16 toolbar icon
│   ├── icon32.png         # 32x32 toolbar icon
│   ├── icon48.png         # 48x48 toolbar icon
│   ├── icon128.png        # 128x128 store icon
│   ├── generate-icons.html # Browser-based icon generator
│   └── generate-icons.js   # Node.js icon generator (requires canvas)
└── README.md              # This file
```

## Module Overview

### `manifest.json`
- Manifest V3 configuration
- Content script matches for live chat URLs
- Minimal permissions: `storage` + YouTube host permissions
- Service worker for background tasks

### `content.js`
- Main entry point, runs in page context
- Initializes extension on load and SPA navigation
- Sets up MutationObserver for new messages
- Handles checkbox click delegation
- Communicates with storage and message-manager modules

### `storage.js`
- `StorageManager` module for chrome.storage.local
- Session isolation by video ID (`yt_chat_read_<VIDEO_ID>`)
- Automatic cleanup of old sessions (keeps 30 most recent)
- Async API with error handling

### `message-manager.js`
- `MessageManager` module for DOM operations
- Stable message ID generation (YouTube ID → fallback hash)
- Checkbox injection with event isolation
- Read/unread styling application
- Duplicate prevention via WeakSet tracking

### `styles.css`
- Native-looking checkbox (matches YouTube's design language)
- Dark/light theme support via `prefers-color-scheme` and YouTube's `[dark]` attribute
- Strikethrough only on message text (not author, metadata, chips)
- Reduced motion & high contrast support
- RTL support
- Print styles (hides checkboxes, keeps strikethrough)

### `background.js`
- Service worker for extension lifecycle
- Daily cleanup of old storage sessions
- Message handling for potential popup integration

## Debugging

### Console Commands (in DevTools on Live Chat page)

```javascript
// Check extension status
YTChatReadTracker.getStats().then(console.log)

// See all read message IDs for current session
YTChatReadTracker.getReadMessages()

// Force reprocess all messages
YTChatReadTracker.processExistingMessages()

// Clear current session data
YTChatReadTracker.clearSession()

// Reinitialize extension
YTChatReadTracker.initialize()
```

### Background Page Debugging

1. Go to `chrome://extensions/`
2. Find "YouTube Live Chat Read Tracker"
3. Click "Service worker" link (opens DevTools for background.js)
4. Check console for cleanup logs

### Common Issues

| Issue | Solution |
|-------|----------|
| Checkboxes not appearing | Refresh page; check DevTools console for errors |
| Read status not persisting | Verify `storage` permission granted; check storage quota |
| Duplicate checkboxes | Extension handles this automatically; try `YTChatReadTracker.cleanup()` then `YTChatReadTracker.initialize()` |
| Not working on popout | Popout is separate page; extension loads automatically |
| Styling looks wrong | YouTube updates CSS; check `styles.css` for selector changes |

## Known Limitations

1. **YouTube DOM Changes**: YouTube frequently updates Live Chat DOM structure. Selectors in `message-manager.js` may need updates.

2. **Message ID Stability**: Fallback ID uses author+text+timestamp hash. Identical messages from same user at same second may collide (rare).

3. **Chat Replay**: Works on live_chat_replay but messages load differently; may need manual reprocess.

4. **Embedded Chat**: Limited testing on embedded chat iframes; may not inject due to CSP.

5. **Mobile**: Extension only works on desktop Chromium browsers with extension support.

6. **Storage Quota**: chrome.storage.local has ~5MB limit. With 10k messages per session, supports ~500 sessions before cleanup.

7. **No Sync**: Read status is local to this browser/profile only. No cloud sync.

## Development

### Prerequisites
- Chromium-based browser (Chrome, Edge, Brave, Vivaldi, etc.)
- Text editor / IDE

### Making Changes

1. Edit source files
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension card
4. Refresh the Live Chat page

### Testing Checklist

- [ ] Regular live chat messages get checkboxes
- [ ] Clicking checkbox applies strikethrough
- [ ] Refresh page - read status persists
- [ ] Navigate to different live chat - separate tracking
- [ ] Super Chat messages work
- [ ] Dark/light theme both look correct
- [ ] Popout chat window works
- [ ] No console errors

### Rebuilding Icons

Open `icons/generate-icons.html` in browser and click "Generate Icons", or run:

```bash
cd icons
npm install canvas
node generate-icons.js
```

## Privacy

- **No network requests** - Extension never contacts external servers
- **No analytics** - No tracking, no user identification
- **Local storage only** - Data stays in your browser's `chrome.storage.local`
- **Minimal permissions** - Only `storage` and YouTube host access
- **Open source** - Full source code visible and auditable

## License

MIT License - Feel free to use, modify, and distribute.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on actual YouTube Live Chat
5. Submit a pull request

## Changelog

### v1.0.0 (Initial Release)
- Core checkbox functionality
- Persistent storage per session
- MutationObserver for new messages
- Support for text, Super Chat, Super Sticker messages
- Dark/light theme support
- Automatic cleanup of old sessions
- Debug console API

---

**Made for streamers who want a simple way to track which chat messages they've read.**
