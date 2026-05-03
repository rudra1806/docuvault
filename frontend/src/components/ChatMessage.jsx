// ============================================================
// components/ChatMessage.jsx — Chat Message Bubble
// ============================================================
// Renders a single message (user or AI) in the chat interface.
// Uses react-markdown for proper markdown rendering.
// ============================================================

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCard from "./SourceCard";

const ChatMessage = ({ message, onPreviewSource }) => {
  const [showSources, setShowSources] = useState(true);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} opacity-0 animate-fade-up`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500/30 to-accent-violet/30 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary-500/20">
          <svg
            className="w-4 h-4 text-primary-400"
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
      )}

      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary-500/15 border border-primary-500/20 text-muted-100"
              : "glass-card text-muted-100"
          }`}
        >
          <div className="text-sm leading-relaxed">
            {isUser ? (
              message.content
            ) : message.loading ? null : (
              <div className="prose-ai">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Headings
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold text-white mt-3 mb-2 first:mt-0">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold text-muted-100 mt-2.5 mb-1 first:mt-0">{children}</h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-sm font-semibold text-muted-200 mt-2 mb-1 first:mt-0">{children}</h4>
                    ),
                    // Paragraphs
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                    ),
                    // Bold & italic
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-muted-200">{children}</em>
                    ),
                    // Lists
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2 space-y-0.5 ml-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2 space-y-0.5 ml-1">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-muted-200 leading-relaxed">{children}</li>
                    ),
                    // Code
                    code: ({ inline, children, ...props }) => {
                      if (inline) {
                        return (
                          <code className="px-1.5 py-0.5 bg-surface-200 rounded text-primary-400 text-xs font-mono">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code
                          className="block bg-surface-200/50 rounded-lg p-3 text-xs font-mono text-muted-200 overflow-x-auto my-2 border border-white/[0.06]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-surface-200/50 rounded-lg p-3 text-xs font-mono text-muted-200 overflow-x-auto my-2 border border-white/[0.06]">
                        {children}
                      </pre>
                    ),
                    // Tables
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded-lg border border-white/[0.08]">
                        <table className="w-full text-xs">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-white/[0.04] border-b border-white/[0.08]">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-white/[0.04]">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left text-muted-300 font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 text-muted-300">{children}</td>
                    ),
                    // Blockquotes
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary-500/40 pl-3 my-2 text-muted-300 italic">
                        {children}
                      </blockquote>
                    ),
                    // Horizontal rules
                    hr: () => (
                      <hr className="border-white/[0.08] my-3" />
                    ),
                    // Links
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300 underline underline-offset-2"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Loading indicator */}
          {message.loading && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>

        {/* AI message actions */}
        {!isUser && !message.loading && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <button
              onClick={handleCopy}
              className="text-xs text-muted-500 hover:text-muted-300 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>

            {message.chunks_found > 0 && (
              <span className="text-xs text-muted-500">
                · {message.chunks_found} chunks searched
              </span>
            )}
          </div>
        )}

        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowSources(!showSources)}
              className="text-xs font-medium text-muted-400 hover:text-muted-200 transition-colors flex items-center gap-1 mb-2 px-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showSources ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {message.sources.length} source{message.sources.length !== 1 ? "s" : ""}
            </button>

            {showSources && (
              <div className="space-y-2">
                {message.sources.map((source, idx) => (
                  <SourceCard
                    key={idx}
                    source={source}
                    onPreview={onPreviewSource}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500/30 to-primary-600/30 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary-500/20">
          <svg
            className="w-4 h-4 text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
