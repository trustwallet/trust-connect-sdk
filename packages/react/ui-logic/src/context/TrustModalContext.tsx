import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { NamespaceId, Wallet, CaipWallet } from '@trustwallet/connect-headless'
import { useConnect, ReactContextError, useNamespaces } from '@trustwallet/connect-headless'
import { useTheme, type Theme, type ResolvedTheme } from '../hooks/useTheme.js'

export type ModalView = 'wallets' | 'networks' | 'qr'

/**
 * ModalType creates to different types of flow in the modal.
 * Users can connect by selecting a wallet and then selecting the network (type wallet).
 * Or by selecting a network first and the selecting a wallet (type namespace)
 */
export type ModalType = 'wallet' | 'namespace'

type OpenOptions =
	| {
			type?: Extract<ModalType, 'wallet'>
			namespaceId?: undefined
	  }
	| { type: Extract<ModalType, 'namespace'>; namespaceId?: NamespaceId }

export type TrustModalContextValue = {
	isOpen: boolean
	view: ModalView
	namespaceFilter?: NamespaceId
	targetWallet: Wallet | CaipWallet | null
	theme: Theme
	resolvedTheme: ResolvedTheme
	modalType: ModalType
	open: (options?: OpenOptions) => void
	close: () => void
	setView: (view: ModalView) => void
	goBack: () => void
	setNamespaceFilter: (namespaceId?: NamespaceId) => void
	setTargetWallet: (wallet: Wallet | CaipWallet | null) => void
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

const TrustModalContext = createContext<TrustModalContextValue | null>(null)

export type TrustModalProviderProps = {
	children: ReactNode
	theme?: Theme
}

export function TrustModalProvider({ children, theme: initialTheme }: TrustModalProviderProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [view, setViewState] = useState<ModalView>('wallets')
	const [modalType, setModalType] = useState<ModalType>('wallet')
	const historyRef = useRef<ModalView[]>([])
	const [namespaceFilter, setNamespaceFilter] = useState<NamespaceId | undefined>(undefined)
	const [targetWallet, setTargetWallet] = useState<Wallet | CaipWallet | null>(null)
	const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme(initialTheme)
	const { clearError, abortConnect, isLoading } = useConnect()
	const { namespaces } = useNamespaces()

	useEffect(() => {
		if (namespaces.length === 1) {
			setModalType('namespace')
		}
	}, [namespaces])

	const setView = useCallback(
		(nextView: ModalView) => {
			historyRef.current.push(view)
			setViewState(nextView)
		},
		[view],
	)

	const goBack = useCallback(() => {
		clearError()
		if (isLoading) abortConnect()

		const last = historyRef.current.pop()
		setViewState(last ?? (modalType === 'wallet' ? 'wallets' : 'networks'))
	}, [clearError, abortConnect, modalType, isLoading])

	const open = useCallback((options: OpenOptions = {}) => {
		const type = options.type || 'wallet'
		setModalType(type)

		setIsOpen(true)
		historyRef.current = []
		setNamespaceFilter(options.namespaceId)
		setTargetWallet(null)
	}, [])

	const close = useCallback(() => {
		setIsOpen(false)
		setNamespaceFilter(undefined)
		setTargetWallet(null)
		historyRef.current = []
		setViewState('wallets')
	}, [])

	const value = useMemo(
		() => ({
			isOpen,
			view,
			namespaceFilter,
			targetWallet,
			theme,
			resolvedTheme,
			modalType,
			open,
			close,
			setView,
			goBack,
			setNamespaceFilter,
			setTargetWallet,
			setTheme,
			toggleTheme,
		}),
		[
			isOpen,
			view,
			namespaceFilter,
			targetWallet,
			theme,
			resolvedTheme,
			modalType,
			open,
			close,
			setView,
			goBack,
			setNamespaceFilter,
			setTargetWallet,
			setTheme,
			toggleTheme,
		],
	)

	return <TrustModalContext.Provider value={value}>{children}</TrustModalContext.Provider>
}

export function useTrustModal(): TrustModalContextValue {
	const context = useContext(TrustModalContext)
	if (!context) {
		throw new ReactContextError('useTrustModal', 'TrustModalProvider')
	}
	return context
}
