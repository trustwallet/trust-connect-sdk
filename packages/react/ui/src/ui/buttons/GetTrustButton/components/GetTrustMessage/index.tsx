import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface GetTrustMessageProps {
	children: ReactNode
}

export function GetTrustMessage({ children }: GetTrustMessageProps) {
	return <div className={styles.message}>{children}</div>
}
