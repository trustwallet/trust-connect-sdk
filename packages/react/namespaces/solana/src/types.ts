import type { UseMutationOptions } from '@tanstack/react-query'

/**
 * Parameters for signing a message
 */
export type SignMessageParams = {
	/** The message to sign (human-readable string, will be encoded to Uint8Array internally) */
	message: string
}

/**
 * Result from signing a message (matches Wallet Standard output)
 */
export type SignMessageResult = {
	/** Message bytes that were signed (may be modified by wallet) */
	signedMessage: Uint8Array
	/** Ed25519 signature */
	signature: Uint8Array
	/** Optional signature type (defaults to ed25519) */
	signatureType?: 'ed25519'
}

/**
 * Options for useSignMessage hook
 */
export type UseSignMessageOptions = {
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<SignMessageResult, Error, SignMessageParams, unknown>,
		'mutationFn' | 'mutationKey'
	>
}

/**
 * Parameters for sending a transaction
 */
export type SignAndSendTransactionParams = {
	/** Serialized transaction as Uint8Array */
	transaction: Uint8Array
	/** Transaction options (matches Wallet Standard) */
	options?: {
		/** Commitment level. If provided, confirm the transaction after sending */
		commitment?: 'processed' | 'confirmed' | 'finalized'
		/** Disable transaction verification at the RPC */
		skipPreflight?: boolean
		/** Commitment level for preflight */
		preflightCommitment?: 'processed' | 'confirmed' | 'finalized'
		/** Maximum number of times to retry sending the transaction */
		maxRetries?: number
		/** Minimum slot to include the transaction */
		minContextSlot?: number
	}
}

/**
 * Result from sending a transaction (matches Wallet Standard output)
 */
export type SignAndSendTransactionResult = {
	/** Transaction signature as raw bytes */
	signature: Uint8Array
}

/**
 * Options for useSendTransaction hook
 */
export type UseSendTransactionOptions = {
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<SignAndSendTransactionResult, Error, SignAndSendTransactionParams, unknown>,
		'mutationFn' | 'mutationKey'
	>
}
