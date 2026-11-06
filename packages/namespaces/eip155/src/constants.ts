import type { Scope } from '@trustwallet/connect-core'

export const EIP155_SCOPE = {
	ID: 'eip155',
	NAME: 'EVM',
	CHAINS: [],
	METHODS: {
		PERSONAL_SIGN: 'personal_sign',
		ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
		ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
		ETH_REQUEST_ACCOUNTS: 'eth_requestAccounts',
		ETH_ACCOUNTS: 'eth_accounts',
		ETH_CHAIN_ID: 'eth_chainId',
		ETH_SEND_TRANSACTION: 'eth_sendTransaction',
		ETH_SIGN_TRANSACTION: 'eth_signTransaction',
		ETH_SEND_RAW_TRANSACTION: 'eth_sendRawTransaction',
	},
	EVENTS: {
		CHAIN_CHANGED: 'chainChanged',
		ACCOUNTS_CHANGED: 'accountsChanged',
		DISCONNECT: 'disconnect',
	},
} as const satisfies Scope

export const EIP155_ICON =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00OCA2NC45NzQxVjgxLjY5MjJMNjguNTc2MiA1Mi43OTk4TDQ4IDY0Ljk3NDFaIiBmaWxsPSIjNDc0RDU3Ii8+CjxwYXRoIGQ9Ik00OCAzOS4xNzY4VjYwLjY5Nkw2OC41NzYyIDQ4LjUyMThMNDggMzkuMTc2OFoiIGZpbGw9IiMwQjBFMTEiLz4KPHBhdGggZD0iTTQ4IDE0LjM5OTlWMzkuMTc3MUw2OC41NzYyIDQ4LjUyMjFMNDggMTQuMzk5OVoiIGZpbGw9IiM0NzRENTciLz4KPHBhdGggZD0iTTQ4IDY0Ljk3NDFWODEuNjkyMkwyNy40MjM4IDUyLjc5OThMNDggNjQuOTc0MVoiIGZpbGw9IiM3NjgwOEYiLz4KPHBhdGggZD0iTTQ4IDM5LjE3NjhWNjAuNjk2TDI3LjQyMzggNDguNTIxOEw0OCAzOS4xNzY4WiIgZmlsbD0iIzFFMjAyNiIvPgo8cGF0aCBkPSJNNDggMTQuMzk5OVYzOS4xNzcxTDI3LjQyMzggNDguNTIyMUw0OCAxNC4zOTk5WiIgZmlsbD0iIzc2ODA4RiIvPgo8L3N2Zz4K'
