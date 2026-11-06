import { type ChainReference, RegistryBase } from '@trustwallet/connect-core'
import { BitcoinStandardWallet } from './wallet.js'
import type { BitcoinWalletStandardWallet } from './types.js'

const APP_READY = 'wallet-standard:app-ready'
const REGISTER_WALLET = 'wallet-standard:register-wallet'

interface WalletStandardRegisterWalletEvent extends Event {
	detail: (api: WalletStandardAppReadyApi) => void
}

interface WalletStandardAppReadyApi {
	register: (wallet: BitcoinWalletStandardWallet) => void
}

export class BitcoinWalletStandardRegistry extends RegistryBase {
	protected wallets: BitcoinStandardWallet[] = []
	private chainRef: ChainReference
	private readonly onRegisterWalletBound = (event: Event) => this.onRegisterWallet(event)
	private readonly appReadyApi: WalletStandardAppReadyApi = {
		register: (wallet: BitcoinWalletStandardWallet) => this.registerWallet(wallet),
	}

	constructor({ chainRef }: { chainRef: ChainReference }) {
		super()
		this.chainRef = chainRef
		this.start()
	}

	private registerWallet(wallet: BitcoinWalletStandardWallet) {
		const exists = this.wallets.some((w) => w.id === wallet.name)
		if (exists) return

		// Check if wallet supports Bitcoin chains
		if (!wallet.chains.some((chain) => chain.startsWith('bitcoin'))) return

		const next = new BitcoinStandardWallet({ wallet, chainRef: this.chainRef })
		this.setWallets([...this.wallets, next])
	}

	private onRegisterWallet(event: Event) {
		const e = event as WalletStandardRegisterWalletEvent
		const callback = e.detail
		if (typeof callback !== 'function') return

		callback(this.appReadyApi)
	}

	protected start(): Promise<void> | void {
		if (typeof window === 'undefined') return

		window.addEventListener(REGISTER_WALLET, this.onRegisterWalletBound)
		window.dispatchEvent(new CustomEvent(APP_READY, { detail: this.appReadyApi }))
	}

	protected stopListeners(): void {
		if (typeof window === 'undefined') return

		window.removeEventListener(REGISTER_WALLET, this.onRegisterWalletBound)
	}
}
