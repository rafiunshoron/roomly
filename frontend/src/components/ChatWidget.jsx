
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, getToken } from "../api.js";
import "./ChatWidget.css";

function ChatWidget() {
  const location = useLocation();

  const [userId, setUserId] = useState(null);
  const [open, setOpen] = useState(false);

  const [chatIds, setChatIds] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  // Identify the logged-in user.
  useEffect(() => {
    let active = true;

    if (!getToken()) {
      setUserId(null);
      setOpen(false);
      setChatIds([]);
      setConversationId(null);
      setMessages([]);
      return;
    }

    api("/api/auth/me")
      .then((user) => {
        if (!active) return;

        const key = `roomly_chats_${user.id}`;

        let saved = [];
        try {
          const parsed = JSON.parse(
            localStorage.getItem(key) || "[]"
          );
          saved = Array.isArray(parsed) ? parsed : [];
        } catch {
          saved = [];
        }

        setUserId(user.id);
        setChatIds(saved);
        setConversationId(saved[0] || null);
      })
      .catch(() => {
        if (active) setUserId(null);
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  // Load a selected conversation from PostgreSQL.
  useEffect(() => {
    let active = true;

    setError("");

    if (!userId || !conversationId) {
      setMessages([]);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);

    api(`/api/ai/conversations/${conversationId}`)
      .then((result) => {
        if (active) {
          setMessages(result.messages || []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [userId, conversationId]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, sending, open]);

  function newChat() {
    if (sending) return;

    setConversationId(null);
    setMessages([]);
    setInput("");
    setError("");
  }

  async function sendMessage() {
    const question = input.trim();

    if (!question || sending || loadingHistory) return;

    setInput("");
    setError("");

    setMessages((previous) => [
      ...previous,
      { role: "user", content: question },
    ]);

    setSending(true);

    try {
      const result = await api("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          conversation_id: conversationId,
        }),
      });

      if (!conversationId) {
        const nextId = result.conversation_id;

        const updated = [
          nextId,
          ...chatIds.filter((id) => id !== nextId),
        ];

        localStorage.setItem(
          `roomly_chats_${userId}`,
          JSON.stringify(updated)
        );

        setChatIds(updated);
        setConversationId(nextId);
      } else {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: result.answer,
            sources: result.sources || [],
          },
        ]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!getToken() || !userId) return null;

  return (
    <>
      <button
        className="roomly-chat-launcher"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        {open ? "✕" : "✦ AI Chat"}
      </button>

      {open && (
        <section className="roomly-chat-panel">
          <header className="roomly-chat-header">
            <div>
              <strong>Roomly AI Assistant</strong>
              <small>LangGraph + Groq</small>
            </div>

            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          <div className="roomly-chat-toolbar">
            <select
              aria-label="Select conversation"
              value={conversationId || ""}
              disabled={sending}
              onChange={(e) => {
                setConversationId(e.target.value || null);
                setError("");
              }}
            >
              <option value="">New conversation</option>

              {chatIds.map((id, index) => (
                <option key={id} value={id}>
                  Conversation {chatIds.length - index}
                </option>
              ))}
            </select>

            <button
              onClick={newChat}
              disabled={sending}
              title="Start a new conversation"
            >
              + New
            </button>
          </div>

          <div
            className="roomly-chat-messages"
            aria-live="polite"
          >
            {!loadingHistory && messages.length === 0 && (
              <div className="roomly-chat-welcome">
                <h3>Welcome to Roomly!</h3>
                <p>
                  Ask me about booking rules,
                  cancellation, refunds or facilities.
                </p>
              </div>
            )}

            {loadingHistory && (
              <p className="roomly-chat-muted">
                Loading conversation...
              </p>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  "roomly-chat-message " +
                  (message.role === "user"
                    ? "roomly-chat-user"
                    : "roomly-chat-assistant")
                }
              >
                <div>{message.content}</div>

                {message.sources?.length > 0 && (
                  <small>
                    Sources: {message.sources.join(", ")}
                  </small>
                )}
              </div>
            ))}

            {sending && (
              <p className="roomly-chat-muted">
                Roomly AI is thinking...
              </p>
            )}

            {error && (
              <p className="roomly-chat-error">
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="roomly-chat-input-area">
            <textarea
              aria-label="Chat message"
              placeholder="Ask Roomly AI..."
              value={input}
              rows={2}
              disabled={sending || loadingHistory}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              disabled={
                sending ||
                loadingHistory ||
                !input.trim()
              }
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default ChatWidget;
