import type { SessionTypes } from '@walletconnect/types'
import type { SignClientInstance } from '../types'
import type { NamespaceAccountData, NamespaceId } from './types'
import { NAMESPACES } from '../constants'
import { hexToBytes } from '@trustwallet/connect-utils/encoding'
import { extractChainRef, extractAddress, buildChainId, type ChainId, InvalidChainRefError } from '@trustwallet/connect-core'
import type { EIP155InterceptorContext } from '../rpc-interceptors/eip155'
import type { SolanaInterceptorContext } from '../rpc-interceptors/solana'
import type { BIP122InterceptorContext } from '../rpc-interceptors/bip122'

const { EIP155, SOLANA, BIP122 } = NAMESPACES

/**
 * Interceptor function type
 */
type InterceptorFunction = (context: any, args: any) => Promise<any>

/**
 * Configuration type for a namespace
 */
type PublishedAccount = {
	address?: string
	chainId?: ChainId
}

type NamespaceConfigItem<N extends NamespaceId> = {
	parseAccount: (account: string) => string
	parseChain: (chain: string | ChainId) => ChainId
	getInterceptor: () => Promise<InterceptorFunction>
	buildContext: (
		account: Partial<NamespaceAccountData[N]>,
		session: SessionTypes.Struct,
		signClient: SignClientInstance,
	) => EIP155InterceptorContext | SolanaInterceptorContext | BIP122InterceptorContext
	parseAccountsChangedEvent: (data: unknown) => Partial<NamespaceAccountData[N]>
	parseChainChangedEvent: (data: unknown) => Partial<NamespaceAccountData[N]>
	connectionFromAccount: (account: Partial<NamespaceAccountData[N]>) => PublishedAccount
}

type NamespaceConfigMap = {
	[K in NamespaceId]: NamespaceConfigItem<K>
}

/**
 * Configuration for each namespace to handle account parsing and RPC interception
 */
export const NAMESPACE_CONFIG: NamespaceConfigMap = {
	[EIP155.ID]: {
		parseAccount: (account: string) => extractAddress(account),

		parseChain: (chain: string) => {
			const ref = extractChainRef(chain)
			const num = Number(ref)
			if (!Number.isFinite(num)) throw new InvalidChainRefError(ref, EIP155.ID)
			return buildChainId({ namespace: EIP155.ID, reference: num.toString() })
		},

		getInterceptor: async () => {
			const { interceptEip155Requests } = await import('../rpc-interceptors/eip155')
			return interceptEip155Requests
		},

		buildContext: (
			account: Partial<NamespaceAccountData['eip155']>,
			session: SessionTypes.Struct,
			signClient: SignClientInstance,
		) => ({
			client: signClient,
			session,
			currentChainId: account.chainId as `eip155:${number}`,
			currentAddress: account.address as `0x${string}`,
			supportedChains: session.namespaces.eip155?.chains || [],
		}),

		parseAccountsChangedEvent: (data: unknown) => {
			const accounts = data as string[]
			const raw = accounts?.[0]
			return { address: typeof raw === 'string' ? extractAddress(raw) : undefined }
		},

		parseChainChangedEvent: (data: unknown) => {
			const raw = typeof data === 'string' && data.includes(':') ? data.slice(data.indexOf(':') + 1) : data
			const numRef = Number(raw)
			if (!Number.isFinite(numRef)) return {}
			return { chainId: buildChainId({ namespace: EIP155.ID, reference: numRef.toString() }) }
		},

		connectionFromAccount: (account) => ({
			address: account.address,
			chainId: account.chainId,
		}),
	},

	[SOLANA.ID]: {
		parseAccount: (account: string) => extractAddress(account),

		parseChain: (chain) => chain as ChainId,

		getInterceptor: async () => {
			const { interceptSolanaRequests } = await import('../rpc-interceptors/solana')
			return interceptSolanaRequests
		},

		buildContext: (
			account: Partial<NamespaceAccountData['solana']>,
			session: SessionTypes.Struct,
			signClient: SignClientInstance,
		) => ({
			client: signClient,
			session,
			currentChainId: account.chainId as `solana:${string}`,
			currentAccount: account.pubkey ? { pubkey: account.pubkey } : undefined,
		}),

		parseAccountsChangedEvent: (data: unknown) => {
			const accounts = data as string[]
			const raw = accounts?.[0]
			return { pubkey: typeof raw === 'string' ? extractAddress(raw) : undefined }
		},

		parseChainChangedEvent: (data: unknown) => {
			return { chainId: data as ChainId }
		},

		connectionFromAccount: (account) => ({
			address: account.pubkey,
			chainId: account.chainId,
		}),
	},

	[BIP122.ID]: {
		parseAccount: (account: string) => extractAddress(account),

		parseChain: (chain) => chain as ChainId,

		getInterceptor: async () => {
			const { interceptBIP122Requests } = await import('../rpc-interceptors/bip122')
			return interceptBIP122Requests
		},

		buildContext: (
			account: Partial<NamespaceAccountData['bip122']>,
			session: SessionTypes.Struct,
			signClient: SignClientInstance,
		) => ({
			client: signClient,
			session,
			currentChainId: account.chainId as `bip122:${string}`,
			currentAccount: account.address
				? {
						address: account.address,
						publicKey: account.publicKey,
						addressType: account.addressType,
					}
				: undefined,
		}),

		parseAccountsChangedEvent: (data: unknown) => {
			const accounts = data as Array<{
				address: string
				publicKey?: string
				addressType?: 'p2tr' | 'p2wpkh' | 'p2sh' | 'p2pkh'
			}>
			const accountData = accounts[0]

			return {
				address: accountData?.address ? extractAddress(accountData.address) : undefined,
				publicKey: accountData?.publicKey ? hexToBytes(accountData.publicKey) : undefined,
				addressType: accountData?.addressType,
			}
		},

		parseChainChangedEvent: (data: unknown) => {
			return { chainId: data as ChainId }
		},

		connectionFromAccount: (account) => ({
			address: account.address,
			chainId: account.chainId,
		}),
	},
}
