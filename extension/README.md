# Sable Cast

Unpacked extension for Chrome and Edge (Manifest V3).

## Install

1. Open `chrome://extensions` or `edge://extensions`.
2. Turn on Developer mode.
3. Load unpacked and choose this folder.
4. Pin Sable Cast.

## What it does

- Lists `<video>` and `<audio>` on the current tab, plus media URLs the page requests.
- Opens a receiver tab in the same browser and plays the chosen direct URL.
- Mirrors a screen, window, or tab into its own window you can put on another display.
- Plays a local file, with optional WebVTT subtitles.
- Alt+Shift+S casts the first detected stream.

DRM, encrypted manifests, and login-walled players will not yield a castable URL. That is the same limit every browser caster has.

## Apple TV

1. On the Apple TV open Settings → AirPlay and Home and set Access to Everyone.
2. Settings → Network shows the IP address. Put that in the extension.
3. Find checks port 7000. Apple TV sends the chosen https video to the TV.

The Apple TV fetches the file itself. A blob URL, a login-only player, or DRM (Netflix, Disney+, most of YouTube) will not play. A direct MP4 or HLS link will.

Pause, Play, and Stop talk to the same Apple TV. Full-screen mirroring of the desktop still has to be done from macOS Control Center → Screen Mirroring. Chrome cannot encode an AirPlay mirror session.
