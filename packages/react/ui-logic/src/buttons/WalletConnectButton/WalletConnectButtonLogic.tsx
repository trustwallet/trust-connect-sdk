import { useWalletConnect } from '@trustwallet/connect-walletconnect/react'
import { useConnect, useWalletIds } from '@trustwallet/connect-headless'
import type { ComponentType } from 'react'
import { useTrustModal } from '../../context/TrustModalContext.js'

interface WalletConnectButtonLogicProps {
	components: {
		title: ComponentType
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
		}>
	}
}

export function WalletConnectButtonLogic({ components }: WalletConnectButtonLogicProps) {
	const { title: Title, grid: Grid, walletButton: WalletButton } = components
	const { wallet, generateUri } = useWalletConnect()
	const { setView } = useTrustModal()
	const { connectedWalletIds, connectingWalletIds } = useWalletIds()
	const { disconnect } = useConnect()

	if (!wallet) return null

	const isConnected = connectedWalletIds.includes(wallet.id)
	const isConnecting = connectingWalletIds.includes(wallet.id)

	const isDisabled = connectedWalletIds.length > 0 && !connectedWalletIds.includes(wallet.id)

	const handleClick = async () => {
		if (isConnected) {
			disconnect()
			return
		}
		setView('qr')
		await generateUri()
		return
	}

	return (
		<>
			<Title />
			<Grid>
				<WalletButton
					key={wallet.id}
					name={wallet.name}
					icon={wallet.icon}
					active={isConnected}
					variant="walletconnect"
					actionLabel={isConnected ? 'Disconnect' : 'Connect'}
					onClick={handleClick}
					disabled={isDisabled}
					loading={isConnecting}
				/>
			</Grid>
		</>
	)
}
