
# Udemy Live Japanese Caption Translator

A Chrome extension that translates Udemy English video captions into Japanese in real time using Chrome's built-in Translator API.

## Features

- Real-time English-to-Japanese caption translation
- Uses Chrome's on-device Translator API
- No external translation API or API key required
- Replaces English captions visually with Japanese captions
- Preserves Udemy's original caption DOM
- In-memory translation cache
- Automatic caption change detection
- Restores English captions when disabled
- No transcript panel required

## Requirements

- Chrome 138 or later (desktop)
- A device supporting the Chrome Translator API
- Udemy videos with English closed captions (CC)

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Select "Load unpacked".
5. Select the repository folder.
6. Open a Udemy video and enable English CC.
7. Click "日本語字幕 開始" on the video.

The translation model may be downloaded on first use.

## How It Works

1. Detect the English caption DOM:
   `[data-purpose="captions-cue-text"]`
2. Translate caption text with Chrome Translator API.
3. Cache completed translations in memory.
4. Hide the original English text using CSS only when the Japanese translation is ready.
5. Display Japanese text in a separate overlay.
6. Restore English captions when translation is disabled.

## Limitations

- Currently supports English to Japanese only.
- Requires existing Udemy English captions.
- Initial translations may be delayed.
- Some fullscreen player modes may not support the overlay.
- Udemy DOM changes may require maintenance.

## Notes

- The overlay uses Japanese-capable fonts (Hiragino Sans, Yu Gothic, Meiryo, Noto Sans JP) before falling back to Arial.
- Element ids, CSS classes, and the global guard key use a `ja` prefix, so this extension can be installed alongside the English-to-Korean version without conflicts.
- Developer helpers are exposed as `window.udemyJaCaptionTranslator` (`start`, `stop`, `destroy`).

## Privacy

Translation is performed using the browser's on-device translation capability. The extension does not send captions to a separate translation service.

## Version

1.0.0 — Initial release.
