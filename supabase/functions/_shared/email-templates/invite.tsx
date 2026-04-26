/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { FALLBACK_LOGO } from '../email-constants.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>دعوة للانضمام إلى {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={FALLBACK_LOGO} alt={siteName} width="64" height="64" style={logo} />
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>دعوة للانضمام</Heading>
        <Text style={text}>
          تمت دعوتك ({recipient}) للانضمام إلى منصة {siteName}.
        </Text>
        <Text style={text}>
          اضغط الزر أدناه لقبول الدعوة وإكمال إعداد حسابك:
        </Text>
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            قبول الدعوة
          </Button>
        </Section>
        <Text style={footer}>
          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة.
        </Text>
        <Hr style={divider} />
        <Text style={legal}>
          {siteName} — رسالة رسمية من <a href={siteUrl} style={link}>waqf-wise.net</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '8px 0 16px' }
const logo = { display: 'inline-block', borderRadius: '12px' }
const brand = { fontSize: '18px', color: 'hsl(158, 64%, 25%)', margin: '12px 0 0', fontWeight: 'bold' as const }
const divider = { borderColor: 'hsl(40, 20%, 88%)', margin: '16px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(150, 30%, 15%)', margin: '0 0 20px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(150, 15%, 35%)', lineHeight: '1.7', margin: '0 0 16px', textAlign: 'right' as const }
const button = {
  backgroundColor: 'hsl(158, 64%, 25%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: 'hsl(150, 15%, 50%)', margin: '24px 0 0', textAlign: 'right' as const }
const legal = { fontSize: '11px', color: 'hsl(150, 15%, 60%)', textAlign: 'center' as const, margin: '8px 0 0' }
const link = { color: 'hsl(43, 74%, 40%)', textDecoration: 'none' }
