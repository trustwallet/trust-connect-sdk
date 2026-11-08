import type { UseMutationOptions } from '@tanstack/react-query'

/**
 * Parameters for signing a message
 */
export type SignMessageMutationParams = {
	/** The message to sign */
	message: string
	/** Message signing protocol (defaults to 'ecdsa' if omitted) */
	protocol?: 'ecdsa' | 'bip322'
}

/**
 * Result from signing a message
 */
export type SignMessageMutationResult = {
	/** Signature produced by the wallet */
	signature: string
	/** Address used for signing, if provided by the wallet */
	address?: string
	/** Hash of the signed message, if provided by the wallet */
	messageHash?: string
}

/**
 * Options for useSignMessage hook
 */
export type UseSignMessageOptions = {
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<SignMessageMutationResult, Error, SignMessageMutationParams, unknown>,
		'mutationFn' | 'mutationKey'
	>
}

/**
 * Parameters for signing a PSBT
 */
export type SignPsbtMutationParams = {
	/** PSBT encoded in base64 */
	psbt: string
	/** Inputs to be signed */
	signInputs: Array<{
		/** Input index within the PSBT */
		index: number
		/** Address associated with the input, if applicable */
		address?: string
		/** Public key associated with the input, if applicable */
		publicKey?: string
		/** Sighash type to use for the input, if specified */
		sighashType?: number
	}>
	/** Indicates whether the wallet should attempt to finalize the PSBT */
	finalize?: boolean
}

/**
 * Result from signing a PSBT
 */
export type SignPsbtMutationResult =
	| {
			/** Signed PSBT in base64 format (not finalized) */
			psbt: string
			/** PSBT was not finalized */
			finalized: false
	  }
	| {
			/** Finalized PSBT in base64 format */
			psbt: string
			/** Transaction ID of the broadcast transaction */
			txid: string
			/** PSBT was finalized and broadcast */
			finalized: true
	  }

/**
 * Options for useSignPsbt hook
 */
export type UseSignPsbtOptions = {
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<SignPsbtMutationResult, Error, SignPsbtMutationParams, unknown>,
		'mutationFn' | 'mutationKey'
	>
}

/**
 * Parameters for sending a transfer
 */
export type SendTransferMutationParams = {
	/** Recipient address */
	toAddress: string
	/** Amount to send, expressed in satoshis */
	satoshis: number
}

/**
 * Result from sending a transfer
 */
export type SendTransferMutationResult = {
	/** Transaction ID */
	txid: string
}

/**
 * Options for useSendTransfer hook
 */
export type UseSendTransferOptions = {
	/** React Query mutation options */
	mutationOptions?: Omit<
		UseMutationOptions<SendTransferMutationResult, Error, SendTransferMutationParams, unknown>,
		'mutationFn' | 'mutationKey'
	>
}
