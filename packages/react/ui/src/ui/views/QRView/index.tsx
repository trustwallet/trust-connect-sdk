import { QRViewLogic } from '@trustwallet/connect-ui-logic/walletConnect'
import { QRWrapper } from './components/QRWrapper/index.js'
import { QRPlaceholder } from './components/QRPlaceholder/index.js'
import { QRActions } from './components/QRActions/index.js'
import { QRButton } from './components/QRButton/index.js'
import { QRError } from './components/QRError/index.js'
import { Cuer } from 'cuer'
import { Spinner } from '../../icons/Spinner.js'

export function QRView() {
	return (
		<QRViewLogic
			components={{
				wrapper: QRWrapper,
				placeholder: QRPlaceholder,
				qrCode: Cuer,
				actions: QRActions,
				button: QRButton,
				error: QRError,
				spinner: Spinner,
			}}
		/>
	)
}
