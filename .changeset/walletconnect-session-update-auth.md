---
"@trustwallet/connect-walletconnect": patch
---

Require WalletConnect sign-client 2.23.10 so a non-controller peer cannot rewrite session namespaces, and ignore account or chain events that are not already in the approved session.
