import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useWalletConnectService } from './useWalletConnectService.js'
import type { CaipWallet } from '@trustwallet/connect-core'
import type { ExplorerWallet } from '../../explorer-api/index.js'
import { useConnect } from '@trustwallet/connect-headless'
import {
	WalletConnectClientNotAvailableError,
	CaipWalletNotInitializedError,
	WalletConnectServiceNotAvailableError,
	LinkNotReadyError,
	MissingMobileDeepLinkError,
} from '../../errors/index.js'

/**
 * Hook to get the WalletConnect URI and generate it
 * Subscribes to URI changes
 * @returns Object with uri, generateUri, isUriLoading, uriError, and wallet
 */
export function useWalletConnect(): {
	uri: string | undefined
	generateUri: () => Promise<void>
	openWalletLink: (wallet: ExplorerWallet) => void
	isUriLoading: boolean
	error: Error | null
	wallet: CaipWallet | undefined
} {
	const service = useWalletConnectService()
	const { connect, isLoading, error } = useConnect()

	const generateUri = useCallback(async () => {
		if (!service) {
			throw new WalletConnectClientNotAvailableError()
		}

		const wallet = service.getCaipWallet()
		if (!wallet) {
			throw new CaipWalletNotInitializedError()
		}

		service.setUri('')
		await connect({ wallet })
	}, [connect, service])

	const openWalletLink = useCallback(
		(wallet: ExplorerWallet) => {
			if (!service) {
				throw new WalletConnectServiceNotAvailableError()
			}

			const currentUri = service.getUri()
			if (!currentUri) {
				throw new LinkNotReadyError()
			}

			const mobileLink = wallet.mobile?.universal || wallet.mobile?.native || wallet.mobile_link

			if (!mobileLink) {
				throw new MissingMobileDeepLinkError(wallet.name)
			}

			// Build the universal link with the WalletConnect URI
			const deepLink = `${mobileLink}wc?uri=${encodeURIComponent(currentUri)}`
			window.open(deepLink, '_blank', 'noreferrer noopener')
		},
		[service],
	)

	const uri = useSyncExternalStore(
		(callback) => {
			if (!service) return () => {}
			return service.onUri(() => callback())
		},
		() => service?.getUri(),
		() => service?.getUri(),
	)

	const wallet = useMemo(() => {
		return service?.getCaipWallet()
	}, [service])

	const isUriLoading = isLoading && !uri

	return { uri, generateUri, openWalletLink, isUriLoading, error, wallet }
}
