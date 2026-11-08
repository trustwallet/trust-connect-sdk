import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

function signClientVersion(): string {
	let dir = path.dirname(require.resolve('@walletconnect/sign-client'))
	for (let i = 0; i < 6; i++) {
		const candidate = path.join(dir, 'package.json')
		if (existsSync(candidate)) {
			const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string; version?: string }
			if (pkg.name === '@walletconnect/sign-client' && pkg.version) return pkg.version
		}
		dir = path.dirname(dir)
	}
	throw new Error('Could not read @walletconnect/sign-client version')
}

describe('WalletConnect sign-client', () => {
	it('is 2.23.10 or newer, which rejects wc_sessionUpdate from a non-controller', () => {
		const [major, minor, patch] = signClientVersion().split('.').map(Number)

		expect(major).toBe(2)
		expect(minor > 23 || (minor === 23 && patch >= 10)).toBe(true)
	})
})
