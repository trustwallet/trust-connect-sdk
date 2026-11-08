import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import styles from './styles.module.css'
import { CheckIcon } from '../../icons/CheckIcon.js'
import { Spinner } from '../../icons/Spinner.js'

type WalletButtonProps = {
	name: string
	icon: string
	variant?: 'default' | 'walletconnect'
	active?: boolean
	actionLabel?: string
	onClick?: () => void
	disabled?: boolean
	loading?: boolean
	error?: string
	supportedNamespaceIcons?: string[]
}

export function WalletButton({
	name,
	icon,
	variant = 'default',
	active = false,
	actionLabel = 'Connect',
	onClick,
	disabled,
	loading,
	error,
	supportedNamespaceIcons,
}: WalletButtonProps) {
	const handleClick = () => {
		if (!disabled && !loading) {
			onClick?.()
		}
	}

	return (
		<div
			className={styles.walletButton}
			data-variant={variant}
			data-active={active}
			data-disabled={disabled}
			data-loading={loading}
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					handleClick()
				}
			}}
		>
			<span className={styles.icon} aria-hidden>
				<img src={icon} alt={name} />
			</span>
			<span className={styles.meta}>
				<span className={styles.name}>
					{name}
					{active && <CheckIcon />}
				</span>
				{supportedNamespaceIcons && supportedNamespaceIcons.length > 0 && (
					<span className={styles.namespaces}>
						{supportedNamespaceIcons.map((nsIcon, i) => (
							<img key={i} src={nsIcon} alt="" />
						))}
					</span>
				)}
				{error && <span className={styles.error}>{error}</span>}
			</span>
			<span className={`tcui-button ${active ? '' : 'tcui-button-primary'}`} data-loading={loading}>
				{loading ? <Spinner /> : actionLabel}
			</span>
		</div>
	)
}
