import { useSyncExternalStore } from 'react'
import type { NamespaceId, Wallet, WalletAdapterBase } from '@trustwallet/connect-core'
import { useTrustConnectContext } from '../context.js'
import { useWalletsByNamespace } from './useWalletsByNamespace.js'

/**
 * Get all wallets from TrustConnect registry.
 */
export function useWallets<T extends NamespaceId | undefined = undefined>({
	namespaceId,
}: {
	namespaceId?: T
} = {}): { wallets: T extends NamespaceId ? WalletAdapterBase[] : Wallet[] } {
	const { client } = useTrustConnectContext()

	const walletAdapters = useWalletsByNamespace(namespaceId)
	const globalWallets = useSyncExternalStore(
		(callback) => client.onWallets(callback),
		() => client.getWallets(),
		() => client.getWallets(),
	)
	const walletsToExport = namespaceId ? walletAdapters : globalWallets

	return {
		wallets: walletsToExport as T extends NamespaceId ? WalletAdapterBase[] : Wallet[],
	}
}
