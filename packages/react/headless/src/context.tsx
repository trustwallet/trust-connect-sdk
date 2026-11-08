import { createContext, useContext, useState, type ReactNode } from 'react'
import { TrustConnect, type TrustConnectOptions } from '@trustwallet/connect-core'
import { ReactContextError } from './errors.js'

type TrustConnectContextValue = {
	client: TrustConnect
}

const TrustConnectContext = createContext<TrustConnectContextValue | null>(null)

export type TrustConnectProviderProps = {
	children: ReactNode
	config: TrustConnectOptions
}

export function TrustConnectProvider({ children, config }: TrustConnectProviderProps) {
	const [client] = useState(() => new TrustConnect(config))
	return <TrustConnectContext.Provider value={{ client }}>{children}</TrustConnectContext.Provider>
}

export function useTrustConnectContext(): TrustConnectContextValue {
	const context = useContext(TrustConnectContext)
	if (!context) {
		throw new ReactContextError('useTrustConnectContext', 'TrustConnectProvider')
	}
	return context
}
