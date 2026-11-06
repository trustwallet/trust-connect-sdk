import { useMutation } from '@tanstack/react-query'
import { buildChainId, useTrustConnectContext } from '@trustwallet/connect-headless'
import { BIP122_SCOPE, type BIP122ChainId } from '@trustwallet/connect-bip122-core'
import {
	NoWalletConnectedError,
	WalletNotFoundInConnectionError,
	AccountNotFoundError,
} from '@trustwallet/connect-headless'
import type {
	SignMessageMutationParams,
	SignMessageMutationResult,
	SignPsbtMutationParams,
	SignPsbtMutationResult,
	SendTransferMutationParams,
	SendTransferMutationResult,
	UseSignMessageOptions,
	UseSignPsbtOptions,
	UseSendTransferOptions,
} from './types.js'
import {
	stringToBytes,
	bytesToHex,
	base64ToBytes,
	bytesToBase64,
	hexToBytes,
} from '@trustwallet/connect-utils/encoding'

export function useSignMessage(options: UseSignMessageOptions = {}) {
	const { client } = useTrustConnectContext()
	const { mutationOptions } = options

	const connection = client.connections[BIP122_SCOPE.ID]

	const mutationFn = async (params: SignMessageMutationParams): Promise<SignMessageMutationResult> => {
		if (connection?.status !== 'connected') {
			throw new NoWalletConnectedError('Bitcoin')
		}

		const wallet = connection.wallet
		if (!wallet) {
			throw new WalletNotFoundInConnectionError()
		}

		const address = connection.address
		if (!address) {
			throw new AccountNotFoundError('', 'bip122')
		}

		const chainId = buildChainId(connection.chain) as BIP122ChainId

		const provider = await wallet.getProvider()

		const result = await provider.request({
			chainId,
			request: {
				method: 'signMessage',
				params: {
					address,
					message: stringToBytes(params.message),
					protocol: params.protocol || 'ecdsa',
				},
			},
		})

		return {
			signature: bytesToHex(result.signature),
			address: result.address,
			messageHash: result.messageHash ? bytesToHex(result.messageHash) : undefined,
		}
	}

	return useMutation<SignMessageMutationResult, Error, SignMessageMutationParams, unknown>({
		mutationKey: ['bip122', 'signMessage'],
		mutationFn,
		...mutationOptions,
	})
}

export function useSignPsbt(options: UseSignPsbtOptions = {}) {
	const { client } = useTrustConnectContext()
	const { mutationOptions } = options

	const connection = client.connections[BIP122_SCOPE.ID]

	const mutationFn = async (params: SignPsbtMutationParams): Promise<SignPsbtMutationResult> => {
		if (connection?.status !== 'connected') {
			throw new NoWalletConnectedError('Bitcoin')
		}

		const wallet = connection.wallet
		if (!wallet) {
			throw new WalletNotFoundInConnectionError()
		}
		const chainId = buildChainId(connection.chain) as BIP122ChainId

		const provider = await wallet.getProvider()

		const result = await provider.request({
			chainId,
			request: {
				method: 'signPsbt',
				params: {
					psbt: base64ToBytes(params.psbt),
					signInputs: params.signInputs.map((input) => ({
						index: input.index,
						address: input.address,
						publicKey: input.publicKey ? hexToBytes(input.publicKey) : undefined,
						sighashType: input.sighashType,
					})),
					finalize: params.finalize,
				},
			},
		})

		if ('txid' in result && result.txid) {
			return {
				psbt: bytesToBase64(result.psbt),
				txid: result.txid,
				finalized: true,
			}
		}

		return {
			psbt: bytesToBase64(result.psbt),
			finalized: false,
		}
	}

	return useMutation<SignPsbtMutationResult, Error, SignPsbtMutationParams, unknown>({
		mutationKey: ['bip122', 'signPsbt'],
		mutationFn,
		...mutationOptions,
	})
}

export function useSendTransfer(options: UseSendTransferOptions = {}) {
	const { client } = useTrustConnectContext()
	const { mutationOptions } = options

	const connection = client.connections[BIP122_SCOPE.ID]

	const mutationFn = async (params: SendTransferMutationParams): Promise<SendTransferMutationResult> => {
		if (connection?.status !== 'connected') {
			throw new NoWalletConnectedError('Bitcoin')
		}

		const wallet = connection.wallet
		if (!wallet) {
			throw new WalletNotFoundInConnectionError()
		}
		const chainId = buildChainId(connection.chain) as BIP122ChainId
		const provider = await wallet.getProvider()

		const result = await provider.request({
			chainId,
			request: {
				method: 'sendTransfer',
				params: {
					toAddress: params.toAddress,
					satoshis: params.satoshis,
				},
			},
		})

		return {
			txid: result,
		}
	}

	return useMutation<SendTransferMutationResult, Error, SendTransferMutationParams, unknown>({
		mutationKey: ['bip122', 'sendTransfer'],
		mutationFn,
		...mutationOptions,
	})
}
