import { RegistryBase } from '@trustwallet/connect-core'
import { EIP155Wallet } from './wallet'
import { EIP6963AnnounceProviderEvent } from './types/config'

export class EIP155Registry extends RegistryBase {
	protected wallets: EIP155Wallet[] = []

	constructor() {
		super()
		this.start()
	}
	onAnnouncement = (event: EIP6963AnnounceProviderEvent) => {
		const existingWallet = this.wallets.find((wallet) => wallet.id === event.detail.info.rdns)
		if (existingWallet) return

		const newWallet = new EIP155Wallet(event.detail)
		this.setWallets([...this.wallets, newWallet])
	}

	private readonly onAnnouncementListener: EventListener = (event) => {
		this.onAnnouncement(event as unknown as EIP6963AnnounceProviderEvent)
	}

	protected start(): Promise<void> | void {
		window.addEventListener('eip6963:announceProvider', this.onAnnouncementListener)
		window.dispatchEvent(new Event('eip6963:requestProvider'))
	}
	protected stopListeners(): void {
		window.removeEventListener('eip6963:announceProvider', this.onAnnouncementListener)
	}
}
