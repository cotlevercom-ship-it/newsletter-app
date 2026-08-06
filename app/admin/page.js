'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getSession, getMyProfile } from '@/lib/supabase'

const emptyPubForm = { title: '', description: '', type: 'ebook', file: null, cover: null }

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [pendingSubs, setPendingSubs] = useState([])
  const [actingId, setActingId] = useState(null)

  const [publications, setPublications] = useState([])
  const [pubForm, setPubForm] = useState(emptyPubForm)
  const [uploading, setUploading] = useState(false)
  const [pubError, setPubError] = useState('')
  const [deletingPubId, setDeletingPubId] = useState(null)

  useEffect(() => {
    async function init() {
      const session = await getSession()
      if (!session) {
        router.replace('/')
        return
      }
      const profile = await getMyProfile()
      if (!profile?.is_admin) {
        router.replace('/dashboard')
        return
      }
      setIsAdmin(true)
      await Promise.all([loadPendingSubs(), loadPublications()])
      setLoading(false)
    }
    init()
  }, [router])

  async function loadPendingSubs() {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, profiles(email)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
    setPendingSubs(data || [])
  }

  async function loadPublications() {
    const { data } = await supabase
      .from('publications')
      .select('*')
      .order('created_at', { ascending: false })
    setPublications(data || [])
  }

  const approve = async (sub) => {
    setActingId(sub.id)
    const nextBilling = new Date()
    nextBilling.setMonth(nextBilling.getMonth() + 1)
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        verified_at: new Date().toISOString(),
        next_billing_date: nextBilling.toISOString().slice(0, 10),
      })
      .eq('id', sub.id)
    await loadPendingSubs()
    setActingId(null)
  }

  const reject = async (sub) => {
    setActingId(sub.id)
    await supabase
      .from('subscriptions')
      .update({ status: 'rejected', verified_at: new Date().toISOString() })
      .eq('id', sub.id)
    await loadPendingSubs()
    setActingId(null)
  }

  const handlePubSubmit = async (e) => {
    e.preventDefault()
    setPubError('')
    if (!pubForm.title.trim()) { setPubError('টাইটেল লিখুন'); return }
    if (!pubForm.file) { setPubError('PDF ফাইল বেছে নিন'); return }

    setUploading(true)
    try {
      const fileExt = pubForm.file.name.split('.').pop()
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('publications')
        .upload(filePath, pubForm.file, { contentType: 'application/pdf' })
      if (uploadError) throw uploadError

      let coverUrl = null
      if (pubForm.cover) {
        const coverExt = pubForm.cover.name.split('.').pop()
        const coverPath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${coverExt}`
        const { error: coverError } = await supabase.storage.from('covers').upload(coverPath, pubForm.cover)
        if (coverError) throw coverError
        const { data: pub } = supabase.storage.from('covers').getPublicUrl(coverPath)
        coverUrl = pub.publicUrl
      }

      const { error: insertError } = await supabase.from('publications').insert({
        title: pubForm.title.trim(),
        description: pubForm.description.trim() || null,
        type: pubForm.type,
        file_path: filePath,
        cover_url: coverUrl,
      })
      if (insertError) throw insertError

      setPubForm(emptyPubForm)
      await loadPublications()
    } catch (err) {
      console.error(err)
      setPubError('আপলোড করতে সমস্যা হয়েছে')
    }
    setUploading(false)
  }

  const deletePublication = async (pub) => {
    if (!confirm(`"${pub.title}" ডিলিট করবে?`)) return
    setDeletingPubId(pub.id)
    try {
      await supabase.storage.from('publications').remove([pub.file_path])
      await supabase.from('publications').delete().eq('id', pub.id)
      await loadPublications()
    } catch (err) {
      console.error(err)
    }
    setDeletingPubId(null)
  }

  if (loading || !isAdmin) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>লোড হচ্ছে...</div>
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px', fontWeight: '600' }

  return (
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#163a2c', marginBottom: '20px' }}>Admin</div>

        {/* Pending payments */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#163a2c', marginBottom: '10px' }}>
            পেন্ডিং পেমেন্ট ({pendingSubs.length})
          </div>
          {pendingSubs.length === 0 ? (
            <div style={{ color: '#999', fontSize: '13px', background: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              কোনো পেন্ডিং পেমেন্ট নেই
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
              {pendingSubs.map((sub, i) => (
                <div key={sub.id} style={{ padding: '14px 16px', borderBottom: i < pendingSubs.length - 1 ? '1px solid #eee' : 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{sub.profiles?.email}</div>
                  <div style={{ fontSize: '12px', color: '#888', margin: '4px 0 10px' }}>
                    TxID: <strong>{sub.transaction_id}</strong> · ৳{sub.amount}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => approve(sub)}
                      disabled={actingId === sub.id}
                      style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#2d6a4f', color: 'white', fontSize: '12px', fontWeight: '600' }}
                    >Approve</button>
                    <button
                      onClick={() => reject(sub)}
                      disabled={actingId === sub.id}
                      style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#c62828', color: 'white', fontSize: '12px', fontWeight: '600' }}
                    >Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publications */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#163a2c', marginBottom: '10px' }}>
            E-book / E-paper আপলোড
          </div>

          <form onSubmit={handlePubSubmit} style={{ background: 'white', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>টাইটেল *</label>
              <input style={inputStyle} value={pubForm.title} onChange={(e) => setPubForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>টাইপ</label>
                <select style={inputStyle} value={pubForm.type} onChange={(e) => setPubForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="ebook">ই-বুক</option>
                  <option value="epaper">ই-পেপার</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>PDF ফাইল *</label>
                <input type="file" accept="application/pdf" onChange={(e) => setPubForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} style={{ fontSize: '12px' }} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>কভার ছবি (ঐচ্ছিক)</label>
              <input type="file" accept="image/*" onChange={(e) => setPubForm((f) => ({ ...f, cover: e.target.files?.[0] || null }))} style={{ fontSize: '12px' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>বিবরণ (ঐচ্ছিক)</label>
              <textarea rows={2} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'none' }} value={pubForm.description} onChange={(e) => setPubForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            {pubError && <div style={{ color: '#c62828', fontSize: '13px', marginBottom: '10px' }}>{pubError}</div>}
            <button
              type="submit"
              disabled={uploading}
              style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: uploading ? '#9ca3af' : '#163a2c', color: 'white', fontSize: '13px', fontWeight: '700' }}
            >
              {uploading ? 'আপলোড হচ্ছে...' : '+ আপলোড করো'}
            </button>
          </form>

          {publications.length === 0 ? (
            <div style={{ color: '#999', fontSize: '13px', background: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              এখনো কিছু আপলোড হয়নি
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
              {publications.map((pub, i) => (
                <div key={pub.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < publications.length - 1 ? '1px solid #eee' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{pub.title}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{pub.type === 'epaper' ? 'ই-পেপার' : 'ই-বুক'} · {pub.published_date}</div>
                  </div>
                  <button
                    onClick={() => deletePublication(pub)}
                    disabled={deletingPubId === pub.id}
                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ffebee', color: '#c62828', fontSize: '12px', fontWeight: '600' }}
                  >{deletingPubId === pub.id ? '...' : 'Delete'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
