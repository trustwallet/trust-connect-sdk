import styles from './styles.module.css'
import type { ReactNode } from 'react'

interface WalletsGridProps {
	children: ReactNode
}

export function WalletsGrid({ children }: WalletsGridProps) {
	return <div className={styles.grid}>{children}</div>
}
