import type { SolanaAddress } from '../../address.js'
import type { SolanaChainId } from '../../chain.js'
import type { SolanaCommitment } from '../../commitment.js'

export type SignAndSendTransactionMethod = 'signAndSendTransaction'

export type SignAndSendTransactionOptions = {
	preflightCommitment?: SolanaCommitment
	minContextSlot?: number
	commitment?: SolanaCommitment
	skipPreflight?: boolean
	maxRetries?: number
}

export type SignAndSendTransactionParams = {
	transaction: Uint8Array
	address: SolanaAddress
	chain: SolanaChainId
	options?: SignAndSendTransactionOptions
}

export type SignAndSendTransactionResponse = {
	signature: Uint8Array
}
