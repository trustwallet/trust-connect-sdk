import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface NamespaceGridProps {
	children: ReactNode
}

export function NamespaceGrid({ children }: NamespaceGridProps) {
	return <div className={styles.grid}>{children}</div>
}
