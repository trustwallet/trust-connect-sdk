import type { BIP122ChainId } from './chain.js'
import type { GetAccountsMethod, GetAccountsParams, GetAccountsResponse } from './methods/getAccounts/index.js'
import type { SignMessageMethod, SignMessageParams, SignMessageResponse } from './methods/signMessage/index.js'
import type { SendTransferMethod, SendTransferParams, SendTransferResponse } from './methods/sendTransfer/index.js'
import type { SignPsbtMethod, SignPsbtParams, SignPsbtResponse } from './methods/signPsbt/index.js'

/**
 * BIP122Bitcoin provider request interface.
 */
export type BIP122Provider = {
	request<T extends BIP122RequestArguments>(args: BIP122RequestParams<T>): Promise<BIP122Response<T>>
}

/**
 * Wrapper object for a Bitcoin request.
 */
export interface BIP122RequestParams<A> {
	/**
	 * Request payload.
	 */
	request: A

	/**
	 * Target Bitcoin chain identifier CAIP-2.
	 */
	chainId: BIP122ChainId
}

/**
 * Supported Bitcoin request arguments
 */
export type BIP122RequestArguments =
	| {
			method: GetAccountsMethod
			params?: GetAccountsParams
	  }
	| {
			method: SignMessageMethod
			params: SignMessageParams
	  }
	| {
			method: SendTransferMethod
			params: SendTransferParams
	  }
	| {
			method: SignPsbtMethod
			params: SignPsbtParams
	  }

/**
 * Response mapping for Bitcoin requests
 */
export type BIP122Response<T extends BIP122RequestArguments = BIP122RequestArguments> = T extends {
	method: GetAccountsMethod
}
	? GetAccountsResponse
	: T extends { method: SignMessageMethod }
		? SignMessageResponse
		: T extends { method: SendTransferMethod }
			? SendTransferResponse
			: T extends { method: SignPsbtMethod }
				? SignPsbtResponse
				: never
