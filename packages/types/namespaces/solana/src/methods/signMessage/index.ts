import type { SolanaAddress } from '../../address.js'

export type SignMessageMethod = 'signMessage'
export type SignMessageParams = {
	address: SolanaAddress
	message: Uint8Array
}
export type SignMessageResponse = {
	signedMessage: Uint8Array
	signature: Uint8Array
	signatureType?: 'ed25519'
}
