import type { BIP122Address } from '../../address.js'

export type SignMessageMethod = 'signMessage'

export type SignMessageParams = {
	/**
	 * Address used to sign the message.
	 */
	address: BIP122Address

	/**
	 * Raw message bytes to sign.
	 */
	message: Uint8Array

	/**
	 * Optional human-readable display text the wallet MAY show to the user.
	 * Must NOT affect the signed bytes.
	 */
	display?: string

	/**
	 * Message signing protocol.
	 * Defaults to 'ecdsa' if omitted.
	 */
	protocol?: 'ecdsa' | 'bip322'
}

export type SignMessageResponse = {
	/**
	 * Signature bytes produced by the wallet.
	 * Encoding is not specified here (wallet + dapp must agree out-of-band).
	 */
	signature: Uint8Array

	/**
	 * Address used for signing, if returned by the wallet.
	 */
	address?: BIP122Address

	/**
	 * Hash of the signed message bytes, if provided by the wallet.
	 */
	messageHash?: Uint8Array
}
