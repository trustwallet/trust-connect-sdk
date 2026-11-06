import { useMutation } from '@tanstack/react-query'
import { createClient } from 'viem'
import { signMessage } from 'viem/actions'
import { useCallback } from 'react'
import { EIP155_SCOPE } from '@trustwallet/connect-eip155-core'
import { NoWalletConnectedError, useConnection } from '@trustwallet/connect-headless'
import { createEIP155Transport } from '../transport.js'
import type { SignMessageResult, UseSignMessageOptions } from '../types.js'

export function useSignMessage(options: UseSignMessageOptions = {}) {
	const { connection } = useConnection({ namespaceId: EIP155_SCOPE.ID })
	const { mutationOptions } = options

	const getClient = useCallback(async () => {
		if (connection?.status !== 'connected') {
			throw new NoWalletConnectedError()
		}

		const provider = await connection.wallet.getProvider()
		const client = createClient({
			account: connection.address,
			transport: createEIP155Transport(provider, { id: 0 }),
		})

		return { client }
	}, [connection])

	return useMutation<SignMessageResult, Error, { message: string }, unknown>({
		mutationFn: async ({ message }) => {
			const { client: viemClient } = await getClient()
			return signMessage(viemClient, { message })
		},
		...mutationOptions,
	})
}
