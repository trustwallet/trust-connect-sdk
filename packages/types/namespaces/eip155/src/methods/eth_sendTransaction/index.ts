import type { Hex } from '../../utils/hex.js'
import type { EIP155Address } from '../../address.js'

export type EthSendTransactionMethod = 'eth_sendTransaction'
export type EthSendTransactionParams = [
	{
		from: EIP155Address
		to?: EIP155Address
		data?: Hex
		gas?: Hex
		gasPrice?: Hex
		value?: Hex
		nonce?: Hex
	},
]
export type EthSendTransactionResponse = Hex
