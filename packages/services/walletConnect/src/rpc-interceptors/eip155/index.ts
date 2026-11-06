/**
 * EIP155 RPC Interceptor
 * Converts EIP155 namespace RPC calls to WalletConnect format
 * Based on: https://docs.walletconnect.network/wallet-sdk/chain-support/evm
 */

import type { SignClientInstance } from '../../types.js'
import type { SessionTypes } from '@walletconnect/types'
import type { WalletConnectEIP155Request, WalletConnectEIP155Response, HexString } from '../../rpc-types/index.js'
import { InvalidChainRefError, AccountNotFoundError, ChainNotSupportedError } from '@trustwallet/connect-core'

export type EIP155InterceptorContext = {
	client: SignClientInstance
	session: SessionTypes.Struct
	currentChainId: `eip155:${number}`
	currentAddress?: `0x${string}`
	supportedChains: string[]
}

export type EIP155RequestArgs = {
	request: { method: string; params?: unknown }
	chainId: string
}

/**
 * Intercepts EIP155 RPC requests and handles them locally or forwards to WalletConnect
 * This acts as an adapter between the namespace API and WalletConnect's RPC format
 */
export async function interceptEip155Requests<T = unknown>(
	context: EIP155InterceptorContext,
	args: EIP155RequestArgs,
): Promise<T> {
	const { client, session, currentChainId, currentAddress, supportedChains } = context
	const method = args.request.method
	const params = args.request.params

	switch (method) {
		case 'wallet_switchEthereumChain': {
			const chainIdParam = (params as [{ chainId: string }])[0].chainId
			const numRef = Number(chainIdParam)

			if (!Number.isFinite(numRef)) {
				throw new InvalidChainRefError(chainIdParam, 'eip155')
			}

			const targetChain = `eip155:${numRef}`
			if (!supportedChains.includes(targetChain)) {
				throw new ChainNotSupportedError(chainIdParam, supportedChains)
			}

			return null as T
		}

		case 'eth_accounts':
		case 'eth_requestAccounts': {
			const addresses: HexString[] = currentAddress ? [currentAddress] : []
			return addresses as T
		}

		case 'eth_chainId': {
			const chainReference = currentChainId.split(':')[1]
			const chainIdHex = `0x${Number(chainReference).toString(16)}` as HexString
			return chainIdHex as T
		}

		default: {
			if (!currentAddress) {
				throw new AccountNotFoundError('', 'eip155')
			}

			const wcRequest = {
				method,
				params,
			} as WalletConnectEIP155Request

			const response = await client.request<WalletConnectEIP155Response<typeof wcRequest>>({
				topic: session.topic,
				chainId: currentChainId,
				request: wcRequest,
			})

			return response as T
		}
	}
}
