import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface FooterWrapperProps {
	children: ReactNode
}

export function FooterWrapper({ children }: FooterWrapperProps) {
	return <div className={styles.container}>{children}</div>
}
