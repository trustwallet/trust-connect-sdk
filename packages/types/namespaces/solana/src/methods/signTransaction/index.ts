import type { SolanaAddress } from '../../address.js'
import type { SolanaCommitment } from '../../commitment.js'

export type SignTransactionMethod = 'signTransaction'

export type SignTransactionOptions = {
	preflightCommitment?: SolanaCommitment
	minContextSlot?: number
}

export type SignTransactionParams = {
	transaction: Uint8Array
	address: SolanaAddress
	options?: SignTransactionOptions
}

export type SignTransactionResponse = {
	signedTransaction: Uint8Array
}
