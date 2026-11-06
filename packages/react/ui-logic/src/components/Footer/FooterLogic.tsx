import type { ComponentType } from 'react'
import { TRUST_WALLET } from '@trustwallet/connect-utils'

interface FooterLogicProps {
	components: {
		wrapper: ComponentType<{ children: React.ReactNode }>
		description: ComponentType<{ children: React.ReactNode }>
		link: ComponentType<{
			onClick: () => void
			children: React.ReactNode
		}>
	}
}

export function FooterLogic({ components }: FooterLogicProps) {
	const { wrapper: Wrapper, description: Description, link: Link } = components

	const handleInstallClick = () => {
		window.open(TRUST_WALLET.INSTALL_LINK, '_blank', 'noopener,noreferrer')
	}

	return (
		<Wrapper>
			<Description>Don't have a wallet?</Description>
			<Link onClick={handleInstallClick}>Install Trust Wallet</Link>
		</Wrapper>
	)
}
