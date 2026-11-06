import type { WalletAdapterBase } from '../../05-wallet/base.js'
import type { ChainId, ChainReference, NamespaceId } from '../caip/index.js'
import type { WalletType } from '../wallet/index.js'
import type { NamespaceSpecs } from './specs.js'

export type Scope = {
	ID: NamespaceId
	NAME: string
	CHAINS: Exclude<ChainReference, number>[]
	EVENTS: Record<string, string>
	METHODS: Record<string, string>
}

export type RpcUrls = Record<ChainId, string[]>

// Re-export NamespaceSpecs for convenience
export type { NamespaceSpecs }

type ExtractProperty<T, K extends string> = T extends Record<string, Record<K, infer V>> ? V : unknown

export type NamespaceAddress = ExtractProperty<NamespaceSpecs, 'address'>
export type NamespaceProvider = ExtractProperty<NamespaceSpecs, 'provider'>
export type NamespaceChainReference = ExtractProperty<NamespaceSpecs, 'chain'>

/**
 * Connection state
 */
export type NamespaceConnection<
	TAddress extends NamespaceAddress = NamespaceAddress,
	TWallet extends WalletAdapterBase<WalletType, TAddress, NamespaceProvider> = WalletAdapterBase<
		WalletType,
		TAddress,
		NamespaceProvider
	>,
> =
	| {
			status: 'disconnected'
			wallet: undefined
			address: undefined
			chain: undefined
	  }
	| {
			status: 'connecting'
			wallet: TWallet
			address: undefined
			chain: undefined
	  }
	| {
			status: 'connected'
			wallet: TWallet
			address: TAddress
			chain: ConnectedChain
	  }

/**
 * We avoid using the `id` key to prevent confusion or name collision
 * between CAIP-2 definition of `chain_id` and local definitions (e.g. EIP-155, BIP-122)
 */
export type ConnectedChain = {
	/**
	 * The namespace the chain belongs to (e.g. eip155)
	 */
	namespace: NamespaceId
	/**
	 * The local identifier of the chain as of CAIP-2 (e.g. 1)
	 */
	reference: ChainReference
}
