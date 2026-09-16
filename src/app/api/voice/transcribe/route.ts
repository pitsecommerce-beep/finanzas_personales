import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 })
  }

  const formData = await request.formData()
  const audio = formData.get('audio') as Blob | null
  if (!audio) {
    return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })
  }

  const whisperForm = new FormData()
  whisperForm.append('file', audio, 'audio.webm')
  whisperForm.append('model', 'whisper-1')
  whisperForm.append('language', 'es')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: whisperForm,
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn('[Nummo] Whisper error:', err)
    return NextResponse.json({ error: 'Error al transcribir' }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json({ text: data.text })
}
