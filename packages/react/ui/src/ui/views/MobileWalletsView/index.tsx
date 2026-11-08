import { MobileWalletsViewLogic } from '@trustwallet/connect-ui-logic/walletConnect'
import { MobileEmptyState } from './components/MobileEmptyState/index.js'
import { MobileLoading } from './components/MobileLoading/index.js'
import { MobileSearch } from './components/MobileSearch/index.js'
import { MobileWalletsList } from './components/MobileWalletsList/index.js'
import { MobileWrapper } from './components/MobileWrapper/index.js'
import { Footer } from '../../components/Footer/index.js'

export function MobileWalletsView() {
	return (
		<MobileWalletsViewLogic
			components={{
				wrapper: MobileWrapper,
				search: MobileSearch,
				loading: MobileLoading,
				emptyState: MobileEmptyState,
				walletsList: MobileWalletsList,
				footer: Footer,
			}}
		/>
	)
}
