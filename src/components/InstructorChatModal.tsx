import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, MessageSquare, Bot, User, RefreshCw, Volume2, Pause, GraduationCap, Globe2 } from 'lucide-react';
import { Lesson } from '../types';
import { maestroVoice } from '../lib/speech';

interface InstructorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLesson?: Lesson;
  userLevel: string;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'maestro';
  text: string;
}

const QUICK_QUESTIONS = [
  "¿Cómo puedo relajar los hombros y muñecas?",
  "¿Por qué el Do central es tan importante?",
  "¿Cómo memorizo los intervalos de las escalas?",
  "¿Qué hago si mi mano izquierda se copia de la derecha?",
  "Explícame el Círculo de Quintas de forma sencilla"
];

export const InstructorChatModal: React.FC<InstructorChatModalProps> = ({
  isOpen,
  onClose,
  currentLesson,
  userLevel,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'maestro',
      text: `¡Hola che! Soy el Maestro Aurelio, tu instructor de piano desde Montevideo. Estoy acá para acompañarte de cero a cien, paso a pasito y sin apuros. Ahora estás en la lección "${currentLesson?.title || 'Fundamentos'}". Decime, ¿qué duda técnica, teórica o de postura tenés en este momento? Preguntá tranquilo.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      maestroVoice.stop();
      setPlayingMessageId(null);
      setLoadingMessageId(null);
    }
  }, [isOpen]);

  const handleSpeakMessage = async (id: string, text: string) => {
    if (playingMessageId === id) {
      maestroVoice.stop();
      setPlayingMessageId(null);
      return;
    }

    maestroVoice.stop();
    setLoadingMessageId(id);

    await maestroVoice.speak(text, {
      onStart: () => {
        setLoadingMessageId(null);
        setPlayingMessageId(id);
      },
      onEnd: () => {
        setPlayingMessageId(null);
        setLoadingMessageId(null);
      },
      onError: () => {
        setPlayingMessageId(null);
        setLoadingMessageId(null);
      }
    });
  };

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'student',
      text,
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/instructor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lessonContext: currentLesson ? { title: currentLesson.title, description: currentLesson.description } : undefined,
          userLevel,
        }),
      });

      const data = await res.json();
      const maestroReply: ChatMessage = {
        id: Math.random().toString(),
        sender: 'maestro',
        text: data.reply || 'Mirá, che, la música requiere paciencia y constancia. Continúa practicando cada compás despacito.',
      };
      setMessages(prev => [...prev, maestroReply]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'maestro',
          text: 'Acordate che de aflojar los hombros y muñecas; el peso del brazo es la base de un sonido hermoso. Probá de nuevo despacio.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0d1017] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-serif text-lg font-bold shadow-md">
                <GraduationCap size={22} className="text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-white">Maestro Aurelio</h3>
                  <span className="flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    <Globe2 size={11} /> Uruguay • Voz Rioplatense
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Lección activa: <span className="text-amber-300/80">{currentLesson?.title || 'Conservatorio'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'maestro' && (
                  <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 flex-shrink-0 flex items-center justify-center text-amber-400 text-xs font-bold">
                    <GraduationCap size={14} className="text-amber-400" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.sender === 'student'
                      ? 'bg-amber-400 text-black font-medium rounded-tr-none'
                      : 'glass text-white/90 border border-white/10 rounded-tl-none font-light'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.sender === 'maestro' && (
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(m.id, m.text)}
                      className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/20 transition-all"
                    >
                      {playingMessageId === m.id ? (
                        <>
                          <Pause size={12} />
                          <span>Pausar voz</span>
                        </>
                      ) : loadingMessageId === m.id ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Conectando voz...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={12} />
                          <span>Escuchar al Maestro</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {m.sender === 'student' && (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-white/70 text-xs">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 items-center text-amber-300 text-xs font-mono">
                <RefreshCw size={14} className="animate-spin" />
                <span>El Maestro Aurelio está respondiendo con calidez rioplatense...</span>
              </div>
            )}
          </div>

          {/* Quick Questions pills */}
          <div className="px-5 py-2.5 bg-black/40 border-t border-white/5 overflow-x-auto flex gap-2 no-scrollbar">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-[11px] whitespace-nowrap bg-white/5 hover:bg-white/10 text-white/70 hover:text-amber-300 px-3 py-1 rounded-full border border-white/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-[#0a0c12] border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe tu consulta sobre técnica, notas, digitación o teoría..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/60"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Preguntar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
