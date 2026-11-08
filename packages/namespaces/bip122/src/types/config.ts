import type { BIP122ChainId } from '@trustwallet/connect-bip122-types'
import type { RpcUrls } from '@trustwallet/connect-core'
/**
 * Configuration options for creating a BIP122 namespace
 */
export type CreateBIP122Options = {
	/** Supported Bitcoin chain (mainnet, testnet, regtest) */
	chain: BIP122ChainId
	rpcUrls?: RpcUrls
}
