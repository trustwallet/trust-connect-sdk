import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface ModalOverlayProps {
	onClick: () => void
	children: ReactNode
}

export function ModalOverlay({ onClick, children }: ModalOverlayProps) {
	return (
		<div className={styles.overlay} role="presentation" onClick={onClick}>
			{children}
		</div>
	)
}
