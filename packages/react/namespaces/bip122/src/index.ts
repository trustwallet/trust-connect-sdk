export * from './types.js'
export { useSignMessage, useSignPsbt, useSendTransfer } from './hooks.js'
export {
	mainnet,
	testnet,
	regtest,
	createBIP122,
	type CreateBIP122Options,
	type BIP122Address,
	type BIP122ChainId,
	type BIP122Provider,
} from '@trustwallet/connect-bip122-core'
