import type { IdentifierString, WalletStandardWallet } from '../types/wallet-standard.js'

export function getFeature<T>(wallet: WalletStandardWallet, key: IdentifierString): T | undefined {
	return wallet.features?.[key] as T | undefined
}
