import type { BIP122Address } from '../../address.js'

export type GetAccountsMethod = 'getAccounts'

export type GetAccountsParams = never

export type Account = {
	/**
	 * Bitcoin address (base58, bech32 or bech32m).
	 */
	address: BIP122Address

	/**
	 * Public key bytes (typically 33-byte compressed SEC1 key).
	 */
	publicKey?: Uint8Array

	/**
	 * BIP32 derivation path corresponding to the address.
	 * Example: m/84'/0'/0'/0/5
	 */
	path?: string

	/**
	 * Script type of the address.
	 */
	addressType?: 'p2tr' | 'p2wpkh' | 'p2sh' | 'p2pkh'

	/**
	 * Declared intent or usage role of the address.
	 */
	intent?: 'payment' | 'ordinal'
}

export type GetAccountsResponse = Account[]
