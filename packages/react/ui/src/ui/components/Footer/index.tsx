import { FooterLogic } from '@trustwallet/connect-ui-logic'
import { FooterWrapper } from './components/FooterWrapper/index.js'
import { FooterDescription } from './components/FooterDescription/index.js'
import { FooterLink } from './components/FooterLink/index.js'

export function Footer() {
	return (
		<FooterLogic
			components={{
				wrapper: FooterWrapper,
				description: FooterDescription,
				link: FooterLink,
			}}
		/>
	)
}
