// ============================================================
// pages/AskAIPage.jsx — AI Document Q&A Chat Interface
// ============================================================
// Full-featured chat page for asking questions about uploaded
// documents. Uses RAG (Retrieval-Augmented Generation).
// ============================================================

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { askQuestion, getAIStats } from "../services/api";
import Navbar from "../components/Navbar";
import ChatMessage from "../components/ChatMessage";

const SUGGESTED_QUESTIONS = [
  "Summarize my documents",
  "What are the key points?",
  "Find all dates and deadlines",
  "List the main topics covered",
  "What data is in my spreadsheets?",
  "Describe the images I uploaded",
];

const AskAIPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch AI stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStats = async () => {
    try {
      const response = await getAIStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error("Failed to fetch AI stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleAsk = async (question = null) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    // Add user message
    const userMsg = { role: "user", content: q, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Add loading AI message
    const loadingId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: "", loading: true, id: loadingId },
    ]);
    setLoading(true);

    try {
      const response = await askQuestion(q);
      const data = response.data;

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                role: "ai",
                content: data.answer,
                sources: data.sources || [],
                chunks_found: data.chunks_found || 0,
                loading: false,
                id: loadingId,
              }
            : msg
        )
      );
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Something went wrong. Please try again.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                role: "ai",
                content: `⚠️ ${errorMsg}`,
                loading: false,
                id: loadingId,
                sources: [],
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const hasProcessedDocs = stats && stats.processedDocuments > 0;

  return (
    <div className="min-h-screen bg-surface-500 flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="py-6 opacity-0 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-accent-violet/20 rounded-xl flex items-center justify-center border border-primary-500/20">
              <svg
                className="w-5 h-5 text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white">
                Ask AI
              </h1>
              <p className="text-xs text-muted-400">
                Chat with your documents using AI
              </p>
            </div>
          </div>

          {/* Stats bar */}
          {!statsLoading && stats && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                <span className="text-muted-400">
                  <span className="text-muted-200 font-medium">
                    {stats.processedDocuments}
                  </span>{" "}
                  documents processed
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-violet" />
                <span className="text-muted-400">
                  <span className="text-muted-200 font-medium">
                    {stats.totalChunks}
                  </span>{" "}
                  knowledge chunks
                </span>
              </div>
              {stats.processingDocuments > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                  <span className="text-primary-400">
                    {stats.processingDocuments} processing...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Chat Area ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full py-16 opacity-0 animate-scale-in">
              {/* Big AI icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500/10 to-accent-violet/10 rounded-3xl flex items-center justify-center mb-6 border border-primary-500/10">
                <svg
                  className="w-10 h-10 text-primary-500/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>

              {!hasProcessedDocs ? (
                <>
                  <h3 className="text-lg font-display font-semibold text-muted-200 mb-2">
                    No documents processed yet
                  </h3>
                  <p className="text-sm text-muted-400 text-center max-w-md mb-6">
                    Upload documents first — they'll be automatically processed
                    for AI. Then come back here to ask questions!
                  </p>
                  <Link
                    to="/upload"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Upload Documents
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-display font-semibold text-muted-200 mb-2">
                    Ask me anything about your documents
                  </h3>
                  <p className="text-sm text-muted-400 text-center max-w-md mb-6">
                    I've analyzed {stats.processedDocuments} document
                    {stats.processedDocuments !== 1 ? "s" : ""} and created{" "}
                    {stats.totalChunks} knowledge chunks. Try one of these
                    questions:
                  </p>

                  {/* Suggested questions */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleAsk(q)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-300 bg-white/[0.03] border border-white/[0.06] hover:border-primary-500/30 hover:text-primary-400 hover:bg-primary-500/5 transition-all duration-300 disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Messages */
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Input Area ──────────────────────────────────────── */}
        <div className="sticky bottom-0 py-4 bg-gradient-to-t from-surface-500 via-surface-500 to-transparent">
          <div className="relative opacity-0 animate-fade-up stagger-1">
            <div className="flex items-end gap-3 p-2 rounded-2xl bg-surface-200/50 border border-muted-600/50 focus-within:border-primary-500/40 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all duration-300">
              <textarea
                ref={inputRef}
                id="ai-question-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasProcessedDocs
                    ? "Ask a question about your documents..."
                    : "Upload documents first to start asking questions..."
                }
                disabled={loading || !hasProcessedDocs}
                rows={1}
                className="flex-1 bg-transparent text-sm text-muted-100 placeholder:text-muted-500 outline-none resize-none px-2 py-2 max-h-32 disabled:opacity-50"
                style={{
                  height: "auto",
                  minHeight: "40px",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 128) + "px";
                }}
              />

              <button
                id="ai-send-button"
                onClick={() => handleAsk()}
                disabled={!input.trim() || loading || !hasProcessedDocs}
                className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-surface-500 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 active:scale-95 flex-shrink-0"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-surface-500/30 border-t-surface-500 rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 19V5m0 0l-7 7m7-7l7 7"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Input hint */}
            <p className="text-center text-xs text-muted-500 mt-2">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AskAIPage;
