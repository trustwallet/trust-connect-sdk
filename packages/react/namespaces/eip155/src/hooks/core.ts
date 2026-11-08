import { useQuery, useMutation } from '@tanstack/react-query'
import type { Chain } from 'viem'
import { createClient, fallback, http } from 'viem'
import { useCallback, useMemo } from 'react'
import { EIP155_SCOPE } from '@trustwallet/connect-eip155-core'
import {
	buildChainId,
	MissingRequiredParamError,
	NamespaceNotFoundError,
	NoWalletConnectedError,
	useConnection,
	useTrustConnectContext,
} from '@trustwallet/connect-headless'
import { createEIP155Transport } from '../transport.js'
import type { UseEIP155MutationOptions, UseEIP155QueryOptions } from '../types.js'

export function eip155QueryKey<TAction extends (client: never, ...args: never[]) => Promise<unknown>>(
	chain: Chain,
	action: TAction,
	options?: readonly unknown[],
) {
	return ['eip155', 'query', chain.id, action.name, ...(options ?? [])] as const
}

export function useEIP155Query<TAction extends (client: never, ...args: never[]) => Promise<unknown>>(
	options: UseEIP155QueryOptions<TAction>,
) {
	const { client } = useTrustConnectContext()
	const { action, chain, request, queryOptions } = options

	const transport = useMemo(() => {
		if (!queryOptions?.enabled) return

		const namespace = client.getNamespace(EIP155_SCOPE.ID)
		if (!namespace) {
			throw new NamespaceNotFoundError(EIP155_SCOPE.ID)
		}

		const chainId = buildChainId({ namespace: namespace.id, reference: chain.id })
		const rpcUrls = namespace?.rpcUrls?.[chainId]

		if (!rpcUrls?.length) return http()

		if (rpcUrls.length === 1) return http(rpcUrls[0])

		return fallback(rpcUrls.map((url) => http(url)))
	}, [client, chain, queryOptions?.enabled])

	type TParams = Parameters<TAction>[1]
	type TReturn = Awaited<ReturnType<TAction>>

	const queryFn = useCallback(async (): Promise<TReturn> => {
		if (!transport) {
			throw new Error('Transport is undefined')
		}
		const viemClient = createClient({
			chain,
			transport,
		})

		return action(viemClient as Parameters<TAction>[0], request as TParams) as TReturn
	}, [chain, transport, action, request])

	const { queryKey, ...reactQueryOptions } = queryOptions ?? {}

	const queryResult = useQuery<TReturn, Error, TReturn>({
		queryKey: chain ? eip155QueryKey(chain, action, queryKey) : [],
		queryFn,
		...reactQueryOptions,
	})

	return {
		...queryResult,
	}
}

export function useEIP155Mutation<TAction extends (client: never, ...args: never[]) => Promise<unknown>>(
	options: UseEIP155MutationOptions<TAction>,
) {
	const { connection } = useConnection({ namespaceId: EIP155_SCOPE.ID })

	const { action, request: defaultRequest, mutationOptions, chain } = options

	type TParams = Parameters<TAction>[1]
	type TReturn = Awaited<ReturnType<TAction>>

	const mutationFn = useCallback(
		async (request?: TParams): Promise<TReturn> => {
			if (connection?.status !== 'connected') {
				throw new NoWalletConnectedError()
			}

			const requestToUse = request ?? defaultRequest

			if (!requestToUse) {
				throw new MissingRequiredParamError('request', 'Pass them to the hook or to the mutate function.')
			}

			const provider = await connection.wallet.getProvider()
			const viemClient = createClient({
				chain,
				transport: createEIP155Transport(provider, chain),
			})

			return action(viemClient as Parameters<TAction>[0], requestToUse as TParams) as TReturn
		},
		[connection, defaultRequest, action, chain],
	)

	return useMutation<TReturn, Error, TParams | undefined, unknown>({
		mutationFn,
		...mutationOptions,
	})
}
