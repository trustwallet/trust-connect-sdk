import { Storage } from '../utils/storage'
import type { RegistryBase } from '../04-registry/base'
import type { WalletAdapterBase } from '../05-wallet/base'
import { Emitter } from '../utils/emitter'
import { NamespaceConnection, NamespaceId } from '../types'
import { Base64SVG } from '../types/utils'
import { RpcUrls } from '../types/namespace'

const STORAGE_KEY_PREFIX = 'trust-connect.namespace'

export abstract class NamespaceBase {
	abstract id: NamespaceId
	abstract name: string
	abstract icon: Base64SVG
	abstract registries: RegistryBase[]
	abstract rpcUrls: RpcUrls | undefined
	abstract connection: NamespaceConnection
	abstract wallets: WalletAdapterBase[]
	private events = new Emitter<{ connection: NamespaceConnection; wallets: WalletAdapterBase[] }>()
	private lastConnectedWalletId: Storage

	constructor({ id }: { id: NamespaceId }) {
		this.lastConnectedWalletId = new Storage({ key: `${STORAGE_KEY_PREFIX}.${id}.lastWallet`, version: '0.0.0' })
	}

	public abstract connect(wallet: WalletAdapterBase): Promise<void>
	public abstract reconnect(wallets: WalletAdapterBase[]): Promise<void>
	public abstract disconnect(): void

	public getConnection(): NamespaceConnection {
		return this.connection
	}
	public getWallets(): WalletAdapterBase[] {
		return this.wallets
	}

	public onConnection(cb: (connection: NamespaceConnection) => void): () => void {
		return this.events.on('connection', cb)
	}
	public onWallets(cb: (wallet: WalletAdapterBase[]) => void): () => void {
		return this.events.on('wallets', cb)
	}

	public setConnection(connection: NamespaceConnection) {
		this.connection = connection
		this.events.emit('connection', connection)
	}
	protected addWallets(wallets: WalletAdapterBase[]) {
		const byId = new Map<string, WalletAdapterBase>()
		for (const wallet of this.wallets) {
			byId.set(wallet.id, wallet)
		}
		for (const wallet of wallets) {
			byId.set(wallet.id, wallet)
		}
		this.wallets = [...byId.values()]
		this.events.emit('wallets', this.wallets)
	}

	public clearAllListeners() {
		this.registries.forEach((registry) => registry.clearAllListeners())
		this.events.clear()
	}

	// Storage
	protected saveLastConnectedWalletId(walletId: string): void {
		this.lastConnectedWalletId.set(walletId)
	}
	protected getLastConnectedWalletId(): string | null {
		return this.lastConnectedWalletId.get()
	}
	protected clearLastConnectedWalletId(): void {
		this.lastConnectedWalletId.remove()
	}
}
