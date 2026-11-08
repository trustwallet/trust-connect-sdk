import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const packageRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
	},
	resolve: {
		alias: {
			'@trustwallet/connect-core': path.resolve(packageRoot, '../../core/src/index.ts'),
			'@trustwallet/connect-utils/encoding': path.resolve(packageRoot, '../../utils/src/encoding/index.ts'),
			'@trustwallet/connect-eip155-types': path.resolve(packageRoot, '../../types/namespaces/eip155/src/index.ts'),
			'@trustwallet/connect-solana-types': path.resolve(packageRoot, '../../types/namespaces/solana/src/index.ts'),
			'@trustwallet/connect-bip122-types': path.resolve(packageRoot, '../../types/namespaces/bip122/src/index.ts'),
		},
	},
})
