import type { Hex } from '../../utils/hex.js'

export type WalletSwitchEthereumChainMethod = 'wallet_switchEthereumChain'
export type WalletSwitchEthereumChainParams = [{ chainId: Hex }]
export type WalletSwitchEthereumChainResponse = null
