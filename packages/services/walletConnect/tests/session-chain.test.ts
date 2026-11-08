import { describe, expect, it, vi } from 'vitest'
import { CaipController } from '../../../core/src/01-caip/controller'
import { NamespaceEngine } from '../../../core/src/02-namespace/engine'
import type { NamespaceId } from '../../../core/src/types'
import { interceptEip155Requests } from '../src/rpc-interceptors/eip155'
import type { EIP155InterceptorContext } from '../src/rpc-interceptors/eip155'
import { WalletConnectWalletAdapter } from '../src/wallet'

const EIP155_ACCOUNT = 'eip155:1:0xabc'
const BIP122_CHAIN = 'bip122:000000000019d6689c085ae165831e93'
const BIP122_ACCOUNT = `${BIP122_CHAIN}:bc1qold`

function createNamespace(id: NamespaceId, name: string) {
	return new NamespaceEngine({
		id,
		name,
		icon: 'data:image/svg+xml;base64,test',
		registries: [],
		rpcUrls: undefined,
	})
}

function createSession() {
	return {
		topic: 'topic-1',
		pairingTopic: 'pair-1',
		namespaces: {
			eip155: {
				chains: ['eip155:1', 'eip155:137'],
				methods: ['eth_sendTransaction', 'wallet_switchEthereumChain'],
				events: ['accountsChanged', 'chainChanged'],
				accounts: [EIP155_ACCOUNT],
			},
			bip122: {
				chains: [BIP122_CHAIN],
				methods: [],
				events: ['accountsChanged'],
				accounts: [BIP122_ACCOUNT],
			},
		},
	}
}

function createSignClient(session: ReturnType<typeof createSession>) {
	const handlers = new Map<string, Set<(payload: unknown) => void>>()

	const client = {
		on(event: string, handler: (payload: unknown) => void) {
			const set = handlers.get(event) ?? new Set<(payload: unknown) => void>()
			set.add(handler)
			handlers.set(event, set)
		},
		off(event: string, handler: (payload: unknown) => void) {
			handlers.get(event)?.delete(handler)
		},
		emit(event: string, payload: unknown) {
			for (const handler of handlers.get(event) ?? []) handler(payload)
		},
		request: vi.fn().mockResolvedValue('0xhash'),
		disconnect: vi.fn().mockResolvedValue(undefined),
		session: {
			getAll: () => [session],
		},
		core: {
			pairing: { getPairings: () => [] },
			expirer: { set: vi.fn() },
		},
		proposal: { getAll: () => [] },
		pairing: { getAll: () => [] },
	}

	return client
}

async function connectWallet() {
	const session = createSession()
	const client = createSignClient(session)
	const eip155 = createNamespace('eip155', 'EVM')
	const bip122 = createNamespace('bip122', 'Bitcoin')
	const wallet = new WalletConnectWalletAdapter({
		walletConnectService: {
			getSignClientInstance: async () => client,
			setUri: () => undefined,
			getConnectParams: async () => ({}),
		} as never,
	})
	const controller = new CaipController({
		namespaces: [eip155, bip122],
		caipWallets: [wallet],
	})

	await controller.connect(wallet)
	await new Promise((resolve) => setTimeout(resolve, 0))

	return { client, eip155, bip122, wallet }
}

function baseContext(overrides: Partial<EIP155InterceptorContext> = {}): EIP155InterceptorContext {
	return {
		client: { request: vi.fn() } as never,
		session: { namespaces: { eip155: { chains: ['eip155:1', 'eip155:137'] } } } as never,
		currentChainId: 'eip155:1',
		currentAddress: '0xabc',
		supportedChains: ['eip155:1', 'eip155:137'],
		...overrides,
	}
}

describe('WalletConnect session events', () => {
	it('writes the parsed account onto the namespace connection useConnection reads', async () => {
		const { client, eip155, bip122, wallet } = await connectWallet()

		expect(eip155.getConnection().address).toBe('0xabc')

		client.emit('session_event', {
			topic: 'topic-1',
			params: {
				chainId: 'eip155:1',
				event: { name: 'accountsChanged', data: ['0xnew'] },
			},
		})

		const provider = await wallet.getProvider()
		const accounts = await provider.request<string[]>({
			chainId: 'eip155:1',
			request: { method: 'eth_accounts' },
		})

		expect(eip155.getConnection().address).toBe('0xnew')
		expect(accounts).toEqual([eip155.getConnection().address])

		client.emit('session_event', {
			topic: 'topic-1',
			params: {
				chainId: BIP122_CHAIN,
				event: {
					name: 'accountsChanged',
					data: [{ address: 'bc1qnew', addressType: 'p2wpkh' }],
				},
			},
		})

		expect(bip122.getConnection().address).toBe('bc1qnew')
	})

	it('strips a CAIP-10 account from accountsChanged before the hooks and provider read it', async () => {
		const { client, eip155, bip122, wallet } = await connectWallet()

		client.emit('session_event', {
			topic: 'topic-1',
			params: {
				chainId: 'eip155:1',
				event: { name: 'accountsChanged', data: ['eip155:1:0xdef'] },
			},
		})

		const provider = await wallet.getProvider()
		const accounts = await provider.request<string[]>({
			chainId: 'eip155:1',
			request: { method: 'eth_accounts' },
		})

		expect(eip155.getConnection().address).toBe('0xdef')
		expect(accounts).toEqual(['0xdef'])

		client.emit('session_event', {
			topic: 'topic-1',
			params: {
				chainId: BIP122_CHAIN,
				event: {
					name: 'accountsChanged',
					data: [{ address: `${BIP122_CHAIN}:bc1qcaip`, addressType: 'p2wpkh' }],
				},
			},
		})

		expect(bip122.getConnection().address).toBe('bc1qcaip')
	})

	it('writes the parsed chain onto the namespace connection and later requests', async () => {
		const { client, eip155, wallet } = await connectWallet()

		client.emit('session_event', {
			topic: 'topic-1',
			params: {
				chainId: 'eip155:1',
				event: { name: 'chainChanged', data: '0x89' },
			},
		})

		const provider = await wallet.getProvider()
		const chainId = await provider.request<string>({
			chainId: 'eip155:1',
			request: { method: 'eth_chainId' },
		})

		expect(eip155.getConnection().chain).toEqual({ namespace: 'eip155', reference: '137' })
		expect(chainId).toBe('0x89')

		await provider.request({
			chainId: 'eip155:1',
			request: { method: 'eth_sendTransaction', params: [{}] },
		})

		expect(client.request).toHaveBeenCalledWith(
			expect.objectContaining({
				chainId: 'eip155:137',
			}),
		)
	})
})

describe('wallet_switchEthereumChain', () => {
	it('does not report success when the stored chain cannot change', async () => {
		await expect(
			interceptEip155Requests(baseContext(), {
				chainId: 'eip155:1',
				request: { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] },
			}),
		).rejects.toThrow(/was not applied/i)
	})

	it('does not report success when persisting the chain fails', async () => {
		await expect(
			interceptEip155Requests(
				baseContext({
					persistChainId: () => false,
				}),
				{
					chainId: 'eip155:1',
					request: { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] },
				},
			),
		).rejects.toThrow(/was not applied/i)
	})

	it('returns null after the new chain is stored', async () => {
		let stored = 'eip155:1'
		const result = await interceptEip155Requests(
			baseContext({
				persistChainId: (chainId) => {
					stored = chainId
					return stored === chainId
				},
			}),
			{
				chainId: 'eip155:1',
				request: { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] },
			},
		)

		expect(result).toBeNull()
		expect(stored).toBe('eip155:137')
	})

	it('leaves the chain alone when the request is already on that chain', async () => {
		const persistChainId = vi.fn()
		const result = await interceptEip155Requests(
			baseContext({
				currentChainId: 'eip155:137',
				persistChainId,
			}),
			{
				chainId: 'eip155:137',
				request: { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] },
			},
		)

		expect(result).toBeNull()
		expect(persistChainId).not.toHaveBeenCalled()
	})

	it('updates the provider chain and the namespace connection', async () => {
		const { client, eip155, wallet } = await connectWallet()
		const provider = await wallet.getProvider()

		const switched = await provider.request({
			chainId: 'eip155:1',
			request: { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] },
		})
		const chainId = await provider.request<string>({
			chainId: 'eip155:1',
			request: { method: 'eth_chainId' },
		})

		expect(switched).toBeNull()
		expect(chainId).toBe('0x89')
		expect(eip155.getConnection().chain).toEqual({ namespace: 'eip155', reference: '137' })

		await provider.request({
			chainId: 'eip155:1',
			request: { method: 'eth_sendTransaction', params: [{}] },
		})
		expect(client.request).toHaveBeenCalledWith(expect.objectContaining({ chainId: 'eip155:137' }))
	})

	it('rejects an unsupported chain and keeps the previous one', async () => {
		const { eip155, wallet } = await connectWallet()
		const provider = await wallet.getProvider()

		await expect(
			provider.request({
				chainId: 'eip155:1',
				request: { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x539' }] },
			}),
		).rejects.toThrow()

		const chainId = await provider.request<string>({
			chainId: 'eip155:1',
			request: { method: 'eth_chainId' },
		})
		expect(chainId).toBe('0x1')
		expect(eip155.getConnection().chain).toEqual({ namespace: 'eip155', reference: '1' })
	})
})
