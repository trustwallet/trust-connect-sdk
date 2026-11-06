import { BaseError } from './base.js'

export class InvalidChainRefError extends BaseError {
	override name = 'InvalidChainRefError'

	constructor(chainRef: unknown, namespace: string) {
		super(`Invalid chain reference for ${namespace}: ${chainRef}`, 'INVALID_CHAIN_REF', {
			chainRef,
			namespace,
		})
	}
}
