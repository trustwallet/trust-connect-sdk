import {
	type ChainReference,
	type ConnectedChain,
	type NamespaceId,
	stringToWalletId,
	WalletAdapterBase,
	UnsupportedMethodError,
	AccountNotFoundError,
	ConnectionFailedError,
} from '@trustwallet/connect-core'
import type {
	WalletStandardAccount,
	WalletStandardConnectFeature,
	WalletStandardDisconnectFeature,
	WalletStandardEventsFeature,
	WalletStandardWallet,
} from './types/wallet-standard.js'
import type {
	SolanaProvider,
	SolanaRequestArguments,
	SolanaRequestParams,
	SolanaResponse,
	SolanaAddress,
} from '@trustwallet/connect-solana-types'
import { FEATURES, SOLANA_SCOPE } from './constants.js'
import { getFeature } from './utils/getFeature.js'

export class SolanaStandardWallet extends WalletAdapterBase<'namespace', SolanaAddress, SolanaProvider> {
	public id: string
	public namespaceIds: [NamespaceId] = [SOLANA_SCOPE.ID]
	public type: 'namespace' = 'namespace'
	public name: string
	public icon: string
	public chainRef: ChainReference

	private standard_wallet: WalletStandardWallet
	private account: WalletStandardAccount | undefined
	private offChange: (() => void) | undefined

	constructor({ wallet, chainRef }: { wallet: WalletStandardWallet; chainRef: ChainReference }) {
		super()
		this.chainRef = chainRef
		this.standard_wallet = wallet
		this.id = stringToWalletId(wallet.name)
		this.name = wallet.name
		this.icon = wallet.icon ?? ''
	}

	public async getProvider(): Promise<SolanaProvider> {
		const wallet = this.standard_wallet
		const self = this

		return {
			request: async <T extends SolanaRequestArguments>(args: SolanaRequestParams<T>): Promise<SolanaResponse<T>> => {
				const { request, chainId } = args

				const featName = request.method
				const method = `solana:${request.method}` as const

				const feat = getFeature(wallet, method) as Record<string, Function> | undefined
				if (!feat?.[featName]) {
					throw new UnsupportedMethodError(method, SOLANA_SCOPE.ID)
				}

				// Handle signAndSendAllTransactions separately
				if (request.method === 'signAndSendAllTransactions') {
					const inputs = request.params.inputs.map((input) => {
						const inputAccount = wallet.accounts.find((acc) => acc.address === input.address)
						if (!inputAccount) {
							throw new AccountNotFoundError(input.address, SOLANA_SCOPE.ID)
						}
						return {
							account: inputAccount,
							transaction: input.transaction,
							chain: input.chain,
							options: input.options,
						}
					})

					const [result] = await feat[featName]({
						inputs,
						options: request.params.options,
					})

					return result as SolanaResponse<T>
				}

				// For other methods that need account, find it by address
				let account = self.account
				if ('address' in request.params && typeof request.params.address === 'string') {
					const matchedAccount = wallet.accounts.find((acc) => acc.address === request.params.address)
					if (!matchedAccount) {
						throw new AccountNotFoundError(request.params.address, SOLANA_SCOPE.ID)
					}
					account = matchedAccount
				}

				const [result] = await feat[featName]({
					account,
					// TODO check if we need chain conversion
					chain: chainId,
					...request.params,
				})

				return result as SolanaResponse<T>
			},
		}
	}

	protected async connect(): Promise<{
		address: SolanaAddress | undefined
		chain: ConnectedChain | undefined
	}> {
		const feat = getFeature<WalletStandardConnectFeature>(this.standard_wallet, FEATURES.CONNECT)
		if (!feat?.connect) throw new UnsupportedMethodError(FEATURES.CONNECT, SOLANA_SCOPE.ID)

		try {
			const { accounts } = await feat.connect()

			this.account = accounts?.[0] ?? this.standard_wallet.accounts?.[0]
			const address = this.account?.address as SolanaAddress | undefined

			const chain = {
				namespace: this.namespaceIds[0],
				reference: this.chainRef,
			}

			return { address, chain }
		} catch (error) {
			console.error('Solana wallet connect error:', error)
			throw new ConnectionFailedError(this.name, error instanceof Error ? error.message : 'Unknown error')
		}
	}

	protected async reconnect(): Promise<{
		address: SolanaAddress | undefined
		chain: ConnectedChain | undefined
	}> {
		const acct = this.standard_wallet.accounts?.[0]
		this.account = acct
		const address = acct?.address as SolanaAddress | undefined

		if (!address) return this.connect()

		const chain = {
			namespace: this.namespaceIds[0],
			reference: this.chainRef,
		}

		return { address, chain }
	}

	protected async disconnect(): Promise<void> {
		const feat = getFeature<WalletStandardDisconnectFeature>(this.standard_wallet, FEATURES.DISCONNECT)
		if (feat?.disconnect) await feat.disconnect()

		this.account = undefined
		this.__internal.setAddress(undefined)
		this.__internal.setChain(undefined)
	}

	protected startListeners(): void {
		const events = getFeature<WalletStandardEventsFeature>(this.standard_wallet, FEATURES.EVENTS)
		if (!events?.on) return

		this.offChange?.()
		this.offChange = events.on('change', (properties) => {
			if ('accounts' in properties) {
				const acct = this.standard_wallet.accounts?.[0]
				this.account = acct
				this.__internal.setAddress(acct?.address as SolanaAddress | undefined)
			}
		})
	}

	protected stopListeners(): void {
		this.offChange?.()
		this.offChange = undefined
	}
}
