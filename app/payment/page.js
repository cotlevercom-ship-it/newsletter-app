'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getSession, getMySubscription } from '@/lib/supabase'

const BKASH_NUMBER = '01813888860'
const AMOUNT = 1000

export default function PaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [txId, setTxId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function init() {
      const s = await getSession()
      if (!s) {
        router.replace('/')
        return
      }
      setSession(s)
      const sub = await getMySubscription()
      if (sub && sub.status === 'pending') setDone(true)
      setLoading(false)
    }
    init()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!txId.trim()) {
      setError('বিকাশ ট্রানজেকশন আইডি লিখুন')
      return
    }
    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('subscriptions').insert({
        user_id: session.user.id,
        status: 'pending',
        transaction_id: txId.trim(),
        bkash_number: BKASH_NUMBER,
        amount: AMOUNT,
      })
      if (insertError) throw insertError
      setDone(true)
    } catch (err) {
      console.error(err)
      setError('সাবমিট করতে সমস্যা হয়েছে, আবার চেষ্টা করুন')
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>লোড হচ্ছে...</div>
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '14px', padding: '32px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '19px', fontWeight: '800', color: '#163a2c', marginBottom: '18px', textAlign: 'center' }}>
          সাবস্ক্রিপশন পেমেন্ট
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
              তোমার পেমেন্ট রিভিউয়ের জন্য জমা হয়েছে। অ্যাডমিন যাচাই করার পর তোমার সাবস্ক্রিপশন চালু হয়ে যাবে।
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ marginTop: '14px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#163a2c', color: 'white', fontSize: '13px', fontWeight: '700' }}
            >
              ড্যাশবোর্ডে যাও
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: '#fdf6e8', border: '1px solid #f4a300', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.8' }}>
                <strong>১.</strong> বিকাশে "Send Money" করে <strong>৳{AMOUNT}</strong> পাঠাও এই নাম্বারে:
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#e2136e', margin: '8px 0', letterSpacing: '0.5px' }}>
                  {BKASH_NUMBER}
                </div>
                <strong>২.</strong> Transaction ID (TxID) কপি করে নিচে বসাও
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                বিকাশ Transaction ID
              </label>
              <input
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="e.g. 8N7A6B5C4D"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '14px' }}
              />
              {error && <div style={{ color: '#c62828', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: submitting ? '#9ca3af' : '#163a2c', color: 'white', fontSize: '14px', fontWeight: '700' }}
              >
                {submitting ? 'সাবমিট হচ্ছে...' : 'সাবমিট করো'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
