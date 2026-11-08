import { useEffect, useState, type ComponentType, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useConnect } from '@trustwallet/connect-headless'
import { isMobile } from '@trustwallet/connect-utils'
import { useTrustModal } from '../context/TrustModalContext.js'
import { useAnimateTransition } from '../hooks/useAnimateTransition.js'

interface ViewConfig {
	title: string
	tag: string
	node: ComponentType
}

interface TrustModalLogicProps {
	layout: {
		overlay: ComponentType<{
			onClick: () => void
			children: React.ReactNode
		}>
		wrapper: ComponentType<{
			onClick: (event: ReactMouseEvent<HTMLDivElement>) => void
			children: React.ReactNode
			wrapperRef?: React.RefObject<HTMLDivElement | null>
		}>
		header: ComponentType<{
			title: string
			showBack?: boolean
			onBack?: () => void
			onClose: () => void
		}>
		body: ComponentType<{
			children: React.ReactNode
			bodyRef?: React.RefObject<HTMLDivElement | null>
		}>
		error: ComponentType<{
			message: string
		}>
	}
	views: ViewConfig[]
	mobileViews: ViewConfig[]
}

export function TrustModalLogic({ layout, views, mobileViews }: TrustModalLogicProps) {
	const { overlay: Overlay, wrapper: Wrapper, header: Header, body: Body, error: Error } = layout
	const { isOpen, view, close, goBack, setNamespaceFilter, setTargetWallet, modalType } = useTrustModal()
	const [isMobileDevice] = useState(() => isMobile())
	const { abortConnect, error, isLoading } = useConnect()
	const { bodyRef, wrapperRef } = useAnimateTransition({ dependencyList: [view, isOpen] })

	const activeViews = isMobileDevice ? mobileViews : views
	const currentView = activeViews.find((v) => v.tag === view)
	const headerTitle = currentView?.title!

	const mainView = modalType === 'wallet' || isMobileDevice ? 'wallets' : 'networks'
	const showBack = view !== mainView && modalType !== 'namespace'

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				close()
			}
		}
		if (isOpen) {
			window.addEventListener('keydown', handler)
		}
		return () => window.removeEventListener('keydown', handler)
	}, [isOpen, close])

	useEffect(() => {
		if (!isOpen) {
			setTargetWallet(null)
			setNamespaceFilter(undefined)
			if (isLoading) abortConnect()
		}
	}, [isOpen, abortConnect, setTargetWallet, setNamespaceFilter])

	if (!isOpen) return null

	return createPortal(
		<Overlay onClick={close}>
			<Wrapper onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()} wrapperRef={wrapperRef}>
				<Header title={headerTitle} showBack={showBack} onBack={goBack} onClose={close} />

				<Body bodyRef={bodyRef}>
					{activeViews.map((viewConfig) => {
						if (view === viewConfig.tag) {
							const ViewComponent = viewConfig.node
							return <ViewComponent key={viewConfig.tag} />
						}
						return null
					})}

					{!isMobileDevice && error && <Error message={error.message} />}
				</Body>
			</Wrapper>
		</Overlay>,
		document.body,
	)
}
