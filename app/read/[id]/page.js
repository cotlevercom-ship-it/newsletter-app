'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getSession } from '@/lib/supabase'

export default function ReadPage() {
  const router = useRouter()
  const params = useParams()
  const canvasRef = useRef(null)
  const pdfDocRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [rendering, setRendering] = useState(false)

  // Block right-click and common save/print shortcuts on this page
  useEffect(() => {
    const blockContextMenu = (e) => e.preventDefault()
    const blockKeys = (e) => {
      const k = e.key?.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'p' || k === 'u')) {
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('keydown', blockKeys)
    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const session = await getSession()
      if (!session) {
        router.replace('/')
        return
      }
      try {
        const res = await fetch(`/api/read/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error === 'Active subscription required'
            ? 'পড়তে হলে সক্রিয় সাবস্ক্রিপশন লাগবে'
            : 'লোড করা যায়নি')
          setLoading(false)
          return
        }
        setTitle(data.title)

        const pdfjsLib = await import('pdfjs-dist/build/pdf')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

        const loadingTask = pdfjsLib.getDocument(data.url)
        const pdf = await loadingTask.promise
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)
      } catch (err) {
        console.error(err)
        setError('লোড করতে সমস্যা হয়েছে')
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  const renderPage = useCallback(async (num) => {
    if (!pdfDocRef.current || !canvasRef.current) return
    setRendering(true)
    const page = await pdfDocRef.current.getPage(num)
    const containerWidth = Math.min(window.innerWidth - 32, 800)
    const baseViewport = page.getViewport({ scale: 1 })
    const scale = containerWidth / baseViewport.width
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({ canvasContext: ctx, viewport }).promise
    setRendering(false)
  }, [])

  useEffect(() => {
    if (!loading && pdfDocRef.current) renderPage(pageNum)
  }, [loading, pageNum, renderPage])

  const goPrev = () => setPageNum((p) => Math.max(1, p - 1))
  const goNext = () => setPageNum((p) => Math.min(numPages, p + 1))

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>লোড হচ্ছে...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#c62828', marginBottom: '14px' }}>{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#163a2c', color: 'white', fontSize: '13px', fontWeight: '700' }}
        >
          ড্যাশবোর্ডে ফিরে যাও
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a' }} className="reader-page">
      <div style={{ position: 'sticky', top: 0, background: '#0a0a0a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: 'white', background: 'none', border: 'none', fontSize: '18px' }}>←</button>
        <div style={{ color: 'white', fontSize: '13px', fontWeight: '600', textAlign: 'center', flex: 1, padding: '0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', minWidth: '50px', textAlign: 'right' }}>{pageNum}/{numPages}</div>
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '16px', userSelect: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} style={{ maxWidth: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', opacity: rendering ? 0.6 : 1 }} />
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: '#0a0a0a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <button
          onClick={goPrev}
          disabled={pageNum <= 1}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: pageNum <= 1 ? '#444' : 'white', color: pageNum <= 1 ? '#888' : '#0a0a0a', fontSize: '13px', fontWeight: '700' }}
        >← আগের পাতা</button>
        <button
          onClick={goNext}
          disabled={pageNum >= numPages}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: pageNum >= numPages ? '#444' : 'white', color: pageNum >= numPages ? '#888' : '#0a0a0a', fontSize: '13px', fontWeight: '700' }}
        >পরের পাতা →</button>
      </div>

      <style jsx global>{`
        @media print {
          .reader-page { display: none !important; }
        }
      `}</style>
    </div>
  )
}
