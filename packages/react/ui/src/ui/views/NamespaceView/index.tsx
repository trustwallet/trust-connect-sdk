import { NamespaceViewLogic } from '@trustwallet/connect-ui-logic'
import { NamespaceButton } from '../../buttons/NamespaceButton/index.js'
import { NamespaceHeader } from './components/NamespaceHeader/index.js'
import { NamespaceGrid } from './components/NamespaceGrid/index.js'

export function NamespaceView() {
	return (
		<NamespaceViewLogic
			components={{
				header: NamespaceHeader,
				grid: NamespaceGrid,
				namespaceButton: NamespaceButton,
			}}
		/>
	)
}
