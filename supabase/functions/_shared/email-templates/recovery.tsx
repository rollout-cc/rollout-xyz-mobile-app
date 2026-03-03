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
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

import { main, container, flag, h1, text, boldText, mutedText, button, divider, footerText, footerLink, wordmark, flagUrl, wordmarkUrl } from './_styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for Rollout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={flagUrl} alt="Rollout" style={flag} />
        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={text}>
          Someone recently requested a password change for your Rollout account. If this was you, you can set a new password here:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={{ ...boldText, marginTop: '24px' }}>
          If you don't want to change your password or didn't request this, just ignore and delete this message.
        </Text>
        <Text style={mutedText}>
          To keep your account secure, please don't forward this email to anyone.
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

export default RecoveryEmail
