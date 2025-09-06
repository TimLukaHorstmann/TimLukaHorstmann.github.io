import { launchGame, closeGame } from './game.js';

// Minimal in-game dialogue streaming (no site chat modal)
let gameConversationHistory = [];
let currentGameContext = '';

function appendNpcMessage(role, text) {
  const $c = document.getElementById('npc-messages');
  if (!$c) return;
  const div = document.createElement('div');
  div.className = role === 'npc' ? 'npc-msg' : 'player-msg';
  div.textContent = text;
  $c.appendChild(div);
  $c.scrollTop = $c.scrollHeight;
}

async function streamNpcChatResponse(query) {
  const apiUrl = `https://Luka512-website.hf.space/api/predict`;
  const container = document.getElementById('npc-messages');
  const typing = document.createElement('div');
  typing.className = 'npc-msg';
  typing.textContent = 'Typing…';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        history: gameConversationHistory,
        game_context: currentGameContext
      })
    });
    if (!response.ok) {
      typing.remove();
      appendNpcMessage('npc', 'Sorry, I had trouble answering. Please try again.');
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalText = '';
    typing.textContent = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      let chunk = decoder.decode(value, { stream: true });
      chunk = chunk.replace(/data:\s?/g, '').replace(/\[DONE\]/g, '');
      finalText += chunk;
      typing.textContent = finalText.replace(/\n{3,}/g, '\n\n');
      container.scrollTop = container.scrollHeight;
    }
    typing.remove();
    appendNpcMessage('npc', finalText.trim() || '');
    gameConversationHistory.push({ role: 'user', content: query });
    gameConversationHistory.push({ role: 'assistant', content: finalText });
  } catch (err) {
    typing.remove();
    appendNpcMessage('npc', `Error: ${err.message}`);
  }
}

window.addEventListener('start-chat', (e) => {
  const stationContext = e.detail?.context || '';
  const stationName = e.detail?.name || 'NPC';
  currentGameContext = stationContext;
  const dlg = document.getElementById('npc-dialogue');
  dlg.style.display = 'block';
  dlg.querySelector('.npc-name').textContent = stationName;
  const input = document.getElementById('npc-input');
  const send = document.getElementById('npc-send-btn');
  input.disabled = false; send.disabled = false; input.placeholder = `Ask about ${stationName}...`; input.focus();
  const messages = document.getElementById('npc-messages');
  if (messages.children.length === 0) {
    appendNpcMessage('npc', `Hi! I can tell you about ${stationContext}. What would you like to know?`);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Launch game scene
  launchGame();

  // Close/back
  document.getElementById('close-game-btn').addEventListener('click', () => {
    // Navigate back to main site
    window.location.href = './index.html#home';
  });

  // In-game dialogue handlers
  document.getElementById('npc-send-btn').addEventListener('click', async () => {
    const input = document.getElementById('npc-input');
    const q = (input.value || '').trim();
    if (!q) return; input.value = '';
    appendNpcMessage('player', q);
    await streamNpcChatResponse(q);
  });
  document.getElementById('npc-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('npc-send-btn').click();
    }
  });
  document.getElementById('npc-close-btn').addEventListener('click', () => {
    const dlg = document.getElementById('npc-dialogue');
    dlg.style.display = 'none';
    document.getElementById('npc-messages').innerHTML = '';
    gameConversationHistory = [];
    currentGameContext = '';
  });

  // Music toggle and credits
  const musicToggle = document.getElementById('music-toggle');
  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      const ev = new CustomEvent('toggle-bgm');
      window.dispatchEvent(ev);
    });
  }
  const credits = document.getElementById('credits');
  const creditsPanel = document.getElementById('credits-panel');
  const creditsClose = document.getElementById('credits-close');
  if (credits && creditsPanel) {
    credits.addEventListener('click', () => creditsPanel.style.display = 'block');
  }
  if (creditsClose) {
    creditsClose.addEventListener('click', () => creditsPanel.style.display = 'none');
  }
});
