import { useMemo, useSyncExternalStore } from 'react'
import type { Connections } from '@trustwallet/connect-core'
import { NamespaceNotFoundError } from '@trustwallet/connect-core'
import { useTrustConnectContext } from '../context.js'

type UseConnectionReturnType<T extends keyof Connections> = {
	connection: NonNullable<Connections[T]>
} & (
	| {
			isConnected: true
			isConnecting: false
			address: NonNullable<NonNullable<Connections[T]>['address']>
			chain: NonNullable<Connections[T]>['chain']
			wallet: NonNullable<Connections[T]>['wallet']
			status: 'connected'
	  }
	| {
			isConnected: false
			isConnecting: true
			address: undefined
			chain: NonNullable<Connections[T]>['chain'] | undefined
			wallet: NonNullable<Connections[T]>['wallet']
			status: 'connecting'
	  }
	| {
			isConnecting: false
			isConnected: false
			address: undefined
			chain: undefined
			wallet: undefined
			status: 'disconnected'
	  }
)
/**
 * Get a single active connection from TrustConnect.
 * Returns a typed connection and derived connection flags for the namespace.
 */
export function useConnection<T extends keyof Connections>(options: { namespaceId: T }): UseConnectionReturnType<T> {
	const { namespaceId } = options
	const { client } = useTrustConnectContext()

	const namespace = useMemo(() => {
		const namespace = client.getNamespace(namespaceId)
		if (!namespace) throw new NamespaceNotFoundError(namespaceId)
		return namespace
	}, [namespaceId, client])

	const connection = useSyncExternalStore(
		(callback) => namespace.onConnection(callback),
		() => namespace.getConnection(),
		() => namespace.getConnection(),
	)

	return {
		connection,
		isConnected: connection.status === 'connected',
		isConnecting: connection.status === 'connecting',
		address: connection.address,
		chain: connection.chain,
		wallet: connection.wallet,
		status: connection.status,
	} as UseConnectionReturnType<T>
}
