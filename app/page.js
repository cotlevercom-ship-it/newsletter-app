'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, sendMagicLink, getSession } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSession().then((session) => {
      if (session) router.replace('/dashboard')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard')
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('ইমেইল লিখুন')
      return
    }
    setSending(true)
    try {
      await sendMagicLink(email.trim())
      setSent(true)
    } catch (err) {
      console.error(err)
      setError('লিংক পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন')
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '14px', padding: '32px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#163a2c' }}>কুপরামর্শ</div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Bangla Newsletter · E-book · E-paper</div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📩</div>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
              <strong>{email}</strong> এ একটা লগইন লিংক পাঠানো হয়েছে।
              ইমেইল চেক করে লিংকে ক্লিক করুন।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              ইমেইল দিয়ে লগইন / সাইনআপ করুন
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            {error && <div style={{ color: '#c62828', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            <button
              type="submit"
              disabled={sending}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: sending ? '#9ca3af' : '#163a2c', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              {sending ? 'পাঠানো হচ্ছে...' : 'লগইন লিংক পাঠান'}
            </button>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '14px', textAlign: 'center' }}>
              কোনো পাসওয়ার্ড লাগবে না — ইমেইলে একটা লিংক পাবেন
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
