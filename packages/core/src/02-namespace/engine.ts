import type { RegistryBase } from '../04-registry/base.js'
import type { WalletAdapterBase } from '../05-wallet/base.js'
import { NamespaceBase } from './base.js'
import type { NamespaceAddress, NamespaceConnection, NamespaceId, NamespaceWallet } from '../types/index.js'
import type { Base64SVG } from '../types/utils/index.js'
import type { ConnectedChain, RpcUrls } from '../types/namespace/index.js'
import { ConnectionInProgressError, WalletAlreadyConnectedError, MissingChainError } from '../errors/index.js'

export class NamespaceEngine extends NamespaceBase {
	id: NamespaceId
	name: string
	icon: Base64SVG
	rpcUrls: RpcUrls | undefined
	registries: RegistryBase[]
	connection: NamespaceConnection = {
		status: 'disconnected',
		wallet: undefined,
		address: undefined,
		chain: undefined,
	}
	wallets: WalletAdapterBase[] = []

	constructor({
		registries,
		id,
		icon,
		name,
		rpcUrls,
	}: {
		registries: RegistryBase[]
		id: NamespaceId
		icon: Base64SVG
		name: string
		rpcUrls: RpcUrls | undefined
	}) {
		super({ id })

		this.id = id
		this.name = name
		this.icon = icon
		this.registries = registries
		this.rpcUrls = rpcUrls

		// Setup wallet listeners and auto-reconnect
		registries.forEach((registry) => {
			registry.onWallets((wallets) => {
				this.reconnect(wallets)
				this.addWallets(wallets)
			})
			const wallets = registry.getWallets()
			this.reconnect(wallets)
			this.addWallets(wallets)
		})
	}

	private async connectOrReconnect({
		wallet,
		functionName,
	}: {
		wallet: NamespaceWallet
		functionName: Extract<keyof WalletAdapterBase['__internal'], 'connect' | 'reconnect'>
	}) {
		const connection = this.getConnection()
		if (connection.status === 'connecting') {
			throw new ConnectionInProgressError()
		}
		if (connection.status === 'connected') {
			throw new WalletAlreadyConnectedError(connection.wallet.id)
		}

		this.setConnection({ status: 'connecting', wallet, address: undefined, chain: undefined })

		try {
			wallet.__internal.clearAllListeners()
			wallet.__internal.handleOnAddress(this.onAddress.bind(this))
			wallet.__internal.handleOnChain(this.onChain.bind(this))
			wallet.__internal.startListeners()

			const result = await wallet.__internal[functionName]()
			if (result?.address && result?.chain) {
				this.saveLastConnectedWalletId(wallet.id)
				this.setConnection({ status: 'connected', wallet, address: result.address, chain: result.chain })
			} else {
				this.internalDisconnect()
				wallet.__internal.clearAllListeners()
			}
		} catch (e) {
			this.internalDisconnect()
			wallet.__internal.clearAllListeners()
			throw e
		}
	}

	/** cleared localStorage and set connection status to disconnect */
	private internalDisconnect() {
		this.clearLastConnectedWalletId()
		this.setConnection({ status: 'disconnected', wallet: undefined, address: undefined, chain: undefined })
	}

	async connect(wallet: NamespaceWallet) {
		return this.connectOrReconnect({ wallet, functionName: 'connect' })
	}

	async reconnect(wallets: NamespaceWallet[]): Promise<void> {
		const connection = this.getConnection()
		if (connection.status !== 'disconnected') return

		const lastWalletId = this.getLastConnectedWalletId()
		if (!lastWalletId) return

		const wallet = wallets.find((w) => w.id === lastWalletId)

		if (!wallet) return
		this.connectOrReconnect({ wallet, functionName: 'reconnect' })
	}

	disconnect() {
		const connection = this.getConnection()
		if (connection.status === 'connected') {
			connection.wallet.__internal.clearAllListeners()
			this.internalDisconnect()
			connection.wallet.__internal.disconnect()
		}
	}

	abortConnect() {
		const connection = this.getConnection()
		if (connection.status === 'connecting' && connection.wallet) {
			connection.wallet.__internal.abortConnect()
			connection.wallet.__internal.clearAllListeners()
			this.internalDisconnect()
		}
	}

	onAddress(next: NamespaceAddress | undefined): void {
		const connection = this.getConnection()
		if (connection.status === 'connected') {
			if (!next) {
				connection.wallet.__internal.clearAllListeners()
				this.internalDisconnect()
			} else {
				this.setConnection({
					...connection,
					address: next,
				})
			}
		}
	}

	onChain(next: ConnectedChain | undefined) {
		const connection = this.getConnection()
		if (connection.status === 'connected') {
			if (!next) throw new MissingChainError(this.id)
			this.setConnection({
				...connection,
				chain: next,
			})
		}
	}
}
