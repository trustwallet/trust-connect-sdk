import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useLayoutEffect, type ReactNode } from 'react'
import {
	NamespaceEngine,
	RegistryBase,
	type NamespaceId,
	type WalletAdapterBase,
} from '@trustwallet/connect-core'
import {
	TrustConnectProvider,
	useConnection,
	useConnections,
	useTrustConnectContext,
} from '@trustwallet/connect-headless'
import { TrustModalLogic } from '../src/TrustModal'
import { TrustModalProvider, useTrustModal } from '../src/context/TrustModalContext'
import { WalletsViewLogic } from '../src/views/WalletsView/WalletsViewLogic'

const ICON = 'data:image/svg+xml;base64,test'
const EVM_ADDRESS = '0x1111111111111111111111111111111111111111'
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112'
const BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'

class StaticRegistry extends RegistryBase<WalletAdapterBase> {
	protected wallets: WalletAdapterBase[]

	constructor(wallets: WalletAdapterBase[]) {
		super()
		this.wallets = wallets
	}

	protected start() {}

	protected stopListeners() {}
}

function createWallet(id: string, name: string, namespaceId: NamespaceId): WalletAdapterBase {
	return {
		id,
		name,
		type: 'namespace',
		icon: ICON,
		namespaceIds: [namespaceId],
		getProvider: async () => ({}),
		__internal: {
			connect: async () => ({ address: undefined, chain: undefined }),
			reconnect: async () => ({ address: undefined, chain: undefined }),
			disconnect: () => undefined,
			abortConnect: () => undefined,
			startListeners: () => undefined,
			stopListeners: () => undefined,
			handleOnCaipSessionEvent: () => undefined,
			handleOnCaipSessionDelete: () => undefined,
			handleOnAddress: () => undefined,
			handleOnChain: () => undefined,
			setAddress: () => undefined,
			setChain: () => undefined,
			clearAllListeners: () => undefined,
		},
	} as unknown as WalletAdapterBase
}

function createNamespace(id: NamespaceId, name: string, wallets: WalletAdapterBase[]) {
	return {
		__createNamespace() {
			return {
				namespace: new NamespaceEngine({
					id,
					name,
					icon: ICON,
					registries: [new StaticRegistry(wallets)],
					rpcUrls: undefined,
				}),
				scope: {
					ID: id,
					NAME: name,
					CHAINS: ['1'],
					METHODS: {},
					EVENTS: {},
				},
			}
		},
	}
}

function createConfig() {
	const metamask = createWallet('metamask', 'MetaMask', 'eip155')
	const rainbowEvm = createWallet('rainbow', 'Rainbow', 'eip155')
	const rainbowSolana = createWallet('rainbow', 'Rainbow', 'solana')
	const phantom = createWallet('phantom', 'Phantom', 'solana')
	const unisat = createWallet('unisat', 'Unisat', 'bip122')

	return {
		namespaces: [
			createNamespace('eip155', 'Ethereum', [metamask, rainbowEvm]),
			createNamespace('solana', 'Solana', [phantom, rainbowSolana]),
			createNamespace('bip122', 'Bitcoin', [unisat]),
		],
	}
}

function installMatchMedia() {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		}),
	})
}

function renderWithClient(children: ReactNode) {
	return render(<TrustConnectProvider config={createConfig()}>{children}</TrustConnectProvider>)
}

function ConnectionProbe() {
	const { client } = useTrustConnectContext()
	const { connections } = useConnections()
	const evm = useConnection({ namespaceId: 'eip155' })

	useLayoutEffect(() => {
		for (const namespace of client.getNamespaces()) {
			const address =
				namespace.id === 'eip155' ? EVM_ADDRESS : namespace.id === 'solana' ? SOL_ADDRESS : BTC_ADDRESS
			namespace.setConnection({
				status: 'connected',
				address,
				chain: { namespace: namespace.id, reference: '1' },
				wallet: namespace.getWallets()[0],
			} as never)
		}
	}, [client])

	const addresses = ['eip155', 'solana', 'bip122']
		.map((id) => {
			const connection = connections[id as keyof typeof connections]
			return connection?.status === 'connected' ? connection.address : ''
		})
		.join(',')

	return (
		<div>
			<span data-testid="namespaces">{Object.keys(connections).sort().join(',')}</span>
			<span data-testid="all-addresses">{addresses}</span>
			<span data-testid="evm-address">{evm.isConnected ? evm.address : ''}</span>
			<span data-testid="evm-status">{evm.status}</span>
			<span data-testid="evm-chain">{evm.chain?.namespace ?? ''}</span>
			<span data-testid="evm-wallet">{evm.wallet?.name ?? ''}</span>
		</div>
	)
}

function WalletsView() {
	return (
		<WalletsViewLogic
			components={{
				emptyState: ({ message }) => <p>{message}</p>,
				header: ({ namespaceName }) => <h2>Connect to {namespaceName}</h2>,
				grid: ({ children }) => <div>{children}</div>,
				walletButton: ({ name }) => <button type="button">{name}</button>,
				walletConnectButton: () => <button type="button">WalletConnect</button>,
			}}
		/>
	)
}

function ModalHarness() {
	const { open } = useTrustModal()

	return (
		<>
			<button type="button" onClick={() => open({ type: 'namespace', namespaceId: 'eip155' })}>
				Connect EVM Wallet
			</button>
			<TrustModalLogic
				layout={{
					overlay: ({ children }) => <div>{children}</div>,
					wrapper: ({ children }) => <div>{children}</div>,
					header: ({ title }) => <h1>{title}</h1>,
					body: ({ children }) => <div>{children}</div>,
					error: ({ message }) => <p>{message}</p>,
				}}
				views={[
					{ title: 'Connect a wallet', tag: 'wallets', node: WalletsView },
					{ title: 'Select a network', tag: 'networks', node: () => null },
					{ title: 'Scan with mobile wallet', tag: 'qr', node: () => null },
				]}
				mobileViews={[{ title: 'Connect a wallet', tag: 'wallets', node: WalletsView }]}
			/>
		</>
	)
}

function renderModal() {
	return render(
		<TrustConnectProvider config={createConfig()}>
			<TrustModalProvider>
				<ModalHarness />
			</TrustModalProvider>
		</TrustConnectProvider>,
	)
}

describe('connection hooks', () => {
	beforeEach(() => {
		installMatchMedia()
		localStorage.clear()
	})

	afterEach(() => {
		cleanup()
	})

	it('useConnections returns all namespace connections', async () => {
		renderWithClient(<ConnectionProbe />)

		await waitFor(() => {
			expect(screen.getByTestId('all-addresses').textContent).toBe(`${EVM_ADDRESS},${SOL_ADDRESS},${BTC_ADDRESS}`)
		})

		expect(screen.getByTestId('namespaces').textContent).toBe('bip122,eip155,solana')
	})

	it('useConnection for eip155 returns only the EVM connection', async () => {
		renderWithClient(<ConnectionProbe />)

		await waitFor(() => {
			expect(screen.getByTestId('evm-address').textContent).toBe(EVM_ADDRESS)
		})

		expect(screen.getByTestId('evm-status').textContent).toBe('connected')
		expect(screen.getByTestId('evm-chain').textContent).toBe('eip155')
		expect(screen.getByTestId('evm-wallet').textContent).toBe('MetaMask')
		expect(screen.getByTestId('evm-address').textContent).not.toBe(SOL_ADDRESS)
		expect(screen.getByTestId('evm-address').textContent).not.toBe(BTC_ADDRESS)
		expect(screen.getByTestId('evm-address').textContent?.startsWith('0x')).toBe(true)
	})

	it('open with the eip155 namespace filters the modal to EVM wallets', () => {
		renderModal()

		expect(screen.queryByRole('button', { name: 'MetaMask' })).toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'Connect EVM Wallet' }))

		expect(screen.getByRole('heading', { name: 'Connect to Ethereum' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'MetaMask' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Rainbow' })).toBeTruthy()
		expect(screen.queryByRole('button', { name: 'Phantom' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Unisat' })).toBeNull()
	})
})
