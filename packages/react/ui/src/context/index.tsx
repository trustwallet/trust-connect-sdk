import {
	TrustModalProvider,
	type Theme,
	TrustConnectProvider as _TrustConnectProvider,
	type TrustConnectOptions,
} from '@trustwallet/connect-ui-logic'
import { TrustModal } from '../ui/TrustModal.js'
import type { ReactNode } from 'react'

export type TrustConnectProviderProps = {
	children: ReactNode
	config: TrustConnectOptions
	theme?: Theme
}

export function TrustConnectProvider({ children, config, theme }: TrustConnectProviderProps) {
	return (
		<_TrustConnectProvider config={config}>
			<TrustModalProvider theme={theme}>
				{children}
				<TrustModal />
			</TrustModalProvider>
		</_TrustConnectProvider>
	)
}
