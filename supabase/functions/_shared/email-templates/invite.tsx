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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Rollout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={flagUrl} alt="Rollout" style={flag} />
        <Heading style={h1}>It's time to get organized.</Heading>
        <Text style={text}>
          You've been invited to join a team on Rollout. Click the button below to create and verify your Rollout account and begin creating and assigning tasks.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Join Team
        </Button>
        <Text style={{ ...mutedText, marginTop: '24px' }}>
          If you weren't expecting this, you can safely ignore this email.
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

export default InviteEmail
