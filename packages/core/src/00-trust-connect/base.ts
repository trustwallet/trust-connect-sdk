import type { NamespaceEngine } from '../02-namespace/engine.js'
import type { ServiceBase } from '../03-services/base.js'
import type { Connections, NamespaceConnection, NamespaceId, Wallet } from '../types/index.js'
import { Emitter } from '../utils/emitter.js'
import { stringToWalletId } from '../utils/stringToWalletId.js'
import { NamespaceNotFoundError } from '../errors/index.js'

export abstract class TrustConnectBase {
	abstract wallets: Wallet[]
	abstract connections: Connections
	abstract namespaces: NamespaceEngine[]
	abstract services: ServiceBase[]
	abstract connectionAborted: boolean
	private isLoading: boolean = false
	private error: Error | null = null
	private events = new Emitter<{
		wallets: Wallet[]
		connections: Connections
		isLoading: boolean
		error: Error | null
		connectionAborted: boolean
	}>()

	getConnectionAborted(): boolean {
		return this.connectionAborted
	}

	getWallets(): Wallet[] {
		return this.wallets
	}

	getWallet(id: string): Wallet | undefined {
		return this.wallets.find((wallet) => wallet.id === id || stringToWalletId(wallet.name) === id)
	}

	getConnections(): Connections {
		return this.connections
	}

	getNamespaces(): NamespaceEngine[] {
		return this.namespaces
	}

	getServices(): ServiceBase[] {
		return this.services
	}

	getIsLoading(): boolean {
		return this.isLoading
	}

	getError(): Error | null {
		return this.error
	}

	protected setIsLoading(isLoading: boolean): void {
		this.isLoading = isLoading
		this.events.emit('isLoading', this.isLoading)
	}

	protected setError(error: Error | null): void {
		this.error = error
		this.events.emit('error', this.error)
	}

	protected setConnectionAborted(isAborted: boolean) {
		this.connectionAborted = isAborted
		return this.events.emit('connectionAborted', this.connectionAborted)
	}

	public onWallets(cb: (wallets: Wallet[]) => void): () => void {
		return this.events.on('wallets', cb)
	}

	public onConnections(cb: (connection: Connections) => void): () => void {
		return this.events.on('connections', cb)
	}

	public onConnectionAborted(cb: (connectionAborted: boolean) => void): () => void {
		return this.events.on('connectionAborted', cb)
	}

	public onIsLoading(cb: (isLoading: boolean) => void): () => void {
		return this.events.on('isLoading', cb)
	}

	public onError(cb: (error: Error | null) => void): () => void {
		return this.events.on('error', cb)
	}

	public onConnection(id: NamespaceId, cb: (next: NamespaceConnection) => void): () => void {
		const namespace = this.namespaces.find((ns) => ns.id === id)
		if (!namespace) throw new NamespaceNotFoundError(id)
		return namespace.onConnection(cb)
	}

	public getNamespace(id: NamespaceId): NamespaceEngine | undefined {
		return this.namespaces.find((ns) => ns.id === id)
	}

	public setConnection(namespace: NamespaceId, state: NamespaceConnection) {
		this.connections = {
			...this.connections,
			[namespace]: state,
		}
		this.events.emit('connections', this.connections)
	}

	protected updateWallet(id: string, updater: (wallet: Wallet) => Wallet): void {
		this.wallets = this.wallets.map((wallet) =>
			wallet.id === id || stringToWalletId(wallet.name) === id ? updater(wallet) : wallet,
		)
		this.events.emit('wallets', this.wallets)
	}

	protected addWallets(wallets: Wallet[]) {
		this.wallets = [...this.wallets, ...wallets]
		this.events.emit('wallets', this.wallets)
	}

	public clearAllListeners(): void {
		this.namespaces.forEach((namespace) => namespace.clearAllListeners())
		this.events.clear()
	}
}
