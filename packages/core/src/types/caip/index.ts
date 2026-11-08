import type { NamespaceSpecs } from '../namespace/specs.js'

// NamespaceId is now derived from NamespaceSpecs keys, making it augmentative
export type NamespaceId = keyof NamespaceSpecs extends never ? string : keyof NamespaceSpecs
export type ChainReference = string | number
export type ChainId = `${NamespaceId extends string ? NamespaceId : string}:${ChainReference}`
export type Address<T extends string = string> = T
export type AccountId = `${ChainId}:${Address}`
export type CaipSessionEvent = {
	event: {
		name: string
		data: unknown
	}
	chainId: ChainId
}

export interface CaipSessionResponse {
	namespaces: Record<NamespaceId, NamespaceScopedResponse>
	sessionProperties?: Record<string, unknown>
}

export interface NamespaceScopedResponse {
	/**
	 * The account addresses of the wallet
	 * */
	accounts: string[]
	methods: string[]
	events: string[]
	/**
	 * The chain references of the namespace
	 * */
	chains: string[]
}

/**
 * Generic CAIP provider interface for multi-namespace wallets
 * This is used by wallets that support multiple namespaces (e.g., WalletConnect)
 */
export type CaipProvider = {
	request<T = unknown>(args: { request: { method: string; params?: unknown }; chainId: ChainId }): Promise<T>
}
