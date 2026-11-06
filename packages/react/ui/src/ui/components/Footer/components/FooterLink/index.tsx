import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface FooterLinkProps {
	onClick: () => void
	children: ReactNode
}

export function FooterLink({ onClick, children }: FooterLinkProps) {
	return (
		<button className={styles.link} onClick={onClick}>
			{children}
		</button>
	)
}
