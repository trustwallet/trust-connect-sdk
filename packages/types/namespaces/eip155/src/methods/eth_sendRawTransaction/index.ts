import type { Hex } from '../../utils/hex.js'

export type EthSendRawTransactionMethod = 'eth_sendRawTransaction'
export type EthSendRawTransactionParams = [signedTransaction: Hex]
export type EthSendRawTransactionResponse = Hex
