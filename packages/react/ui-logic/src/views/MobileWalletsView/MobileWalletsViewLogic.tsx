import { useState, useRef, useEffect, type ComponentType } from 'react'
import type { ExplorerWallet } from '@trustwallet/connect-walletconnect'
import { useWalletConnect, useWalletConnectExplorer } from '@trustwallet/connect-walletconnect/react'
import { useTrustModal } from '../../context/TrustModalContext.js'
import { useConnect } from '@trustwallet/connect-headless'

interface MobileWalletsViewLogicProps {
	components: {
		wrapper: ComponentType<{ children: React.ReactNode }>
		search: ComponentType<{
			searchQuery: string
			setSearchQuery: (query: string) => void
			uri: string | undefined
		}>
		loading: ComponentType
		emptyState: ComponentType<{ searchQuery?: string }>
		walletsList: ComponentType<{
			wallets: ExplorerWallet[]
			connectingWalletId: string | null
			connectionError: string | null
			isLoadingMore: boolean
			scrollRef: React.RefObject<HTMLDivElement | null>
			onWalletClick: (wallet: ExplorerWallet) => void
		}>
		footer: ComponentType
	}
}

export function MobileWalletsViewLogic({ components }: MobileWalletsViewLogicProps) {
	const {
		wrapper: Wrapper,
		search: Search,
		loading: Loading,
		emptyState: EmptyState,
		walletsList: WalletsList,
		footer: Footer,
	} = components
	const [searchQuery, setSearchQuery] = useState('')
	const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null)
	const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null)
	const { close } = useTrustModal()
	const { isConnectionAborted } = useConnect()
	const { error: connectionError, openWalletLink, generateUri, isUriLoading, uri } = useWalletConnect()
	const { wallets, isLoading, isLoadingMore, error, hasMore, loadMore } = useWalletConnectExplorer({
		query: searchQuery,
	})
	const scrollRef = useRef<HTMLDivElement>(null)

	const handleWalletClick = async (wallet: ExplorerWallet) => {
		setConnectingWalletId(wallet.id)
		setConnectionErrorMessage(null)
		openWalletLink(wallet)
	}

	async function handleUriAndAwait() {
		await generateUri()
		if (!error && !isConnectionAborted) close()
	}

	useEffect(() => {
		if (!uri && !isUriLoading) {
			// Auto-generate URI when modal opens on mobile
			handleUriAndAwait()
		}
	}, [uri, isUriLoading])

	useEffect(() => {
		if (connectionError && connectingWalletId) {
			setConnectionErrorMessage(connectionError.message)
			setConnectingWalletId(null)
		}
	}, [connectionError, connectingWalletId])

	useEffect(() => {
		const scrollContainer = scrollRef.current
		if (!scrollContainer) {
			return
		}

		let timeoutId: ReturnType<typeof setTimeout> | null = null

		const handleScroll = () => {
			if (timeoutId) return

			timeoutId = setTimeout(() => {
				const { scrollTop, scrollHeight, clientHeight } = scrollContainer
				const distanceFromBottom = scrollHeight - scrollTop - clientHeight

				if (distanceFromBottom < 100 && hasMore && !isLoadingMore) {
					loadMore()
				}

				timeoutId = null
			}, 150)
		}

		scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			scrollContainer.removeEventListener('scroll', handleScroll)
			if (timeoutId) clearTimeout(timeoutId)
		}
	}, [hasMore, isLoadingMore, loadMore, wallets.length, isLoading, isUriLoading])

	if (error) {
		return <EmptyState />
	}

	const showLoading = isLoading || isUriLoading

	return (
		<Wrapper>
			<Search searchQuery={searchQuery} setSearchQuery={setSearchQuery} uri={uri} />

			{showLoading && <Loading />}

			{!showLoading && wallets.length === 0 && <EmptyState searchQuery={searchQuery} />}

			{!showLoading && wallets.length > 0 && (
				<WalletsList
					wallets={wallets}
					connectingWalletId={connectingWalletId}
					connectionError={connectionErrorMessage}
					isLoadingMore={isLoadingMore}
					scrollRef={scrollRef}
					onWalletClick={handleWalletClick}
				/>
			)}

			<Footer />
		</Wrapper>
	)
}
