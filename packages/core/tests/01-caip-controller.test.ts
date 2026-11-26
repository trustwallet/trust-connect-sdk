import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CaipController } from '../src/01-caip/controller'
import { NamespaceEngine } from '../src/02-namespace/engine'
import { NoActiveSessionError } from '../src/errors'
import type { CaipWallet, NamespaceId, CaipSessionResponse, CaipSessionEvent, NamespaceConnection } from '../src/types'

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

// Mock console methods
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

// Helper to create mock CAIP wallet
function createMockCaipWallet(id: string, namespaceIds: NamespaceId[]): CaipWallet {
	return {
		id,
		namespaceIds,
		type: 'caip',
		name: `Wallet ${id}`,
		icon: 'data:image/svg+xml;base64,test',
		getProvider: vi.fn().mockResolvedValue({}),
		__internal: {
			connect: vi.fn().mockResolvedValue({
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: ['eth_sendTransaction'],
						events: ['accountsChanged'],
					},
				},
			} as CaipSessionResponse),
			reconnect: vi.fn().mockResolvedValue(undefined),
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

// Helper to create mock namespace
function createMockNamespace(id: NamespaceId): NamespaceEngine {
	const getConnection = vi.fn().mockReturnValue({
		status: 'disconnected',
		wallet: undefined,
		address: undefined,
		chain: undefined,
	})

	const namespace = {
		id,
		name: `Namespace ${id}`,
		icon: 'data:image/svg+xml;base64,test',
		getConnection,
		setConnection: vi.fn(),
	}

	return namespace as unknown as NamespaceEngine
}

describe('CaipController - 01-caip-controller', () => {
	let caipController: CaipController
	let mockNamespace: NamespaceEngine
	let mockWallet: CaipWallet

	beforeEach(() => {
		localStorageMock.clear()
		consoleErrorSpy.mockClear()
		mockNamespace = createMockNamespace('eip155' as NamespaceId)
		mockWallet = createMockCaipWallet('walletconnect', ['eip155', 'bip122'] as NamespaceId[])
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('Initialization', () => {
		it('should store namespaces in a Map with namespace ID as key', () => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})

			expect(caipController.namespaces).toBeInstanceOf(Map)
			expect(caipController.namespaces.size).toBe(1)
			expect(caipController.namespaces.has('eip155')).toBe(true)
			expect(caipController.namespaces.get('eip155')).toBe(mockNamespace)
		})

		it('should store caipWallets array (or empty array if not provided)', () => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})

			expect(caipController.wallets).toEqual([mockWallet])

			const controllerWithoutWallets = new CaipController({
				namespaces: [mockNamespace],
			})

			expect(controllerWithoutWallets.wallets).toEqual([])
		})

		it('should call start() on initialization', () => {
			const startSpy = vi.spyOn(CaipController.prototype, 'start')

			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})

			expect(startSpy).toHaveBeenCalled()
			startSpy.mockRestore()
		})

		it("start() should attempt reconnection if there's a lastConnectedWalletId in storage", async () => {
			// Save wallet ID to storage with correct key format (uses period not colon)
			localStorageMock.setItem('trust-connect.caip.lastWallet.0.0.0', JSON.stringify('walletconnect'))

			// Mock reconnect to return a session
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue({
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			})

			// Create controller - start() will be called in constructor
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})

			// Wait for async reconnect
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify reconnect was called by checking the wallet's reconnect method
			expect(mockWallet.__internal.reconnect).toHaveBeenCalled()
		})

		it('start() should do nothing if no lastConnectedWalletId exists', () => {
			const reconnectSpy = vi.spyOn(CaipController.prototype, 'reconnect')

			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})

			expect(reconnectSpy).not.toHaveBeenCalled()
			reconnectSpy.mockRestore()
		})

		it('start() should only reconnect the wallet matching lastConnectedWalletId', async () => {
			const wallet2 = createMockCaipWallet('other-wallet', ['eip155'] as NamespaceId[])
			localStorageMock.setItem('trust-connect.caip.lastWallet.0.0.0', JSON.stringify('walletconnect'))

			// Mock reconnect to return a session
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue({
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			})

			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet, wallet2],
			})

			// Wait for async reconnect
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Only mockWallet should be reconnected
			expect(mockWallet.__internal.reconnect).toHaveBeenCalled()
			expect(wallet2.__internal.reconnect).not.toHaveBeenCalled()
		})
	})

	describe('Connect', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should call startListeners() with the wallet before connecting', async () => {
			const startListenersSpy = vi.spyOn(caipController, 'startListeners')

			await caipController.connect(mockWallet)

			expect(startListenersSpy).toHaveBeenCalledWith(mockWallet)
			expect(startListenersSpy).toHaveBeenCalledBefore(mockWallet.__internal.connect as any)
		})

		it('should call wallet.__internal.connect()', async () => {
			await caipController.connect(mockWallet)

			expect(mockWallet.__internal.connect).toHaveBeenCalled()
		})

		it('should throw NoActiveSessionError if session is falsy/null', async () => {
			mockWallet.__internal.connect = vi.fn().mockResolvedValue(null)

			await expect(caipController.connect(mockWallet)).rejects.toThrow(NoActiveSessionError)
		})

		it('should call setConnections() with session and wallet on successful connect', async () => {
			const setConnectionsSpy = vi.spyOn(caipController, 'setConnections')
			const mockSession: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: ['eth_sendTransaction'],
						events: ['accountsChanged'],
					},
				},
			}
			mockWallet.__internal.connect = vi.fn().mockResolvedValue(mockSession)

			await caipController.connect(mockWallet)

			expect(setConnectionsSpy).toHaveBeenCalledWith({ session: mockSession, wallet: mockWallet })
		})

		it('should call wallet.__internal.clearAllListeners() on error', async () => {
			const error = new Error('Connection failed')
			mockWallet.__internal.connect = vi.fn().mockRejectedValue(error)

			await expect(caipController.connect(mockWallet)).rejects.toThrow(error)
			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should rethrow the error after clearing listeners', async () => {
			const error = new Error('Connection failed')
			mockWallet.__internal.connect = vi.fn().mockRejectedValue(error)

			await expect(caipController.connect(mockWallet)).rejects.toThrow(error)
		})
	})

	describe('Reconnect', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should call startListeners() with the wallet before reconnecting', async () => {
			const startListenersSpy = vi.spyOn(caipController, 'startListeners')
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue({
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			})

			await caipController.reconnect({ wallet: mockWallet })

			expect(startListenersSpy).toHaveBeenCalledWith(mockWallet)
		})

		it('should call wallet.__internal.reconnect()', async () => {
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue(undefined)

			await caipController.reconnect({ wallet: mockWallet })

			expect(mockWallet.__internal.reconnect).toHaveBeenCalled()
		})

		it('should not throw when reconnect errors occur', async () => {
			mockWallet.__internal.reconnect = vi.fn().mockRejectedValue(new Error('Reconnect failed'))

			// The promise should resolve (not reject) even when reconnect errors
			// Errors are caught silently in the try-catch block
			await expect(caipController.reconnect({ wallet: mockWallet })).resolves.not.toThrow()
		})

		it('should call wallet.__internal.clearAllListeners() if session is undefined/falsy', async () => {
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue(undefined)

			await caipController.reconnect({ wallet: mockWallet })

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should call clearLastConnectedWalletId() if session is undefined/falsy', async () => {
			localStorageMock.setItem('trust-connect.caip.lastWallet.0.0.0', JSON.stringify('walletconnect'))
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue(undefined)

			await caipController.reconnect({ wallet: mockWallet })

			expect(localStorageMock.getItem('trust-connect.caip.lastWallet.0.0.0')).toBeNull()
		})

		it('should call setConnections() if session exists', async () => {
			const mockSession: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue(mockSession)
			const setConnectionsSpy = vi.spyOn(caipController, 'setConnections')

			await caipController.reconnect({ wallet: mockWallet })

			expect(setConnectionsSpy).toHaveBeenCalledWith({ session: mockSession, wallet: mockWallet })
		})

		it('should return early if no session after reconnect attempt', async () => {
			mockWallet.__internal.reconnect = vi.fn().mockResolvedValue(undefined)
			const setConnectionsSpy = vi.spyOn(caipController, 'setConnections')

			await caipController.reconnect({ wallet: mockWallet })

			expect(setConnectionsSpy).not.toHaveBeenCalled()
		})
	})

	describe('Disconnect', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should iterate through all namespaces', () => {
			const namespace2 = createMockNamespace('bip122' as NamespaceId)
			caipController.namespaces.set('bip122', namespace2)

			caipController.disconnect()

			expect(mockNamespace.getConnection).toHaveBeenCalled()
			expect(namespace2.getConnection).toHaveBeenCalled()
		})

		it("should skip namespaces that are not in 'connected' status", () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			caipController.disconnect()

			expect(mockNamespace.setConnection).not.toHaveBeenCalled()
		})

		it('should call clearAllListeners() on connected wallet', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.disconnect()

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should call clearLastConnectedWalletId()', () => {
			localStorageMock.setItem('trust-connect.caip.lastWallet.0.0.0', JSON.stringify('walletconnect'))
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.disconnect()

			expect(localStorageMock.getItem('trust-connect.caip.lastWallet.0.0.0')).toBeNull()
		})

		it('should set namespace connection to disconnected with undefined values', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.disconnect()

			expect(mockNamespace.setConnection).toHaveBeenCalledWith({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})
		})

		it('should call wallet.__internal.disconnect() on the connected wallet', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.disconnect()

			expect(mockWallet.__internal.disconnect).toHaveBeenCalled()
		})

		it('should handle multiple connected namespaces', () => {
			const wallet2 = createMockCaipWallet('wallet2', ['bip122'] as NamespaceId[])
			const namespace2 = createMockNamespace('bip122' as NamespaceId)
			vi.mocked(namespace2.getConnection).mockReturnValue({
				status: 'connected',
				wallet: wallet2,
				address: '0xabc',
				chain: { namespace: 'bip122', reference: '000000000019d6689c085ae165831e93' },
			})
			caipController.namespaces.set('bip122', namespace2)

			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.disconnect()

			expect(mockWallet.__internal.disconnect).toHaveBeenCalled()
			expect(wallet2.__internal.disconnect).toHaveBeenCalled()
			expect(mockNamespace.setConnection).toHaveBeenCalled()
			expect(namespace2.setConnection).toHaveBeenCalled()
		})
	})

	describe('AbortConnect', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should call abortConnect() on all wallets in the wallets array', () => {
			const wallet2 = createMockCaipWallet('wallet2', ['eip155'] as NamespaceId[])
			caipController.wallets.push(wallet2)

			caipController.abortConnect()

			expect(mockWallet.__internal.abortConnect).toHaveBeenCalled()
			expect(wallet2.__internal.abortConnect).toHaveBeenCalled()
		})

		it('should call clearAllListeners() on all wallets in the wallets array', () => {
			const wallet2 = createMockCaipWallet('wallet2', ['eip155'] as NamespaceId[])
			caipController.wallets.push(wallet2)

			caipController.abortConnect()

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
			expect(wallet2.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should iterate through all namespaces', () => {
			const namespace2 = createMockNamespace('bip122' as NamespaceId)
			caipController.namespaces.set('bip122', namespace2)

			caipController.abortConnect()

			expect(mockNamespace.getConnection).toHaveBeenCalled()
			expect(namespace2.getConnection).toHaveBeenCalled()
		})

		it("should only abort namespaces with status 'connecting' and a wallet", () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			caipController.abortConnect()

			expect(mockWallet.__internal.abortConnect).toHaveBeenCalledTimes(2) // once for wallet array, once for namespace
			expect(mockNamespace.setConnection).toHaveBeenCalled()
		})

		it("should set connection to 'disconnected' for connecting namespaces", () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connecting',
				wallet: mockWallet,
				address: undefined,
				chain: undefined,
			})

			caipController.abortConnect()

			expect(mockNamespace.setConnection).toHaveBeenCalledWith({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})
		})

		it("should not affect namespaces with status 'connected' or 'disconnected'", () => {
			const disconnectedNamespace = createMockNamespace('bip122' as NamespaceId)
			vi.mocked(disconnectedNamespace.getConnection).mockReturnValue({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			const connectedNamespace = createMockNamespace('cosmos' as NamespaceId)
			vi.mocked(connectedNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'cosmos', reference: 'cosmoshub-4' },
			})

			caipController.namespaces.set('bip122', disconnectedNamespace)
			caipController.namespaces.set('cosmos', connectedNamespace)

			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			caipController.abortConnect()

			expect(disconnectedNamespace.setConnection).not.toHaveBeenCalled()
			expect(connectedNamespace.setConnection).not.toHaveBeenCalled()
			expect(mockNamespace.setConnection).not.toHaveBeenCalled()
		})
	})

	describe('SetConnections', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should iterate through all namespaces in the session response', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
					bip122: {
						accounts: ['bip122:000000000019d6689c085ae165831e93:0xabc'],
						chains: ['bip122:000000000019d6689c085ae165831e93'],
						methods: [],
						events: [],
					},
				},
			}

			const namespace2 = createMockNamespace('bip122' as NamespaceId)
			caipController.namespaces.set('bip122', namespace2)

			caipController.setConnections({ session, wallet: mockWallet })

			expect(mockNamespace.setConnection).toHaveBeenCalled()
			expect(namespace2.setConnection).toHaveBeenCalled()
		})

		it('should skip namespaces without a first account and log error', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: [],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Wallet walletconnect was unable to connect with namespace eip155'),
			)
			expect(mockNamespace.setConnection).not.toHaveBeenCalled()
		})

		it('should extract address from CAIP-10 account format', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123456789'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(mockNamespace.setConnection).toHaveBeenCalledWith(
				expect.objectContaining({
					address: '0x123456789',
				}),
			)
		})

		it('should extract chain reference from chain string', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(mockNamespace.setConnection).toHaveBeenCalledWith(
				expect.objectContaining({
					chain: {
						namespace: 'eip155',
						reference: '1',
					},
				}),
			)
		})

		it('should skip and log error if namespace is not found in namespaces Map', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					unknown: {
						accounts: ['unknown:1:0x123'],
						chains: ['unknown:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Namespace unknown not found'))
		})

		it("should set namespace connection with 'connected' status", () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(mockNamespace.setConnection).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'connected',
				}),
			)
		})

		it('should set wallet, address, and chain in namespace connection', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(mockNamespace.setConnection).toHaveBeenCalledWith({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: {
					namespace: 'eip155',
					reference: '1',
				},
			})
		})

		it('should call saveLastConnectedWalletId() if at least one namespace connected', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(localStorageMock.getItem('trust-connect.caip.lastWallet.0.0.0')).toBe(
				JSON.stringify('walletconnect'),
			)
		})

		it('should call disconnect() if no namespaces were connected successfully', () => {
			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: [], // No accounts
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
				},
			}

			const disconnectSpy = vi.spyOn(caipController, 'disconnect')

			caipController.setConnections({ session, wallet: mockWallet })

			expect(disconnectSpy).toHaveBeenCalled()
		})

		it('should handle sessions with multiple namespaces', () => {
			const namespace2 = createMockNamespace('bip122' as NamespaceId)
			caipController.namespaces.set('bip122', namespace2)

			const session: CaipSessionResponse = {
				namespaces: {
					eip155: {
						accounts: ['eip155:1:0x123'],
						chains: ['eip155:1'],
						methods: [],
						events: [],
					},
					bip122: {
						accounts: ['bip122:000000000019d6689c085ae165831e93:0xabc'],
						chains: ['bip122:000000000019d6689c085ae165831e93'],
						methods: [],
						events: [],
					},
				},
			}

			caipController.setConnections({ session, wallet: mockWallet })

			expect(mockNamespace.setConnection).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'connected',
					address: '0x123',
				}),
			)
			expect(namespace2.setConnection).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'connected',
					address: '0xabc',
				}),
			)
		})
	})

	describe('OnSessionEvent', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should extract namespace ID from chainId', () => {
			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456'],
				},
			}

			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.onSessionEvent(event)

			expect(mockNamespace.getConnection).toHaveBeenCalled()
		})

		it('should get the namespace from the namespaces Map', () => {
			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456'],
				},
			}

			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			caipController.onSessionEvent(event)

			expect(mockNamespace.getConnection).toHaveBeenCalled()
		})

		it('should return early if namespace is not found', () => {
			const event: CaipSessionEvent = {
				chainId: 'unknown:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456'],
				},
			}

			caipController.onSessionEvent(event)

			// Should not throw, just return early
			expect(mockWallet.__internal.setAddress).not.toHaveBeenCalled()
		})

		it("should return early if connection doesn't exist", () => {
			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456'],
				},
			}

			vi.mocked(mockNamespace.getConnection).mockReturnValue(undefined as unknown as NamespaceConnection)

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setAddress).not.toHaveBeenCalled()
		})

		it("should return early if connection status is not 'connected'", () => {
			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456'],
				},
			}

			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'disconnected',
				wallet: undefined,
				address: undefined,
				chain: undefined,
			})

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setAddress).not.toHaveBeenCalled()
		})

		it("should handle ADDRESS_CHANGED events ('accountChanged', 'accountsChanged')", () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			const event1: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountChanged',
					data: ['0x456'],
				},
			}

			caipController.onSessionEvent(event1)
			expect(mockWallet.__internal.setAddress).toHaveBeenCalledWith('0x456')

			mockWallet.__internal.setAddress = vi.fn()

			const event2: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x789'],
				},
			}

			caipController.onSessionEvent(event2)
			expect(mockWallet.__internal.setAddress).toHaveBeenCalledWith('0x789')
		})

		it('should call wallet.__internal.setAddress() with first account on address changed', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456', '0x789'],
				},
			}

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setAddress).toHaveBeenCalledWith('0x456')
		})

		it("should handle CHAIN_REFERENCE_CHANGED events ('chainChanged')", () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'chainChanged',
					data: 'eip155:42',
				},
			}

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setChain).toHaveBeenCalled()
		})

		it('should extract chain reference from event data on chain changed', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'chainChanged',
					data: 'eip155:42',
				},
			}

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setChain).toHaveBeenCalledWith({
				namespace: 'eip155',
				reference: '42',
			})
		})

		it('should call wallet.__internal.setChain() with namespace and reference', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'chainChanged',
					data: 'eip155:137',
				},
			}

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setChain).toHaveBeenCalledWith({
				namespace: 'eip155',
				reference: '137',
			})
		})

		it('should persist the session address on the namespace connection', () => {
			const current: NamespaceConnection = {
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			}
			vi.mocked(mockNamespace.getConnection).mockReturnValue(current)

			caipController.onSessionEvent({
				chainId: 'eip155:1',
				event: {
					name: 'accountsChanged',
					data: ['0x456'],
				},
			})

			expect(mockNamespace.setConnection).toHaveBeenCalledWith({
				...current,
				address: '0x456',
			})
		})

		it('should persist the session chain on the namespace connection', () => {
			const current: NamespaceConnection = {
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			}
			vi.mocked(mockNamespace.getConnection).mockReturnValue(current)

			caipController.onSessionEvent({
				chainId: 'eip155:1',
				event: {
					name: 'chainChanged',
					data: 'eip155:137',
				},
			})

			expect(mockNamespace.setConnection).toHaveBeenCalledWith({
				...current,
				chain: { namespace: 'eip155', reference: '137' },
			})
		})

		it('should ignore unrecognized event types', () => {
			vi.mocked(mockNamespace.getConnection).mockReturnValue({
				status: 'connected',
				wallet: mockWallet,
				address: '0x123',
				chain: { namespace: 'eip155', reference: '1' },
			})

			const event: CaipSessionEvent = {
				chainId: 'eip155:1',
				event: {
					name: 'unknownEvent',
					data: 'some data',
				},
			}

			caipController.onSessionEvent(event)

			expect(mockWallet.__internal.setAddress).not.toHaveBeenCalled()
			expect(mockWallet.__internal.setChain).not.toHaveBeenCalled()
		})
	})

	describe('StartListeners', () => {
		beforeEach(() => {
			caipController = new CaipController({
				namespaces: [mockNamespace],
				caipWallets: [mockWallet],
			})
		})

		it('should call wallet.__internal.clearAllListeners() first', () => {
			caipController.startListeners(mockWallet)

			expect(mockWallet.__internal.clearAllListeners).toHaveBeenCalled()
		})

		it('should call handleOnCaipSessionEvent() with onSessionEvent callback', () => {
			caipController.startListeners(mockWallet)

			expect(mockWallet.__internal.handleOnCaipSessionEvent).toHaveBeenCalled()
			expect(mockWallet.__internal.handleOnCaipSessionEvent).toHaveBeenCalledWith(expect.any(Function))
		})

		it('should call handleOnCaipSessionDelete() with disconnect callback', () => {
			caipController.startListeners(mockWallet)

			expect(mockWallet.__internal.handleOnCaipSessionDelete).toHaveBeenCalled()
			expect(mockWallet.__internal.handleOnCaipSessionDelete).toHaveBeenCalledWith(expect.any(Function))
		})

		it('should call wallet.__internal.startListeners() at the end', () => {
			caipController.startListeners(mockWallet)

			expect(mockWallet.__internal.startListeners).toHaveBeenCalled()
			expect(mockWallet.__internal.startListeners).toHaveBeenCalledAfter(
				mockWallet.__internal.clearAllListeners as any,
			)
		})
	})
})
