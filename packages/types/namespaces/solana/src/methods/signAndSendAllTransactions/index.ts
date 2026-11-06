import type { SolanaAddress } from '../../address.js'
import type { SolanaChainId } from '../../chain.js'
import type { SignAndSendTransactionOptions, SignAndSendTransactionResponse } from '../signAndSendTransaction/index.js'

export type SignAndSendAllTransactionsMethod = 'signAndSendAllTransactions'

export type SignAndSendAllTransactionsOptions = {
	readonly mode?: 'parallel' | 'serial'
}

export type SignAndSendAllTransactionsParams = {
	inputs: readonly {
		transaction: Uint8Array
		address: SolanaAddress
		chain: SolanaChainId
		options?: SignAndSendTransactionOptions
	}[]
	options?: SignAndSendAllTransactionsOptions
}

export type SignAndSendAllTransactionsResponse = readonly PromiseSettledResult<SignAndSendTransactionResponse>[]
