(function () {
  const script = document.currentScript;
  const BUSINESS_ID = script.getAttribute("data-business-id");
  const BASE_URL = script.getAttribute("data-api-url") || "http://localhost:3000";
  const CHAT_URL = BASE_URL + "/api/chat";
  const CONFIG_URL = BASE_URL + "/api/widget-config";

  if (!BUSINESS_ID) {
    console.error("[SupportAI] data-business-id attribute is required");
    return;
  }

  // session
  let sessionId = localStorage.getItem("supportai_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("supportai_session", sessionId);
  }

  // config (defaults, overridden by fetch)
  let config = {
    bot_name: "Support",
    welcome_message: "Hi! How can I help you today?",
    suggested_questions: ["Refund policy", "Contact support"],
  };
  let started = false;

  // styles
  const style = document.createElement("style");
  style.textContent = `
    .sai-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      width: 54px; height: 54px; border-radius: 18px;
      background: #0f172a;
      color: #fff; border: none; cursor: pointer;
      font-size: 22px; box-shadow: 0 4px 14px rgba(15,23,42,.35);
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s ease, border-radius .2s ease;
    }
    .sai-bubble:hover { transform: translateY(-2px); border-radius: 50%; }
    .sai-window {
      position: fixed; bottom: 90px; right: 24px; z-index: 999999;
      width: 350px; max-width: calc(100vw - 32px); height: 500px;
      max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 20px 50px -12px rgba(15,23,42,.3), 0 0 0 1px rgba(15,23,42,.05);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      opacity: 0; pointer-events: none;
      transform: translateY(12px) scale(.97);
      transform-origin: bottom right;
      transition: opacity .2s ease, transform .2s ease;
      -webkit-font-smoothing: antialiased;
    }
    .sai-window.open {
      opacity: 1; pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    .sai-header {
      background: #0f172a;
      color: #fff; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
    }
    .sai-header-avatar {
      width: 34px; height: 34px; border-radius: 10px;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff;
    }
    .sai-header-name { font-weight: 600; font-size: 14.5px; }
    .sai-header-status { font-size: 11.5px; opacity: .7; margin-top: 1px; }
    .sai-header-status::before {
      content: "\\25CF"; color: #4ade80; margin-right: 4px; font-size: 9px;
    }
    .sai-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 8px;
      background: #fafbfc;
    }
    .sai-msg {
      max-width: 85%; padding: 10px 13px; border-radius: 14px;
      font-size: 14px; line-height: 1.5; white-space: pre-wrap;
      word-wrap: break-word;
      animation: sai-in .2s ease;
    }
    @keyframes sai-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .sai-msg.user {
      align-self: flex-end; background: #0f172a; color: #fff;
      border-bottom-right-radius: 4px;
    }
    .sai-msg.bot {
      align-self: flex-start; background: #fff; color: #1e293b;
      border: 1px solid #eef2f6;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(15,23,42,.05);
    }
    .sai-msg.bot a { color: #2563eb; }
    .sai-msg.bot table { border-collapse: collapse; margin: 6px 0; }
    .sai-msg.bot td, .sai-msg.bot th {
      border: 1px solid #d8dee7; padding: 5px 9px; font-size: 13px;
    }
    .sai-suggestions {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px;
      background: #fafbfc;
    }
    .sai-chip {
      border: 1px solid #d3dce8; background: #fff; border-radius: 16px;
      padding: 6px 12px; font-size: 12.5px; cursor: pointer; color: #334155;
      transition: background .12s ease, border-color .12s ease, color .12s ease;
    }
    .sai-chip:hover { background: #0f172a; border-color: #0f172a; color: #fff; }
    .sai-inputrow {
      display: flex; border-top: 1px solid #e8ecf1; padding: 12px;
      gap: 8px; background: #fff;
    }
    .sai-input {
      flex: 1; border: 1px solid #d3dce8; border-radius: 10px;
      padding: 10px 13px; font-size: 14px; outline: none;
      transition: border-color .12s ease, box-shadow .12s ease;
    }
    .sai-input:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.08); }
    .sai-send {
      background: #0f172a; color: #fff; border: none; border-radius: 50%;
      width: 40px; height: 40px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background .12s ease;
      flex-shrink: 0;
    }
    .sai-send:hover { background: #1e293b; }
    .sai-send:disabled { opacity: .5; cursor: default; }
    .sai-typing {
      padding: 0 14px 8px; background: #fafbfc;
      display: none; align-items: center; gap: 3px;
    }
    .sai-typing.show { display: flex; }
    .sai-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
      animation: sai-bounce 1.2s infinite;
    }
    .sai-typing span:nth-child(2) { animation-delay: .15s; }
    .sai-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes sai-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: .5; }
      30% { transform: translateY(-5px); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // markdown-lite: bold, links, bullets, tables (escapes HTML first)
  function renderMarkdown(text) {
    let html = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^- (.+)$/gm, "\u2022 $1");

    const lines = html.split("\n");
    let result = [], tableRows = [];
    for (const line of lines) {
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const cells = line.trim().slice(1, -1).split("|").map(c => c.trim());
        if (cells.every(c => /^[-: ]+$/.test(c))) continue;
        tableRows.push("<tr>" + cells.map(c => `<td>${c}</td>`).join("") + "</tr>");
      } else {
        if (tableRows.length) {
          result.push("<table>" + tableRows.join("") + "</table>");
          tableRows = [];
        }
        result.push(line);
      }
    }
    if (tableRows.length) result.push("<table>" + tableRows.join("") + "</table>");
    return result.join("\n");
  }

  // UI
  const bubble = document.createElement("button");
  bubble.className = "sai-bubble";
  bubble.innerHTML = "\uD83D\uDCAC";
  bubble.setAttribute("aria-label", "Open support chat");

  const win = document.createElement("div");
  win.className = "sai-window";
  win.innerHTML = `
    <div class="sai-header">
      <div class="sai-header-avatar">S</div>
      <div>
        <div class="sai-header-name">Support</div>
        <div class="sai-header-status">Online</div>
      </div>
    </div>
    <div class="sai-messages"></div>
    <div class="sai-typing"><span></span><span></span><span></span></div>
    <div class="sai-suggestions"></div>
    <div class="sai-inputrow">
      <input class="sai-input" placeholder="Type your message\u2026" />
      <button class="sai-send" aria-label="Send">\u27A4</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  const messagesEl = win.querySelector(".sai-messages");
  const inputEl = win.querySelector(".sai-input");
  const sendBtn = win.querySelector(".sai-send");
  const typingEl = win.querySelector(".sai-typing");
  const suggestionsEl = win.querySelector(".sai-suggestions");
  const headerNameEl = win.querySelector(".sai-header-name");
  const avatarEl = win.querySelector(".sai-header-avatar");

  // fetch real config
  fetch(`${CONFIG_URL}?business_id=${BUSINESS_ID}`)
    .then((r) => r.json())
    .then((d) => {
      if (d && d.bot_name) {
        config = {
          bot_name: d.bot_name,
          welcome_message: d.welcome_message || config.welcome_message,
          suggested_questions: Array.isArray(d.suggested_questions)
            ? d.suggested_questions
            : config.suggested_questions,
        };
        headerNameEl.textContent = config.bot_name;
        avatarEl.textContent = config.bot_name[0].toUpperCase();
      }
    })
    .catch(() => {});

  function addMessage(text, who) {
    const div = document.createElement("div");
    div.className = `sai-msg ${who}`;
    if (who === "bot") div.innerHTML = renderMarkdown(text);
    else div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showSuggestions() {
    suggestionsEl.innerHTML = "";
    config.suggested_questions.forEach((s) => {
      const chip = document.createElement("button");
      chip.className = "sai-chip";
      chip.textContent = s;
      chip.onclick = () => { suggestionsEl.innerHTML = ""; send(s); };
      suggestionsEl.appendChild(chip);
    });
  }

  async function send(text) {
    const message = (text ?? inputEl.value).trim();
    if (!message) return;

    inputEl.value = "";
    addMessage(message, "user");
    sendBtn.disabled = true;
    typingEl.classList.add("show");

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: BUSINESS_ID,
          session_id: sessionId,
          message,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        addMessage(data.error || "Something went wrong. Please try again.", "bot");
      } else {
        addMessage(data.reply, "bot");
        if (data.ticket_created) {
          addMessage("A support ticket has been created. Our team will follow up with you.", "bot");
        }
      }
    } catch {
      addMessage("Connection error. Please try again.", "bot");
    } finally {
      sendBtn.disabled = false;
      typingEl.classList.remove("show");
      inputEl.focus();
    }
  }

  bubble.onclick = () => {
    const opening = !win.classList.contains("open");
    win.classList.toggle("open");
    bubble.innerHTML = opening ? "\u2715" : "\uD83D\uDCAC";
    if (opening && !started) {
      started = true;
      addMessage(config.welcome_message, "bot");
      showSuggestions();
    }
    if (opening) inputEl.focus();
  };

  sendBtn.onclick = () => send();
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });
})();