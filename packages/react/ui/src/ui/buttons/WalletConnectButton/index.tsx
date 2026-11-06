import { WalletConnectButtonLogic } from '@trustwallet/connect-ui-logic/walletConnect'
import { WalletButton } from '../WalletButton/index.js'
import { WCTitle } from './components/WCTitle/index.js'
import { WCGrid } from './components/WCGrid/index.js'

export function WalletConnectButton() {
	return (
		<WalletConnectButtonLogic
			components={{
				title: WCTitle,
				grid: WCGrid,
				walletButton: WalletButton,
			}}
		/>
	)
}
