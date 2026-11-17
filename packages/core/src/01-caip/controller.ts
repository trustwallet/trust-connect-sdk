import { CAIP } from '../constants/caip'
import { CaipSessionEvent, CaipSessionResponse, CaipWallet, NamespaceId } from '../types'
import { NamespaceEngine } from '../02-namespace/engine'
import { CaipControllerBase } from './base'
import { extractAddress, extractChainRef, extractNamespace } from '../utils/caip'
import { NoActiveSessionError } from '../errors'

export class CaipController extends CaipControllerBase {
	namespaces: Map<NamespaceId, NamespaceEngine> = new Map()
	wallets: CaipWallet[]

	constructor({ namespaces, caipWallets }: { namespaces: NamespaceEngine[]; caipWallets?: CaipWallet[] }) {
		super()

		for (let namespace of namespaces) {
			this.namespaces.set(namespace.id, namespace)
		}
		this.wallets = caipWallets || []

		this.start()
	}

	start() {
		const lastWalletId = this.getLastConnectedWalletId()
		if (!lastWalletId) return

		for (let wallet of this.wallets) {
			if (wallet.id !== lastWalletId) continue
			this.reconnect({ wallet })
		}
	}

	async reconnect({ wallet }: { wallet: CaipWallet }) {
		this.startListeners(wallet)
		let session: CaipSessionResponse | undefined
		try {
			session = await wallet.__internal.reconnect()
		} catch {
			// silently try to reconnect
		} finally {
			if (!session) {
				wallet.__internal.clearAllListeners()
				this.clearLastConnectedWalletId()
				return
			}
		}
		this.setConnections({ session, wallet })
	}

	async connect(wallet: CaipWallet) {
		this.startListeners(wallet)
		let session: CaipSessionResponse
		try {
			session = await wallet.__internal.connect()
			if (!session) throw new NoActiveSessionError()
		} catch (e) {
			wallet.__internal.clearAllListeners()
			throw e
		}
		this.setConnections({ session, wallet })
	}

	disconnect() {
		for (let namespace of this.namespaces.values()) {
			const connection = namespace.getConnection()

			if (connection.status !== 'connected') continue

			connection.wallet.__internal.clearAllListeners()
			this.clearLastConnectedWalletId()
			namespace.setConnection({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})
			connection.wallet.__internal.disconnect()
		}
	}

	abortConnect() {
		for (let wallet of this.wallets) {
			wallet.__internal.abortConnect()
			wallet.__internal.clearAllListeners()
		}

		for (let namespace of this.namespaces.values()) {
			const connection = namespace.getConnection()

			if (connection.status === 'connecting' && connection.wallet) {
				connection.wallet.__internal.abortConnect()
				connection.wallet.__internal.clearAllListeners()
				this.clearLastConnectedWalletId()
				namespace.setConnection({
					status: 'disconnected',
					wallet: undefined,
					address: undefined,
					chain: undefined,
				})
			}
		}
	}

	onSessionEvent(caipSessionEvent: CaipSessionEvent) {
		const { chainId, event } = caipSessionEvent

		const namespaceId = extractNamespace(chainId)
		const namespace = this.namespaces.get(namespaceId)
		const connection = namespace?.getConnection()

		if (!namespace || !connection || connection.status !== 'connected') return

		if (CAIP.NAMESPACES.EVENTS.ADDRESS_CHANGED.includes(event.name)) {
			const accounts = Array.isArray(event.data) ? event.data : []
			const address = typeof accounts[0] === 'string' ? accounts[0] : undefined
			connection.wallet.__internal.setAddress(address)
			if (address) {
				namespace.setConnection({
					...connection,
					address,
				})
			}
		} else if (CAIP.NAMESPACES.EVENTS.CHAIN_REFERENCE_CHANGED.includes(event.name)) {
			if (typeof event.data !== 'string' && typeof event.data !== 'number') return

			const reference = extractChainRef(String(event.data))
			if (!reference || reference === 'NaN') return

			const chain = {
				namespace: namespaceId,
				reference,
			}
			connection.wallet.__internal.setChain(chain)
			namespace.setConnection({
				...connection,
				chain,
			})
		}
	}

	setConnections({ session, wallet }: { session: CaipSessionResponse; wallet: CaipWallet }) {
		let isConnected = false
		for (let [namespaceId, scope] of Object.entries(session.namespaces)) {
			const firstAccount = scope.accounts[0]
			const firstChain = scope.chains[0]

			if (!firstAccount) {
				console.error(`Wallet ${wallet.id} was unable to connect with namespace ${namespaceId}`)
				continue
			}

			// Extract address from CAIP-10 account format
			const address = extractAddress(firstAccount)
			const chainRef = extractChainRef(firstChain)
			const namespace = this.namespaces.get(namespaceId as NamespaceId)

			if (!namespace) {
				console.error(`Namespace ${namespaceId} not found`)
				continue
			}

			isConnected = true

			namespace.setConnection({
				status: 'connected',
				wallet,
				address,
				/**
				 * Chains in CAIP for connections are irrelevant since there is no single active chain.
				 * In the CAIP paradigm all chains are active at the same time.
				 */
				chain: {
					namespace: namespace.id,
					reference: chainRef,
				},
			})
		}
		if (isConnected) {
			this.saveLastConnectedWalletId(wallet.id)
		} else {
			this.disconnect()
		}
	}

	startListeners(wallet: CaipWallet) {
		wallet.__internal.clearAllListeners()
		wallet.__internal.handleOnCaipSessionEvent(this.onSessionEvent.bind(this))
		wallet.__internal.handleOnCaipSessionDelete(this.disconnect.bind(this))
		wallet.__internal.startListeners()
	}
}
