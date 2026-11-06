import type { NamespaceId, Scope } from '@trustwallet/connect-core'
import type { SignClient } from '@walletconnect/sign-client'

export type SignClientMetadata = {
	name: string
	description: string
	url: string
	icons: string[]
}

export type SignClientInstance = Awaited<ReturnType<(typeof SignClient)['init']>>

export type WalletConnectOptions = {
	projectId: string
	metadata?: SignClientMetadata
}

export type WalletConnectServiceOptions = {
	scopes: Map<NamespaceId, Scope>
	signClientPromise: Promise<SignClientInstance>
} & WalletConnectOptions
