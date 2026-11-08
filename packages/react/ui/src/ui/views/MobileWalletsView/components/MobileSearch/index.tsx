import { useCopyToClipboard } from '@trustwallet/connect-ui-logic'
import { SearchBar } from '../../../../inputs/SearchBar/index.js'
import styles from './styles.module.css'
import { CheckIcon } from '../../../../icons/CheckIcon.js'
import { CopyIcon } from '../../../../icons/CopyIcon.js'

interface MobileSearchProps {
	searchQuery: string
	setSearchQuery: (query: string) => void
	uri: string | undefined
}

export function MobileSearch({ searchQuery, setSearchQuery, uri }: MobileSearchProps) {
	const { copied, copy } = useCopyToClipboard()

	const handleCopyUri = async () => {
		if (!uri) return
		await copy(uri)
	}

	return (
		<div className={styles.searchContainer}>
			<SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search wallets..." />
			<button
				type="button"
				onClick={handleCopyUri}
				className={styles.copyButton}
				aria-label="Copy WalletConnect URI"
				disabled={!uri}
				data-copied={copied}
			>
				{copied ? <CheckIcon /> : <CopyIcon />}
			</button>
		</div>
	)
}
