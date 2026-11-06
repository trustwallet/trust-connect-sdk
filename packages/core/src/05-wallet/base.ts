import type {
	CaipSessionEvent,
	ConnectedChain,
	NamespaceAddress,
	NamespaceId,
	NamespaceProvider,
	CaipSessionResponse,
	WalletType,
} from '../types/index.js'
import type { CaipProvider } from '../types/caip/index.js'
import { Emitter } from '../utils/emitter.js'

/**
 * A class that represents an individual wallet created by a single Namespace.
 * A global Wallet might own more than one Namespace Wallet.
 */
export abstract class WalletAdapterBase<
	TWalletType extends WalletType = 'namespace',
	TAddress extends NamespaceAddress = NamespaceAddress,
	TProvider extends NamespaceProvider = NamespaceProvider,
> {
	public abstract id: string
	public abstract namespaceIds: TWalletType extends 'caip' ? NamespaceId[] : [NamespaceId]
	public abstract type: TWalletType
	public abstract name: string
	public abstract icon: string
	public abortController?: AbortController | undefined

	private events = new Emitter<{
		address: NamespaceAddress | undefined
		chain: ConnectedChain | undefined
		session_event: CaipSessionEvent
		session_delete: undefined
	}>()

	public abstract getProvider(): Promise<TWalletType extends 'namespace' ? TProvider : CaipProvider>

	public __internal: {
		connect: () => TWalletType extends 'namespace'
			? Promise<{ address: TAddress | undefined; chain: ConnectedChain | undefined }>
			: Promise<CaipSessionResponse>
		reconnect: () => TWalletType extends 'namespace'
			? Promise<{ address: TAddress | undefined; chain: ConnectedChain | undefined }>
			: Promise<CaipSessionResponse | undefined>
		disconnect: WalletAdapterBase['disconnect']
		abortConnect: WalletAdapterBase['abortConnect']
		startListeners: WalletAdapterBase['startListeners']
		stopListeners: WalletAdapterBase['stopListeners']
		handleOnCaipSessionEvent: WalletAdapterBase['handleOnCaipSessionEvent']
		handleOnCaipSessionDelete: WalletAdapterBase['handleOnCaipSessionDelete']
		handleOnAddress: WalletAdapterBase['handleOnAddress']
		handleOnChain: WalletAdapterBase['handleOnChain']
		setAddress: WalletAdapterBase['emitAddress']
		setChain: WalletAdapterBase['emitChain']
		clearAllListeners: WalletAdapterBase['clearAllListeners']
	}

	constructor() {
		this.__internal = {
			connect: this.connect.bind(this),
			reconnect: this.reconnect.bind(this),
			disconnect: this.disconnect.bind(this),
			abortConnect: this.abortConnect.bind(this),
			startListeners: this.startListeners.bind(this),
			stopListeners: this.stopListeners.bind(this),
			handleOnCaipSessionEvent: this.handleOnCaipSessionEvent.bind(this),
			handleOnCaipSessionDelete: this.handleOnCaipSessionDelete.bind(this),
			handleOnAddress: this.handleOnAddress.bind(this),
			handleOnChain: this.handleOnChain.bind(this),
			setAddress: this.emitAddress.bind(this),
			setChain: this.emitChain.bind(this),
			clearAllListeners: this.clearAllListeners.bind(this),
		}
	}

	protected abstract connect(): TWalletType extends 'namespace'
		? Promise<{ address: TAddress | undefined; chain: ConnectedChain | undefined }>
		: Promise<CaipSessionResponse>

	protected abstract reconnect(): TWalletType extends 'namespace'
		? Promise<{ address: TAddress | undefined; chain: ConnectedChain | undefined }>
		: Promise<CaipSessionResponse | undefined>
	protected abstract disconnect(id?: NamespaceId): Promise<void> | void
	protected abstract startListeners(): unknown
	protected abstract stopListeners(): unknown

	/**
	 * Abort any pending connection attempt
	 * This should abort the connection process and clean up any resources
	 */
	protected abortConnect(): void {
		if (this.abortController) {
			this.abortController.abort()
			this.abortController = undefined
		}
	}

	protected handleOnCaipSessionEvent(cb: (caipSessionEvent: CaipSessionEvent) => void): void {
		this.events.on('session_event', cb)
	}
	protected handleOnCaipSessionDelete(cb: () => void): void {
		this.events.on('session_delete', cb)
	}
	protected handleOnAddress(cb: (address: NamespaceAddress | undefined) => void) {
		return this.events.on('address', cb)
	}
	protected handleOnChain(cb: (chain: ConnectedChain | undefined) => void) {
		return this.events.on('chain', cb)
	}
	protected emitCaipSessionEvent(caipSessionEvent: CaipSessionEvent) {
		this.events.emit('session_event', caipSessionEvent)
	}
	protected emitCaipSessionDelete() {
		this.events.emit('session_delete', undefined)
	}
	protected emitAddress(address: TAddress | undefined) {
		this.events.emit('address', address)
	}
	protected emitChain(chain: ConnectedChain | undefined) {
		this.events.emit('chain', chain)
	}
	protected clearAllListeners() {
		this.events.clear()
		this.__internal.stopListeners()
	}
}
