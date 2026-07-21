# Telegraphic — User guide

Turn Telegram Desktop chat exports into a customizable bar-chart-race video, preview it live, share a view-only link, and download MP4 in the browser.

## 1. Sign up / sign in

Create an account with email + password. Your projects live on the Home page.

## 2. Create a rating

On Home, click **New rating** (or **Create your first rating** when empty). Open the project to enter the editor.

## 3. Import chats (Data)

1. Open the **Data** panel.
2. Click **Add record** and drop a Telegram Desktop single-chat export (`result.json` or a ZIP that contains it).
3. Repeat for more chats. Rename, hide, or delete records as needed. Avatars can be uploaded per record (resized in the browser).

Raw Telegram messages never leave your browser. Only daily message totals and theme settings are saved to the server.

## 4. Customize (Total & Design)

- **Total** — Top N, date range, scale, screen size, speed, delays, smoothing.
- **Design** — Background (frontiers, fill, timer) and Card (bars, labels, avatars, overrides).

Changes preview instantly in the canvas. The bottom player scrub/play uses the same engine as export.

## 5. Save

Edits autosave while you work. The toolbar shows **Saving…** / **Saved**. If the project is too large (e.g. many large avatars), you’ll see a clear oversized-payload error — remove some avatars or records and try again.

## 6. Share

1. Open the **Share** panel.
2. Click **Make a link** to create a view-only URL `/p/…`.
3. **Copy** / **Revoke** links under **Manage links**.
4. **Download a video** encodes MP4 in the browser (WebM fallback when WebCodecs isn’t available — Chrome/Firefox/Safari differences are explained in the player notice).

## 7. Public page

Anyone with the link can play the race, download a video, or **Duplicate to my projects** (sign-in required). Shared pages are `noindex`.

## Browser notes

- Best MP4 export: Chromium with WebCodecs.
- Safari / older browsers may fall back to WebM with an on-screen notice.
- Export runs entirely in your browser; keep the tab open until the download finishes.
