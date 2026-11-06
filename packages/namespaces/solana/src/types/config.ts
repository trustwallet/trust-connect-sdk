import type { RegistryBase } from '@trustwallet/connect-core'
import type { SolanaChainId } from '@trustwallet/connect-solana-types'
import type { RpcUrls } from '@trustwallet/connect-core'
/**
 * Configuration options for creating a Solana namespace
 */
export type CreateSolanaOptions = {
	/** Supported Solana chain (mainnet, devnet, testnet) */
	chain: SolanaChainId
	/** External registries (Optional) */
	registries?: RegistryBase[]
	rpcUrls?: RpcUrls
}
