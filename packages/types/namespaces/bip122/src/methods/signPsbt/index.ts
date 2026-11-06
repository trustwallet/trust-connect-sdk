import type { BIP122Address } from '../../address.js'

export type SignPsbtMethod = 'signPsbt'

export type SignPsbtParams = {
	/**
	 * PSBT bytes (raw binary).
	 *
	 * IMPORTANT:
	 * - The dapp MUST decode base64/hex and provide final bytes.
	 * - Wallet MUST interpret these bytes as PSBT (BIP-174) and sign accordingly.
	 */
	psbt: Uint8Array

	/**
	 * Inputs to be signed.
	 */
	signInputs: Array<{
		/**
		 * Input index within the PSBT.
		 */
		index: number

		/**
		 * Address associated with the input, if applicable.
		 */
		address?: BIP122Address

		/**
		 * Public key associated with the input, if applicable.
		 */
		publicKey?: Uint8Array

		/**
		 * Sighash type to use for the input, if specified.
		 */
		sighashType?: number
	}>

	/**
	 * Indicates whether the wallet should attempt to finalize the PSBT.
	 */
	finalize?: boolean
}

export type SignPsbtResponse =
	| {
			/** Signed PSBT bytes (not finalized) */
			psbt: Uint8Array
			finalized: false
	  }
	| {
			/** Finalized PSBT bytes */
			psbt: Uint8Array
			/** Transaction ID of the broadcast transaction (hex) */
			txid: string
			finalized: true
	  }
