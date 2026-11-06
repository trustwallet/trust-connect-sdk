import type { ReactNode, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import styles from './styles.module.css'

interface ModalWrapperProps {
	children: ReactNode
	onClick: (event: ReactMouseEvent<HTMLDivElement>) => void
	wrapperRef?: RefObject<HTMLDivElement | null>
}

export function ModalWrapper({ children, onClick, wrapperRef }: ModalWrapperProps) {
	return (
		<div
			ref={wrapperRef}
			className={styles.modal}
			role="dialog"
			aria-modal="true"
			aria-label="TrustConnect modal"
			onClick={onClick}
		>
			{children}
		</div>
	)
}
