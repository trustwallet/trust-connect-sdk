import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface FooterDescriptionProps {
	children: ReactNode
}

export function FooterDescription({ children }: FooterDescriptionProps) {
	return <div className={styles.description}>{children}</div>
}
