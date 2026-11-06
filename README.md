# TrustConnect SDK

A [CAIP](https://chainagnostic.org/) compliant, multi-chain wallet connection SDK.

## Installation

Install the main React package:

```sh
pnpm add @trustwallet/connect-react
```

### Network-specific packages

Install network-specific packages for the chains you want to support:

```sh
# EIP-155 (EVM chains like Ethereum, Polygon, etc.)
pnpm add @trustwallet/connect-eip155-react

# Solana
pnpm add @trustwallet/connect-solana-react

# Bitcoin (BIP-122)
pnpm add @trustwallet/connect-bip122-react
```

For WalletConnect support (mobile and QR code connections):

```sh
pnpm add @trustwallet/connect-walletconnect
```

EIP155 peer dependencies (if not already installed):

```sh
pnpm add @tanstack/react-query viem
```

---

## Setup

Wrap your app with `TrustConnectProvider` and configure your supported networks:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet, polygon } from 'viem/chains'

// Network namespaces
import { createEIP155 } from '@trustwallet/connect-eip155-react'
import { createBIP122, mainnet as bip122Mainnet } from '@trustwallet/connect-bip122-react'
import { createSolana, mainnet as solanaMainnet } from '@trustwallet/connect-solana-react'

// Services
import { createWalletConnect } from '@trustwallet/connect-walletconnect'

// Core provider
import { TrustConnectProvider } from '@trustwallet/connect-react'

const queryClient = new QueryClient()
const projectId = import.meta.env.VITE_WALLETCONNECT_ID

// Configure EVM chains
const eip155 = createEIP155({
	chains: [mainnet, polygon],
})

// Configure Solana
const solana = createSolana({
	chain: solanaMainnet,
})

// Configure Bitcoin
const bip122 = createBIP122({
	chain: bip122Mainnet,
})

// Configure WalletConnect service
const walletConnect = createWalletConnect({
	projectId,
	metadata: {
		name: 'My dApp',
		url: 'https://example.com',
		description: 'My awesome dApp',
		icons: ['https://example.com/icon.png'],
	},
})

function App() {
	return (
		<TrustConnectProvider
			config={{
				namespaces: [eip155, solana, bip122],
				services: [walletConnect],
			}}
			theme="dark" // Optional: 'light', 'dark', or 'auto' (default: 'auto')
		>
			<QueryClientProvider client={queryClient}>
				<YourApp />
			</QueryClientProvider>
		</TrustConnectProvider>
	)
}
```

### Configuration Options

**Note:** The EIP-155 package uses [Viem](https://viem.sh). You can configure custom RPC URLs and it will internally create Viem transports:

```ts
import { mainnet } from 'viem/chains'
import { formatChainId, createEIP155 } from '@trustwallet/connect-eip155-react'

// Since Viem doesn't follow CAIP-2 we need to format the chain reference first.
const caipMainnetId = formatChainId(mainnet.id)

const eip155 = createEIP155({
	chains: [mainnet],
	rpcUrls: {
		[caipMainnetId]: ['https://rpc-node.com'],
	},
})
```

---

## Opening the Modal

Use the `useTrustModal` hook to control the connection modal:

```tsx
import { useTrustModal } from '@trustwallet/connect-react'

function ConnectButton() {
	const { open } = useTrustModal()

	return (
		<>
			{/* Open wallet selection */}
			<button onClick={() => open()}>Connect Wallet</button>

			{/* Prompt the user to connect to a specific namespace */}
			<button onClick={() => open({ type: 'namespace', namespaceId: 'eip155' })}>
				Connect EVM Wallet
			</button>
		</>
	)
}
```

---

## Reading Connection State

Use `useConnections` for all namespaces, and `useConnection` for a single namespace:

```tsx
import { useConnection, useConnections } from '@trustwallet/connect-react'
import type { NamespaceId } from '@trustwallet/connect-react'

function WalletInfo() {
	// Get all connections
	const { connections } = useConnections()

	// Get specific namespace connection with type inference
	const { isConnected, address, wallet, chain, status } = useConnection({
		namespaceId: 'eip155'
	})

	if (!isConnected) return <p>Not connected</p>

	return (
		<div>
			<p>Wallet: {wallet?.name}</p>
			<p>Address: {address}</p>
			<p>Chain: {chain?.reference}</p>
			<p>Status: {status}</p>
		</div>
	)
}
```

---

## EIP-155 (EVM) Actions

The EIP-155 React package provides hooks for interacting with EVM chains using Viem actions.

### Read Operations (Queries)

Use `useEIP155Query` for read-only operations:

```tsx
import { useEIP155Query } from '@trustwallet/connect-eip155-react'
import { getBalance } from 'viem/actions'
import { mainnet } from 'viem/chains'
import { useConnection } from '@trustwallet/connect-react'

function Balance() {
	const { address, isConnected } = useConnection({ namespaceId: 'eip155' })

	const { data } = useEIP155Query({
		chain: mainnet,
		action: getBalance,
		request: { address },
		queryOptions: {
			enabled: isConnected,
			queryKey: [address],
		},
	})

	return <p>Balance: {data?.toString()}</p>
}
```

### Write Operations (Mutations)

Use `useSignMessage` for a simple message flow, `useWriteContract` for contract writes, `useSendTransaction` for transfers, and `useEIP155Mutation` for other Viem actions:

**NOTE:** `useWriteContract` and `useSendTransaction` will handle internally chain switching (if the user is not connected in the target chain ID) and [`waitForTransactionReceipt`](https://viem.sh/docs/actions/public/waitForTransactionReceipt).
You can disable `switchChain` by setting `autoSwitchChain` to `false`.

```tsx
import { useSignMessage, useWriteContract, useSendTransaction, useEIP155Mutation } from '@trustwallet/connect-eip155-react'
import { switchChain } from 'viem/actions'
import { mainnet } from 'viem/chains'
import { parseEther } from 'viem'
import { useConnection } from '@trustwallet/connect-react'

// Sign messages
function SignMessage() {
	const { isConnected } = useConnection({ namespaceId: 'eip155' })
	const { mutate: sign, data, isPending, isSuccess, isError, error } = useSignMessage()

	return (
		<div>
			<button onClick={() => sign({ message: 'Hello World' })} disabled={!isConnected || isPending}>
				Sign Message
			</button>
			{isPending && <p>Signing...</p>}
			{isSuccess && <p>Signature: {data}</p>}
			{isError && <p>Error: {error?.message}</p>}
		</div>
	)
}

// Write contracts and wait for confirmation
function WriteContract() {
	const { mutate, hash, receipt, isLoading, isConfirming, isConfirmed } = useWriteContract()

	const handleWrite = () => {
		mutate({
			chain: mainnet,
			address: '0x...',
			abi: [...],
			functionName: 'transfer',
			args: ['0x...', parseEther('0.01')],
		})
	}

	return (
		<div>
			<button onClick={handleWrite} disabled={isLoading}>
				{isLoading ? 'Sending...' : 'Send'}
			</button>
			{hash && <p>Hash: {hash}</p>}
			{isConfirming && <p>Waiting for confirmation...</p>}
			{isConfirmed && receipt && <p>Confirmed in block {receipt.blockNumber}</p>}
		</div>
	)
}

// Send transactions
function SendTransaction() {
	const { mutateAsync, isPending, hash, receipt, isConfirming, isConfirmed } = useSendTransaction()

	const handleSend = async () => {
		try {
			await mutateAsync({
				chain: mainnet,
				to: '0x...',
				value: parseEther('0.01'),
			})
		} catch (error) {
			console.error('Failed:', error)
		}
	}

	return (
		<div>
			<button onClick={handleSend} disabled={isPending}>
				{isPending ? 'Sending...' : 'Send 0.01 ETH'}
			</button>
			{hash && <p>Hash: {hash}</p>}
			{isConfirming && <p>Waiting for confirmation...</p>}
			{isConfirmed && receipt && <p>Confirmed in block {receipt.blockNumber}</p>}
		</div>
	)
}

// Custom Viem actions
function CustomAction() {
	const { mutateAsync, isPending } = useEIP155Mutation({
		chain: mainnet,
		action: switchChain,
	})

	return (
		<button onClick={() => mutateAsync({ id: mainnet.id })} disabled={isPending}>
			{isPending ? 'Switching...' : 'Switch Chain'}
		</button>
	)
}
```

---

**Note**: For Solana and Bitcoin there is a lot of work to be done, at the moment
we simply wrap wallet features into React Query hooks.

## Solana Actions

The Solana React package provides hooks for Solana wallet interactions.

### Sign Messages

```tsx
import { useSignMessage } from '@trustwallet/connect-solana-react'
import { useConnection } from '@trustwallet/connect-react'
import bs58 from 'bs58'

function SolanaSignMessage() {
	const { isConnected } = useConnection({ namespaceId: 'solana' })
	const { mutate, data, isPending, isSuccess, error } = useSignMessage()

	const handleSign = () => {
		if (!isConnected) return
		mutate({ message: 'Hello Solana!' })
	}

	// Signature is returned as Uint8Array
	const signatureBase58 = data ? bs58.encode(data.signature) : null

	return (
		<div>
			<button onClick={handleSign} disabled={isPending || !isConnected}>
				{isPending ? 'Signing...' : 'Sign Message'}
			</button>
			{isSuccess && signatureBase58 && (
				<div>
					<p>Message signed successfully!</p>
					<code>{signatureBase58}</code>
				</div>
			)}
			{error && <p>Error: {error.message}</p>}
		</div>
	)
}
```

### Send Transactions

```tsx
import { useSignSendTransaction } from '@trustwallet/connect-solana-react'
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js'

function SolanaSendTransaction() {
	const { mutateAsync, isPending } = useSignSendTransaction()

	const handleSend = async () => {
		try {
			// Create transaction
			const tx = new Transaction().add(
				SystemProgram.transfer({
					fromPubkey: new PublicKey('...'),
					toPubkey: new PublicKey('...'),
					lamports: 1000000, // 0.001 SOL
				})
			)

			// Serialize and send
			const serialized = tx.serialize({ requireAllSignatures: false })
			const result = await mutateAsync({
				transaction: serialized,
				options: {
					skipPreflight: false,
					preflightCommitment: 'confirmed',
				},
			})

			console.log('Transaction signature:', result.signature)
		} catch (error) {
			console.error('Transaction failed:', error)
		}
	}

	return (
		<button onClick={handleSend} disabled={isPending}>
			{isPending ? 'Sending...' : 'Send SOL'}
		</button>
	)
}
```

---

## Bitcoin (BIP-122) Actions

The Bitcoin React package provides hooks for Bitcoin wallet interactions.

### Sign Messages

```tsx
import { useSignMessage } from '@trustwallet/connect-bip122-react'
import { useConnection } from '@trustwallet/connect-react'

function BitcoinSignMessage() {
	const { isConnected } = useConnection({ namespaceId: 'bip122' })

	const {
		mutate: sign,
		data: signature,
		isPending,
		isSuccess,
		error,
	} = useSignMessage()

	const handleSign = () => {
		if (!isConnected) return
		sign({
			message: 'Hello from TrustConnect SDK!',
			protocol: 'ecdsa', // or 'bip322'
		})
	}

	return (
		<div>
			<button onClick={handleSign} disabled={isPending || !isConnected}>
				{isPending ? 'Signing...' : 'Sign Message'}
			</button>
			{isSuccess && signature && (
				<div>
					<p>Message signed!</p>
					<code>{signature.signature}</code>
				</div>
			)}
			{error && <p>Error: {error.message}</p>}
		</div>
	)
}
```

### Sign and Send PSBTs

```tsx
import { useSignPsbt, useSendTransfer } from '@trustwallet/connect-bip122-react'

function BitcoinTransaction() {
	// Sign PSBT (Partially Signed Bitcoin Transaction)
	const { mutate: signPsbt, isPending: isSigning } = useSignPsbt()

	// Send transfer
	const { mutateAsync: sendTransfer, isPending: isSending } = useSendTransfer()

	const handleSignPsbt = () => {
		signPsbt({
			psbt: 'cHNidP8BA...', // Base64 encoded PSBT
			signInputs: [
				{ index: 0, sighashType: 1 }
			],
			finalize: false, // Don't finalize after signing
		})
	}

	const handleTransfer = async () => {
		try {
			const result = await sendTransfer({
				toAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
				satoshis: 10000,
			})
			console.log('Transaction ID:', result.txid)
		} catch (error) {
			console.error('Transfer failed:', error)
		}
	}

	return (
		<div>
			<button onClick={handleSignPsbt} disabled={isSigning}>
				{isSigning ? 'Signing...' : 'Sign PSBT'}
			</button>
			<button onClick={handleTransfer} disabled={isSending}>
				{isSending ? 'Sending...' : 'Send BTC'}
			</button>
		</div>
	)
}
```

---

## Theme Customization

Set the initial theme via the provider (see [Configuration Options](#configuration-options)), or toggle it programmatically:

```tsx
import { useTheme } from '@trustwallet/connect-react'

function ThemeToggle() {
	const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

	return (
		<div>
			<p>Current: {resolvedTheme}</p>
			<button onClick={toggleTheme}>Toggle</button>
			<button onClick={() => setTheme('dark')}>Dark</button>
			<button onClick={() => setTheme('light')}>Light</button>
			<button onClick={() => setTheme('auto')}>Auto</button>
		</div>
	)
}
```

---

## Full Control of UI Styles

If you want full control of the UI styles, copy the TrustConnect UI components into your app and edit them directly:

```bash
npx @trustwallet/connect-react add
```

You can also choose a custom path:

```bash
npx @trustwallet/connect-react add --path ./src/components/trust
```

This downloads the components and their styles so you can customize everything locally.

You can now delete `@trustwallet/connect-react` and import `TrustConnectProvider` and other **TrustConnect**
hooks directly from your TrustConnect components folder.

## Complete Example

See the [playground](./playground) for a complete working example with all features.

Run the playground:

```sh
pnpm install
pnpm run build
pnpm run dev:all
```

---

## License

Copyright 2026 Trust Wallet

Licensed under the Apache License, Version 2.0. See the [LICENSE](./LICENSE.md) file for details.
