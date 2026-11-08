import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { sendTransaction, signMessage, writeContract, waitForTransactionReceipt } from 'viem/actions'
import type { Chain } from 'viem'

/**
 * Options for useEIP155Query hook
 */
export type UseEIP155QueryOptions<TAction extends (client: never, ...args: never[]) => Promise<unknown>> = {
	/** The chain to use for the request */
	chain: Chain
	/** The Viem action to execute (e.g., getBalance, getBlockNumber) */
	action: TAction
	/** Parameters for the action (excluding the client) */
	request: Parameters<TAction>[1]
	/** React Query options */
	queryOptions?: Omit<UseQueryOptions<Awaited<ReturnType<TAction>>, Error, Awaited<ReturnType<TAction>>>, 'queryFn'>
}

/**
 * Options for useEIP155Mutation hook
 */
export type UseEIP155MutationOptions<TAction extends (client: never, ...args: never[]) => Promise<unknown>> = {
	/** The chain to use for the request */
	chain: Chain
	/** The Viem action to execute (e.g., signMessage, sendTransaction) */
	action: TAction
	/** Parameters for the action (excluding the client) - can be provided here or when calling mutate */
	request?: Parameters<TAction>[1]
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<Awaited<ReturnType<TAction>>, Error, Parameters<TAction>[1] | undefined, unknown>,
		'mutationFn' | 'mutationKey'
	>
}

export type SignMessageResult = Awaited<ReturnType<typeof signMessage>>

export type UseSignMessageOptions = {
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<SignMessageResult, Error, { message: string }, unknown>,
		'mutationFn' | 'mutationKey'
	>
}

export type WriteContractRequest = Parameters<typeof writeContract>[1]
export type WriteContractRequestFiltered = Omit<WriteContractRequest, 'account'>
export type SendTransactionRequest = Parameters<typeof sendTransaction>[1]
export type SendTransactionRequestFiltered = Omit<SendTransactionRequest, 'account'>

export type UseWriteContractAndWaitOptions = {
	/**If true it will request switchChain internally, true by default. */
	autoSwitchChain?: boolean
	/** Parameters for writeContract - can be provided here or when calling writeContract */
	request?: WriteContractRequestFiltered
	/** Options for waiting on transaction confirmation */
	receiptOptions?: Omit<Parameters<typeof waitForTransactionReceipt>[1], 'hash'>
	/** React Query options for the receipt query */
	waitQueryOptions?: Omit<
		UseQueryOptions<Awaited<ReturnType<typeof waitForTransactionReceipt>>, Error>,
		'queryKey' | 'queryFn'
	>
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<Awaited<ReturnType<typeof writeContract>>, Error, WriteContractRequestFiltered | undefined, unknown>,
		'mutationFn' | 'mutationKey'
	>
}

export type UseSendTransactionOptions = {
	/**If true it will request switchChain internally, true by default. */
	autoSwitchChain?: boolean
	/** Parameters for sendTransaction - can be provided here or when calling sendTransaction */
	request?: SendTransactionRequestFiltered
	/** Options for waiting on transaction confirmation */
	receiptOptions?: Omit<Parameters<typeof waitForTransactionReceipt>[1], 'hash'>
	/** React Query options for the receipt query */
	waitQueryOptions?: Omit<
		UseQueryOptions<Awaited<ReturnType<typeof waitForTransactionReceipt>>, Error>,
		'queryKey' | 'queryFn'
	>
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<Awaited<ReturnType<typeof sendTransaction>>, Error, SendTransactionRequestFiltered | undefined, unknown>,
		'mutationFn' | 'mutationKey'
	>
}
