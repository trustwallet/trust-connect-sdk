import type { ReactNode, RefObject } from 'react'
import styles from './styles.module.css'

interface ModalBodyProps {
	children: ReactNode
	bodyRef?: RefObject<HTMLDivElement | null>
}

export function ModalBody({ children, bodyRef }: ModalBodyProps) {
	return (
		<div ref={bodyRef} className={styles.body}>
			{children}
		</div>
	)
}
