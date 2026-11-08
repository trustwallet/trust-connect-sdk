import { type ChainReference, RegistryBase } from '@trustwallet/connect-core'
import { SolanaStandardWallet } from './wallet.js'
import type {
	WalletStandardRegisterWalletEvent,
	WalletStandardWallet,
	WalletStandardAppReadyApi,
} from './types/wallet-standard.js'
import { SOLANA_SCOPE } from './constants.js'

const APP_READY = 'wallet-standard:app-ready'
const REGISTER_WALLET = 'wallet-standard:register-wallet'

export class WalletStandardRegistry extends RegistryBase {
	protected wallets: SolanaStandardWallet[] = []
	private chainRef: ChainReference
	private readonly onRegisterWalletBound = (event: Event) => this.onRegisterWallet(event)
	private readonly appReadyApi: WalletStandardAppReadyApi = {
		register: (wallet: WalletStandardWallet) => this.registerWallet(wallet),
	}

	constructor({ chainRef }: { chainRef: ChainReference }) {
		super()
		this.chainRef = chainRef
		this.start()
	}

	private registerWallet(wallet: WalletStandardWallet) {
		const exists = this.wallets.some((w) => w.id === wallet.name)
		if (exists) return
		if (!wallet.chains.some((chain) => chain.startsWith(SOLANA_SCOPE.ID))) return

		const next = new SolanaStandardWallet({ wallet, chainRef: this.chainRef })
		this.setWallets([...this.wallets, next])
	}

	private onRegisterWallet(event: Event) {
		const e = event as WalletStandardRegisterWalletEvent
		const callback = e.detail
		if (typeof callback !== 'function') return

		callback(this.appReadyApi)
	}

	protected start(): Promise<void> | void {
		window.addEventListener(REGISTER_WALLET, this.onRegisterWalletBound)
		window.dispatchEvent(new CustomEvent(APP_READY, { detail: this.appReadyApi }))
	}

	protected stopListeners(): void {
		window.removeEventListener(REGISTER_WALLET, this.onRegisterWalletBound)
	}
}
