import { useSyncExternalStore } from 'react'
import type { Connections } from '@trustwallet/connect-core'
import { useTrustConnectContext } from '../context.js'

/**
 * Get all active connections from TrustConnect.
 * Returns a partial object with connections indexed by namespace ID.
 * When namespaceId is provided, the connection type is properly inferred.
 */
export function useConnections(): { connections: Connections } {
	const { client } = useTrustConnectContext()

	const connections = useSyncExternalStore(
		(callback) => client.onConnections(callback),
		() => client.getConnections(),
		() => client.getConnections(),
	)

	return {
		connections,
	}
}
