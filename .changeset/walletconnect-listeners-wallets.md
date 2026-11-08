---
"@trustwallet/connect-core": patch
"@trustwallet/connect-eip155-core": patch
"@trustwallet/connect-walletconnect": patch
---

Keep WalletConnect account and chain updates on the namespace connection, apply wallet_switchEthereumChain to the stored chain, remove EIP-155 listeners with stable handlers, and dedupe namespace wallet lists by id.
