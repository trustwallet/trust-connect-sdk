import { BackIcon } from '../../icons/BackIcon.js'
import { CloseIcon } from '../../icons/CloseIcon.js'
import styles from './styles.module.css'

interface ModalHeaderProps {
	title: string
	showBack?: boolean
	onBack?: () => void
	onClose: () => void
}

export function ModalHeader({ title, showBack, onBack, onClose }: ModalHeaderProps) {
	return (
		<header className={styles.header}>
			{showBack && onBack && (
				<button type="button" className={styles.back} onClick={onBack} aria-label="Go back">
					<BackIcon />
				</button>
			)}
			<h2 className={styles.title}>{title}</h2>
			<button type="button" className={styles.close} onClick={onClose} aria-label="Close modal">
				<CloseIcon />
			</button>
		</header>
	)
}
