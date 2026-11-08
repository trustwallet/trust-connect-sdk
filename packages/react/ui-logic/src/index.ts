// Context
export { TrustModalProvider, useTrustModal } from './context/TrustModalContext.js'
export type { TrustModalProviderProps, TrustModalContextValue, ModalView, ModalType } from './context/TrustModalContext.js'

// Hooks
export { useTheme } from './hooks/useTheme.js'
export type { Theme, ResolvedTheme } from './hooks/useTheme.js'
export { useCopyToClipboard } from './hooks/useCopyToClipboard.js'

// Utils
export { TRUST_WALLET } from '@trustwallet/connect-utils'

// UI Logic Components
export { TrustModalLogic } from './TrustModal/index.js'
export { WalletsViewLogic } from './views/WalletsView/WalletsViewLogic.js'
export { NamespaceViewLogic } from './views/NamespaceView/NamespaceViewLogic.js'
export { GetTrustButtonLogic } from './buttons/GetTrustButton/GetTrustButtonLogic.js'
export { FooterLogic } from './components/Footer/FooterLogic.js'

export {
	TrustConnectProvider,
	useWallets,
	useConnection,
	useConnections,
	useConnect,
	useNamespaces,
} from '@trustwallet/connect-headless'
export type {
	NamespaceId,
	TrustConnectOptions,
	TrustConnectProviderProps,
	Connections,
	RpcUrls,
} from '@trustwallet/connect-headless'
