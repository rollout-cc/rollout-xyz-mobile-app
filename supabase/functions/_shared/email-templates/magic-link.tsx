/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

import { main, container, flag, h1, text, mutedText, button, divider, footerText, footerLink, wordmark, flagUrl, wordmarkUrl } from './_styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for Rollout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={flagUrl} alt="Rollout" style={flag} />
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click below to sign in to Rollout. This link will expire shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Sign In
        </Button>
        <Text style={{ ...mutedText, marginTop: '24px' }}>
          If you didn't request this link, you can safely ignore this email.
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

export default MagicLinkEmail
