import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import styles from './styles.module.css'
import { Spinner } from '../../icons/Spinner.js'

type NamespaceButtonProps = {
	label: string
	icon: string
	onClick?: () => void
	actionLabel?: string
	loading?: boolean
	disabled?: boolean
	connectedWallet?: { id: string; name: string; icon: string } | null
}

export function NamespaceButton({
	icon,
	label,
	onClick,
	actionLabel,
	loading,
	disabled,
	connectedWallet,
}: NamespaceButtonProps) {
	const handleClick = () => {
		if (!disabled && !loading) {
			onClick?.()
		}
	}

	return (
		<div
			className={styles.namespaceButton}
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					handleClick()
				}
			}}
			data-disabled={disabled}
			data-loading={loading}
		>
			<img width={28} src={icon} />
			<span className={styles.meta}>
				<span className={styles.name}>{label}</span>
				{connectedWallet && (
					<span className={styles.connectedWith}>
						<img src={connectedWallet.icon} alt="" className={styles.connectedWalletIcon} />
						{connectedWallet.name}
					</span>
				)}
			</span>
			{actionLabel && (
				<span className="tcui-button tcui-button-primary" data-loading={loading}>
					{loading ? <Spinner /> : actionLabel}
				</span>
			)}
		</div>
	)
}
