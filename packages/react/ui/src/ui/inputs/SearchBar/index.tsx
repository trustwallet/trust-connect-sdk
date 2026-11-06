import { useState, type ChangeEvent } from 'react'
import styles from './styles.module.css'
import { SearchIcon } from '../../icons/SearchIcon.js'
import { CloseIcon } from '../../icons/CloseIcon.js'

interface SearchBarProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
	const [isFocused, setIsFocused] = useState(false)

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value)
	}

	const handleClear = () => {
		onChange('')
	}

	return (
		<div className={`${styles.searchBar} ${isFocused ? styles.focused : ''}`}>
			<div className={styles.searchIcon}>
				<SearchIcon />
			</div>
			<input
				type="text"
				value={value}
				onChange={handleChange}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
				placeholder={placeholder}
				className={styles.input}
			/>
			{value && (
				<button type="button" onClick={handleClear} className={styles.clearButton} aria-label="Clear search">
					<CloseIcon />
				</button>
			)}
		</div>
	)
}
