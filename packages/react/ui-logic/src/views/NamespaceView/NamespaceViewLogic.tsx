import type { NamespaceId, Cast } from '@trustwallet/connect-headless'
import { useNamespaces, useConnect, useConnections } from '@trustwallet/connect-headless'
import { useTrustModal } from '../../context/TrustModalContext.js'
import { handleConnectWallet } from '../../utils/handleConnectWallet.js'
import type { ComponentType } from 'react'

interface NamespaceViewLogicProps {
	components: {
		header: ComponentType<{ targetWallet: any }>
		grid: ComponentType<{ children: React.ReactNode }>
		namespaceButton: ComponentType<{
			label: string
			icon: string
			onClick: () => void
			actionLabel: string
			loading: boolean
			connectedWallet?: any
		}>
	}
}

export function NamespaceViewLogic({ components }: NamespaceViewLogicProps) {
	const { header: Header, grid: Grid, namespaceButton: NamespaceButton } = components
	const { namespaces } = useNamespaces()
	const { connections } = useConnections()
	const { connect, disconnect } = useConnect()
	const { targetWallet, modalType, setTargetWallet, setNamespaceFilter, setView } = useTrustModal()

	const handleNamespaceClick = async (namespaceId: NamespaceId) => {
		if (modalType === 'wallet') {
			if (!targetWallet) {
				console.error('No wallet was previously selected, select a wallet before connecting.')
				return
			}
			const connection = (connections as Cast['connections'])[namespaceId]
			const isConnected = connection && connection.status === 'connected'
			if (isConnected) {
				disconnect({ namespaceId })
				return
			}

			await handleConnectWallet({ wallet: targetWallet, namespaceId, connect })
			return
		}

		if (modalType === 'namespace') {
			setTargetWallet(null)
			setNamespaceFilter(namespaceId)
			setView('wallets')
			return
		}
	}

	return (
		<>
			<Header targetWallet={targetWallet} />
			<Grid>
				{namespaces.map((namespace) => {
					if (targetWallet && !Array.from(targetWallet.namespaceIds).includes(namespace.id)) return

					const allConnections = connections as Cast['connections']
					const connection = allConnections[namespace.id]
					const isConnected = connection && connection.status === 'connected'
					const connectedWallet = isConnected ? connection.wallet : null
					const isDifferentWallet = isConnected && targetWallet && connectedWallet?.id !== targetWallet.id

					const actionLabel = targetWallet ? (isConnected ? 'Disconnect' : 'Connect') : 'Select'

					return (
						<NamespaceButton
							key={namespace.id}
							icon={namespace.icon}
							label={namespace.name}
							onClick={() => handleNamespaceClick(namespace.id)}
							actionLabel={actionLabel}
							loading={connection?.status === 'connecting'}
							connectedWallet={isDifferentWallet ? connectedWallet : undefined}
						/>
					)
				})}
			</Grid>
		</>
	)
}
