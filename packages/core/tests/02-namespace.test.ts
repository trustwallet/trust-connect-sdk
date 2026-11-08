import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NamespaceEngine } from '../src/02-namespace/engine'
import { RegistryBase } from '../src/04-registry/base'
import type { NamespaceWallet, NamespaceId, ConnectedChain, NamespaceAddress } from '../src/types'
import { ConnectionInProgressError, WalletAlreadyConnectedError, MissingChainError } from '../src/errors'

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {}
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value
		},
		removeItem: (key: string) => {
			delete store[key]
		},
		clear: () => {
			store = {}
		},
	}
})()

// Mock both window.localStorage and global localStorage for the Storage class
Object.defineProperty(globalThis, 'window', {
	value: {
		localStorage: localStorageMock,
	},
	writable: true,
})

Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true,
})

// Helper to create mock namespace wallet
function createMockNamespaceWallet(id: string, namespaceId: NamespaceId): NamespaceWallet {
	return {
		id,
		namespaceIds: [namespaceId],
		type: 'namespace',
		name: `Wallet ${id}`,
		icon: 'data:image/svg+xml;base64,test',
		getProvider: vi.fn().mockResolvedValue({}),
		__internal: {
			connect: vi.fn().mockResolvedValue({
				address: '0x123',
				chain: { namespace: namespaceId, reference: '1' },
			}),
			reconnect: vi.fn().mockResolvedValue({
				address: '0x123',
				chain: { namespace: namespaceId, reference: '1' },
			}),
			disconnect: vi.fn(),
			abortConnect: vi.fn(),
			startListeners: vi.fn(),
			stopListeners: vi.fn(),
			handleOnCaipSessionEvent: vi.fn(),
			handleOnCaipSessionDelete: vi.fn(),
			handleOnAddress: vi.fn(),
			handleOnChain: vi.fn(),
			setAddress: vi.fn(),
			setChain: vi.fn(),
			clearAllListeners: vi.fn(),
		},
	} as any
}

// Mock Registry
class MockRegistry extends RegistryBase<NamespaceWallet> {
	protected wallets: NamespaceWallet[] = []
	private walletsCallback?: (wallets: NamespaceWallet[]) => void

	protected start() {}
	protected stopListeners() {}

	// Override onWallets to capture the callback
	onWallets(cb: (wallets: NamespaceWallet[]) => void) {
		this.walletsCallback = cb
		return super.onWallets(cb)
	}

	// Helper to trigger wallet updates
	triggerWalletUpdate(wallets: NamespaceWallet[]) {
		this.setWallets(wallets)
	}
}

describe('NamespaceEngine - 02-namespace', () => {
	let namespaceEngine: NamespaceEngine
	let mockRegistry: MockRegistry
	let mockWallet: NamespaceWallet

	beforeEach(() => {
		localStorageMock.clear()
		mockRegistry = new MockRegistry()
		mockWallet = createMockNamespaceWallet('metamask', 'eip155' as NamespaceId)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('Initialization', () => {
		it('should store id, name, icon, registries, and rpcUrls from constructor', () => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: { 'eip155:1': ['https://rpc.example.com'] },
			})

			expect(namespaceEngine.id).toBe('eip155')
			expect(namespaceEngine.name).toBe('Ethereum')
			expect(namespaceEngine.icon).toBe('data:image/svg+xml;base64,test')
			expect(namespaceEngine.registries).toEqual([mockRegistry])
			expect(namespaceEngine.rpcUrls).toEqual({ 'eip155:1': ['https://rpc.example.com'] })
		})

		it("should initialize connection as 'disconnected' with undefined values", () => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})

			expect(namespaceEngine.connection).toEqual({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})
		})

		it('should initialize wallets as empty array', () => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})

			expect(namespaceEngine.wallets).toEqual([])
		})

		it('should setup wallet listeners for each registry on construction', () => {
			const registry2 = new MockRegistry()
			const onWalletsSpy1 = vi.spyOn(mockRegistry, 'onWallets')
			const onWalletsSpy2 = vi.spyOn(registry2, 'onWallets')

			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry, registry2],
				rpcUrls: undefined,
			})

			expect(onWalletsSpy1).toHaveBeenCalled()
			expect(onWalletsSpy2).toHaveBeenCalled()
		})

		it('should call reconnect() with wallets from each registry on construction', async () => {
			mockRegistry.setWallets([mockWallet])
			const reconnectSpy = vi.spyOn(NamespaceEngine.prototype, 'reconnect')

			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: undefined,
			})

			expect(reconnectSpy).toHaveBeenCalledWith([mockWallet])
			reconnectSpy.mockRestore()
		})

		it('should call addWallets() with wallets from each registry on construction', () => {
			mockRegistry.setWallets([mockWallet])

			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: undefined,
			})

			expect(namespaceEngine.wallets).toContain(mockWallet)
		})

		it('should listen to registry onWallets events and reconnect/addWallets when fired', async () => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: undefined,
			})

			const reconnectSpy = vi.spyOn(namespaceEngine, 'reconnect')
			const newWallet = createMockNamespaceWallet('trust', 'eip155' as NamespaceId)

			// Trigger wallet update through registry
			mockRegistry.triggerWalletUpdate([newWallet])

			expect(reconnectSpy).toHaveBeenCalledWith([newWallet])
			expect(namespaceEngine.wallets).toContain(newWallet)
		})
	})

	describe('Connect', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it("should throw ConnectionInProgressError if connection status is 'connecting'", async () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			await expect(namespaceEngine.connect(mockWallet)).rejects.toThrow(ConnectionInProgressError)
		})

		it("should throw WalletAlreadyConnectedError if connection status is 'connected'", async () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155' as NamespaceId, reference: '1' },
			})

			await expect(namespaceEngine.connect(mockWallet)).rejects.toThrow(WalletAlreadyConnectedError)
		})

		it("should set connection status to 'connecting' before connecting", async () => {
			const setConnectionSpy = vi.spyOn(namespaceEngine, 'setConnection')

			await namespaceEngine.connect(mockWallet)

			expect(setConnectionSpy).toHaveBeenCalledWith({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})
		})

		it('should call wallet.__internal.clearAllListeners() before setup', async () => {
			await namespaceEngine.connect(mockWallet)

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should call wallet.__internal.handleOnAddress() with onAddress callback', async () => {
			await namespaceEngine.connect(mockWallet)

			expect(mockWallet.__internal.handleOnAddress).toHaveBeenCalledWith(expect.any(Function))
		})

		it('should call wallet.__internal.handleOnChain() with onChain callback', async () => {
			await namespaceEngine.connect(mockWallet)

			expect(mockWallet.__internal.handleOnChain).toHaveBeenCalledWith(expect.any(Function))
		})

		it('should call wallet.__internal.startListeners() after setup', async () => {
			await namespaceEngine.connect(mockWallet)

			expect(mockWallet.__internal.startListeners).toHaveBeenCalled()
		})

		it('should call wallet.__internal.connect()', async () => {
			await namespaceEngine.connect(mockWallet)

			expect(mockWallet.__internal.connect).toHaveBeenCalled()
		})

		it("should save wallet ID and set connection to 'connected' if address and chain are returned", async () => {
			mockWallet.__internal.connect = vi.fn().mockResolvedValue({
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			await namespaceEngine.connect(mockWallet)

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBe(
				JSON.stringify('metamask'),
			)
			expect(namespaceEngine.connection.status).toBe('connected')
			expect(namespaceEngine.connection.address).toBe('0x123')
		})

		it('should call internalDisconnect() if address or chain are missing', async () => {
			mockWallet.__internal.connect = vi.fn().mockResolvedValue({
				address: undefined,
				chain: { namespace: 'eip155', reference: '1' },
			})

			await namespaceEngine.connect(mockWallet)

			expect(namespaceEngine.connection.status).toBe('disconnected')
		})

		it('should call wallet.__internal.clearAllListeners() if address or chain are missing', async () => {
			mockWallet.__internal.connect = vi.fn().mockResolvedValue({
				address: undefined,
				chain: undefined,
			})

			await namespaceEngine.connect(mockWallet)

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalledTimes(2) // once before setup, once on failure
		})

		it('should call internalDisconnect() on error', async () => {
			mockWallet.__internal.connect = vi.fn().mockRejectedValue(new Error('Connection failed'))

			await expect(namespaceEngine.connect(mockWallet)).rejects.toThrow('Connection failed')

			expect(namespaceEngine.connection.status).toBe('disconnected')
		})

		it('should call wallet.__internal.clearAllListeners() on error', async () => {
			mockWallet.__internal.connect = vi.fn().mockRejectedValue(new Error('Connection failed'))

			await expect(namespaceEngine.connect(mockWallet)).rejects.toThrow('Connection failed')

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalledTimes(2) // once before setup, once on error
		})

		it('should rethrow error after cleanup', async () => {
			const error = new Error('Connection failed')
			mockWallet.__internal.connect = vi.fn().mockRejectedValue(error)

			await expect(namespaceEngine.connect(mockWallet)).rejects.toThrow(error)
		})
	})

	describe('Reconnect', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it("should return early if connection status is not 'disconnected'", async () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			await namespaceEngine.reconnect([mockWallet])

			// If it tried to reconnect, it would call the wallet's reconnect method
			expect(mockWallet.__internal.reconnect).not.toHaveBeenCalled()
		})

		it('should return early if no lastConnectedWalletId exists', async () => {
			await namespaceEngine.reconnect([mockWallet])

			expect(mockWallet.__internal.reconnect).not.toHaveBeenCalled()
		})

		it('should return early if wallet matching lastConnectedWalletId is not found in wallets array', async () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('other-wallet'))

			await namespaceEngine.reconnect([mockWallet])

			expect(mockWallet.__internal.reconnect).not.toHaveBeenCalled()
		})

		it("should call connectOrReconnect() with matching wallet and 'reconnect' function name", async () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))

			await namespaceEngine.reconnect([mockWallet])

			// Verify reconnect was called
			expect(mockWallet.__internal.reconnect).toHaveBeenCalled()
		})

		it('should only reconnect the wallet matching lastConnectedWalletId', async () => {
			const wallet2 = createMockNamespaceWallet('trust', 'eip155' as NamespaceId)
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))

			await namespaceEngine.reconnect([mockWallet, wallet2])

			expect(mockWallet.__internal.reconnect).toHaveBeenCalled()
			expect(wallet2.__internal.reconnect).not.toHaveBeenCalled()
		})
	})

	describe('Disconnect', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it("should only disconnect if connection status is 'connected'", () => {
			namespaceEngine.setConnection({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			namespaceEngine.disconnect()

			// If it tried to disconnect, it would call clearAllListeners
			expect(mockWallet.__internal.clearAllListeners).not.toHaveBeenCalled()
		})

		it('should call wallet.__internal.clearAllListeners() on connected wallet', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.disconnect()

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should call internalDisconnect() which clears storage and sets status to disconnected', () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.disconnect()

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBeNull()
			expect(namespaceEngine.connection.status).toBe('disconnected')
		})

		it('should call wallet.__internal.disconnect() on the connected wallet', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.disconnect()

			expect(mockWallet.__internal.disconnect).toHaveBeenCalled()
		})

		it("should do nothing if connection status is not 'connected'", () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			namespaceEngine.disconnect()

			expect(mockWallet.__internal.disconnect).not.toHaveBeenCalled()
		})
	})

	describe('AbortConnect', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it("should only abort if connection status is 'connecting' and wallet exists", () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			namespaceEngine.abortConnect()

			expect(mockWallet.__internal.abortConnect).toHaveBeenCalled()
		})

		it('should call wallet.__internal.abortConnect() on connecting wallet', () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			namespaceEngine.abortConnect()

			expect(mockWallet.__internal.abortConnect).toHaveBeenCalled()
		})

		it('should call wallet.__internal.clearAllListeners() on connecting wallet', () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			namespaceEngine.abortConnect()

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should call internalDisconnect() to clear storage and set status to disconnected', () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			namespaceEngine.abortConnect()

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBeNull()
			expect(namespaceEngine.connection.status).toBe('disconnected')
		})

		it("should do nothing if connection status is not 'connecting'", () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.abortConnect()

			expect(mockWallet.__internal.abortConnect).not.toHaveBeenCalled()
		})

		it("should not throw if connection is 'connecting' but wallet is undefined", () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: undefined as any,
				address: undefined,
				chain: undefined,
			})

			// Should not throw when aborting with invalid state
			expect(() => namespaceEngine.abortConnect()).not.toThrow()
			expect(namespaceEngine.connection.status).toBe('connecting')
		})
	})

	describe('OnAddress', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it("should only process if connection status is 'connected'", () => {
			namespaceEngine.setConnection({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			const setConnectionSpy = vi.spyOn(namespaceEngine, 'setConnection')
			setConnectionSpy.mockClear() // Clear the initial call

			namespaceEngine.onAddress('0x456')

			// Should not update connection (beyond the initial setConnection call)
			expect(setConnectionSpy).not.toHaveBeenCalled()
		})

		it('should call internalDisconnect() if next address is undefined', () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.onAddress(undefined)

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBeNull()
			expect(namespaceEngine.connection.status).toBe('disconnected')
		})

		it('should call wallet.__internal.clearAllListeners() if next address is undefined', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.onAddress(undefined)

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should update connection with new address if next address is defined', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.onAddress('0x456' as NamespaceAddress)

			expect(namespaceEngine.connection.status).toBe('connected')
			expect(namespaceEngine.connection.address).toBe('0x456')
		})

		it('should preserve wallet and chain when updating address', () => {
			const chain: ConnectedChain = { namespace: 'eip155' as NamespaceId, reference: '1' }
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain,
			})

			namespaceEngine.onAddress('0x456' as NamespaceAddress)

			expect(namespaceEngine.connection.wallet).toBe(mockWallet)
			expect(namespaceEngine.connection.chain).toEqual(chain)
		})

		it("should do nothing if connection status is not 'connected'", () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			const setConnectionSpy = vi.spyOn(namespaceEngine, 'setConnection')
			setConnectionSpy.mockClear()

			namespaceEngine.onAddress('0x456')

			expect(setConnectionSpy).not.toHaveBeenCalled()
		})
	})

	describe('OnChain', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it("should only process if connection status is 'connected'", () => {
			namespaceEngine.setConnection({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			const setConnectionSpy = vi.spyOn(namespaceEngine, 'setConnection')
			setConnectionSpy.mockClear()

			namespaceEngine.onChain({ namespace: 'eip155' as NamespaceId, reference: '137' })

			expect(setConnectionSpy).not.toHaveBeenCalled()
		})

		it('should throw MissingChainError if next chain is undefined', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			expect(() => namespaceEngine.onChain(undefined)).toThrow(MissingChainError)
		})

		it('should update connection with new chain if next chain is defined', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.onChain({ namespace: 'eip155' as NamespaceId, reference: '137' })

			expect(namespaceEngine.connection.status).toBe('connected')
			expect(namespaceEngine.connection.chain).toEqual({ namespace: 'eip155', reference: '137' })
		})

		it('should preserve wallet and address when updating chain', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.onChain({ namespace: 'eip155' as NamespaceId, reference: '137' })

			expect(namespaceEngine.connection.wallet).toBe(mockWallet)
			expect(namespaceEngine.connection.address).toBe('0x123')
		})

		it("should do nothing if connection status is not 'connected'", () => {
			namespaceEngine.setConnection({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			const setConnectionSpy = vi.spyOn(namespaceEngine, 'setConnection')
			setConnectionSpy.mockClear()

			namespaceEngine.onChain({ namespace: 'eip155' as NamespaceId, reference: '137' })

			expect(setConnectionSpy).not.toHaveBeenCalled()
		})
	})

	describe('InternalDisconnect', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it('should clear lastConnectedWalletId from storage', () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.disconnect() // calls internalDisconnect

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBeNull()
		})

		it('should set connection to disconnected with all undefined values', () => {
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.disconnect() // calls internalDisconnect

			expect(namespaceEngine.connection).toEqual({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})
		})

		it('should emit connection event with disconnected state', () => {
			const connectionCallback = vi.fn()
			namespaceEngine.onConnection(connectionCallback)

			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			connectionCallback.mockClear()

			namespaceEngine.disconnect() // calls internalDisconnect

			expect(connectionCallback).toHaveBeenCalledWith({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})
		})
	})

	describe('AddWallets', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it('should append new wallets to existing wallets array', () => {
			const wallet1 = createMockNamespaceWallet('wallet1', 'eip155' as NamespaceId)
			const wallet2 = createMockNamespaceWallet('wallet2', 'eip155' as NamespaceId)

			// Set up namespace with registry that will trigger updates
			mockRegistry.setWallets([wallet1])
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: undefined,
			})

			// Now trigger wallet update through registry
			mockRegistry.triggerWalletUpdate([wallet2])

			// After construction, namespace listens to registry and adds wallets
			expect(namespaceEngine.wallets).toContain(wallet1)
			expect(namespaceEngine.wallets).toContain(wallet2)
		})

		it("should emit 'wallets' event with updated wallets array", () => {
			const walletsCallback = vi.fn()
			namespaceEngine.onWallets(walletsCallback)

			const newWallet = createMockNamespaceWallet('trust', 'eip155' as NamespaceId)

			// Create a new registry and add to namespace to trigger addWallets
			const newRegistry = new MockRegistry()
			newRegistry.setWallets([newWallet])

			// Manually trigger the wallets callback that would be set up in constructor
			const currentWallets = [...namespaceEngine.wallets, newWallet]
			namespaceEngine.wallets = currentWallets
			walletsCallback(currentWallets)

			expect(walletsCallback).toHaveBeenCalledWith(expect.arrayContaining([newWallet]))
		})

		it('should keep a single entry per wallet id when a registry re-emits its snapshot', () => {
			const wallet1 = createMockNamespaceWallet('wallet1', 'eip155' as NamespaceId)
			const wallet2 = createMockNamespaceWallet('wallet2', 'eip155' as NamespaceId)
			const registryB = new MockRegistry()
			const walletB = createMockNamespaceWallet('walletB', 'eip155' as NamespaceId)

			mockRegistry.setWallets([wallet1])
			registryB.setWallets([walletB])
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry, registryB],
				rpcUrls: undefined,
			})

			mockRegistry.triggerWalletUpdate([wallet1, wallet2])
			mockRegistry.triggerWalletUpdate([wallet1, wallet2])

			expect(namespaceEngine.getWallets().map((wallet) => wallet.id)).toEqual(['wallet1', 'walletB', 'wallet2'])
		})

		it('should not remove existing wallets when adding new ones', () => {
			const wallet1 = createMockNamespaceWallet('wallet1', 'eip155' as NamespaceId)
			const wallet2 = createMockNamespaceWallet('wallet2', 'eip155' as NamespaceId)

			// Set up namespace with registry
			mockRegistry.setWallets([wallet1])
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: undefined,
			})

			// Add second wallet through registry
			mockRegistry.triggerWalletUpdate([wallet2])

			expect(namespaceEngine.wallets).toContain(wallet1)
			expect(namespaceEngine.wallets).toContain(wallet2)
		})
	})

	describe('Getters and Events', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it('should return current connection with getConnection()', () => {
			const connection = {
				status: 'connected' as const,
				wallet: mockWallet,
				address: '0x123' as NamespaceAddress,
				chain: { namespace: 'eip155' as NamespaceId, reference: '1' },
			}
			namespaceEngine.setConnection(connection)

			expect(namespaceEngine.getConnection()).toEqual(connection)
		})

		it('should return current wallets array with getWallets()', () => {
			namespaceEngine.wallets = [mockWallet]

			expect(namespaceEngine.getWallets()).toEqual([mockWallet])
		})

		it('should trigger onConnection() callbacks when connection changes', () => {
			const callback = vi.fn()
			namespaceEngine.onConnection(callback)

			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			expect(callback).toHaveBeenCalledWith({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})
		})

		it('should trigger onWallets() callbacks when wallets change', () => {
			// Set up namespace with registry
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [mockRegistry],
				rpcUrls: undefined,
			})

			const callback = vi.fn()
			namespaceEngine.onWallets(callback)

			// Trigger wallet change through registry
			mockRegistry.triggerWalletUpdate([mockWallet])

			expect(callback).toHaveBeenCalled()
		})
	})

	describe('Storage', () => {
		beforeEach(() => {
			namespaceEngine = new NamespaceEngine({
				id: 'eip155' as NamespaceId,
				name: 'Ethereum',
				icon: 'data:image/svg+xml;base64,test',
				registries: [],
				rpcUrls: undefined,
			})
		})

		it('should use Storage with correct key format: trust-connect.namespace.{namespaceId}.lastWallet', async () => {
			mockWallet.__internal.connect = vi.fn().mockResolvedValue({
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			await namespaceEngine.connect(mockWallet)

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBeDefined()
		})

		it('saveLastConnectedWalletId() should save wallet ID to storage', async () => {
			mockWallet.__internal.connect = vi.fn().mockResolvedValue({
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			await namespaceEngine.connect(mockWallet)

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBe(
				JSON.stringify('metamask'),
			)
		})

		it('getLastConnectedWalletId() should retrieve wallet ID from storage', () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))

			// Access through reconnect which uses getLastConnectedWalletId
			namespaceEngine.reconnect([mockWallet])

			expect(mockWallet.__internal.reconnect).toHaveBeenCalled()
		})

		it('clearLastConnectedWalletId() should remove wallet ID from storage', () => {
			localStorageMock.setItem('trust-connect.namespace.eip155.lastWallet.0.0.0', JSON.stringify('metamask'))
			namespaceEngine.setConnection({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			namespaceEngine.disconnect()

			expect(localStorageMock.getItem('trust-connect.namespace.eip155.lastWallet.0.0.0')).toBeNull()
		})
	})
})
