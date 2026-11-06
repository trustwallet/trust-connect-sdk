import { BaseError } from './base.js'

export class MissingChainError extends BaseError {
	override name = 'MissingChainError'

	constructor(namespace: string) {
		super(`No chain provided for ${namespace}`, 'MISSING_CHAIN', { namespace })
	}
}

export class MissingNamespaceIdError extends BaseError {
	override name = 'MissingNamespaceIdError'

	constructor(walletId: string, walletType: string) {
		super(`Wallet must have a namespaceId`, 'MISSING_NAMESPACE_ID', { walletId, walletType })
	}
}
