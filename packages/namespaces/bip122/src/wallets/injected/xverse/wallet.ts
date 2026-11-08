import {
	type ChainReference,
	type ConnectedChain,
	type NamespaceId,
	WalletAdapterBase,
	UnsupportedMethodError,
} from '@trustwallet/connect-core'
import type {
	BIP122Address,
	BIP122Provider,
	BIP122RequestArguments,
	BIP122RequestParams,
	BIP122Response,
} from '@trustwallet/connect-bip122-types'
import type { XverseAddress, XverseWalletAPI } from './types.js'
import { hexToBytes, bytesToString, base64ToBytes } from '@trustwallet/connect-utils/encoding'
import { BIP122_SCOPE } from '../../../constants.js'

export class XverseWallet extends WalletAdapterBase<'namespace', BIP122Address, BIP122Provider> {
	public id = 'xverse'
	public namespaceIds: [NamespaceId] = [BIP122_SCOPE.ID]
	public type: 'namespace' = 'namespace'
	public name = 'Xverse Wallet'
	public icon =
		'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGlkPSJJY29uX0FydCAoRWRpdCBNZSkiPgo8cmVjdCB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgZmlsbD0iIzE4MTgxOCIvPgo8ZyBpZD0iTG9nby9FbWJsZW0iIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8yMF8xMjIzKSI+CjxwYXRoIGlkPSJWZWN0b3IiIGQ9Ik03NC42NTQyIDczLjg4ODNWNjUuMjMxMkM3NC42NTQyIDY0Ljg4OCA3NC41MTc3IDY0LjU2MDYgNzQuMjc0NSA2NC4zMTc0TDM3LjQzOTcgMjcuNDgyNUMzNy4xOTY1IDI3LjIzOTIgMzYuODY5MSAyNy4xMDI4IDM2LjUyNTggMjcuMTAyOEgyNy44NjlDMjcuNDQxNiAyNy4xMDI4IDI3LjA5MzggMjcuNDUwNiAyNy4wOTM4IDI3Ljg3OFYzNS45MjExQzI3LjA5MzggMzYuMjY0NCAyNy4yMzAyIDM2LjU5MTcgMjcuNDczNCAzNi44MzVMNDAuNjk1MiA1MC4wNTY3QzQwLjk5NzUgNTAuMzU5MSA0MC45OTc1IDUwLjg1MDEgNDAuNjk1MiA1MS4xNTI0TDI3LjMyMTEgNjQuNTI2NUMyNy4xNzU2IDY0LjY3MiAyNy4wOTM4IDY0Ljg2OTggMjcuMDkzOCA2NS4wNzQ0VjczLjg4ODNDMjcuMDkzOCA3NC4zMTUzIDI3LjQ0MTYgNzQuNjYzNSAyNy44NjkgNzQuNjYzNUg0Mi4zMzQyQzQyLjc2MTYgNzQuNjYzNSA0My4xMDk0IDc0LjMxNTMgNDMuMTA5NCA3My44ODgzVjY4LjY5NThDNDMuMTA5NCA2OC40OTEyIDQzLjE5MTIgNjguMjkzNSA0My4zMzY4IDY4LjE0NzlMNTAuNTExNCA2MC45NzMzQzUwLjgxMzggNjAuNjcwOSA1MS4zMDQ4IDYwLjY3MDkgNTEuNjA3MiA2MC45NzMzTDY0LjkxOTggNzQuMjg2MUM2NS4xNjMxIDc0LjUyOTMgNjUuNDkwNCA3NC42NjU4IDY1LjgzMzcgNzQuNjY1OEg3My44NzY3Qzc0LjMwNDIgNzQuNjY1OCA3NC42NTE5IDc0LjMxNzYgNzQuNjUxOSA3My44OTA2TDc0LjY1NDIgNzMuODg4M1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGlkPSJWZWN0b3JfMiIgZD0iTTU1LjM1OCAzOC41NjcySDYyLjYwMzFDNjMuMDMyOCAzOC41NjcyIDYzLjM4MjkgMzguOTE3MyA2My4zODI5IDM5LjM0NjlWNDYuNTkyMUM2My4zODI5IDQ3LjI4NzcgNjQuMjI0IDQ3LjYzNTUgNjQuNzE1MSA0Ny4xNDIyTDc0LjY1NDEgMzcuMTg3M0M3NC43OTk0IDM3LjA0MTggNzQuODgxNiAzNi44NDQgNzQuODgxNiAzNi42MzcxVjI3LjkxODlDNzQuODgxNiAyNy40ODkyIDc0LjUzMzQgMjcuMTM5MSA3NC4xMDE3IDI3LjEzOTFMNjUuMjUzOCAyNy4xMjc3QzY1LjA0NyAyNy4xMjc3IDY0Ljg0OTIgMjcuMjA5NiA2NC43MDE0IDI3LjM1NTFMNTQuODA1NiAzNy4yMzVDNTQuMzE0NSAzNy43MjYgNTQuNjYyMyAzOC41NjcyIDU1LjM1NTcgMzguNTY3Mkg1NS4zNThaIiBmaWxsPSIjRUU3QTMwIi8+CjwvZz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF8yMF8xMjIzIj4KPHJlY3Qgd2lkdGg9IjQ3LjgxMjUiIGhlaWdodD0iNDcuODEyNSIgZmlsbD0id2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI3LjA5MzggMjcuMDkzOCkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K'
	public chainRef: ChainReference

	private xverse: XverseWalletAPI
	private addresses: XverseAddress[] = []

	constructor({ xverse, chainRef }: { xverse: XverseWalletAPI; chainRef: ChainReference }) {
		super()
		this.xverse = xverse
		this.chainRef = chainRef
	}

	public async getProvider(): Promise<BIP122Provider> {
		const xverse = this.xverse
		const self = this

		return {
			request: async <T extends BIP122RequestArguments>(
				args: BIP122RequestParams<T>,
			): Promise<BIP122Response<T>> => {
				const { request } = args

				switch (request.method) {
					case 'getAccounts': {
						return self.addresses.map((acc) => ({
							address: acc.address,
							publicKey: hexToBytes(acc.publicKey),
							addressType: acc.addressType,
							intent: acc.purpose === 'ordinals' ? 'ordinal' : acc.purpose,
						})) as BIP122Response<T>
					}

					case 'signMessage': {
						// Map protocol to Xverse format (uppercase)
						const protocol = request.params.protocol === 'bip322' ? 'BIP322' : 'ECDSA'

						// Convert Uint8Array message to string for Xverse
						const messageStr = bytesToString(request.params.message)

						const response = await xverse.request('signMessage', {
							address: request.params.address,
							message: messageStr,
							protocol,
						})

						if ('error' in response) {
							throw response.error
						}

						return {
							signature: base64ToBytes(response.result.signature),
							messageHash: base64ToBytes(response.result.messageHash),
							address: response.result.address,
						} as BIP122Response<T>
					}

					case 'signPsbt': {
						const signInputs: Record<string, number[]> = {}
						for (const input of request.params.signInputs) {
							if (input.address) {
								if (!signInputs[input.address]) {
									signInputs[input.address] = []
								}
								signInputs[input.address].push(input.index)
							}
						}

						// Convert Uint8Array PSBT to base64 for Xverse
						const psbtBase64 = btoa(String.fromCharCode(...request.params.psbt))

						const response = await xverse.request('signPsbt', {
							psbt: psbtBase64,
							broadcast: request.params.finalize || false,
							signInputs,
						})

						if ('error' in response) {
							throw response.error
						}

						// Convert base64 result back to Uint8Array
						const psbtBytes = Uint8Array.from(atob(response.result.psbt), (c) => c.charCodeAt(0))

						if (request.params.finalize && response.result.txId) {
							return {
								psbt: psbtBytes,
								txid: response.result.txId,
								finalized: true,
							} as BIP122Response<T>
						}

						return {
							psbt: psbtBytes,
							finalized: false,
						} as BIP122Response<T>
					}

					case 'sendTransfer': {
						const response = await xverse.request('sendTransfer', {
							recipients: [
								{
									address: request.params.toAddress,
									amount: request.params.satoshis.toString(),
								},
							],
						})

						if ('error' in response) {
							throw response.error
						}

						return response.result.txid as BIP122Response<T>
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
		const response = await this.xverse.request('wallet_connect')

		if ('error' in response) {
			throw response.error
		}
		this.addresses = response.result.addresses

		// Prefer payment address if available
		const paymentAddress = this.addresses.find((acc) => acc.purpose === 'payment')
		const address = (paymentAddress?.address || this.addresses[0]?.address) as BIP122Address | undefined
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
		if (this.addresses.length === 0) return this.connect()

		// Prefer payment address if available
		const paymentAddress = this.addresses.find((acc) => acc.purpose === 'payment')
		const address = (paymentAddress?.address || this.addresses[0]?.address) as BIP122Address | undefined
		const chain = {
			namespace: BIP122_SCOPE.ID,
			reference: this.chainRef,
		}
		return { address, chain }
	}

	protected async disconnect(): Promise<void> {
		this.xverse.request('wallet_disconnect')
		this.addresses = []
		this.__internal.setAddress(undefined)
		this.__internal.setChain(undefined)
	}

	protected startListeners(): void {
		// Xverse doesn't expose account change events via standard API
	}

	protected stopListeners(): void {
		// No listeners to stop
	}
}
