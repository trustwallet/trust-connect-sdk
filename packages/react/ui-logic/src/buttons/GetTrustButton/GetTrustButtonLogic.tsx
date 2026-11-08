import type { ComponentType } from 'react'
import { TRUST_WALLET } from '@trustwallet/connect-utils'

interface GetTrustButtonLogicProps {
	message?: string
	components: {
		wrapper: ComponentType<{ children: React.ReactNode }>
		message: ComponentType<{ children: React.ReactNode }>
		walletButton: ComponentType<{
			name: string
			icon: string
			actionLabel: string
			onClick: () => void
		}>
	}
}

export function GetTrustButtonLogic({ message, components }: GetTrustButtonLogicProps) {
	const { wrapper: Wrapper, message: Message, walletButton: WalletButton } = components

	const handleGetWallet = () => {
		window.open(TRUST_WALLET.INSTALL_LINK, '_blank', 'noopener,noreferrer')
	}

	const defaultMessage = 'No wallets found. Get Trust Wallet to get started.'

	return (
		<Wrapper>
			<Message>{message || defaultMessage}</Message>
			<WalletButton name={TRUST_WALLET.NAME} icon={TRUST_WALLET.LOGO} actionLabel="Install" onClick={handleGetWallet} />
		</Wrapper>
	)
}
