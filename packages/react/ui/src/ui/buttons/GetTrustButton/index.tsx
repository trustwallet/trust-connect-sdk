import { GetTrustButtonLogic } from '@trustwallet/connect-ui-logic'
import { GetTrustWrapper } from './components/GetTrustWrapper/index.js'
import { GetTrustMessage } from './components/GetTrustMessage/index.js'
import { WalletButton } from '../WalletButton/index.js'

interface GetTrustButtonProps {
	message?: string
}

export function GetTrustButton({ message }: GetTrustButtonProps) {
	return (
		<GetTrustButtonLogic
			message={message}
			components={{
				wrapper: GetTrustWrapper,
				message: GetTrustMessage,
				walletButton: WalletButton,
			}}
		/>
	)
}
