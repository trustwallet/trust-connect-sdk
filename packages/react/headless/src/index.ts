export { TrustConnectProvider, useTrustConnectContext } from './context.js'
export type { TrustConnectProviderProps } from './context.js'
export { ReactContextError, MissingRequiredParamError, InvalidResponseError } from './errors.js'
export {
	type TrustConnectOptions,
	type NamespaceId,
	type Wallet,
	type WalletAdapterBase,
	type WalletType,
	type CaipWallet,
	type NamespaceWallet,
	type NamespaceConnection,
	type Cast,
	type CastConnection,
	type CastConnections,
	type CastWalletNamespaces,
	type Connections,
	type RpcUrls,
	extractAddress,
	extractChainRef,
	extractNamespace,
	formatChainId,
	buildChainId,
	NoWalletConnectedError,
	WalletNotFoundInConnectionError,
	NamespaceNotFoundError,
	MissingChainError,
	AccountNotFoundError,
	UnsupportedMethodError,
	InvalidChainRefError,
	ChainNotSupportedError,
	ConnectionFailedError,
} from '@trustwallet/connect-core'
export { useWallets, useConnection, useConnections, useConnect, useNamespaces, useWalletIds } from './hooks/index.js'
