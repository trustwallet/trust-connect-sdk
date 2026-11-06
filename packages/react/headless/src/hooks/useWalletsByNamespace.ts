import { useMemo, useSyncExternalStore } from 'react'
import type { NamespaceId, WalletAdapterBase } from '@trustwallet/connect-core'
import { NamespaceNotFoundError } from '@trustwallet/connect-core'
import { useTrustConnectContext } from '../context.js'

/**
 * Get all wallets from TrustConnect registry.
 */
export function useWalletsByNamespace(namespaceId?: NamespaceId): WalletAdapterBase[] {
	const { client } = useTrustConnectContext()

	const namespace = useMemo(() => {
		/** if the id is not provided we mock the namespace */
		if (!namespaceId) {
			// the getter function must return always the same reference variable.
			const emptyArray: WalletAdapterBase[] = []
			return {
				onWallets() {
					return () => emptyArray
				},
				getWallets: () => emptyArray,
			}
		}
		return client.getNamespace(namespaceId)
	}, [namespaceId])

	if (!namespace) throw new NamespaceNotFoundError(namespaceId!)

	return useSyncExternalStore(
		(callback) => namespace.onWallets(callback),
		() => namespace.getWallets(),
		() => namespace.getWallets(),
	)
}
