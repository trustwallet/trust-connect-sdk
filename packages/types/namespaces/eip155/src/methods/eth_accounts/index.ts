import type { EIP155Address } from '../../address.js'

export type EthAccountsMethod = 'eth_accounts'
export type EthAccountsParams = never
export type EthAccountsResponse = EIP155Address[]
