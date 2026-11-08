import type { ChainId, NamespaceId, Scope } from '@trustwallet/connect-core'

const NAMESPACES_REQUIRING_PREFIX: Set<NamespaceId> = new Set(['solana'])

export function scopeInterceptor(namespace: NamespaceId, scope: Scope): Scope {
	const transformedChains: ChainId[] = []

	for (let chain of scope.CHAINS) {
		transformedChains.push(`${scope.ID}:${chain}`)
	}

	if (!NAMESPACES_REQUIRING_PREFIX.has(namespace)) {
		return {
			...scope,
			CHAINS: transformedChains,
		}
	}

	const transformedMethods: Record<string, string> = {}

	for (const [key, method] of Object.entries(scope.METHODS)) {
		if (method.includes('_')) {
			transformedMethods[key] = method
		} else {
			// Add namespace prefix (e.g., solana_signMessage)
			transformedMethods[key] = `${namespace}_${method}`
		}
	}

	return {
		...scope,
		METHODS: transformedMethods,
		CHAINS: transformedChains,
	}
}
