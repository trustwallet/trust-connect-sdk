import type { NamespaceEngine } from '../../02-namespace/engine.js'
import type { ServiceBase } from '../../03-services/base.js'
import type { WalletAdapterBase } from '../../05-wallet/base.js'
import type { NamespaceId } from '../caip/index.js'
import type { NamespaceConnection, NamespaceSpecs, Scope } from '../namespace/index.js'

export interface TrustConnectOptions {
	namespaces: NamespaceConstructor[]
	services?: ServiceConstructor[]
}

export type NamespaceConstructor = {
	__createNamespace: () => {
		namespace: NamespaceEngine
		scope: Scope
	}
}

export type ServiceConstructor = {
	__createService: ({ scopes }: { scopes: Map<NamespaceId, Scope> }) => ServiceBase
}

/**
 * Connection states for all namespaces, typed correctly per namespace.
 * Each namespace (eip155, solana, bitcoin) has its own specific connection state with proper types.
 */
export type Connections = {
	[K in keyof NamespaceSpecs]?: NamespaceConnection<
		NamespaceSpecs[K]['address'],
		WalletAdapterBase<'namespace', NamespaceSpecs[K]['address'], NamespaceSpecs[K]['provider']>
	>
}
