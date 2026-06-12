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
      width: 52px; height: 52px; border-radius: 16px;
      background: #1a1b1e; border: 1px solid rgba(255,255,255,.10);
      color: #fff; cursor: pointer;
      font-size: 20px; box-shadow: 0 4px 20px rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s ease, border-radius .2s ease, box-shadow .15s ease;
    }
    .sai-bubble:hover { transform: translateY(-2px); border-radius: 50%; box-shadow: 0 8px 24px rgba(0,0,0,.6); }
    .sai-window {
      position: fixed; bottom: 88px; right: 24px; z-index: 999999;
      width: 348px; max-width: calc(100vw - 32px); height: 496px;
      max-height: calc(100vh - 120px);
      background: #1a1b1e; border-radius: 12px;
      border: 1px solid rgba(255,255,255,.08);
      box-shadow: 0 24px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      opacity: 0; pointer-events: none;
      transform: translateY(10px) scale(.97);
      transform-origin: bottom right;
      transition: opacity .18s ease, transform .18s ease;
      -webkit-font-smoothing: antialiased;
    }
    .sai-window.open {
      opacity: 1; pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    .sai-header {
      background: #1a1b1e; border-bottom: 1px solid rgba(255,255,255,.07);
      color: #e6e6e9; padding: 12px 14px;
      display: flex; align-items: center; gap: 10px;
    }
    .sai-header-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: #5e6ad2;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: #fff;
    }
    .sai-header-name { font-weight: 600; font-size: 13.5px; color: #e6e6e9; }
    .sai-header-status { font-size: 11px; color: #8a8f98; margin-top: 1px; }
    .sai-header-status::before {
      content: "\\25CF"; color: #4ade80; margin-right: 4px; font-size: 8px;
    }
    .sai-messages {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 7px;
      background: #0e0f11;
    }
    .sai-messages::-webkit-scrollbar { width: 4px; }
    .sai-messages::-webkit-scrollbar-track { background: transparent; }
    .sai-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
    .sai-msg {
      max-width: 85%; padding: 9px 12px; border-radius: 10px;
      font-size: 13.5px; line-height: 1.5; white-space: pre-wrap;
      word-wrap: break-word;
      animation: sai-in .18s ease;
    }
    @keyframes sai-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .sai-msg.user {
      align-self: flex-end; background: #5e6ad2; color: #fff;
      border-bottom-right-radius: 3px;
    }
    .sai-msg.bot {
      align-self: flex-start; background: #232428; color: #e6e6e9;
      border: 1px solid rgba(255,255,255,.07);
      border-bottom-left-radius: 3px;
    }
    .sai-msg.bot a { color: #818cf8; }
    .sai-msg.bot table { border-collapse: collapse; margin: 6px 0; }
    .sai-msg.bot td, .sai-msg.bot th {
      border: 1px solid rgba(255,255,255,.1); padding: 4px 8px; font-size: 12.5px;
    }
    .sai-suggestions {
      display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px 8px;
      background: #0e0f11;
    }
    .sai-chip {
      border: 1px solid rgba(255,255,255,.1); background: #1a1b1e; border-radius: 12px;
      padding: 5px 11px; font-size: 12px; cursor: pointer; color: #8a8f98;
      transition: background .12s ease, border-color .12s ease, color .12s ease;
    }
    .sai-chip:hover { background: #5e6ad2; border-color: #5e6ad2; color: #fff; }
    .sai-inputrow {
      display: flex; border-top: 1px solid rgba(255,255,255,.07); padding: 10px;
      gap: 7px; background: #1a1b1e;
    }
    .sai-input {
      flex: 1; border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
      padding: 8px 11px; font-size: 13.5px; outline: none;
      background: #0e0f11; color: #e6e6e9;
      transition: border-color .12s ease, box-shadow .12s ease;
    }
    .sai-input::placeholder { color: #62666d; }
    .sai-input:focus { border-color: #5e6ad2; box-shadow: 0 0 0 3px rgba(94,106,210,.18); }
    .sai-send {
      background: #5e6ad2; color: #fff; border: none; border-radius: 50%;
      width: 36px; height: 36px; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      transition: background .12s ease, transform .1s ease;
      flex-shrink: 0; align-self: center;
    }
    .sai-send:hover { background: #6e7ae2; transform: scale(1.05); }
    .sai-send:disabled { opacity: .4; cursor: default; transform: none; }
    .sai-typing {
      padding: 0 12px 7px; background: #0e0f11;
      display: none; align-items: center; gap: 3px;
    }
    .sai-typing.show { display: flex; }
    .sai-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: #62666d;
      animation: sai-bounce 1.2s infinite;
    }
    .sai-typing span:nth-child(2) { animation-delay: .15s; }
    .sai-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes sai-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: .4; }
      30% { transform: translateY(-4px); opacity: 1; }
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
  bubble.type = "button";
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
    sendBtn.type = "button";
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

  function addContactForm(ticketId) {
    const div = document.createElement("div");
    div.className = "sai-msg bot";
    div.innerHTML = `
        <div style="font-size:13px;margin-bottom:8px;">Leave your details so our team can follow up:</div>
        <input class="sai-cf-name" placeholder="Your name" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:7px 10px;border:1px solid #d3dce8;border-radius:8px;font-size:13px;" />
        <input class="sai-cf-email" placeholder="Email" type="email" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:7px 10px;border:1px solid #d3dce8;border-radius:8px;font-size:13px;" />
        <button class="sai-cf-send" type="button" style="background:#5e6ad2;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer;">Submit</button>
    `;
    const btn = div.querySelector(".sai-cf-send");
    btn.onclick = async () => {
        const name = div.querySelector(".sai-cf-name").value;
        const email = div.querySelector(".sai-cf-email").value;
        if (!name.trim() || !email.includes("@")) return;
        btn.disabled = true;
        try {
        await fetch(`${BASE_URL}/api/tickets/${ticketId}/contact`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer_name: name, customer_email: email, business_id: BUSINESS_ID }),
        });
        div.innerHTML = `<div style="font-size:13px;">Thanks! Our team will reach out to <b>${email.replace(/</g,"&lt;")}</b>.</div>`;
        } catch {
        btn.disabled = false;
        }
    };
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
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
        if (data.ticket_created && data.ticket_id) {
            addMessage("A support ticket has been created. Our team will follow up with you.", "bot");
            addContactForm(data.ticket_id);
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
    if (e.key === "Enter") {
        e.preventDefault();
        send()
    };
  });
})();