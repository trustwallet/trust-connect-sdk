import {
	type ChainReference,
	type ConnectedChain,
	type NamespaceId,
	WalletAdapterBase,
	stringToWalletId,
	UnsupportedMethodError,
	AccountNotFoundError,
} from '@trustwallet/connect-core'
import type {
	BIP122Address,
	BIP122Provider,
	BIP122RequestArguments,
	BIP122RequestParams,
	BIP122Response,
} from '@trustwallet/connect-bip122-types'
import type {
	BitcoinWalletStandardWallet,
	BitcoinWalletStandardAccount,
	BitcoinConnectFeature,
	BitcoinSignMessageFeature,
	BitcoinSignTransactionFeature,
	BitcoinSignAndSendTransactionFeature,
} from './types.js'
import { BIP122_SCOPE, BITCOIN_WALLET_STANDARD_FEATURES } from '../../constants.js'

function getFeature<T>(wallet: BitcoinWalletStandardWallet, featureName: string): T | undefined {
	return wallet.features[featureName] as T | undefined
}

export class BitcoinStandardWallet extends WalletAdapterBase<'namespace', BIP122Address, BIP122Provider> {
	public id: string
	public namespaceIds: [NamespaceId] = [BIP122_SCOPE.ID]
	public type: 'namespace' = 'namespace'
	public name: string
	public icon: string
	public chainRef: ChainReference

	private standardWallet: BitcoinWalletStandardWallet
	private account: BitcoinWalletStandardAccount | undefined

	constructor({ wallet, chainRef }: { wallet: BitcoinWalletStandardWallet; chainRef: ChainReference }) {
		super()
		this.chainRef = chainRef
		this.standardWallet = wallet
		this.id = stringToWalletId(wallet.name)
		this.name = wallet.name
		this.icon = wallet.icon ?? ''
	}

	public async getProvider(): Promise<BIP122Provider> {
		const wallet = this.standardWallet
		const self = this

		return {
			request: async <T extends BIP122RequestArguments>(
				args: BIP122RequestParams<T>,
			): Promise<BIP122Response<T>> => {
				const { request } = args
				const method = request.method

				switch (method) {
					case 'getAccounts': {
						const accounts = self.account ? [self.account] : wallet.accounts || []

						return accounts.map((acc) => ({
							address: acc.address,
							publicKey: acc.publicKey,
							intent: acc.purpose,
						})) as BIP122Response<T>
					}

					case 'signMessage': {
						const feat = getFeature<BitcoinSignMessageFeature>(wallet, BITCOIN_WALLET_STANDARD_FEATURES.SIGN_MESSAGE)
						if (!feat?.signMessage) {
							throw new UnsupportedMethodError(BITCOIN_WALLET_STANDARD_FEATURES.SIGN_MESSAGE, 'bip122')
						}

						if (!self.account) {
							throw new AccountNotFoundError('', 'bip122')
						}

						const [result] = await feat.signMessage({
							account: self.account,
							message: request.params.message,
							protocol: request.params.protocol,
						})

						return {
							signature: result.signature,
							messageHash: result.signedMessage,
							address: self.account.address,
						} as BIP122Response<T>
					}

					case 'signPsbt': {
						const feat = getFeature<BitcoinSignTransactionFeature>(
							wallet,
							BITCOIN_WALLET_STANDARD_FEATURES.SIGN_TRANSACTION,
						)
						if (!feat?.signTransaction) {
							throw new UnsupportedMethodError(BITCOIN_WALLET_STANDARD_FEATURES.SIGN_TRANSACTION, 'bip122')
						}

						if (!self.account) {
							throw new AccountNotFoundError('', 'bip122')
						}

						// Build inputsToSign from request.params.signInputs
						const inputsToSign = request.params.signInputs
							.filter((input) => input.address)
							.reduce(
								(acc, input) => {
									const existingInput = acc.find((item) => item.account.address === input.address)
									if (existingInput) {
										existingInput.signingIndexes.push(input.index)
									} else {
										acc.push({
											account: self.account!,
											signingIndexes: [input.index],
											sigHash: input.sighashType ? self.convertSigHashType(input.sighashType) : undefined,
										})
									}
									return acc
								},
								[] as Array<{
									account: BitcoinWalletStandardAccount
									signingIndexes: number[]
									sigHash?: any
								}>,
							)

						const [result] = await feat.signTransaction({
							account: self.account,
							psbt: request.params.psbt,
							inputsToSign: inputsToSign.length > 0 ? inputsToSign : undefined,
						})

						if (request.params.finalize) {
							// If finalize is requested, try to use signAndSendTransaction
							const sendFeat = getFeature<BitcoinSignAndSendTransactionFeature>(
								wallet,
								BITCOIN_WALLET_STANDARD_FEATURES.SIGN_AND_SEND_TRANSACTION,
							)
							if (sendFeat?.signAndSendTransaction) {
								const [sendResult] = await sendFeat.signAndSendTransaction([
									{
										account: self.account,
										psbt: result.psbt,
									},
								])
								return {
									psbt: result.psbt,
									txid: sendResult.txid,
									finalized: true,
								} as BIP122Response<T>
							}
						}

						return {
							psbt: result.psbt,
							finalized: false,
						} as BIP122Response<T>
					}

					case 'sendTransfer': {
						throw new Error(
							'sendTransfer is not supported by Bitcoin Wallet Standard. Use signPsbt with finalize instead.',
						)
					}

					default:
						throw new UnsupportedMethodError(method, 'bip122')
				}
			},
		}
	}

	private convertSigHashType(sighashType: number): any {
		// Map sighash type number to string format
		// This is a simplified mapping, adjust as needed
		const SIGHASH_ALL = 0x01
		const SIGHASH_NONE = 0x02
		const SIGHASH_SINGLE = 0x03
		const SIGHASH_ANYONECANPAY = 0x80

		if (sighashType & SIGHASH_ANYONECANPAY) {
			const base = sighashType & ~SIGHASH_ANYONECANPAY
			if (base === SIGHASH_ALL) return 'ALL|ANYONECANPAY'
			if (base === SIGHASH_NONE) return 'NONE|ANYONECANPAY'
			if (base === SIGHASH_SINGLE) return 'SINGLE|ANYONECANPAY'
		}

		if (sighashType === SIGHASH_ALL) return 'ALL'
		if (sighashType === SIGHASH_NONE) return 'NONE'
		if (sighashType === SIGHASH_SINGLE) return 'SINGLE'

		return 'ALL' // Default
	}

	protected async connect(): Promise<{
		address: BIP122Address | undefined
		chain: ConnectedChain | undefined
	}> {
		const feat = getFeature<BitcoinConnectFeature>(this.standardWallet, BITCOIN_WALLET_STANDARD_FEATURES.CONNECT)
		if (!feat?.connect) {
			throw new UnsupportedMethodError(BITCOIN_WALLET_STANDARD_FEATURES.CONNECT, 'bip122')
		}

		const { accounts } = await feat.connect({
			purposes: ['payment', 'ordinals'],
		})

		// Prefer payment account if available
		const allAccounts = accounts ?? this.standardWallet.accounts ?? []
		const paymentAccount = allAccounts.find((acc) => acc.purpose === 'payment')
		this.account = paymentAccount ?? allAccounts[0]
		const address = this.account?.address as BIP122Address | undefined
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
		// Prefer payment account if available
		const allAccounts = this.standardWallet.accounts ?? []
		const paymentAccount = allAccounts.find((acc) => acc.purpose === 'payment')
		this.account = paymentAccount ?? allAccounts[0]
		const address = this.account?.address as BIP122Address | undefined

		if (!address) return this.connect()

		const chain = {
			namespace: BIP122_SCOPE.ID,
			reference: this.chainRef,
		}
		return { address, chain }
	}

	protected async disconnect(): Promise<void> {
		this.account = undefined
		this.__internal.setAddress(undefined)
		this.__internal.setChain(undefined)
	}

	protected startListeners(): void {
		// Bitcoin Wallet Standard doesn't define events yet
		// Can be implemented when standard is updated
	}

	protected stopListeners(): void {
		// Bitcoin Wallet Standard doesn't define events yet
	}
}
