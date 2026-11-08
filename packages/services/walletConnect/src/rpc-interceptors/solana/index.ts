/**
 * Solana RPC Interceptor
 * Converts Solana namespace RPC calls to WalletConnect format
 * Based on: https://docs.walletconnect.network/wallet-sdk/chain-support/solana
 */

import type { SignClientInstance } from '../../types.js'
import type { SessionTypes } from '@walletconnect/types'
import type { WalletConnectSolanaRequest, WalletConnectSolanaResponse, Base58String } from '../../rpc-types/index.js'
import type {
	SignMessageParams,
	SignTransactionParams,
	SignAndSendTransactionParams,
	SignAndSendAllTransactionsParams,
	SignMessageResponse,
	SignTransactionResponse,
	SignAndSendTransactionResponse,
} from '@trustwallet/connect-solana-types'
import { bytesToBase64, base64ToBytes, bytesToBase58, base58ToBytes } from '@trustwallet/connect-utils/encoding'
import { AccountNotFoundError, UnsupportedMethodError } from '@trustwallet/connect-core'

export type SolanaInterceptorContext = {
	client: SignClientInstance
	session: SessionTypes.Struct
	currentChainId: `solana:${string}`
	currentAccount?: {
		pubkey: Base58String
	}
}

export type SolanaRequestArgs = {
	request: { method: string; params?: unknown }
	chainId: string
}

/**
 * Intercepts Solana RPC requests and handles them locally or forwards to WalletConnect
 * This acts as an adapter between the namespace API (Wallet Standard format) and WalletConnect's RPC format
 */
export async function interceptSolanaRequests<T = unknown>(
	context: SolanaInterceptorContext,
	args: SolanaRequestArgs,
): Promise<T> {
	const { client, session, currentChainId, currentAccount } = context
	const method = args.request.method
	const params = args.request.params

	if (!currentAccount) {
		throw new AccountNotFoundError('', 'solana')
	}

	switch (method) {
		case 'signMessage': {
			const { message } = params as SignMessageParams

			const wcRequest: WalletConnectSolanaRequest = {
				method: 'solana_signMessage',
				params: {
					message: bytesToBase58(message),
					pubkey: currentAccount.pubkey,
				},
			}

			const response = await client.request<WalletConnectSolanaResponse<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			return {
				signature: base58ToBytes(response.signature),
				signedMessage: message,
			} as SignMessageResponse as T
		}

		case 'signTransaction': {
			const { transaction } = params as SignTransactionParams

			const wcRequest: WalletConnectSolanaRequest = {
				method: 'solana_signTransaction',
				params: {
					transaction: bytesToBase64(transaction),
				},
			}

			const response = await client.request<WalletConnectSolanaResponse<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			const signedTransaction = response.transaction ? base64ToBytes(response.transaction) : transaction

			return {
				signedTransaction,
			} as SignTransactionResponse as T
		}

		case 'signAndSendTransaction': {
			const { transaction, options } = params as SignAndSendTransactionParams

			const wcRequest: WalletConnectSolanaRequest = {
				method: 'solana_signAndSendTransaction',
				params: {
					transaction: bytesToBase64(transaction),
					sendOptions: options
						? {
								skipPreflight: options.skipPreflight,
								preflightCommitment: options.preflightCommitment,
								maxRetries: options.maxRetries,
							}
						: undefined,
				},
			}

			const response = await client.request<WalletConnectSolanaResponse<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			return {
				signature: base58ToBytes(response.signature),
			} as SignAndSendTransactionResponse as T
		}

		case 'signAndSendAllTransactions': {
			const { inputs } = params as SignAndSendAllTransactionsParams

			const results = await Promise.allSettled(
				inputs.map(async (input: SignAndSendTransactionParams) => {
					const wcRequest: WalletConnectSolanaRequest = {
						method: 'solana_signAndSendTransaction',
						params: {
							transaction: bytesToBase64(input.transaction),
							sendOptions: input.options
								? {
										skipPreflight: input.options.skipPreflight,
										preflightCommitment: input.options.preflightCommitment,
										maxRetries: input.options.maxRetries,
									}
								: undefined,
						},
					}

					const response = await client.request<WalletConnectSolanaResponse<typeof wcRequest>>({
						topic: session.topic,
						chainId: currentChainId,
						request: wcRequest,
					})

					return {
						signature: base58ToBytes(response.signature),
					}
				}),
			)

			return results as T
		}

		default:
			throw new UnsupportedMethodError(method, 'solana')
	}
}
