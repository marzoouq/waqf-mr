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
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>إعادة تعيين كلمة المرور — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://nuzdeamtujezrsxbvpfi.supabase.co/storage/v1/object/public/waqf-assets/email-logo.png?v=1"
          alt="شعار نظام إدارة الوقف"
          width="80"
          style={logo}
        />
        <Heading style={h1}>إعادة تعيين كلمة المرور</Heading>
        <Text style={text}>
          وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في {siteName}. اضغط على الزر أدناه لاختيار كلمة مرور جديدة.
        </Text>
        <Button style={button} href={confirmationUrl}>
          إعادة تعيين كلمة المرور
        </Button>
        <Text style={footer}>
          إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا البريد. لن يتم تغيير كلمة المرور.
        </Text>
        <Text style={divider}>❖</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Tajawal', 'Segoe UI', Tahoma, sans-serif" }
const container = { padding: '30px 25px', textAlign: 'center' as const }
const logo = { margin: '0 auto 20px', borderRadius: '12px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(150, 30%, 15%)',
  margin: '0 0 20px',
  fontFamily: "'Amiri', 'Times New Roman', serif",
}
const text = {
  fontSize: '15px',
  color: 'hsl(150, 15%, 45%)',
  lineHeight: '1.7',
  margin: '0 0 20px',
  textAlign: 'right' as const,
}
const button = {
  backgroundColor: 'hsl(158, 64%, 25%)',
  color: 'hsl(40, 30%, 98%)',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0', textAlign: 'right' as const }
const divider = { fontSize: '18px', color: 'hsl(43, 74%, 49%)', margin: '16px 0 0', letterSpacing: '4px' }
