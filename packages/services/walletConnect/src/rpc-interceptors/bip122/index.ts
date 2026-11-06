/**
 * Bitcoin RPC Interceptor
 * Converts Bitcoin namespace RPC calls to WalletConnect format
 */

import type { SignClientInstance } from '../../types.js'
import type { SessionTypes } from '@walletconnect/types'
import type {
	Account,
	SignMessageParams,
	SignPsbtParams,
	SendTransferParams,
	GetAccountsResponse,
	SignMessageResponse,
	SignPsbtResponse,
} from '@trustwallet/connect-bip122-types'
import { bytesToBase64, base64ToBytes, bytesToHex, hexToBytes } from '@trustwallet/connect-utils/encoding'
import type { WalletConnectBIP122Request, WalletConnectBIP122Response } from '../../rpc-types/index.js'
import { AccountNotFoundError, UnsupportedMethodError } from '@trustwallet/connect-core'

export type BIP122InterceptorContext = {
	client: SignClientInstance
	session: SessionTypes.Struct
	currentChainId: `bip122:${string}`
	currentAccount?: Account
}

export type BIP122RequestArgs = {
	request: { method: string; params?: unknown }
	chainId: string
}

/**
 * Intercepts Bitcoin RPC requests and handles them locally or forwards to WalletConnect
 */
export async function interceptBIP122Requests<T = unknown>(
	context: BIP122InterceptorContext,
	args: BIP122RequestArgs,
): Promise<T> {
	const { client, session, currentChainId, currentAccount } = context
	const method = args.request.method
	const params = args.request.params

	switch (method) {
		case 'getAccounts': {
			if (!currentAccount) {
				return [] as T
			}

			const result: GetAccountsResponse = [
				{
					address: currentAccount.address,
					publicKey: currentAccount.publicKey,
					addressType: currentAccount.addressType,
				},
			]
			return result as T
		}

		case 'signMessage': {
			if (!currentAccount) {
				throw new AccountNotFoundError('', 'bip122')
			}

			const msgParams = params as SignMessageParams

			// Convert Uint8Array message to hex string for WalletConnect
			const messageHex = bytesToHex(msgParams.message)

			const wcRequest: WalletConnectBIP122Request = {
				method: 'signMessage',
				params: {
					address: msgParams.address,
					message: messageHex,
					protocol: msgParams.protocol,
				},
			}

			const response = await client.request<WalletConnectBIP122Response<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			// Convert hex signature and messageHash back to Uint8Array
			const result: SignMessageResponse = {
				signature: hexToBytes(response.signature),
				address: response.address,
				messageHash: response.messageHash ? hexToBytes(response.messageHash) : undefined,
			}
			return result as T
		}

		case 'signPsbt': {
			if (!currentAccount) {
				throw new AccountNotFoundError('', 'bip122')
			}

			const psbtParams = params as SignPsbtParams

			// Convert Uint8Array PSBT to base64 for WalletConnect
			const psbtBase64 = bytesToBase64(psbtParams.psbt)

			// Convert Uint8Array publicKeys in signInputs to hex strings
			const signInputs = psbtParams.signInputs?.map((input) => ({
				index: input.index,
				address: input.address,
				publicKey: input.publicKey ? bytesToHex(input.publicKey) : undefined,
				sighashType: input.sighashType,
			}))

			const wcRequest: WalletConnectBIP122Request = {
				method: 'signPsbt',
				params: {
					psbt: psbtBase64,
					signInputs,
					broadcast: psbtParams.finalize,
				},
			}

			const response = await client.request<WalletConnectBIP122Response<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			// Convert base64 PSBT back to Uint8Array
			const psbtBytes = base64ToBytes(response.psbt)

			let result: SignPsbtResponse
			if (psbtParams.finalize && response.txid) {
				result = {
					psbt: psbtBytes,
					txid: response.txid,
					finalized: true,
				}
			} else {
				result = {
					psbt: psbtBytes,
					finalized: false,
				}
			}
			return result as T
		}

		case 'sendTransfer': {
			if (!currentAccount) {
				throw new AccountNotFoundError('', 'bip122')
			}

			const transferParams = params as SendTransferParams

			const wcRequest: WalletConnectBIP122Request = {
				method: 'sendTransfer',
				params: {
					toAddress: transferParams.toAddress,
					satoshis: transferParams.satoshis,
				},
			}

			const response = await client.request<WalletConnectBIP122Response<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			return response.txid as T
		}

		default:
			throw new UnsupportedMethodError(method, 'bip122')
	}
}
