import { useEffect, useMemo } from 'react'
import { WALLETCONNECT_WALLET } from '@trustwallet/connect-walletconnect'
import { useWalletConnect } from '@trustwallet/connect-walletconnect/react'
import { useWalletIds } from '@trustwallet/connect-headless'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.js'
import type { ComponentType } from 'react'
import { useTrustModal } from '../../context/TrustModalContext.js'

interface QRViewLogicProps {
	components: {
		wrapper: ComponentType<{ children: React.ReactNode }>
		placeholder: ComponentType<{ children: React.ReactNode }>
		qrCode: ComponentType<{ arena: string; value: string }>
		actions: ComponentType<{ children: React.ReactNode }>
		button: ComponentType<{
			onClick: () => void
			disabled?: boolean
			children: string
		}>
		error: ComponentType<{ message: string }>
		spinner: ComponentType
	}
}

export function QRViewLogic({ components }: QRViewLogicProps) {
	const {
		wrapper: Wrapper,
		placeholder: Placeholder,
		qrCode: QRCode,
		actions: Actions,
		button: Button,
		error: Error,
		spinner: Spinner,
	} = components
	const arena = useMemo(() => WALLETCONNECT_WALLET.ICON, [])
	const { uri, isUriLoading, error, wallet } = useWalletConnect()
	const { copied, copy } = useCopyToClipboard()
	const { close } = useTrustModal()
	const { connectedWalletIds } = useWalletIds()

	const handleCopy = async () => {
		if (!uri) return
		await copy(uri)
	}

	useEffect(() => {
		if (wallet && connectedWalletIds.includes(wallet.id)) {
			close()
		}
	}, [wallet, connectedWalletIds])

	return (
		<Wrapper>
			{isUriLoading || !uri ? (
				<Placeholder>
					<Spinner />
				</Placeholder>
			) : (
				<QRCode arena={arena} value={uri} />
			)}

			<Actions>
				<Button onClick={handleCopy} disabled={!uri || isUriLoading}>
					{copied ? 'Copied!' : 'Copy to clipboard'}
				</Button>
			</Actions>

			{error && <Error message={error.message} />}
		</Wrapper>
	)
}
