import { useMutation } from '@tanstack/react-query'
import { buildChainId, useTrustConnectContext } from '@trustwallet/connect-headless'
import { SOLANA_SCOPE, type SolanaChainId } from '@trustwallet/connect-solana-core'
import {
	NoWalletConnectedError,
	WalletNotFoundInConnectionError,
	AccountNotFoundError,
	InvalidResponseError,
} from '@trustwallet/connect-headless'
import type {
	SignMessageParams,
	SignMessageResult,
	SignAndSendTransactionParams,
	SignAndSendTransactionResult,
	UseSignMessageOptions,
	UseSendTransactionOptions,
} from './types.js'

export function useSignMessage(options: UseSignMessageOptions = {}) {
	const { client } = useTrustConnectContext()
	const { mutationOptions } = options

	const connection = client.connections[SOLANA_SCOPE.ID]

	const mutationFn = async (params: SignMessageParams): Promise<SignMessageResult> => {
		if (connection?.status !== 'connected') {
			throw new NoWalletConnectedError(SOLANA_SCOPE.ID)
		}

		const wallet = connection.wallet
		if (!wallet) {
			throw new WalletNotFoundInConnectionError()
		}

		const address = connection.address
		if (!address) {
			throw new AccountNotFoundError('', SOLANA_SCOPE.ID)
		}

		const provider = await wallet.getProvider()
		const chainId = buildChainId(connection.chain) as SolanaChainId

		// Convert string message to Uint8Array
		const messageBytes = new TextEncoder().encode(params.message)

		const result = await provider.request<{
			method: 'signMessage'
			params: { address: string; message: Uint8Array }
		}>({
			chainId,
			request: {
				method: 'signMessage',
				params: {
					address,
					message: messageBytes,
				},
			},
		})

		return {
			signedMessage: result.signedMessage,
			signature: result.signature,
			signatureType: result.signatureType,
		}
	}

	return useMutation<SignMessageResult, Error, SignMessageParams, unknown>({
		mutationKey: ['solana', 'signMessage'],
		mutationFn,
		...mutationOptions,
	})
}

export function useSignSendTransaction(options: UseSendTransactionOptions = {}) {
	const { client } = useTrustConnectContext()
	const { mutationOptions } = options

	const connection = client.connections[SOLANA_SCOPE.ID]

	const mutationFn = async (params: SignAndSendTransactionParams): Promise<SignAndSendTransactionResult> => {
		if (connection?.status !== 'connected') {
			throw new NoWalletConnectedError(SOLANA_SCOPE.ID)
		}

		const wallet = connection.wallet
		if (!wallet) {
			throw new WalletNotFoundInConnectionError()
		}

		const address = connection.address
		if (!address) {
			throw new AccountNotFoundError('', SOLANA_SCOPE.ID)
		}

		const provider = await wallet.getProvider()
		const chainId = buildChainId(connection.chain) as SolanaChainId

		const result = await provider.request({
			chainId,
			request: {
				method: 'signAndSendTransaction',
				params: {
					transaction: params.transaction,
					address,
					chain: chainId,
					...(params.options ? { options: params.options } : {}),
				},
			},
		})

		if ('signature' in result) {
			return {
				signature: result.signature,
			}
		}

		throw new InvalidResponseError('wallet')
	}

	return useMutation<SignAndSendTransactionResult, Error, SignAndSendTransactionParams, unknown>({
		mutationKey: ['solana', 'signAndSendTransaction'],
		mutationFn,
		...mutationOptions,
	})
}
