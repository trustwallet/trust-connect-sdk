import type { Cast, NamespaceId } from '@trustwallet/connect-core'
import { useMemo } from 'react'
import { useConnections } from './useConnections.js'

interface WalletIds {
	connectedWalletIds: string[]
	connectingWalletIds: string[]
}

export function useWalletIds<T extends NamespaceId | undefined = undefined>({
	namespaceId,
}: {
	namespaceId?: T
} = {}): WalletIds {
	const { connections } = useConnections()

	return useMemo(() => {
		const connectedWalletIds: string[] = []
		const connectingWalletIds: string[] = []

		if (namespaceId) {
			// If we have a namespace filter, only check that specific namespace
			const connection = (connections as Cast['connections'])[namespaceId]
			if (connection?.wallet?.id) {
				if (connection.status === 'connected') {
					connectedWalletIds.push(connection.wallet.id)
				} else if (connection.status === 'connecting') {
					connectingWalletIds.push(connection.wallet.id)
				}
			}
		} else {
			// Check all namespaces
			for (const connection of Object.values(connections)) {
				const castedCon = connection as Cast['connection']
				if (castedCon?.wallet?.id) {
					if (castedCon.status === 'connected') {
						connectedWalletIds.push(castedCon.wallet.id)
					} else if (castedCon.status === 'connecting') {
						connectingWalletIds.push(castedCon.wallet.id)
					}
				}
			}
		}

		return { connectedWalletIds, connectingWalletIds }
	}, [connections, namespaceId])
}
