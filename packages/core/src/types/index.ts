// CAIP Types
export type {
	NamespaceId,
	AccountId,
	ChainId,
	ChainReference,
	Address,
	CaipSessionEvent,
	CaipSessionResponse,
	NamespaceScopedResponse,
	CaipProvider,
} from './caip/index.js'

// Namespace Types
export type {
	NamespaceSpecs,
	NamespaceAddress,
	NamespaceProvider,
	NamespaceChainReference,
	NamespaceConnection,
	Scope,
	ConnectedChain,
	RpcUrls,
} from './namespace/index.js'

// TrustConnect Types
export type {
	TrustConnectOptions,
	NamespaceConstructor,
	ServiceConstructor,
	Connections,
} from './trust-connect/index.js'

// Wallet Types
export type { WalletType, Wallet, WalletParam, CaipWallet, NamespaceWallet } from './wallet/index.js'

// Casting Types
export type { Cast, CastConnection, CastConnections, CastWalletNamespaces } from './casting.js'
