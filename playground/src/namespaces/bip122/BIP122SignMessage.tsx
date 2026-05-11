import { useConnection } from '@trustwallet/connect-react'
import { ActionCard } from '../../components/ActionCard'
import { useSignMessage } from '@trustwallet/connect-bip122-react'

export function BIP122SignMessage() {
	const { isConnected } = useConnection({ namespaceId: 'bip122' })

	const { mutate: sign, data: signature, isPending, isSuccess, isError, error } = useSignMessage()

	const handleSign = () => {
		if (!isConnected) return
		sign({
			message: 'Hello from TrustConnect SDK!',
			protocol: 'ecdsa',
		})
	}

	return (
		<ActionCard
			eyebrow="Signature"
			title="Sign Message"
			copy="Test message signing with your connected Bitcoin wallet."
		>
			<button className="btn btn-primary" onClick={handleSign} disabled={isPending || !isConnected}>
				{isPending ? 'Signing...' : 'Sign Message'}
			</button>

			{isPending && (
				<div className="status-message pending">
					<span className="spinner"></span>
					Signing message...
				</div>
			)}

			{isSuccess && signature && (
				<div className="status-message success">
					Message successfully signed!
					<details className="signature-details">
						<summary>View Signature</summary>
						<code>{signature.signature}</code>
					</details>
				</div>
			)}

			{isError && <div className="status-message error">Error: {error?.message}</div>}
		</ActionCard>
	)
}
