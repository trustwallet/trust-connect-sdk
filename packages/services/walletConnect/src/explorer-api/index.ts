/**
 * WalletConnect Explorer API
 * Reference: https://docs.walletconnect.network/walletguide/explorer
 */

import { WalletConnectExplorerApiError } from '../errors/index.js'

export interface ExplorerWallet {
	id: string
	name: string
	homepage: string
	image_id: string
	iconUrl: string
	order: number
	mobile_link?: string
	desktop_link?: string
	webapp_link?: string
	app_store?: string
	play_store?: string
	rdns?: string
	mobile?: {
		native?: string
		universal?: string
	}
	desktop?: {
		native?: string
		universal?: string
	}
	injected?: Array<{
		namespace: string
		injected_id: string
	}>
	metadata?: {
		shortName?: string
		colors?: {
			primary?: string
			secondary?: string
		}
	}
}

export interface ExplorerApiResponse<T> {
	count: number
	data: T[]
}

export interface FetchWalletsOptions {
	page?: number
	entries?: number
	search?: string
	ids?: string[]
	chains?: string[]
	platforms?: Array<'ios' | 'android' | 'mac' | 'windows' | 'linux' | 'injected'>
	sdks?: Array<'sign_v1' | 'sign_v2' | 'auth_v1'>
	standards?: string[]
}

export class WalletConnectExplorer {
	private readonly baseUrl = 'https://explorer-api.walletconnect.com/v3'
	private readonly projectId: string
	private readonly searchDebounceMs: number

	private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
	private pendingSearchPromise: Promise<ExplorerApiResponse<ExplorerWallet>> | null = null

	constructor(projectId: string, searchDebounceMs = 300) {
		this.projectId = projectId
		this.searchDebounceMs = searchDebounceMs
	}

	/**
	 * Fetches wallets from the WalletConnect Explorer API
	 * - Search queries are debounced
	 * @param options - Filtering and pagination options
	 * @returns Promise with wallets response
	 */
	async fetchWallets(options: FetchWalletsOptions = {}): Promise<ExplorerApiResponse<ExplorerWallet>> {
		const isSearch = Boolean(options.search && options.search.trim())

		if (isSearch) {
			return this.fetchWalletsWithDebounce(options)
		}

		return this.fetchFromApi(options)
	}

	/**
	 * Fetches wallets with debounce for search queries
	 */
	private async fetchWalletsWithDebounce(options: FetchWalletsOptions): Promise<ExplorerApiResponse<ExplorerWallet>> {
		if (this.searchDebounceTimer) {
			clearTimeout(this.searchDebounceTimer)
		}

		if (this.pendingSearchPromise) {
			return this.pendingSearchPromise
		}

		this.pendingSearchPromise = new Promise((resolve, reject) => {
			this.searchDebounceTimer = setTimeout(async () => {
				try {
					const result = await this.fetchFromApi(options)
					this.pendingSearchPromise = null
					resolve(result)
				} catch (error) {
					this.pendingSearchPromise = null
					reject(error)
				}
			}, this.searchDebounceMs)
		})

		return this.pendingSearchPromise
	}

	/**
	 * Performs the actual API fetch
	 */
	private async fetchFromApi(options: FetchWalletsOptions): Promise<ExplorerApiResponse<ExplorerWallet>> {
		const params = this.buildWalletsQueryParams(options)
		const url = `${this.baseUrl}/wallets?${params.toString()}`

		try {
			const response = await fetch(url)
			if (!response.ok) {
				throw new WalletConnectExplorerApiError(response.status, response.statusText)
			}

			const rawData = (await response.json()) as { listings: Record<string, Omit<ExplorerWallet, 'iconUrl'>> }

			// Convert listings object to array
			const walletsArray = Object.values(rawData.listings)

			// Add iconUrl to each wallet
			const dataWithIcons: ExplorerApiResponse<ExplorerWallet> = {
				count: walletsArray.length,
				data: walletsArray.map((wallet) => ({
					...wallet,
					iconUrl: this.getLogoUrl(wallet.image_id, 'md'),
				})),
			}

			return dataWithIcons
		} catch (error) {
			throw new Error(
				`Error fetching wallets from Explorer API: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Gets the logo URL for a wallet
	 * @param imageId - The image_id from the explorer entry
	 * @param size - Size of the logo (sm, md, or lg)
	 * @returns The logo URL
	 */
	getLogoUrl(imageId: string, size: 'sm' | 'md' | 'lg' = 'md'): string {
		return `${this.baseUrl}/logo/${size}/${imageId}?projectId=${this.projectId}`
	}

	private buildWalletsQueryParams(options: FetchWalletsOptions): URLSearchParams {
		const params = new URLSearchParams({
			projectId: this.projectId,
		})

		if (options.page !== undefined && options.entries !== undefined) {
			params.append('page', String(options.page))
			params.append('entries', String(options.entries))
		}

		if (options.search) {
			params.append('search', options.search)
		}

		if (options.ids && options.ids.length > 0) {
			params.append('ids', options.ids.join(','))
		}

		if (options.chains && options.chains.length > 0) {
			params.append('chains', options.chains.join(','))
		}

		if (options.platforms && options.platforms.length > 0) {
			params.append('platforms', options.platforms.join(','))
		}

		if (options.sdks && options.sdks.length > 0) {
			params.append('sdks', options.sdks.join(','))
		}

		if (options.standards && options.standards.length > 0) {
			params.append('standards', options.standards.join(','))
		}

		return params
	}
}
