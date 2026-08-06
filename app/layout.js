export const metadata = {
  title: 'Kuporamorso — কুপরামর্শ',
  description: 'Paid Bangla newsletter, e-book & e-paper subscription',
}

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
