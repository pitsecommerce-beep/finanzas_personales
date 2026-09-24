'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ConversationMessage = {
  role: string
  content: unknown
}

function getSupportedMimeType(): { mimeType: string; ext: string } {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: 'webm' }
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/mp4', ext: 'mp4' },
    { mimeType: 'audio/aac', ext: 'aac' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
    { mimeType: 'audio/wav', ext: 'wav' },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  return { mimeType: '', ext: 'webm' }
}

function AudioWaveform({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!stream || !canvasRef.current) return

    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)

    const canvas = canvasRef.current
    const canvasCtx = canvas.getContext('2d')!
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const barCount = 40

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const step = Math.floor(bufferLength / barCount)
      const current: number[] = []
      for (let i = 0; i < barCount; i++) {
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        current.push(sum / step / 255)
      }

      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      canvasCtx.scale(dpr, dpr)

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      canvasCtx.clearRect(0, 0, w, h)

      const barWidth = 3
      const gap = 2
      const totalWidth = barCount * (barWidth + gap)
      const startX = w - totalWidth

      for (let i = 0; i < barCount; i++) {
        const val = current[i] ?? 0
        const barH = Math.max(2, val * h * 0.9)
        const x = startX + i * (barWidth + gap)
        const y = (h - barH) / 2

        const alpha = 0.3 + val * 0.7
        const xRatio = i / barCount
        const fadeAlpha = xRatio < 0.3 ? xRatio / 0.3 : 1

        canvasCtx.fillStyle = `rgba(20, 184, 166, ${alpha * fadeAlpha})`
        canvasCtx.beginPath()
        canvasCtx.roundRect(x, y, barWidth, barH, 1.5)
        canvasCtx.fill()
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      ctx.close()
    }
  }, [stream])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10"
      style={{ display: 'block' }}
    />
  )
}

export function VoiceEntry() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([])
  const [conversation, setConversation] = useState<ConversationMessage[] | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const audioFormat = useRef(getSupportedMimeType())

  const startRecording = useCallback(async () => {
    try {
      setError('')
      setResponse('')
      setQuestion('')
      setOptions([])
      setActions([])
      setConversation(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMediaStream(stream)

      const format = getSupportedMimeType()
      audioFormat.current = format

      const recorderOptions: MediaRecorderOptions = {}
      if (format.mimeType) recorderOptions.mimeType = format.mimeType

      const recorder = new MediaRecorder(stream, recorderOptions)
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setMediaStream(null)
        const blob = new Blob(chunks.current, {
          type: format.mimeType || 'audio/webm',
        })
        await processAudio(blob)
      }

      recorder.start()
      mediaRecorder.current = recorder
      setRecording(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Permiso de micrófono denegado. Ve a Ajustes > Safari > Micrófono y permite el acceso para este sitio.')
      } else if (msg.includes('NotFoundError')) {
        setError('No se encontró micrófono en este dispositivo.')
      } else {
        setError('No se pudo acceder al micrófono. Verifica los permisos en Ajustes del navegador.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
      setRecording(false)
    }
  }, [])

  async function processAudio(blob: Blob) {
    setProcessing(true)
    setTranscript('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('audio', blob, `audio.${audioFormat.current.ext}`)
      const transcribeRes = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
      if (!transcribeRes.ok) {
        const data = await transcribeRes.json().catch(() => ({}))
        setError(data.error ?? 'Error al transcribir el audio.')
        setProcessing(false)
        return
      }
      const { text } = await transcribeRes.json()
      setTranscript(text)

      await sendToProcess(text, null)
    } catch {
      setError('Error de conexión.')
    }
    setProcessing(false)
  }

  async function sendToProcess(text: string, conv: ConversationMessage[] | null) {
    setProcessing(true)
    setError('')
    try {
      const body: Record<string, unknown> = { text }
      if (conv) body.conversation = conv

      const processRes = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await processRes.json()

      if (!processRes.ok) {
        setError(data.error ?? 'Error al procesar la solicitud.')
        setProcessing(false)
        return
      }

      if (data.question) {
        setQuestion(data.question)
        setOptions(data.options ?? [])
        setConversation(data.conversation)
        setResponse('')
      } else {
        setResponse(data.message)
        setActions(data.actions ?? [])
        setQuestion('')
        setOptions([])
        setConversation(null)
      }
    } catch {
      setError('Error de conexión.')
    }
    setProcessing(false)
  }

  async function handleAnswer(value?: string) {
    const text = value ?? answer.trim()
    if (!text || !conversation) return
    const newConv = [
      ...conversation,
      { role: 'user', content: text },
    ]
    setQuestion('')
    setAnswer('')
    setOptions([])
    await sendToProcess(text, newConv)
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Registro por voz</p>
          <p className="text-xs text-muted">Dicta tu gasto, ingreso o registro</p>
        </div>

        {recording ? (
          <button
            onClick={stopRecording}
            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-danger text-white"
          >
            <span className="absolute inset-0 rounded-full bg-danger/30 animate-ping" />
            <Square size={20} className="relative" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={processing}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white hover:bg-accent/90 transition disabled:opacity-50"
          >
            {processing ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
          </button>
        )}
      </div>

      {recording && (
        <div className="overflow-hidden rounded-lg bg-gray-50 px-2 py-1">
          <AudioWaveform stream={mediaStream} />
        </div>
      )}

      {/* Transcripción omitida: el usuario solo necesita ver la confirmación */}

      {question && (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-sm text-blue-800">{question}</p>
          </div>
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  disabled={processing}
                  className="px-3 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:border-accent hover:text-accent transition disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
                placeholder="Escribe tu respuesta..."
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <Button onClick={() => handleAnswer()} size="sm" disabled={!answer.trim() || processing}>
                <Send size={14} />
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {response && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <p className="text-sm text-green-800">{response}</p>
        </div>
      )}

      {actions.length > 0 && (
        <div className="space-y-1">
          {actions.map((a, i) => (
            <p key={i} className="text-xs text-success">&#10003; {a}</p>
          ))}
        </div>
      )}
    </div>
  )
}
