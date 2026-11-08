import {
	useConnect,
	useWallets,
	type Wallet,
	type CaipWallet,
	useConnections,
	useNamespaces,
	type Cast,
	MissingRequiredParamError,
	useWalletIds,
} from '@trustwallet/connect-headless'
import { useTrustModal } from '../../context/TrustModalContext.js'
import { handleConnectWallet } from '../../utils/handleConnectWallet.js'
import { useMemo, type ComponentType } from 'react'
import { TRUST_WALLET } from '@trustwallet/connect-utils'

interface WalletsViewLogicProps {
	components: {
		emptyState: ComponentType<{ message?: string }>
		header: ComponentType<{ namespaceName: string }>
		grid: ComponentType<{ children: React.ReactNode }>
		walletButton: ComponentType<{
			name: string
			icon: string
			active: boolean
			variant: 'default' | 'walletconnect'
			actionLabel: string
			onClick: () => void
			disabled: boolean
			loading: boolean
			supportedNamespaceIcons?: string[]
		}>
		walletConnectButton: ComponentType
	}
}

export function WalletsViewLogic({ components }: WalletsViewLogicProps) {
	const {
		emptyState: EmptyState,
		header: Header,
		grid: Grid,
		walletButton: WalletButton,
		walletConnectButton: WalletConnectButton,
	} = components
	const { wallets } = useWallets()
	const { connect, disconnect } = useConnect()
	const { connections } = useConnections()
	const { namespaces } = useNamespaces()
	const { modalType, namespaceFilter, setTargetWallet, setView } = useTrustModal()
	const { connectedWalletIds, connectingWalletIds } = useWalletIds({ namespaceId: namespaceFilter })

	const sortedWallets = useMemo(() => {
		const filtered = namespaceFilter
			? wallets.filter((wallet) => {
					const supportedNamespaces = Object.keys(wallet.namespaces)
					return supportedNamespaces.includes(namespaceFilter)
				})
			: wallets

		return [...filtered].sort((a, b) => {
			if (a.id === TRUST_WALLET.ID) return -1
			if (b.id === TRUST_WALLET.ID) return 1
			return 0
		})
	}, [wallets, namespaceFilter])

	const namespaceIconsMap = useMemo(() => new Map(namespaces.map((ns) => [ns.id, ns.icon])), [namespaces])

	const activeConnection = useMemo(() => {
		if (!namespaceFilter) return null
		return (connections as Cast['connections'])[namespaceFilter]
	}, [connections, namespaceFilter])

	const hasActiveConnection = activeConnection?.status === 'connected'

	const getSupportedNamespaceIcons = (wallet: Wallet | CaipWallet): string[] | undefined => {
		if (modalType !== 'wallet') return undefined
		return Array.from(wallet.namespaceIds)
			.map((nsId) => namespaceIconsMap.get(nsId))
			.filter(Boolean) as string[]
	}

	const getActionLabel = (isConnected: boolean): string => {
		if (!isConnected) return 'Connect'
		return modalType === 'wallet' ? 'Manage' : 'Disconnect'
	}

	const isWalletDisabled = (wallet: Wallet | CaipWallet): boolean => {
		return modalType === 'namespace' && hasActiveConnection && !connectedWalletIds.includes(wallet.id)
	}

	const handleWalletClick = async (wallet: Wallet | CaipWallet) => {
		if (modalType === 'wallet') {
			setTargetWallet(wallet)
			setView('networks')
			return
		}

		if (modalType === 'namespace') {
			if (!namespaceFilter) throw new MissingRequiredParamError('namespaceFilter')

			const connection = (connections as Cast['connections'])[namespaceFilter]
			const isConnected = connection && connection.status === 'connected'
			if (isConnected) {
				disconnect()
				return
			}

			handleConnectWallet({ wallet, namespaceId: namespaceFilter, connect })
		}
	}

	const namespaceNameFilter = useMemo(() => {
		if (namespaceFilter) {
			return namespaces.find((n) => n.id === namespaceFilter)?.name || ''
		}
		return ''
	}, [namespaceFilter])

	if (sortedWallets.length === 0) {
		const namespaceMessage = modalType === 'namespace' ? `No ${namespaceNameFilter} wallets found.` : undefined

		return (
			<>
				<EmptyState message={namespaceMessage} />
				<WalletConnectButton />
			</>
		)
	}

	return (
		<>
			{namespaceFilter && <Header namespaceName={namespaceNameFilter} />}

			<Grid>
				{sortedWallets.map((wallet) => {
					const isConnected = connectedWalletIds.includes(wallet.id)
					const isConnecting = connectingWalletIds.includes(wallet.id)

					return (
						<WalletButton
							key={wallet.id}
							name={wallet.name}
							icon={wallet.icon}
							active={isConnected}
							variant="default"
							actionLabel={getActionLabel(isConnected)}
							onClick={() => handleWalletClick(wallet)}
							disabled={isWalletDisabled(wallet)}
							loading={isConnecting}
							supportedNamespaceIcons={getSupportedNamespaceIcons(wallet)}
						/>
					)
				})}
			</Grid>

			<WalletConnectButton />
		</>
	)
}
