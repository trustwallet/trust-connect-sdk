import { afterEach, describe, expect, it, vi } from 'vitest'
import { EIP155Registry } from '../src/registry'
import { EIP155Wallet } from '../src/wallet'
import type { EIP1193Provider } from '../src/types/config'

type Listener = (payload: unknown) => void

function createProvider() {
	const listeners = new Map<string, Set<Listener>>()

	const provider = {
		request: vi.fn(),
		on(event: string, listener: Listener) {
			const set = listeners.get(event) ?? new Set<Listener>()
			set.add(listener)
			listeners.set(event, set)
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener)
		},
		emit(event: string, payload: unknown) {
			for (const listener of listeners.get(event) ?? []) listener(payload)
		},
		count() {
			let total = 0
			for (const set of listeners.values()) total += set.size
			return total
		},
	}

	return provider
}

function createWallet(provider: EIP1193Provider) {
	return new EIP155Wallet({
		info: {
			uuid: 'uuid-1',
			name: 'MetaMask',
			icon: 'icon',
			rdns: 'io.metamask',
		},
		provider,
	})
}

describe('EIP155Wallet listeners', () => {
	it('removes the same handlers that startListeners registered', () => {
		const provider = createProvider()
		const wallet = createWallet(provider)
		const addresses: unknown[] = []

		wallet.__internal.handleOnAddress((address) => {
			addresses.push(address)
		})

		wallet.startListeners()
		provider.emit('accountsChanged', ['0x111'])
		expect(addresses).toEqual(['0x111'])
		expect(provider.count()).toBe(3)

		wallet.stopListeners()
		provider.emit('accountsChanged', ['0x222'])
		provider.emit('chainChanged', '0x1')
		provider.emit('disconnect', undefined)

		expect(provider.count()).toBe(0)
		expect(addresses).toEqual(['0x111'])
	})

	it('does not stack handlers across connect cycles', () => {
		const provider = createProvider()
		const wallet = createWallet(provider)
		const addresses: unknown[] = []

		for (let i = 0; i < 5; i++) {
			wallet.__internal.clearAllListeners()
			wallet.startListeners()
		}

		wallet.__internal.handleOnAddress((address) => {
			addresses.push(address)
		})
		provider.emit('accountsChanged', ['0xabc'])

		expect(provider.count()).toBe(3)
		expect(addresses).toEqual(['0xabc'])
	})
})

describe('EIP155Registry listeners', () => {
	const listeners = new Map<string, Set<EventListener>>()
	const originalWindow = globalThis.window

	afterEach(() => {
		listeners.clear()
		if (originalWindow === undefined) {
			// @ts-expect-error test teardown
			delete globalThis.window
		} else {
			globalThis.window = originalWindow
		}
	})

	it('removes the EIP-6963 announcement listener', () => {
		globalThis.window = {
			addEventListener: ((type: string, listener: EventListener) => {
				const set = listeners.get(type) ?? new Set<EventListener>()
				set.add(listener)
				listeners.set(type, set)
			}) as typeof window.addEventListener,
			removeEventListener: ((type: string, listener: EventListener) => {
				listeners.get(type)?.delete(listener)
			}) as typeof window.removeEventListener,
			dispatchEvent: ((event: Event) => {
				for (const listener of listeners.get(event.type) ?? []) listener(event)
				return true
			}) as typeof window.dispatchEvent,
		} as Window

		const registry = new EIP155Registry()
		expect(listeners.get('eip6963:announceProvider')?.size).toBe(1)

		registry.clearAllListeners()
		expect(listeners.get('eip6963:announceProvider')?.size ?? 0).toBe(0)

		window.dispatchEvent({
			type: 'eip6963:announceProvider',
			detail: {
				info: { uuid: 'u', name: 'MetaMask', icon: 'i', rdns: 'io.metamask' },
				provider: { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
			},
		} as unknown as Event)
		expect(registry.getWallets()).toHaveLength(0)
	})
})
