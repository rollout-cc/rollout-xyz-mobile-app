// Shared email styles — flat beige design matching Rollout brand
export const flagUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-flag.svg'
export const wordmarkUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-logo.png'

export const main = { backgroundColor: '#ffffff', fontFamily: 'Switzer, Arial, Helvetica, sans-serif' }
export const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#e8e4dc', padding: '48px 40px' }
export const flag = { height: '40px', marginBottom: '24px' }
export const h1 = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 16px', lineHeight: '1.2' }
export const h2 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '32px 0 16px', lineHeight: '1.3' }
export const text = { fontSize: '16px', color: '#0d0d0d', lineHeight: '1.5', margin: '0 0 24px' }
export const mutedText = { fontSize: '16px', color: '#666666', lineHeight: '1.5', margin: '0 0 24px' }
export const boldText = { ...text, fontWeight: 'bold' as const }
export const button = { backgroundColor: '#0d0d0d', color: '#f2ead9', fontSize: '15px', fontWeight: '600' as const, borderRadius: '9999px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }
export const divider = { borderTop: '1px solid #c4c0b8', margin: '32px 0' }
export const footerText = { fontSize: '14px', color: '#666666', lineHeight: '1.5', margin: '0 0 8px' }
export const footerLink = { color: '#0d0d0d', fontWeight: 'bold' as const, textDecoration: 'none' }
export const wordmark = { height: '32px', marginTop: '24px' }
export const card = { backgroundColor: '#d5d0c8', borderRadius: '8px', padding: '16px 20px', margin: '0 0 24px' }
export const cardLabel = { fontSize: '13px', color: '#737373', margin: '0 0 4px', lineHeight: '1.3' }
export const cardTitle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0', lineHeight: '1.3' }
export const cardDate = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0', textAlign: 'right' as const }
export const cardDateLabel = { fontSize: '13px', color: '#737373', margin: '0 0 4px', textAlign: 'right' as const, lineHeight: '1.3' }
export const badge = (color: string) => ({ backgroundColor: color, color: '#ffffff', fontSize: '12px', fontWeight: 'bold' as const, borderRadius: '4px', padding: '2px 8px', display: 'inline-block' })
