import { Storage } from '../utils/storage.js'

const STORAGE_KEY_PREFIX = 'trust-connect.caip'

export abstract class CaipControllerBase {
	private lastConnectedWalletId: Storage

	constructor() {
		this.lastConnectedWalletId = new Storage({ key: `${STORAGE_KEY_PREFIX}.lastWallet`, version: '0.0.0' })
	}

	// Storage
	protected saveLastConnectedWalletId(walletId: string): void {
		this.lastConnectedWalletId.set(walletId)
	}
	protected getLastConnectedWalletId(): string | null {
		return this.lastConnectedWalletId.get()
	}
	protected clearLastConnectedWalletId(): void {
		this.lastConnectedWalletId.remove()
	}
}
