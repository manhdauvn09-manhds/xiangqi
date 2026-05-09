// Cờ Tướng Vương — Full Chat Panel
// Phase 3: Dedicated in-game chat panel (replaces toast-only chat)
import { t } from '../i18n/i18n.js';
import * as wsClient from '../net/ws-client.js';

export function createChatPanel(gameId, userName) {
  const el = document.createElement('div');
  el.className = 'chat-panel';
  el.innerHTML = `
    <div class="chat-head">
      <span>💬 ${esc(t('chat.title'))}</span>
      <button class="chat-toggle" title="${esc(t('chat.toggle'))}">▼</button>
    </div>
    <div class="chat-body" id="chatBody">
      <div class="chat-msgs" id="chatMsgs">
        <div class="chat-sys">${esc(t('chat.welcome'))}</div>
      </div>
      <div class="chat-input-wrap">
        <input type="text" id="chatInput" placeholder="${esc(t('chat.placeholder'))}" maxlength="500" autocomplete="off">
        <button class="btn btn-sm btn-primary" id="chatSend">${esc(t('chat.send'))}</button>
      </div>
    </div>
  `;

  let collapsed = false;
  const toggleBtn = el.querySelector('.chat-toggle');
  const body = el.querySelector('.chat-body');
  const msgs = el.querySelector('#chatMsgs');
  const input = el.querySelector('#chatInput');
  const sendBtn = el.querySelector('#chatSend');

  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : '';
    toggleBtn.textContent = collapsed ? '▲' : '▼';
    el.classList.toggle('collapsed', collapsed);
  });

  function addMsg(sender, text, isSelf = false, isSystem = false) {
    const div = document.createElement('div');
    if (isSystem) {
      div.className = 'chat-sys';
      div.textContent = text;
    } else {
      div.className = `chat-msg ${isSelf ? 'self' : 'opp'}`;
      div.innerHTML = `<span class="chat-name">${esc(sender)}</span> <span class="chat-text">${esc(text)}</span>`;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    wsClient.send('chat.send', { gameId, text });
    input.value = '';
    input.focus();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  });

  // Typing indicator
  let typingTimer = null;
  input.addEventListener('input', () => {
    wsClient.send('chat.typing', { gameId, on: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => wsClient.send('chat.typing', { gameId, on: false }), 2000);
  });

  // Listen for incoming messages
  const unsubs = [];
  unsubs.push(wsClient.on('chat.message', (msg) => {
    if (msg.gameId !== gameId) return;
    const isSelf = msg.sender?.name === userName;
    addMsg(msg.sender?.name || '?', msg.text, isSelf);
  }));
  unsubs.push(wsClient.on('chat.typing', (msg) => {
    // Could show typing indicator in UI
  }));

  // Public API
  el._chatAPI = {
    addMsg,
    addSystem: (text) => addMsg('', text, false, true),
    destroy: () => unsubs.forEach(fn => fn && fn()),
  };

  return el;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
