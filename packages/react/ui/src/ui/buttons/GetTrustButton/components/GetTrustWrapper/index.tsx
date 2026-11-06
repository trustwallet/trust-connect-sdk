import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface GetTrustWrapperProps {
	children: ReactNode
}

export function GetTrustWrapper({ children }: GetTrustWrapperProps) {
	return <div className={styles.container}>{children}</div>
}
