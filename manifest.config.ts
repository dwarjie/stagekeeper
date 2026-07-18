import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest((env) => {
	const isFirefox = env.mode === 'firefox';

	return {
		manifest_version: 3,
		name: 'Stagekeeper — Odoo.sh Staging Expiry Tracker',
		short_name: 'Stagekeeper',
		description:
			'Tracks Odoo.sh staging branch expiration dates and warns before they are auto-dropped.',
		version: pkg.version,
		icons: {
			16: 'public/icon-16.png',
			32: 'public/icon-32.png',
			48: 'public/icon-48.png',
			128: 'public/icon-128.png',
		},
		action: {
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
					data_collection_permissions: {
						required: ['none'],
					},
				},
			},
		}),
	};
});
