# YT Chat Tracker

A lightweight Chromium browser extension that helps YouTube livestreamers keep track of which live chat messages they have read.

Instead of losing your place as new messages arrive, mark a message as read with a checkbox. Read messages are visually crossed out, making it easier to see which messages still need your attention.

## Features

- **Mark messages as read:** A checkbox is added alongside supported YouTube Live Chat messages.
- **Clear visual status:** Checked messages receive a strikethrough so you can distinguish them from unread messages.
- **Live chat integration:** Designed to work directly in YouTube's live chat interface.
- **Lightweight workflow:** No separate dashboard is needed; use the tracker where you already read chat.

> Compatibility and persistence behaviour can depend on the current YouTube interface and the extension build. See [Known limitations](#known-limitations).

## Installation

### Install from source (Developer mode)

1. Download or clone this repository.
2. Extract the ZIP file if you downloaded one.
3. Open your browser's extensions page:
   - **Google Chrome:** `chrome://extensions`
   - **Microsoft Edge:** `edge://extensions`
   - **Opera:** `opera://extensions`
4. Turn on **Developer mode**.
5. Select **Load unpacked**.
6. Choose the project folder containing `manifest.json`.
7. Open a YouTube livestream and display its live chat.

Keep the project folder in a permanent location. The browser loads the extension from that folder.

### Updating a local installation

1. Download or pull the latest project files.
2. Open the browser's extensions page.
3. Find **YT Chat Tracker** and select **Reload**.

## How to use

1. Open a YouTube livestream.
2. Open the livestream's chat.
3. Find the checkbox shown beside a supported message.
4. Select the checkbox after reading that message.
5. The message is visually marked with a strikethrough.

Uncheck a message if you want to mark it unread again.

## Browser support

YT Chat Tracker is intended for Chromium-based browsers that support Manifest V3 extensions, such as:

- Google Chrome
- Microsoft Edge
- Opera

The exact behaviour may vary between browsers and YouTube's different live chat layouts.

## Project structure

The source files are located in the repository root. The main extension entry point is `manifest.json`.

## Development

To work on the extension:

1. Clone the repository.
2. Make changes to the source files.
3. Load the project folder using the browser's **Load unpacked** option.
4. Reload the extension after making changes.
5. Test the changes on an actual YouTube livestream chat.

Please test against the live YouTube interface. YouTube may change its page structure, which can affect how extensions detect and decorate chat messages.

## Known limitations

- The extension depends on YouTube's live chat page structure, which can change without notice.
- Not every chat message type or embedded chat layout is guaranteed to be supported.
- Browser-level extension enable/disable controls are managed by the browser, not by this extension.
- Compatibility should be verified against the specific browser and extension version being used.

## Contributing

Issues, bug reports, and improvements are welcome.

When reporting a problem, include:

- Browser name and version.
- Whether you are using the pop-out chat or the chat beside a livestream.
- What you expected to happen.
- What happened instead.
- Relevant screenshots or console errors (remove personal information first).

## License

No license has been specified yet. Unless a license is added to this repository, all rights remain with the copyright holder and reuse is not automatically permitted.
