import { expectTypeOf } from 'vitest'
import type { BIP122Address } from '@trustwallet/connect-bip122-types'
import type { EIP155Address } from '@trustwallet/connect-eip155-types'
import type { SolanaAddress } from '@trustwallet/connect-solana-types'
import { useConnection } from '../../headless/src/hooks/useConnection'
import { useConnections } from '../../headless/src/hooks/useConnections'
import '../../../namespaces/eip155/src/types/augmentation'
import '../../../namespaces/solana/src/types/augmentation'
import '../../../namespaces/bip122/src/types/augmentation'

export function useConnectionInfersEip155Address() {
	const evm = useConnection({ namespaceId: 'eip155' })

	expectTypeOf(evm.address).toEqualTypeOf<EIP155Address | undefined>()

	if (evm.isConnected) {
		expectTypeOf(evm.address).toEqualTypeOf<EIP155Address>()
		expectTypeOf(evm.address).not.toEqualTypeOf<SolanaAddress>()
	}

	if (!evm.isConnected) {
		expectTypeOf(evm.address).toEqualTypeOf<undefined>()
	}
}

export function useConnectionsKeepsNamespaceAddressTypes() {
	const { connections } = useConnections()

	expectTypeOf<keyof typeof connections>().toEqualTypeOf<'bip122' | 'eip155' | 'solana'>()

	const evm = connections.eip155
	if (evm?.status === 'connected') {
		expectTypeOf(evm.address).toEqualTypeOf<EIP155Address>()
	}

	const solana = connections.solana
	if (solana?.status === 'connected') {
		expectTypeOf(solana.address).toEqualTypeOf<SolanaAddress>()
	}

	const bitcoin = connections.bip122
	if (bitcoin?.status === 'connected') {
		expectTypeOf(bitcoin.address).toEqualTypeOf<BIP122Address>()
	}
}
