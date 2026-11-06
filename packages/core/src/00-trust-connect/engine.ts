import type { WalletAdapterBase } from '../05-wallet/base.js'
import { TrustConnectBase } from './base.js'
import type { ServiceBase } from '../03-services/base.js'
import type { NamespaceEngine } from '../02-namespace/engine.js'
import type {
	CaipWallet,
	Cast,
	Connections,
	NamespaceConstructor,
	NamespaceId,
	NamespaceWallet,
	Scope,
	TrustConnectOptions,
	Wallet,
} from '../types/index.js'
import { CaipController } from '../01-caip/controller.js'
import { stringToWalletId } from '../utils/stringToWalletId.js'
import { MissingNamespaceIdError, NamespaceNotFoundError } from '../errors/index.js'

export class TrustConnect<T extends readonly NamespaceConstructor[] = NamespaceConstructor[]> extends TrustConnectBase {
	wallets: Wallet[] = []
	connections: Connections = {}
	namespaces: NamespaceEngine[] = []
	services: ServiceBase[] = []
	caipController: CaipController
	connectionAborted: boolean = false

	constructor(options: TrustConnectOptions & { namespaces: T }) {
		super()

		/** create namespaces and services */
		const caipWallets: CaipWallet[] = []
		const scopes: Map<NamespaceId, Scope> = new Map()

		this.namespaces = options.namespaces.map((external) => {
			const { namespace, scope } = external.__createNamespace()
			scopes.set(namespace.id, scope)
			return namespace
		})

		this.services =
			options.services?.map((external) => {
				const service = external.__createService({ scopes })
				if (service.caipWallet) {
					caipWallets.push(service.caipWallet)
				}
				return service
			}) || []

		this.caipController = new CaipController({ namespaces: this.namespaces, caipWallets })
		this.start()
	}

	private start() {
		for (let namespace of this.namespaces) {
			const namespaceId = namespace.id

			const wallets = namespace.getWallets()
			this.computeNamespaceWallet({ namespaceId, wallets })

			const connection = namespace.getConnection()
			this.setConnection(namespaceId, connection)

			namespace.onWallets((wallets) => {
				this.computeNamespaceWallet({ namespaceId, wallets })
			})
			namespace.onConnection((next) => {
				this.setConnection(namespaceId, next)
			})
		}
	}

	/**
	 * Connect a caip wallet or a wallet to a specific namespace.
	 */
	public async connect({ wallet }: { wallet: CaipWallet | NamespaceWallet }): Promise<void> {
		try {
			this.setConnectionAborted(false)
			this.setIsLoading(true)
			this.setError(null)

			if (wallet.type === 'caip') {
				return await this.caipController.connect(wallet)
			}

			if (!wallet.namespaceIds.length) throw new MissingNamespaceIdError(wallet.id, wallet.type)

			// If the wallet is not of caip type, then it only supports one namespace.
			const namespace = this.getNamespace(wallet.namespaceIds[0])
			if (!namespace) throw new NamespaceNotFoundError(wallet.namespaceIds[0])

			return await namespace.connect(wallet)
		} catch (error) {
			const err =
				error instanceof Error
					? error
					: new Error(
							typeof error === 'object' && error !== null && 'message' in error
								? String(error.message)
								: JSON.stringify(error),
						)
			this.setError(err)
			throw err
		} finally {
			this.setIsLoading(false)
		}
	}

	/**
	 * Disconnect from one or all namespaces.
	 */
	public disconnect({ namespaceId }: { namespaceId?: NamespaceId | undefined } = {}): void {
		try {
			if (namespaceId) {
				this.getNamespace(namespaceId)?.disconnect()
				return
			}

			const connectionValues = Object.values(this.connections) as Cast['connection'][]
			for (let connection of connectionValues) {
				if (connection.wallet?.type === 'caip') {
					this.caipController.disconnect()
				} else {
					for (let namespace of this.namespaces) {
						namespace.disconnect()
					}
				}
			}
		} catch (error) {
			if ('message' in (error as Error)) {
				console.error((error as Error).message)
			}
		}
	}

	/**
	 * Abort any pending connection attempts
	 * Does not throw errors, simply cleans up connection attempts and listeners
	 */
	public abortConnect({ namespaceId }: { namespaceId?: NamespaceId | undefined } = {}): void {
		this.setConnectionAborted(true)
		this.setIsLoading(false)
		this.setError(null)
		if (namespaceId) {
			const namespace = this.getNamespace(namespaceId)
			if (namespace) {
				namespace.abortConnect()
			}
			return
		}

		// Abort all namespace connections
		for (const namespace of this.namespaces) {
			namespace.abortConnect()
		}

		// Abort CAIP controller connections
		this.caipController.abortConnect()
	}

	/**
	 * Clear any error state
	 */
	public clearError(): void {
		this.setError(null)
	}

	/**
	 * We take each wallet from each namespace object
	 * and merged all together into Wallet type and store them.
	 * */
	private computeNamespaceWallet({
		namespaceId,
		wallets,
	}: {
		namespaceId: NamespaceId
		wallets: WalletAdapterBase[]
	}): void {
		const walletsToSet: ReturnType<typeof this.getWallets> = []

		for (const wallet of wallets) {
			/**
			 * since there is no unified protocol in use by most multi-chain wallets
			 * a wallet may use different IDs in each network provider. This is a workaround
			 * to the lack of unification protocol.
			 */
			let isNameId = false
			const nameId = stringToWalletId(wallet.name)

			let existingWallet: Wallet | undefined
			existingWallet = this.getWallet(wallet.id)
			if (!existingWallet) {
				existingWallet = this.getWallet(nameId)

				isNameId = Boolean(existingWallet)
			}

			if (existingWallet) {
				// we assign an existing id to avoid id collisions.
				wallet.id = existingWallet.id
				this.updateWallet(isNameId ? nameId : wallet.id, (existingWallet) => ({
					...existingWallet,
					namespaceIds: new Set([...existingWallet.namespaceIds, ...wallet.namespaceIds]),
					namespaces: {
						...existingWallet.namespaces,
						[namespaceId]: wallet,
					} as typeof existingWallet.namespaces,
				}))
			} else {
				walletsToSet.push({
					id: wallet.id,
					name: wallet.name,
					type: wallet.type,
					icon: wallet.icon,
					namespaceIds: new Set([namespaceId]),
					namespaces: {
						[namespaceId]: wallet,
					},
				})
			}
		}

		if (walletsToSet.length > 0) {
			this.addWallets(walletsToSet)
		}
	}
}
