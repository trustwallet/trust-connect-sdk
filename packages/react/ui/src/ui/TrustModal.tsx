import '../styles/global.css'
import { TrustModalLogic } from '@trustwallet/connect-ui-logic'
import { MobileWalletsView } from './views/MobileWalletsView/index.js'
import { WalletsView } from './views/WalletsView/index.js'
import { NamespaceView } from './views/NamespaceView/index.js'
import { QRView } from './views/QRView/index.js'
import { ModalOverlay } from './layout/ModalOverlay/index.js'
import { ModalWrapper } from './layout/ModalWrapper/index.js'
import { ModalHeader } from './layout/ModalHeader/index.js'
import { ModalBody } from './layout/ModalBody/index.js'
import { ModalError } from './layout/ModalError/index.js'

export function TrustModal() {
	return (
		<TrustModalLogic
			layout={{
				overlay: ModalOverlay,
				wrapper: ModalWrapper,
				header: ModalHeader,
				body: ModalBody,
				error: ModalError,
			}}
			views={[
				{ title: 'Connect a wallet', tag: 'wallets', node: WalletsView },
				{ title: 'Select a network', tag: 'networks', node: NamespaceView },
				{ title: 'Scan with mobile wallet', tag: 'qr', node: QRView },
			]}
			mobileViews={[{ title: 'Connect a wallet', tag: 'wallets', node: MobileWalletsView }]}
		/>
	)
}
