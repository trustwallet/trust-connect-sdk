import type { WalletAdapterBase } from '../05-wallet/base.js'
import type { ChainId } from './caip/index.js'
import type { CaipWallet, NamespaceWallet } from './wallet/index.js'

/**
 * Augmented placeholder types for safe casting in the UI layer.
 *
 * Core SDK types are complex generics. UI layer sees them as `unknown`.
 * These are intentional "skeleton" types with just the properties UI needs.
 */

/**
 * Single connection cast type
 * @example connections[id] as Cast['connection']
 */
export type CastConnection = {
	status?: 'disconnected' | 'connecting' | 'connected'
	wallet?: NamespaceWallet | CaipWallet
	address?: string
	chain?: {
		id: ChainId
		reference: string | number
	}
}

/**
 * Connections map cast type
 * @example connections as Cast['connections']
 */
export type CastConnections<T extends string> = Record<T, CastConnection | undefined>

/**
 * Wallet namespaces cast type
 * @example wallet.namespaces as Cast['walletNamespaces']
 */
export type CastWalletNamespaces = Record<string, WalletAdapterBase | undefined>

/**
 * Main casting utility - access via Cast['connection'], Cast['connections'], etc.
 */
export interface Cast<T extends string = string> {
	connection: CastConnection
	connections: CastConnections<T>
	walletNamespaces: CastWalletNamespaces
}
