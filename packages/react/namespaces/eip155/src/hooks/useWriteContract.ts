import { useMutation, useQuery } from '@tanstack/react-query'
import type { Chain } from 'viem'
import { createClient, type WriteContractReturnType } from 'viem'
import { switchChain, waitForTransactionReceipt, writeContract } from 'viem/actions'
import { useCallback, useRef } from 'react'
import { EIP155_SCOPE } from '@trustwallet/connect-eip155-core'
import {
	MissingChainError,
	MissingRequiredParamError,
	NoWalletConnectedError,
	useConnection,
} from '@trustwallet/connect-headless'
import { createEIP155Transport } from '../transport.js'
import type { UseWriteContractAndWaitOptions, WriteContractRequest, WriteContractRequestFiltered } from '../types.js'

export function useWriteContract(options: UseWriteContractAndWaitOptions = {}) {
	const { connection } = useConnection({ namespaceId: EIP155_SCOPE.ID })
	const { request: defaultRequest, mutationOptions, autoSwitchChain, receiptOptions, waitQueryOptions } = options

	const getClient = useCallback(
		async (chainToUse: Chain) => {
			if (connection?.status !== 'connected') {
				throw new NoWalletConnectedError()
			}

			const provider = await connection.wallet.getProvider()
			return createClient({
				chain: chainToUse,
				account: connection.address,
				transport: createEIP155Transport(provider, chainToUse),
			})
		},
		[connection],
	)

	const lastChainRef = useRef<Chain | null>(null)

	const writeMutation = useMutation({
		mutationFn: async (request?: WriteContractRequestFiltered): Promise<WriteContractReturnType> => {
			const requestToUse = request ?? defaultRequest

			if (!requestToUse) {
				throw new MissingRequiredParamError('request', 'Pass them to the hook or to the writeContract function.')
			}

			const chainToUse = requestToUse.chain
			if (!chainToUse) throw new MissingChainError(EIP155_SCOPE.ID)

			lastChainRef.current = chainToUse
			const viemClient = await getClient(chainToUse)

			if (autoSwitchChain !== false && Number(connection?.chain?.reference) !== chainToUse.id) {
				await switchChain(viemClient, { id: chainToUse.id })
			}

			return writeContract(viemClient, { ...requestToUse } as WriteContractRequest)
		},
		...mutationOptions,
	})

	const hash = writeMutation.data
	const address = connection?.address
	const chainForReceipt = lastChainRef.current

	const waitQuery = useQuery({
		queryKey: [EIP155_SCOPE.ID, waitForTransactionReceipt.name, address, hash, chainForReceipt?.id],
		queryFn: async () => {
			if (!hash) throw new Error('Transaction hash is missing')
			if (!chainForReceipt) throw new MissingChainError(EIP155_SCOPE.ID)
			const viemClient = await getClient(chainForReceipt)
			return waitForTransactionReceipt(viemClient, { hash, ...receiptOptions })
		},
		enabled: Boolean(hash),
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		...waitQueryOptions,
	})

	return {
		...writeMutation,
		writeContract: writeMutation.mutate,
		writeContractAsync: writeMutation.mutateAsync,
		isConfirming: waitQuery.isFetching,
		isConfirmed: waitQuery.isSuccess,
		error: writeMutation.error ?? waitQuery.error,
		hash: writeMutation.data,
		receipt: waitQuery.data,
	}
}
