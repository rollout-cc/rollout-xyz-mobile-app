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

import { main, container, flag, h1, text, boldText, mutedText, button, divider, footerText, footerLink, wordmark, flagUrl, wordmarkUrl } from './_styles.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for Rollout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={flagUrl} alt="Rollout" style={flag} />
        <Heading style={h1}>Update Your Email</Heading>
        <Text style={text}>
          Please click the link below to confirm your new email address.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email
        </Button>
        <Text style={{ ...boldText, marginTop: '24px' }}>
          If you don't want to change your email or didn't request this, just ignore and delete this message.
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

export default EmailChangeEmail
