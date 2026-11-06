import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { WalletConnectExplorer, type ExplorerWallet } from '../../explorer-api/index.js'
import { useWalletConnectService } from './useWalletConnectService.js'
import { getPlatform } from '@trustwallet/connect-utils'
import { WalletConnectServiceNotInitializedError } from '../../errors/index.js'

/**
 * Hook to fetch and paginate WalletConnect explorer wallets
 * @param query - Optional search query to filter wallets
 * @returns Wallets data, loading states, and pagination controls
 */
export function useWalletConnectExplorer(
	{ query, entries }: { query: string; entries?: number } = { query: '', entries: 10 },
) {
	const service = useWalletConnectService()
	if (!service) throw new WalletConnectServiceNotInitializedError()

	const explorer = useMemo(() => {
		return new WalletConnectExplorer(service.projectId)
	}, [service])

	const [wallets, setWallets] = useState<ExplorerWallet[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [hasMore, setHasMore] = useState(true)
	const pageRef = useRef(1)

	const platform = getPlatform()

	const fetchWallets = useCallback(
		async (search: string, reset = false) => {
			if (reset) {
				pageRef.current = 1
				setWallets([])
				setHasMore(true)
			}

			if (reset) {
				setIsLoading(true)
			} else {
				setIsLoadingMore(true)
			}
			setError(null)
			try {
				const response = await explorer.fetchWallets({
					page: pageRef.current,
					entries: entries || 10,
					search,
					platforms: platform === 'desktop' ? undefined : [platform],
				})

				if (reset) {
					setWallets(response.data)
				} else {
					setWallets((prev) => [...prev, ...response.data])
				}

				setHasMore(response.data.length === 10)
				pageRef.current += 1
			} catch (err) {
				setError(err instanceof Error ? err : new Error('Failed to fetch wallets'))
			} finally {
				setIsLoading(false)
				setIsLoadingMore(false)
			}
		},
		[explorer, platform],
	)

	const loadMore = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			fetchWallets(query, false)
		}
	}, [fetchWallets, query, isLoadingMore, hasMore])

	useEffect(() => {
		const timer = setTimeout(() => {
			fetchWallets(query, true)
		}, 300)

		return () => clearTimeout(timer)
	}, [query, fetchWallets])

	return {
		wallets,
		isLoading,
		isLoadingMore,
		error,
		hasMore,
		loadMore,
	}
}
