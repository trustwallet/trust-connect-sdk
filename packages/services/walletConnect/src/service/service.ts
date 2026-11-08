import type { SignClientInstance, SignClientMetadata, WalletConnectServiceOptions } from '../types.js'
import { type NamespaceId, ServiceBase, Emitter, type Scope } from '@trustwallet/connect-core'
import { WALLETCONNECT_WALLET } from '../constants.js'
import { WalletConnectWalletAdapter } from '../wallet/index.js'
import { scopeInterceptor } from '../scope-interceptor/index.js'

type ConnectParams = {
	optionalNamespaces?: Record<
		string,
		{
			chains: string[]
			methods: string[]
			events: string[]
		}
	>
}

export class WalletConnectService extends ServiceBase {
	public readonly id: string = WALLETCONNECT_WALLET.ID
	public readonly projectId: string
	public readonly metadata: SignClientMetadata | undefined
	private signClientPromise: Promise<SignClientInstance>
	private signClientInstance: SignClientInstance | undefined
	private scopes: Map<NamespaceId, Scope>

	uri: string | undefined
	caipWallet = new WalletConnectWalletAdapter({
		walletConnectService: this,
	})

	private wcEvents = new Emitter<{
		uri: string | undefined
	}>()

	constructor(options: WalletConnectServiceOptions) {
		super()
		this.scopes = options.scopes
		this.projectId = options.projectId
		this.metadata = options.metadata
		this.signClientPromise = options.signClientPromise

		this.start()
	}

	private async start() {
		this.signClientInstance = await this.signClientPromise
	}

	async getSignClientInstance() {
		if (this.signClientInstance) return this.signClientInstance
		return this.signClientPromise
	}

	async getConnectParams(): Promise<ConnectParams> {
		const optionalNamespaces: Record<
			string,
			{
				chains: string[]
				methods: string[]
				events: string[]
				//rpcMap?: Record<string, string>
			}
		> = {}

		/** Populate chains, methods, and events from scopes */
		for (const [namespace, scope] of this.scopes) {
			const transformedScope = scopeInterceptor(namespace, scope)

			optionalNamespaces[namespace] = {
				chains: transformedScope.CHAINS,
				methods: Object.values(transformedScope.METHODS),
				events: Object.values(transformedScope.EVENTS),
			}
		}

		return {
			optionalNamespaces,
		}
	}

	/** store for external use. */
	getCaipWallet() {
		return this.caipWallet
	}

	getUri(): string | undefined {
		return this.uri
	}

	setUri(uri: string): void {
		this.uri = uri
		this.wcEvents.emit('uri', this.uri)
	}

	onUri(cb: (uri: string | undefined) => void): () => void {
		return this.wcEvents.on('uri', cb)
	}

	offUri(cb: (uri: string | undefined) => void): void {
		return this.wcEvents.off('uri', cb)
	}

	public clearAllListeners(): void {
		this.wcEvents.clear()
	}
}
