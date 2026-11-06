import { BaseError } from './base.js'

export class UnsupportedMethodError extends BaseError {
	override name = 'UnsupportedMethodError'

	constructor(method: string, namespace: string) {
		super(`Unsupported method: ${method}`, 'UNSUPPORTED_METHOD', { method, namespace })
	}
}

export class ChainNotSupportedError extends BaseError {
	override name = 'ChainNotSupportedError'

	constructor(chainId: string, supportedChains?: string[]) {
		super(`Chain not supported: ${chainId}`, 'CHAIN_NOT_SUPPORTED', { chainId, supportedChains })
	}
}
