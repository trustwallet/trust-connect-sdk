import type { Address, ChainId, ChainReference, NamespaceId } from '../types/index.js'

export function extractChainRef(chain: ChainId | ChainReference): ChainReference {
	const strChain = chain.toString()
	if (!strChain.includes(':')) return chain

	const [_, reference] = strChain.split(':')
	return reference
}

export function extractAddress(accountId: string): Address {
	if (!accountId.includes(':')) return accountId

	const parts = accountId.split(':')
	return parts[parts.length - 1]
}

export function extractNamespace(chain: ChainId | NamespaceId): NamespaceId {
	if (!chain.includes(':')) return chain

	const [namespace, _] = chain.split(':')
	return namespace
}

export function formatChainId(chainId: ChainId): {
	namespace: string
	reference: string
} {
	const [namespace, reference] = chainId.split(':')
	return {
		namespace,
		reference,
	} satisfies {
		namespace: NamespaceId
		reference: ChainReference
	}
}

export function buildChainId({ namespace, reference }: { namespace: NamespaceId; reference: ChainReference }): ChainId {
	return `${namespace}:${reference}`
}
