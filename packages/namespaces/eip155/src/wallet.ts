import { ConnectedChain, NamespaceId, WalletAdapterBase, WalletType } from '@trustwallet/connect-core'
import { EIP1193Provider, EIP155WalletOptions } from './types/config'
import { EIP155_SCOPE } from './constants'
import { EIP155Address, EIP155Provider } from '@trustwallet/connect-eip155-types'

const { METHODS, EVENTS } = EIP155_SCOPE
export class EIP155Wallet extends WalletAdapterBase {
	public id: string
	public namespaceIds: [NamespaceId] = [EIP155_SCOPE.ID]
	public type: Extract<WalletType, 'namespace'> = 'namespace'
	public name: string
	public icon: string
	public eip1193Provider: EIP1193Provider

	constructor({ info, provider }: EIP155WalletOptions) {
		super()
		this.id = info.rdns
		this.name = info.name
		this.icon = info.icon
		this.eip1193Provider = provider
	}

	async connect(): Promise<{ address: EIP155Address | undefined; chain: ConnectedChain | undefined }> {
		const accounts: EIP155Address[] = await this.eip1193Provider.request({ method: METHODS.ETH_REQUEST_ACCOUNTS })

		if (accounts.length) {
			const chainId = await this.eip1193Provider.request({ method: METHODS.ETH_CHAIN_ID })

			return {
				address: accounts[0],
				chain: {
					namespace: this.namespaceIds[0],
					reference: Number(chainId),
				},
			}
		}
		return { address: undefined, chain: undefined }
	}

	async reconnect(): Promise<{ address: EIP155Address | undefined; chain: ConnectedChain | undefined }> {
		const accounts: EIP155Address[] = await this.eip1193Provider.request({ method: METHODS.ETH_ACCOUNTS })

		if (accounts.length) {
			const chainId = await this.eip1193Provider.request({ method: METHODS.ETH_CHAIN_ID })

			return {
				address: accounts[0],
				chain: {
					namespace: this.namespaceIds[0],
					reference: Number(chainId),
				},
			}
		}
		return { address: undefined, chain: undefined }
	}
	disconnect(): Promise<void> | void {
		this.emitAddress(undefined)
	}

	protected handleAccounts(accounts: EIP155Address[]) {
		this.emitAddress(accounts[0])
	}

	protected handleChainId = (chainId: string | number) => {
		this.emitChain(
			chainId
				? {
						namespace: this.namespaceIds[0],
						reference: Number(chainId),
					}
				: undefined,
		)
	}

	protected handleDisconnect = () => {
		this.emitAddress(undefined)
	}

	private readonly onAccountsChanged = (accounts: EIP155Address[]) => {
		this.handleAccounts(accounts)
	}

	private readonly onChainChanged = (chainId: string | number) => {
		this.handleChainId(chainId)
	}

	private readonly onDisconnect = () => {
		this.handleDisconnect()
	}

	startListeners() {
		this.eip1193Provider.on(EVENTS.ACCOUNTS_CHANGED, this.onAccountsChanged)
		this.eip1193Provider.on(EVENTS.CHAIN_CHANGED, this.onChainChanged)
		this.eip1193Provider.on(EVENTS.DISCONNECT, this.onDisconnect)
	}
	stopListeners() {
		this.eip1193Provider.removeListener(EVENTS.ACCOUNTS_CHANGED, this.onAccountsChanged)
		this.eip1193Provider.removeListener(EVENTS.CHAIN_CHANGED, this.onChainChanged)
		this.eip1193Provider.removeListener(EVENTS.DISCONNECT, this.onDisconnect)
	}

	async getProvider(): Promise<EIP155Provider> {
		const provider: EIP155Provider = {
			request: async (args) => {
				return this.eip1193Provider.request({
					method: args.request.method,
					params: args.request.params,
				})
			},
		}
		return provider
	}
}
