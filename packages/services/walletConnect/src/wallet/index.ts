import {
	WalletAdapterBase,
	type NamespaceId,
	type WalletType,
	type CaipProvider,
	type CaipSessionResponse,
	type ChainId,
	extractNamespace,
	NoActiveSessionError,
} from '@trustwallet/connect-core'
import type { SessionTypes } from '@walletconnect/types'
import type { WalletConnectService } from '../service/service.js'
import { NAMESPACES, WALLETCONNECT_WALLET } from '../constants.js'
import type { SignClientInstance } from '../types.js'
import type { NamespaceAccountData, NamespaceId as WalletNamespaceId } from './types.js'
import { NAMESPACE_CONFIG } from './namespace-config.js'

type WalletAdapterOptions = {
	walletConnectService: WalletConnectService
}

class AbortError extends Error {
	code = 'ABORT_ERROR' as const

	constructor(message: string) {
		super(message)
		this.name = 'AbortError'
	}
}

const { EIP155, SOLANA, BIP122 } = NAMESPACES
export class WalletConnectWalletAdapter extends WalletAdapterBase<'caip'> {
	// We cannot know if a wallet supports namespaces or not until we make a session request.
	namespaceIds = []
	service: WalletConnectService
	readonly id: string = WALLETCONNECT_WALLET.ID
	readonly type: Extract<WalletType, 'caip'> = 'caip'
	readonly name: string = WALLETCONNECT_WALLET.NAME
	readonly icon: string = WALLETCONNECT_WALLET.ICON
	private currentSession: SessionTypes.Struct | undefined
	connectPromise: Promise<CaipSessionResponse> | undefined
	private accounts = new Map<WalletNamespaceId, Partial<NamespaceAccountData[WalletNamespaceId]>>()
	unsubscribers: (() => void)[] = []

	constructor(readonly options: WalletAdapterOptions) {
		super()
		this.service = options.walletConnectService
	}

	/**
	 * Get account data for a specific namespace
	 */
	private getAccount<N extends WalletNamespaceId>(namespaceId: N): Partial<NamespaceAccountData[N]> {
		return (this.accounts.get(namespaceId) ?? {}) as Partial<NamespaceAccountData[N]>
	}

	/**
	 * Set account data for a specific namespace
	 */
	private setAccount<N extends WalletNamespaceId>(namespaceId: N, data: Partial<NamespaceAccountData[N]>): void {
		this.accounts.set(namespaceId, data)
	}

	/**
	 * Update account data for a specific namespace (merge with existing)
	 */
	private updateAccount<N extends WalletNamespaceId>(namespaceId: N, updates: Partial<NamespaceAccountData[N]>): void {
		const current = this.getAccount(namespaceId)
		this.accounts.set(namespaceId, { ...current, ...updates })
	}

	/**
	 * Reset all account data
	 */
	private resetAllAccounts(): void {
		this.accounts.clear()
	}

	/**
	 * Clean up all pending proposals from previous failed attempts
	 */
	private async cleanupPendingPairings() {
		try {
			const signClient = await this.service.getSignClientInstance()

			const pairings = signClient.core.pairing.getPairings()
			const proposals = signClient.proposal.getAll()

			const activePairingTopics = new Set(
				signClient.session
					.getAll()
					.map((s) => s.pairingTopic)
					.filter(Boolean),
			)

			for (const pairing of pairings) {
				if (!activePairingTopics.has(pairing.topic)) {
					signClient.core.expirer.set(pairing.topic, 0)
				}
			}
			await Promise.allSettled(
				proposals.map((proposal) =>
					signClient.proposal.delete(proposal.id, {
						code: 5000,
						message: 'Cleanup',
					}),
				),
			)
		} catch (error) {
			// Log but don't throw - cleanup is best effort
			console.warn('Failed to cleanup WalletConnect pairings:', error)
		}
	}

	protected async connect(): Promise<CaipSessionResponse> {
		if (this.connectPromise) return this.connectPromise

		this.connectPromise = (async () => {
			try {
				this.service.setUri('')
				const oldSession = await this.reconnect()

				if (oldSession) {
					return oldSession
				}
				await this.cleanupPendingPairings()

				const signClient = await this.service.getSignClientInstance()

				const { uri, approval } = await signClient.connect(await this.service.getConnectParams())

				if (uri) {
					this.service.setUri(uri)
				}
				this.abortController = new AbortController()
				const signal = this.abortController.signal

				const session = await Promise.race([
					approval(),
					new Promise<SessionTypes.Struct>((_, reject) => {
						signal.addEventListener('abort', () => {
							reject(new AbortError('Connection aborted'))
						})
					}),
				])

				this.currentSession = session

				await this.startListeners()

				const namespaces = {} as CaipSessionResponse['namespaces']

				for (const [namespaceKey, namespaceData] of Object.entries(session.namespaces)) {
					const nsKey = namespaceKey as NamespaceId
					const nsData = namespaceData as SessionTypes.Namespace
					namespaces[nsKey] = {
						chains: nsData.chains || [],
						methods: nsData.methods,
						events: nsData.events,
						accounts: nsData.accounts,
					}
				}

				this.service.setUri('')

				this.onConnect(namespaces)
				return { namespaces }
			} catch (error) {
				this.abortController = undefined
				this.service.setUri('')
				this.connectPromise = undefined

				if (error instanceof AbortError) {
					return { namespaces: {} as CaipSessionResponse['namespaces'] }
				}

				throw error
			} finally {
				this.connectPromise = undefined
			}
		})()

		return this.connectPromise
	}

	private disconnectRemainingSessions(signClient: SignClientInstance) {
		const sessions = signClient.session.getAll()

		if (!sessions.length) return

		const sessionsToDisconnect = sessions.slice(0, -1)

		for (const session of sessionsToDisconnect) {
			/**
			 * we don't await- if disconnection fails,
			 * sessions will expire naturally or be cleaned up on next connect.
			 *
			 * Why would the user want a hundred sessions connected to the same website?
			 */
			signClient
				.disconnect({
					topic: session.topic,
					reason: {
						code: 6000,
						message: 'Disconnecting from old session',
					},
				})
				.catch((e) => console.warn(`Unable to disconnect from old session ${session.topic}`, e))
		}
	}

	protected async reconnect(): Promise<CaipSessionResponse | undefined> {
		const signClient = await this.service.getSignClientInstance()
		const sessions = signClient.session.getAll()

		if (!sessions.length) return

		// Use the most recent session
		const session = sessions[sessions.length - 1]
		this.currentSession = session
		this.disconnectRemainingSessions(signClient)

		this.startListeners()

		const namespaces = {} as CaipSessionResponse['namespaces']

		for (const [namespaceKey, namespaceData] of Object.entries(session.namespaces)) {
			const nsKey = namespaceKey as NamespaceId
			const nsData = namespaceData as SessionTypes.Namespace
			namespaces[nsKey] = {
				chains: nsData.chains || [],
				methods: nsData.methods,
				events: nsData.events,
				accounts: nsData.accounts,
			}
		}
		this.onConnect(namespaces)

		return { namespaces }
	}

	protected async disconnect(): Promise<void> {
		try {
			this.stopListeners()
			if (!this.currentSession) return
			const topic = this.currentSession.topic
			const signClient = await this.service.getSignClientInstance()

			// Reset all accounts
			this.resetAllAccounts()

			// Emit empty accounts for EIP155 (fallback behavior)
			this.emitCaipSessionEvent({
				chainId: `${EIP155.ID}:1`,
				event: {
					name: EIP155.EVENTS.ACCOUNTS_CHANGED,
					data: [],
				},
			})

			signClient.disconnect({
				topic,
				reason: {
					code: 6000,
					message: 'User disconnected',
				},
			})

			const inactivePairings = signClient.pairing.getAll()
			for (const pairing of inactivePairings) {
				signClient.core.expirer.set(pairing.topic, 0)
			}

			this.currentSession = undefined
			this.service.setUri('')
		} catch (e: unknown) {
			throw e
		}
	}

	public async getProvider(): Promise<CaipProvider> {
		const signClient = await this.service.getSignClientInstance()

		if (!this.currentSession) {
			throw new NoActiveSessionError()
		}

		const session = this.currentSession

		const provider: CaipProvider = {
			request: async (args) => {
				// Determine namespace from chainId
				const namespaceId = extractNamespace(args.chainId) as WalletNamespaceId
				const config = NAMESPACE_CONFIG[namespaceId]

				if (!config) {
					// Fallback to direct WalletConnect request
					return signClient.request({
						topic: session.topic,
						chainId: args.chainId,
						request: {
							method: args.request.method,
							params: args.request.params,
						},
					})
				}

				// Get account data for this namespace
				const account = this.getAccount(namespaceId)

				// Get the interceptor dynamically
				const interceptor = await config.getInterceptor()

				// Build context using namespace config
				const context = config.buildContext(account, session, signClient)

				// Call the interceptor
				return interceptor(context, args)
			},
		}

		return provider
	}

	protected async startListeners() {
		if (!this.currentSession) return

		this.stopListeners()

		const signClient = await this.service.getSignClientInstance()
		const topic = this.currentSession.topic

		const handleSessionEvent = (event: {
			topic: string
			params: {
				event: { name: string; data: unknown }
				chainId: string
			}
		}) => {
			if (event.topic !== topic) return

			// Determine namespace from chainId
			const namespaceId = extractNamespace(event.params.chainId) as WalletNamespaceId
			const config = NAMESPACE_CONFIG[namespaceId]
			const namespace = NAMESPACES[namespaceId.toUpperCase() as keyof typeof NAMESPACES]

			if (!config || !namespace) {
				// Still emit generic event for unsupported namespaces
				this.emitCaipSessionEvent({
					chainId: event.params.chainId as ChainId,
					event: event.params.event,
				})
				return
			}

			// Handle ACCOUNTS_CHANGED event
			if (event.params.event.name === namespace.EVENTS.ACCOUNTS_CHANGED) {
				const updates = config.parseAccountsChangedEvent(event.params.event.data)
				this.updateAccount(namespaceId, updates)

				const updatedAccount = this.getAccount(namespaceId)
				const eventChainId = (updatedAccount.chainId || event.params.chainId) as ChainId

				this.emitCaipSessionEvent({
					chainId: eventChainId,
					event: {
						name: namespace.EVENTS.ACCOUNTS_CHANGED,
						data: event.params.event.data,
					},
				})
			}

			// Handle CHAIN_CHANGED event
			if (event.params.event.name === namespace.EVENTS.CHAIN_CHANGED) {
				const updates = config.parseChainChangedEvent(event.params.event.data)
				this.updateAccount(namespaceId, updates)

				const updatedAccount = this.getAccount(namespaceId)
				const eventChainId = (updatedAccount.chainId || event.params.chainId) as ChainId

				this.emitCaipSessionEvent({
					chainId: eventChainId,
					event: {
						name: namespace.EVENTS.CHAIN_CHANGED,
						data: updatedAccount.chainId,
					},
				})
			}

			// Always emit generic event
			this.emitCaipSessionEvent({
				chainId: event.params.chainId as ChainId,
				event: event.params.event,
			})
		}

		const handleSessionDelete = (event: { topic: string }) => {
			if (event.topic !== topic) return

			this.currentSession = undefined
			this.service.setUri('')
			this.stopListeners()

			this.emitCaipSessionDelete()
		}

		signClient.on('session_event', handleSessionEvent)
		signClient.on('session_delete', handleSessionDelete)

		this.unsubscribers = [
			() => signClient.off('session_event', handleSessionEvent),
			() => signClient.off('session_delete', handleSessionDelete),
		]
	}

	protected stopListeners() {
		this.unsubscribers.forEach((unsubscriber) => unsubscriber())
		this.unsubscribers = []
	}

	onConnect(namespaces: CaipSessionResponse['namespaces']) {
		// Process each namespace using configuration
		for (const [namespaceKey, namespaceData] of Object.entries(namespaces)) {
			const namespaceId = namespaceKey as WalletNamespaceId
			const config = NAMESPACE_CONFIG[namespaceId]

			if (!config || !namespaceData) continue

			const firstChain = namespaceData.chains?.[0]
			const firstAccount = namespaceData.accounts[0]

			if (!firstChain || !firstAccount) continue

			const parsedChain = config.parseChain(firstChain)
			const parsedAccount = config.parseAccount(firstAccount)

			// Set account data based on namespace type
			if (namespaceId === EIP155.ID) {
				this.setAccount(EIP155.ID, {
					address: parsedAccount,
					chainId: parsedChain,
				})
			} else if (namespaceId === SOLANA.ID) {
				this.setAccount(SOLANA.ID, {
					pubkey: parsedAccount,
					chainId: parsedChain,
				})
			} else if (namespaceId === BIP122.ID) {
				this.setAccount(BIP122.ID, {
					address: parsedAccount,
					chainId: parsedChain,
				})
			}
		}
	}
}
