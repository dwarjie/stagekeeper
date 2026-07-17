import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest((env) => {
  const isFirefox = env.mode === 'firefox'

  return {
    manifest_version: 3,
    name: 'Stagekeeper — Odoo.sh Staging Expiry Tracker',
    short_name: 'Stagekeeper',
    description:
      'Tracks Odoo.sh staging branch expiration dates and warns before they are auto-dropped.',
    version: pkg.version,
    icons: {
      48: 'public/logo.png',
    },
    action: {
      default_icon: {
        48: 'public/logo.png',
      },
      default_popup: 'src/popup/index.html',
    },
    options_ui: {
      page: 'src/options/index.html',
      open_in_tab: true,
    },
    permissions: ['storage', 'alarms', 'notifications'],
    content_scripts: [
      {
        js: ['src/content/index.ts'],
        matches: ['https://www.odoo.sh/*'],
        run_at: 'document_idle',
      },
    ],
    background: isFirefox
      ? { scripts: ['src/background/service-worker.ts'], type: 'module' }
      : { service_worker: 'src/background/service-worker.ts', type: 'module' },
    ...(isFirefox && {
      browser_specific_settings: {
        gecko: {
          id: 'stage-keeper@ichini.dev',
          strict_min_version: '121.0',
        },
      },
    }),
  }
})
