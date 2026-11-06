import { formatChainId, type NamespaceConstructor, NamespaceEngine, type Scope, MissingChainError } from '@trustwallet/connect-core'
import { WalletStandardRegistry } from './registry.js'
import { SOLANA_ICON, SOLANA_SCOPE } from './constants.js'
import type { CreateSolanaOptions } from './types/config.js'

export function createSolana(config: CreateSolanaOptions): NamespaceConstructor {
	if (!config.chain) throw new MissingChainError(SOLANA_SCOPE.ID)
	const chain = config.chain
	const { reference } = formatChainId(chain)

	/** Supported chain are added dynamically. */
	const scope: Scope = { ...SOLANA_SCOPE, CHAINS: [reference] }

	return {
		__createNamespace: () => {
			const registry = new WalletStandardRegistry({ chainRef: reference })

			return {
				namespace: new NamespaceEngine({
					registries: [...(config.registries ?? []), registry],
					id: scope.ID,
					name: scope.NAME,
					icon: SOLANA_ICON,
					rpcUrls: config.rpcUrls,
				}),
				scope,
			}
		},
	}
}
