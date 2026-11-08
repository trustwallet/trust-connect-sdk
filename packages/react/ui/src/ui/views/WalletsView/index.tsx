import { WalletsViewLogic } from '@trustwallet/connect-ui-logic'
import { WalletButton } from '../../buttons/WalletButton/index.js'
import { WalletConnectButton } from '../../buttons/WalletConnectButton/index.js'
import { GetTrustButton } from '../../buttons/GetTrustButton/index.js'
import { WalletsHeader } from './components/WalletsHeader/index.js'
import { WalletsGrid } from './components/WalletsGrid/index.js'

export function WalletsView() {
	return (
		<WalletsViewLogic
			components={{
				emptyState: GetTrustButton,
				header: WalletsHeader,
				grid: WalletsGrid,
				walletButton: WalletButton,
				walletConnectButton: WalletConnectButton,
			}}
		/>
	)
}
