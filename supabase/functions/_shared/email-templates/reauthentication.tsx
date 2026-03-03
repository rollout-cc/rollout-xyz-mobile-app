/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

import { main, container, flag, h1, text, mutedText, divider, footerText, footerLink, wordmark, flagUrl, wordmarkUrl } from './_styles.ts'

interface ReauthenticationEmailProps {
  token: string
}

const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '32px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 24px', letterSpacing: '6px' }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for Rollout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={flagUrl} alt="Rollout" style={flag} />
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={mutedText}>
          This code will expire shortly. If you didn't request this, you can safely ignore it.
        </Text>
        <Hr style={divider} />
        <Text style={footerText}>
          For any questions or issues please email <a href="mailto:support@rollout.cc" style={footerLink}>support@rollout.cc</a>
        </Text>
        <Img src={wordmarkUrl} alt="ROLLOUT" style={wordmark} />
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
