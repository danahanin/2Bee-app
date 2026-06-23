import { useState } from 'react'
import HiveCard from '../design-system/HiveCard.jsx'
import Hexagon from '../design-system/Hexagon.jsx'
import HexButton from '../design-system/HexButton.jsx'
import { useAssistantChat } from '../../hooks/useAssistantChat.js'

function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-[var(--honey-400)] to-[var(--honey-600)] text-white'
            : 'border border-[rgba(61,41,20,0.1)] bg-white text-[var(--brown-text)]'
        }`}
      >
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
            {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        ))}
      </div>
    </div>
  )
}

function CompactChatAssistant({ hiveId }) {
  const { messages, isTyping, sendMessage, suggestedPrompts } = useAssistantChat({ hiveId })
  const [input, setInput] = useState('')
  const recentMessages = messages.slice(-6)

  function handleSubmit(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    sendMessage(text)
  }

  return (
    <HiveCard className="mx-auto max-w-2xl border border-[rgba(61,41,20,0.08)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Hexagon size={28} variant="glow" />
        <div>
          <p className="hive-title text-sm">Ask 2bee AI</p>
          <p className="text-xs text-[var(--brown-muted)]">Need more help?</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {suggestedPrompts.slice(0, 3).map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => sendMessage(prompt.label, prompt.intent)}
            className="rounded-full border border-[rgba(61,41,20,0.1)] bg-[var(--honey-50)] px-3 py-1 text-[11px] font-medium text-[var(--brown-text)] transition hover:bg-[var(--honey-100)]"
          >
            {prompt.label}
          </button>
        ))}
      </div>

      <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
        {recentMessages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isTyping ? (
          <p className="text-xs text-[var(--brown-muted)]">Thinking...</p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-[rgba(61,41,20,0.08)] pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          className="hive-input flex-1 text-sm"
        />
        <HexButton type="submit" size="sm" disabled={isTyping || !input.trim()}>
          <span>Send</span>
        </HexButton>
      </form>
    </HiveCard>
  )
}

export default CompactChatAssistant
