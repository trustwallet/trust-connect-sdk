import type { EIP155Address } from '../../address.js'

export type EthRequestAccountsMethod = 'eth_requestAccounts'
export type EthRequestAccountsParams = never
export type EthRequestAccountsResponse = EIP155Address[]
