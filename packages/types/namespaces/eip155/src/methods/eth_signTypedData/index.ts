import type { Hex } from '../../utils/hex.js'
import type { EIP155Address } from '../../address.js'

export type EthSignTypedDataMethod = 'eth_signTypedData' | 'eth_signTypedData_v4'
export type EthSignTypedDataParams = [account: EIP155Address, typedData: string]
export type EthSignTypedDataResponse = Hex
