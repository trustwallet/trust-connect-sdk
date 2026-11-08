import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	esbuild: {
		jsx: 'automatic',
	},
	resolve: {
		alias: {
			'@trustwallet/connect-core': path.resolve(root, '../../core/src/index.ts'),
			'@trustwallet/connect-headless': path.resolve(root, '../headless/src/index.ts'),
			'@trustwallet/connect-utils': path.resolve(root, '../../utils/src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
		typecheck: {
			enabled: true,
			// Namespace augmentations make core's source fail existing assignability checks.
			// Those errors are outside these tests.
			ignoreSourceErrors: true,
			tsconfig: './tsconfig.vitest.json',
			spawnTimeout: 60_000,
		},
	},
})
