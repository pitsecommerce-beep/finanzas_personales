'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ConversationMessage = {
  role: string
  content: unknown
}

export function VoiceEntry() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [conversation, setConversation] = useState<ConversationMessage[] | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        await processAudio(blob)
      }

      recorder.start()
      mediaRecorder.current = recorder
      setRecording(true)
      setResponse('')
      setQuestion('')
      setActions([])
      setConversation(null)
    } catch {
      setResponse('No se pudo acceder al micrófono. Verifica los permisos.')
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

    try {
      const formData = new FormData()
      formData.append('audio', blob)
      const transcribeRes = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
      if (!transcribeRes.ok) {
        setResponse('Error al transcribir el audio.')
        setProcessing(false)
        return
      }
      const { text } = await transcribeRes.json()
      setTranscript(text)

      await sendToProcess(text, null)
    } catch {
      setResponse('Error de conexión.')
    }
    setProcessing(false)
  }

  async function sendToProcess(text: string, conv: ConversationMessage[] | null) {
    setProcessing(true)
    try {
      const body: Record<string, unknown> = { text }
      if (conv) body.conversation = conv

      const processRes = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!processRes.ok) {
        setResponse('Error al procesar la solicitud.')
        setProcessing(false)
        return
      }

      const data = await processRes.json()

      if (data.question) {
        setQuestion(data.question)
        setConversation(data.conversation)
        setResponse('')
      } else {
        setResponse(data.message)
        setActions(data.actions ?? [])
        setQuestion('')
        setConversation(null)
      }
    } catch {
      setResponse('Error de conexión.')
    }
    setProcessing(false)
  }

  async function handleAnswer() {
    if (!answer.trim() || !conversation) return
    const newConv = [
      ...conversation,
      { role: 'user', content: answer },
    ]
    setQuestion('')
    setAnswer('')
    await sendToProcess(answer, newConv)
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
            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-danger text-white animate-pulse"
          >
            <Square size={20} />
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

      {transcript && (
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-muted mb-0.5">Transcripción</p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      {question && (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-sm text-blue-800">{question}</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
              placeholder="Escribe tu respuesta..."
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <Button onClick={handleAnswer} size="sm" disabled={!answer.trim() || processing}>
              <Send size={14} />
            </Button>
          </div>
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
