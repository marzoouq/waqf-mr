/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

interface ReauthenticationEmailProps {
  siteName?: string
  siteUrl?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName = 'وقف مرزوق بن علي الثبيتي',
  siteUrl = 'https://waqf-wise.net',
  token,
}: ReauthenticationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رمز التحقق — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={FALLBACK_LOGO} alt={siteName} width="64" height="64" style={logo} />
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>تأكيد إعادة المصادقة</Heading>
        <Text style={text}>
          استخدم الرمز التالي لتأكيد هويتك:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          ينتهي صلاحية الرمز خلال دقائق. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.
        </Text>
        <Hr style={divider} />
        <Text style={legal}>
          {siteName} — رسالة آمنة من <a href={siteUrl} style={link}>waqf-wise.net</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '8px 0 16px' }
const logo = { display: 'inline-block', borderRadius: '12px' }
const brand = { fontSize: '18px', color: 'hsl(158, 64%, 25%)', margin: '12px 0 0', fontWeight: 'bold' as const }
const divider = { borderColor: 'hsl(40, 20%, 88%)', margin: '16px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(150, 30%, 15%)', margin: '0 0 20px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: 'hsl(150, 15%, 35%)', lineHeight: '1.7', margin: '0 0 16px', textAlign: 'right' as const }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: 'hsl(158, 64%, 25%)',
  letterSpacing: '8px',
  textAlign: 'center' as const,
  backgroundColor: 'hsl(158, 45%, 96%)',
  padding: '20px',
  borderRadius: '12px',
  margin: '24px 0',
}
const footer = { fontSize: '13px', color: 'hsl(150, 15%, 50%)', margin: '24px 0 0', textAlign: 'right' as const }
const legal = { fontSize: '11px', color: 'hsl(150, 15%, 60%)', textAlign: 'center' as const, margin: '8px 0 0' }
const link = { color: 'hsl(43, 74%, 40%)', textDecoration: 'none' }
