import {
	type ChainReference,
	type ConnectedChain,
	type NamespaceId,
	WalletAdapterBase,
	AccountNotFoundError,
	UnsupportedMethodError,
} from '@trustwallet/connect-core'
import type {
	BIP122Address,
	BIP122Provider,
	BIP122RequestArguments,
	BIP122RequestParams,
	BIP122Response,
} from '@trustwallet/connect-bip122-types'
import type { UnisatWalletAPI } from './types.js'
import { bytesToHex, hexToBytes, bytesToString } from '@trustwallet/connect-utils/encoding'
import { BIP122_SCOPE } from '../../../constants.js'

export class UnisatWallet extends WalletAdapterBase<'namespace', BIP122Address, BIP122Provider> {
	public id: string
	public name: string
	public icon: string
	public namespaceIds: [NamespaceId] = [BIP122_SCOPE.ID]
	public type: 'namespace' = 'namespace'
	public chainRef: ChainReference

	private api: UnisatWalletAPI
	private currentAccount: string | undefined
	private accountsChangedHandler: ((accounts: string[]) => void) | undefined

	constructor({
		id,
		name,
		icon = '',
		api,
		chainRef,
	}: {
		id: string
		name: string
		icon?: string
		api: UnisatWalletAPI
		chainRef: ChainReference
	}) {
		super()
		this.id = id
		this.name = name
		this.icon = icon
		this.api = api
		this.chainRef = chainRef
	}

	public async getProvider(): Promise<BIP122Provider> {
		const api = this.api
		const self = this

		return {
			request: async <T extends BIP122RequestArguments>(
				args: BIP122RequestParams<T>,
			): Promise<BIP122Response<T>> => {
				const { request } = args

				switch (request.method) {
					case 'getAccounts': {
						const [accounts, publicKeyHex] = await Promise.all([api.getAccounts(), api.getPublicKey()])

						// Unisat doesn't expose intent, so we leave it undefined
						return [
							{
								address: accounts[0],
								publicKey: hexToBytes(publicKeyHex),
							},
						] as BIP122Response<T>
					}

					case 'signMessage': {
						if (!self.currentAccount) {
							throw new AccountNotFoundError('', 'bip122')
						}

						// Map protocol to Unisat-like type
						const type = request.params.protocol === 'bip322' ? 'bip322-simple' : 'ecdsa'

						// Convert Uint8Array message to string
						const messageStr = bytesToString(request.params.message)
						const signatureBase64 = await api.signMessage(messageStr, type)

						// Unisat returns base64-encoded signature
						const signatureBytes = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0))

						return {
							signature: signatureBytes,
							address: self.currentAccount,
						} as BIP122Response<T>
					}

					case 'signPsbt': {
						if (!self.currentAccount) {
							throw new AccountNotFoundError('', 'bip122')
						}

						// Convert Uint8Array PSBT to hex
						const psbtHex = bytesToHex(request.params.psbt)

						const options: {
							toSignInputs?: Array<{
								index: number
								address: string
								publicKey: string
								sighashTypes?: number[]
							}>
							autoFinalized?: boolean
						} = {}

						if (request.params.signInputs) {
							options.toSignInputs = request.params.signInputs
								.filter((input) => input.address && input.publicKey)
								.map((input) => ({
									index: input.index,
									address: input.address!,
									publicKey: bytesToHex(input.publicKey!),
									sighashTypes: input.sighashType ? [input.sighashType] : undefined,
								}))
						}

						if (request.params.finalize) {
							options.autoFinalized = true
						}

						const signedPsbtHex = await api.signPsbt(psbtHex, options)

						if (request.params.finalize) {
							// Push the transaction
							try {
								const txid = await api.pushPsbt(signedPsbtHex)
								return {
									psbt: hexToBytes(signedPsbtHex),
									txid,
									finalized: true,
								} as BIP122Response<T>
							} catch (error) {
								// If push fails, return signed but not finalized
								return {
									psbt: hexToBytes(signedPsbtHex),
									finalized: false,
								} as BIP122Response<T>
							}
						}

						return {
							psbt: hexToBytes(signedPsbtHex),
							finalized: false,
						} as BIP122Response<T>
					}

					case 'sendTransfer': {
						const txid = await api.sendBitcoin(request.params.toAddress, request.params.satoshis)
						return txid as BIP122Response<T>
					}

					default:
						throw new UnsupportedMethodError('unknown', 'bip122')
				}
			},
		}
	}

	protected async connect(): Promise<{
		address: BIP122Address | undefined
		chain: ConnectedChain | undefined
	}> {
		if (this.api.connect) {
			const res = await this.api.connect()
			if (res?.address) this.currentAccount = res.address
		} else {
			const res = await this.api.requestAccounts()
			if (res.length) this.currentAccount = res[0]
		}

		const address = this.currentAccount
		const chain = {
			namespace: BIP122_SCOPE.ID,
			reference: this.chainRef,
		}
		return { address, chain }
	}

	protected async reconnect(): Promise<{
		address: BIP122Address | undefined
		chain: ConnectedChain | undefined
	}> {
		const accounts = await this.api.getAccounts()
		this.currentAccount = accounts[0]

		if (!this.currentAccount) return this.connect()

		const address = this.currentAccount
		const chain = {
			namespace: BIP122_SCOPE.ID,
			reference: this.chainRef,
		}
		return { address, chain }
	}

	protected async disconnect(): Promise<void> {
		this.currentAccount = undefined
		this.__internal.setAddress(undefined)
		this.__internal.setChain(undefined)
	}

	protected startListeners(): void {
		this.accountsChangedHandler = (accounts: string[]) => {
			this.currentAccount = accounts[0]
			this.__internal.setAddress(this.currentAccount || undefined)
		}

		this.api.on('accountsChanged', this.accountsChangedHandler as any)
	}

	protected stopListeners(): void {
		if (this.accountsChangedHandler) {
			this.api.removeListener('accountsChanged', this.accountsChangedHandler as any)
			this.accountsChangedHandler = undefined
		}
	}
}
