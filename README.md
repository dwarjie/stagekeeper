<div align="center">
    <img src="public/logo.png" width="96" />
    <h1>Stagekeeper</h1>
    <p>Never lose an Odoo.sh staging database again — track expiration dates and get warned before branches are dropped.</p>
    <div>
        <a href="https://chromewebstore.google.com/detail/stagekeeper-%E2%80%94-odoosh-stag/klccpnbcjmoakcijjgghkhekcngoednj">
            <img alt="Chrome Web Store" src="https://img.shields.io/chrome-web-store/rating/klccpnbcjmoakcijjgghkhekcngoednj?style=flat-square&logo=chromewebstore&logoColor=white&label=Rating&color=%233871e1"/>
        </a>
        <a href="https://addons.mozilla.org/en-US/firefox/addon/stagekeeper/">
            <img alt="Mozilla Add-on" src="https://img.shields.io/amo/rating/stage-keeper?style=flat-square&logo=firefoxbrowser&logoColor=white&label=Rating&color=%23ed6449"/>
        </a>
    </div>
</div>

---

## What is Stagekeeper?

**Stagekeeper** is a browser extension that tracks the expiration dates of your Odoo.sh **staging** branches and warns you before they are automatically dropped.

Odoo.sh cut staging retention from 3 months to **1 month** — a branch rebuilt today is auto-dropped ~30 days later, taking its database with it. Stagekeeper adds a **Track** button on staging branch pages, remembers each branch's real expiration date, and raises a browser notification before it's too late to back up or rebuild.

---

## Features

### Tracking

- **One-click tracking** — a floating Track button appears on every Odoo.sh staging branch page
- **Real expiration dates** — read live from Odoo.sh, not estimated
- **Rebuild-aware** — re-click Track after a rebuild to refresh the stored date
- **SPA-aware** — the button follows you as you switch branches without a page reload

### Notifications

- **Daily check** — compares every tracked branch against your warning threshold once per day
- **Browser notifications** — get warned when a branch expires within your configured window; click the notification to jump straight to the branch
- **Toolbar badge** — the extension icon shows a red counter with the number of expiring branches, updated the moment you track, untrack, or change the threshold
- **Configurable threshold** — choose how many days of warning you want (default: 1)

### Popup & Settings

- **At-a-glance list** — all tracked branches sorted by soonest expiry, with a time-left badge on every row
- **Red highlight** — branches inside the warning window are impossible to miss
- **Quick actions** — open a branch on Odoo.sh or stop tracking it, right from the popup

### Compatibility

- Works on **Chromium based browsers** (Chrome, Edge, Brave, etc.) and **Firefox**
- Manifest V3, one codebase for both browsers
- No external services — everything is stored locally in your browser

---

## How to Use

1. Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/stagekeeper/CHROME_EXTENSION_ID) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/stage-keeper/).
2. Open one of your Odoo.sh **staging** branch pages.
3. Click the floating **Track** button — the branch's live expiration date is fetched and stored.
4. Click the extension icon to see all tracked branches, and open the settings page to configure how many days of warning you want.

> **Tip:** Rebuilding a staging branch resets its real expiration date. Re-click **Track** after a rebuild so Stagekeeper stores the new date.

---

## Roadmap

- [x] Track button on staging branch pages (SPA navigation aware)
- [x] Live expiration date fetching from Odoo.sh
- [x] Daily expiry check with browser notifications
- [x] Popup with expiry badges and red highlighting
- [x] Configurable warning threshold
- [x] Firefox support
- [x] Toolbar badge with the number of expiring branches

---

## Development

```bash
# clone the repository
git clone https://github.com/dwarjie/stage-keeper.git
cd stage-keeper

# install dependencies
pnpm install

# build the extension
pnpm build # or build:firefox
```

To load the built extension locally, follow the [Chrome unpacked extension guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) (load `dist/`) or the [Firefox temporary add-on guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) (load `dist-firefox/manifest.json`).

---

## Technologies

| Technology                                                                | Purpose                            |
| ------------------------------------------------------------------------- | ---------------------------------- |
| [React](https://react.dev/)                                               | Extension UI                       |
| [Vite](https://vitejs.dev/)                                               | Build tooling                      |
| [Crxjs](https://crxjs.dev/)                                               | Browser extension development tool |
| [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) | Cross-browser extension API        |
| [TypeScript](https://www.typescriptlang.org/)                             | Typed storage & message contracts  |
| [Radix Icons](https://www.radix-ui.com/icons)                             | Popup & options iconography        |

---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

---

## Author's Note

This project was born out of losing a staging database one too many times after Odoo.sh shortened its retention window. Stagekeeper is intentionally simple: it only stores what you explicitly track, checks once a day, and never talks to anything but Odoo.sh itself.

If you find it useful, consider leaving a review on the [Chrome Web Store](https://chromewebstore.google.com/detail/stagekeeper/klccpnbcjmoakcijjgghkhekcngoednj) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/stagekeeper/) — it helps a lot. 🙏
