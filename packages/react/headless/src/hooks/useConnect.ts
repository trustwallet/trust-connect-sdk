import { useCallback, useSyncExternalStore } from 'react'
import type { NamespaceId, Wallet, WalletAdapterBase } from '@trustwallet/connect-core'
import { useTrustConnectContext } from '../context.js'
import { useWallets } from './useWallets.js'
import { useWalletsByNamespace } from './useWalletsByNamespace.js'

/**
 * Main hook for managing wallet connections in TrustConnect.
 * Provides wallet management, connection handling, and loading/error states.
 * @returns an object containing:
 * - connect: function to connect a wallet adapter
 * - error: any error that occurred during connection
 * - isLoading: boolean indicating if a connection is in progress
 * - wallets: array of all available wallets
 */
export function useConnect<T extends NamespaceId | undefined = undefined>({ namespaceId }: { namespaceId?: T } = {}) {
	const { client } = useTrustConnectContext()

	const error = useSyncExternalStore(
		(callback) => client.onError(callback),
		() => client.getError(),
		() => client.getError(),
	)

	const isLoading = useSyncExternalStore(
		(callback) => client.onIsLoading(callback),
		() => client.getIsLoading(),
		() => client.getIsLoading(),
	)

	const globalWallets = useWallets()
	const walletAdapters = useWalletsByNamespace(namespaceId)

	const connect = useCallback(async ({ wallet }: Parameters<typeof client.connect>[0]) => {
		await client.connect({ wallet })
	}, [])

	const disconnect = useCallback(({ namespaceId }: { namespaceId?: NamespaceId } | undefined = {}) => {
		client.disconnect({ namespaceId })
	}, [])

	const abortConnect = useCallback(({ namespaceId }: { namespaceId?: NamespaceId } | undefined = {}) => {
		client.abortConnect({ namespaceId })
	}, [])

	const isConnectionAborted = useSyncExternalStore(
		(callback) => client.onConnectionAborted(callback),
		() => client.getConnectionAborted(),
		() => client.getConnectionAborted(),
	)

	const clearError = useCallback(() => {
		client.clearError()
	}, [])

	const walletsToExport = namespaceId ? walletAdapters : globalWallets

	return {
		connect,
		disconnect,
		abortConnect,
		isConnectionAborted,
		clearError,
		error,
		isLoading,
		wallets: walletsToExport as T extends NamespaceId ? WalletAdapterBase[] : Wallet[],
	}
}
