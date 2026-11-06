import type { Hex } from '../../utils/hex.js'
import type { EIP155Address } from '../../address.js'

export type PersonalSignMethod = 'personal_sign'
export type PersonalSignParams = [message: string, account: EIP155Address]
export type PersonalSignResponse = Hex
