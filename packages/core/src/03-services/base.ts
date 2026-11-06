import type { CaipWallet } from '../types/index.js'

export abstract class ServiceBase {
	abstract id: string
	abstract caipWallet: CaipWallet | undefined
}
