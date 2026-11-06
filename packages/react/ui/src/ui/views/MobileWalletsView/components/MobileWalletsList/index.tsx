import type { RefObject } from 'react'
import styles from './styles.module.css'
import { WalletButton } from '../../../../buttons/WalletButton/index.js'
import { Spinner } from '../../../../icons/Spinner.js'
import type { ExplorerWallet } from '@trustwallet/connect-ui-logic/walletConnect'

interface MobileWalletsListProps {
	wallets: ExplorerWallet[]
	connectingWalletId: string | null
	connectionError: string | null
	isLoadingMore: boolean
	scrollRef: RefObject<HTMLDivElement | null>
	onWalletClick: (wallet: ExplorerWallet) => void
}

export function MobileWalletsList({
	wallets,
	connectingWalletId,
	connectionError,
	isLoadingMore,
	scrollRef,
	onWalletClick,
}: MobileWalletsListProps) {
	return (
		<div className={styles.grid} ref={scrollRef}>
			{wallets.map((wallet) => (
				<WalletButton
					key={wallet.id}
					name={wallet.name}
					icon={wallet.iconUrl}
					active={false}
					variant="default"
					actionLabel="Connect"
					onClick={() => onWalletClick(wallet)}
					loading={connectingWalletId === wallet.id}
					error={connectionError ?? undefined}
				/>
			))}
			{isLoadingMore && (
				<div className={styles.loadingMore}>
					<Spinner />
				</div>
			)}
		</div>
	)
}
