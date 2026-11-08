import type { WalletAdapterBase } from '../../05-wallet/base.js'
import type { NamespaceId } from '../caip/index.js'
import type { NamespaceSpecs } from '../namespace/index.js'

/**
 * Represents a multi-chain wallet that can support multiple blockchains.
 * A wallet aggregates multiple namespace-specific adapters (e.g., a wallet that supports both Ethereum and Bitcoin).
 */
export type WalletType = 'namespace' | 'caip'

export type CaipWallet = WalletAdapterBase<'caip'>
export type NamespaceWallet = WalletAdapterBase<'namespace'>

export type Wallet = {
	id: string
	name: string
	type: WalletType
	icon: string
	/** An array of the wallet's supported namespace IDs */
	namespaceIds: Set<NamespaceId>
	/** Map of supported namespaces to their respective wallet adapters. Partial because a wallet may not support all namespaces. */
	namespaces: Partial<{
		[NS in keyof NamespaceSpecs]: WalletAdapterBase<
			'namespace',
			NamespaceSpecs[NS]['address'],
			NamespaceSpecs[NS]['provider']
		>
	}>
}

export type WalletParam = NamespaceWallet | CaipWallet | WalletAdapterBase<WalletType>
