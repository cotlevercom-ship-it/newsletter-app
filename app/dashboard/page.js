'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getSession, getMySubscription, signOut } from '@/lib/supabase'

const STATUS_LABEL = {
  pending: { text: 'রিভিউ হচ্ছে', color: '#f4a300', bg: '#fdf6e8' },
  active: { text: 'সক্রিয়', color: '#2d6a4f', bg: '#eaf6ee' },
  expired: { text: 'মেয়াদ শেষ', color: '#c62828', bg: '#fdecea' },
  rejected: { text: 'বাতিল হয়েছে', color: '#c62828', bg: '#fdecea' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [publications, setPublications] = useState([])

  useEffect(() => {
    async function init() {
      const session = await getSession()
      if (!session) {
        router.replace('/')
        return
      }
      setEmail(session.user.email)
      const sub = await getMySubscription()
      setSubscription(sub)

      if (sub?.status === 'active') {
        const { data } = await supabase
          .from('publications')
          .select('*')
          .order('published_date', { ascending: false })
        setPublications(data || [])
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await signOut()
    router.replace('/')
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>লোড হচ্ছে...</div>
  }

  const statusInfo = subscription ? STATUS_LABEL[subscription.status] : null

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '19px', fontWeight: '800', color: '#163a2c' }}>কুপরামর্শ</div>
          <button onClick={handleLogout} style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            লগআউট
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>{email}</div>

          {!subscription ? (
            <>
              <div style={{ fontSize: '14px', color: '#333', margin: '10px 0 16px' }}>
                তুমি এখনো সাবস্ক্রাইব করোনি।
              </div>
              <button
                onClick={() => router.push('/payment')}
                style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#163a2c', color: 'white', fontSize: '13px', fontWeight: '700' }}
              >
                সাবস্ক্রাইব করো — ৳১০০০/মাস
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: statusInfo.color, background: statusInfo.bg, margin: '6px 0 10px' }}>
                {statusInfo.text}
              </div>
              {subscription.status === 'pending' && (
                <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                  Transaction ID: <strong>{subscription.transaction_id}</strong><br />
                  অ্যাডমিন যাচাই করলেই সাবস্ক্রিপশন চালু হয়ে যাবে।
                </div>
              )}
              {subscription.status === 'active' && subscription.next_billing_date && (
                <div style={{ fontSize: '13px', color: '#666' }}>
                  পরবর্তী রিনিউ: {subscription.next_billing_date}
                </div>
              )}
              {(subscription.status === 'expired' || subscription.status === 'rejected') && (
                <button
                  onClick={() => router.push('/payment')}
                  style={{ marginTop: '10px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#163a2c', color: 'white', fontSize: '13px', fontWeight: '700' }}
                >
                  আবার সাবস্ক্রাইব করো
                </button>
              )}
            </>
          )}
        </div>

        {subscription?.status === 'active' && (
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#163a2c', marginBottom: '12px' }}>
              E-book ও E-paper
            </div>
            {publications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#999', background: 'white', borderRadius: '12px' }}>
                এখনো কিছু আপলোড হয়নি
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '14px' }}>
                {publications.map((pub) => (
                  <div
                    key={pub.id}
                    onClick={() => router.push(`/read/${pub.id}`)}
                    style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  >
                    <div style={{ aspectRatio: '3 / 4', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
                      {pub.cover_url ? (
                        <img src={pub.cover_url} alt={pub.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (pub.type === 'epaper' ? '📰' : '📖')}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a', lineHeight: '1.4' }}>{pub.title}</div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>
                        {pub.type === 'epaper' ? 'ই-পেপার' : 'ই-বুক'} · {pub.published_date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
