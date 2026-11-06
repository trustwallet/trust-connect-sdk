import type { EIP155ChainId } from './chain.js'
import type { PersonalSignMethod, PersonalSignParams, PersonalSignResponse } from './methods/personal_sign/index.js'
import type {
	EthSignTypedDataMethod,
	EthSignTypedDataParams,
	EthSignTypedDataResponse,
} from './methods/eth_signTypedData/index.js'
import type {
	EthRequestAccountsMethod,
	EthRequestAccountsParams,
	EthRequestAccountsResponse,
} from './methods/eth_requestAccounts/index.js'
import type { EthAccountsMethod, EthAccountsParams, EthAccountsResponse } from './methods/eth_accounts/index.js'
import type { EthChainIdMethod, EthChainIdParams, EthChainIdResponse } from './methods/eth_chainId/index.js'
import type {
	WalletSwitchEthereumChainMethod,
	WalletSwitchEthereumChainParams,
	WalletSwitchEthereumChainResponse,
} from './methods/wallet_switchEthereumChain/index.js'
import type {
	EthSendTransactionMethod,
	EthSendTransactionParams,
	EthSendTransactionResponse,
} from './methods/eth_sendTransaction/index.js'
import type {
	EthSignTransactionMethod,
	EthSignTransactionParams,
	EthSignTransactionResponse,
} from './methods/eth_signTransaction/index.js'
import type {
	EthSendRawTransactionMethod,
	EthSendRawTransactionParams,
	EthSendRawTransactionResponse,
} from './methods/eth_sendRawTransaction/index.js'

export type EIP155Provider = {
	request<P extends EIP155RequestParams<EIP155RequestArguments>>(args: P): Promise<InferEIP155Response<P>>
}

export type EIP155RequestParams<A> = {
	request: A
	chainId: EIP155ChainId
}

export type InferEIP155Response<P> =
	P extends EIP155RequestParams<infer T> ? (T extends EIP155RequestArguments ? EIP155Response<T> : never) : never

export type EIP155RequestArguments =
	| {
			method: PersonalSignMethod
			params: PersonalSignParams
	  }
	| {
			method: EthSignTypedDataMethod
			params: EthSignTypedDataParams
	  }
	| {
			method: EthRequestAccountsMethod
			params?: EthRequestAccountsParams
	  }
	| {
			method: EthAccountsMethod
			params?: EthAccountsParams
	  }
	| {
			method: EthChainIdMethod
			params?: EthChainIdParams
	  }
	| {
			method: WalletSwitchEthereumChainMethod
			params: WalletSwitchEthereumChainParams
	  }
	| {
			method: EthSendTransactionMethod
			params: EthSendTransactionParams
	  }
	| {
			method: EthSignTransactionMethod
			params: EthSignTransactionParams
	  }
	| {
			method: EthSendRawTransactionMethod
			params: EthSendRawTransactionParams
	  }

export type EIP155Response<T extends EIP155RequestArguments = EIP155RequestArguments> = T extends {
	method: PersonalSignMethod
}
	? PersonalSignResponse
	: T extends { method: EthSignTypedDataMethod }
		? EthSignTypedDataResponse
		: T extends { method: EthRequestAccountsMethod }
			? EthRequestAccountsResponse
			: T extends { method: EthAccountsMethod }
				? EthAccountsResponse
				: T extends { method: EthChainIdMethod }
					? EthChainIdResponse
					: T extends { method: WalletSwitchEthereumChainMethod }
						? WalletSwitchEthereumChainResponse
						: T extends { method: EthSendTransactionMethod }
							? EthSendTransactionResponse
							: T extends { method: EthSignTransactionMethod }
								? EthSignTransactionResponse
								: T extends { method: EthSendRawTransactionMethod }
									? EthSendRawTransactionResponse
									: never
