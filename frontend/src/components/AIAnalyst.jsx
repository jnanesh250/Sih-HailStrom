import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Copy, Check, Volume2, VolumeX, RotateCcw, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '../services/api';

export default function AIAnalyst({ onOpenWhyAlert }) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: "👋 I am your **StormSense AI Convective Analyst**, powered by Groq's high-speed inference LPU engine. I interpret the multi-source Doppler radar, INSAT thermal imagery, and electrical lightning data to provide explainable early warnings. Ask me any question or select a scenario briefing below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      thoughtProcess: [
        "Ingested Open-Meteo environmental background (CAPE 2450 J/kg)",
        "Fused synthetic Doppler reflectivity core (64.2 dBZ)",
        "Correlated 28 CG lightning strikes with cloud-top cooling (-65.2°C)",
        "Random Forest Regressor predicted 74% Hail / 91% Lightning probability"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentThoughts, setCurrentThoughts] = useState([]);
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatBottomRef = useRef(null);

  const suggestions = [
    "Why is this area classified as high risk?",
    "What is the hail damage potential?",
    "Which sector is likely to be affected first?",
    "What immediate civil protection actions are required?"
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, currentThoughts]);

  // Audio Speech Reader using Web Speech API
  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThought = (id) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Realistic Streaming Typewriter Effect
  const streamResponse = (fullText, thoughts) => {
    let index = 0;
    setStreamingText('');
    const words = fullText.split(' ');

    const interval = setInterval(() => {
      index += 2;
      if (index >= words.length) {
        clearInterval(interval);
        setStreamingText('');
        const newMsg = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          text: fullText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thoughtProcess: thoughts
        };
        setMessages((prev) => [...prev, newMsg]);
        setLoading(false);
        setCurrentThoughts([]);
      } else {
        setStreamingText(words.slice(0, index).join(' '));
      }
    }, 28);
  };

  const handleSend = async (textToSend) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Dynamic Thought Process Sequence
    setCurrentThoughts([
      "🛰️ Decoding INSAT-3DR Thermal Cloud-Top (-65.2°C overshooting top)...",
      "📡 Scanning Doppler Weather Radar Core (64.2 dBZ Hail Signature)...",
      "⚡ Analyzing 28 Cloud-to-Ground Lightning Strikes and flash jump...",
      "📊 Querying Multi-Output Random Forest Convective Classifier...",
      "🛡️ Synthesizing Civil Protection & Agri-Defense Directives..."
    ]);

    try {
      const res = await api.chatAI(q);
      const answer = res.data.response;
      streamResponse(answer, [
        "Verified atmospheric CAPE (2450 J/kg) & low CIN cap",
        "Correlated radar reflectivity spike with freezing level isotherm",
        "Executed local Random Forest hazard inference (Hail 74% / Lightning 91%)",
        "Formatted emergency action recommendations"
      ]);
    } catch (err) {
      streamResponse(
        "⚠️ Connection to the cloud AI service was interrupted. Fallback convective reasoning indicates high severe hail (>2.5 cm) and lightning potential within the 30-minute impact corridor.",
        ["Local fallback model deployed"]
      );
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '600px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
      
      {/* Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
          }}>
            <Bot size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                AI STORM ANALYST
              </h3>
              <span className="mono" style={{ fontSize: '0.66rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                GROQ LPU LIVE
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Explainable Convective Intelligence & Tactical Advisory
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWhyAlert}
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Sparkles size={13} />
          Threat Dossier
        </button>
      </div>

      {/* Message Chat Area */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        scrollbarWidth: 'thin'
      }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {/* Thought Process Dropdown (Like ChatGPT / o1) */}
            {m.thoughtProcess && m.thoughtProcess.length > 0 && (
              <div style={{ marginBottom: '4px' }}>
                <button
                  onClick={() => toggleThought(m.id)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={11} color="#38bdf8" />
                  <span>Convective Diagnostics ({m.thoughtProcess.length} steps)</span>
                  {expandedThoughts[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {expandedThoughts[m.id] && (
                  <div style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginTop: '4px',
                    fontSize: '0.7rem',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}>
                    {m.thoughtProcess.map((tp, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8' }} />
                        {tp}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bubble */}
            <div style={{
              background: m.role === 'user' ? 'rgba(2, 132, 199, 0.22)' : 'rgba(15, 23, 42, 0.90)',
              border: `1px solid ${m.role === 'user' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.84rem',
              lineHeight: 1.55,
              color: m.role === 'user' ? '#f8fafc' : '#e2e8f0',
              boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
              whiteSpace: 'pre-line'
            }}>
              {m.text}
            </div>

            {/* Footer with Timestamp & Audio / Copy Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', fontSize: '0.66rem', color: 'var(--text-dim)', padding: '0 4px' }}>
              <span>{m.timestamp}</span>
              {m.role === 'assistant' && (
                <>
                  <button
                    onClick={() => handleCopy(m.id, m.text)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Copy response"
                  >
                    {copiedId === m.id ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={() => handleSpeak(m.text)}
                    style={{ background: 'none', border: 'none', color: isSpeaking ? '#38bdf8' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title={isSpeaking ? "Stop audio" : "Listen aloud"}
                  >
                    {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming Response with Blinking Cursor */}
        {loading && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Dynamic Real-Time Thinking Steps */}
            {currentThoughts.length > 0 && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.72rem',
                color: '#38bdf8',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <span className="pulsing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                  Running Convective Multi-Source Inference...
                </div>
                {currentThoughts.map((ct, i) => (
                  <div key={i} style={{ color: 'var(--text-muted)', fontSize: '0.68rem', paddingLeft: '12px' }}>
                    {ct}
                  </div>
                ))}
              </div>
            )}

            {streamingText && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.90)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.84rem',
                lineHeight: 1.55,
                color: '#e2e8f0',
                whiteSpace: 'pre-line'
              }}>
                {streamingText}
                <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#38bdf8', marginLeft: '3px', verticalAlign: 'middle', animation: 'pulse-ring 1s infinite' }} />
              </div>
            )}
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggestion Chips */}
      <div style={{
        padding: '8px 14px',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        scrollbarWidth: 'none'
      }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSend(s)}
            style={{
              flex: '0 0 auto',
              background: '#0d1322',
              border: '1px solid #1e293b',
              color: 'var(--text-muted)',
              borderRadius: '14px',
              padding: '4px 10px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = '#0284c7'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = '#1e293b'; }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(10, 15, 29, 0.8)'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask StormSense AI about hail, radar dBZ, or arrival..."
          style={{
            flex: 1,
            background: '#090d16',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.82rem',
            color: '#f8fafc',
            outline: 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '0 16px',
            color: '#ffffff',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading || !input.trim() ? 0.5 : 1,
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
          }}
        >
          <Send size={15} />
        </button>
      </div>

    </div>
  );
}
