import { BaseError } from './base.js'

export class NoActiveSessionError extends BaseError {
	override name = 'NoActiveSessionError'

	constructor() {
		super('No active session', 'NO_ACTIVE_SESSION')
	}
}

export class ConnectionInProgressError extends BaseError {
	override name = 'ConnectionInProgressError'

	constructor() {
		super('Connection already in progress', 'CONNECTION_IN_PROGRESS')
	}
}

export class WalletAlreadyConnectedError extends BaseError {
	override name = 'WalletAlreadyConnectedError'

	constructor(walletId: string) {
		super(`Wallet already connected: ${walletId}`, 'WALLET_ALREADY_CONNECTED', { walletId })
	}
}

export class NoWalletConnectedError extends BaseError {
	override name = 'NoWalletConnectedError'

	constructor(namespace?: string) {
		const message = namespace
			? `No wallet connected. Please connect a ${namespace} wallet first.`
			: 'No wallet connected. Please connect a wallet first.'
		super(message, 'NO_WALLET_CONNECTED', { namespace })
	}
}

export class WalletNotFoundInConnectionError extends BaseError {
	override name = 'WalletNotFoundInConnectionError'

	constructor() {
		super('No wallet found in connection', 'WALLET_NOT_FOUND_IN_CONNECTION')
	}
}

export class ConnectionFailedError extends BaseError {
	override name = 'ConnectionFailedError'

	constructor(walletName: string, reason?: string) {
		const message = reason
			? `Failed to connect to ${walletName}: ${reason}`
			: `Failed to connect to ${walletName}`
		super(message, 'CONNECTION_FAILED', { walletName, reason })
	}
}
