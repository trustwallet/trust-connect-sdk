import { BaseError } from './base.js'

export class NamespaceNotFoundError extends BaseError {
	override name = 'NamespaceNotFoundError'

	constructor(namespaceId: string) {
		super(`Namespace not found: ${namespaceId}`, 'NAMESPACE_NOT_FOUND', { namespaceId })
	}
}

export class AccountNotFoundError extends BaseError {
	override name = 'AccountNotFoundError'

	constructor(address: string, namespace: string) {
		super(`Account not found: ${address}`, 'ACCOUNT_NOT_FOUND', { address, namespace })
	}
}
