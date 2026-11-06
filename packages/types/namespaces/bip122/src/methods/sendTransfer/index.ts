import type { BIP122Address } from '../../address.js'

export type SendTransferMethod = 'sendTransfer'

export type SendTransferParams = {
	/**
	 * Recipient address.
	 */
	toAddress: BIP122Address

	/**
	 * Amount to send, expressed in satoshis.
	 */
	satoshis: number
}

export type SendTransferResponse = string // txid (hex)
