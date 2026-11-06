import type { SolanaAddress } from '../../address.js'

export type SignInMethod = 'signIn'

export type SignInParams = {
	domain?: string
	address?: SolanaAddress
	statement?: string
	uri?: string
	version?: string
	chainId?: string
	nonce?: string
	issuedAt?: string
	expirationTime?: string
	notBefore?: string
	requestId?: string
	resources?: readonly string[]
}

export type SignInResponse = {
	account: {
		address: SolanaAddress
		publicKey?: Uint8Array
	}
	signedMessage: Uint8Array
	signature: Uint8Array
	signatureType?: 'ed25519'
}
