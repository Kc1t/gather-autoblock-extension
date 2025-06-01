let ativado = true;

// Seletores para verificar se está na própria mesa
const SELECTORS = {
  TABLE_NAME: 'span.css-1l3f3dx', // Span com nome da mesa
  USER_NAME: 'span[color="white"].css-1n1bhhn', // Span branco com nome do usuário
  TABLE_PATTERN: /Mesa de (.+)/i // Padrão para extrair nome do dono da mesa
};

// Recupera estado inicial salvo
chrome.storage?.local.get(['gatherAutoBlock'], (result) => {
  ativado = result.gatherAutoBlock ?? true;
  console.log('[Gather Auto Block] Estado inicial:', ativado);
});

// Toast container
const toastContainer = document.createElement('div');
toastContainer.style.position = 'fixed';
toastContainer.style.top = '16px';
toastContainer.style.left = '50%';
toastContainer.style.transform = 'translateX(-50%)';
toastContainer.style.zIndex = '9999';
toastContainer.style.display = 'flex';
toastContainer.style.flexDirection = 'column';
toastContainer.style.alignItems = 'center';
toastContainer.style.gap = '8px';
document.body.appendChild(toastContainer);

// Toast feedback
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.background = '#333';
  toast.style.color = '#fff';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  toast.style.fontFamily = 'sans-serif';
  toast.style.fontSize = '14px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease';
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = '1'));
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Verifica se o usuário está na própria mesa
function isUserAtOwnTable() {
  // Procura pelo nome da mesa
  const mesaElement = document.querySelector(SELECTORS.TABLE_NAME);
  if (!mesaElement) return false;
  
  // Procura pelo nome do usuário (span branco)
  const userElement = document.querySelector(SELECTORS.USER_NAME);
  if (!userElement) return false;
  
  const mesaText = mesaElement.textContent.trim();
  const userName = userElement.textContent.trim();
  
  // Extrai o nome da mesa usando regex
  const tableMatch = mesaText.match(SELECTORS.TABLE_PATTERN);
  if (!tableMatch) return false;
  
  const tableOwnerName = tableMatch[1].toLowerCase();
  const currentUserName = userName.toLowerCase();
  
  // Verifica se o nome do dono da mesa é igual ao nome do usuário atual
  return tableOwnerName === currentUserName;
}

// Clica no botão do menu de área de reunião
function clicarBotaoAbrirMenu() {
  if (!ativado) return;
  
  if (!isUserAtOwnTable()) {
    console.log('[Gather Auto Block] Não está na própria mesa, ignorando...');
    return;
  }
  
  const botaoMenu = [...document.querySelectorAll('button')]
    .find(btn => btn.querySelector('svg path[d*="M12 10.354"]'));
  if (botaoMenu && !botaoMenu.dataset._clicado) {
    botaoMenu.click();
    botaoMenu.dataset._clicado = 'true';
    showToast('Menu da área de reunião aberto');
  }
}

// Clica no botão de bloquear
function clicarBotaoBloquear() {
  if (!ativado) return;
  
  if (!isUserAtOwnTable()) {
    console.log('[Gather Auto Block] Não está na própria mesa, não bloqueando...');
    return;
  }
  
  const botao = [...document.querySelectorAll('button')]
    .find(btn => btn.textContent.includes('Bloquear área de reunião'));
  if (botao && !botao.dataset._bloqueadoAuto) {
    botao.click();
    botao.dataset._bloqueadoAuto = 'true';
    showToast('Área de reunião bloqueada');
  }
}

// Detecta botão de desbloqueio manual e reverte
function clicarBotaoDesbloqueadoSeExistir() {
  if (!ativado) return;
  
  if (!isUserAtOwnTable()) {
    console.log('[Gather Auto Block] Não está na própria mesa, não rebloqueando...');
    return;
  }
  
  const btnDesbloqueado = document.querySelector('button[aria-label="botão de bloqueio da área atual"]');
  if (btnDesbloqueado && !btnDesbloqueado.dataset._bloqueadoAuto) {
    btnDesbloqueado.click();
    btnDesbloqueado.dataset._bloqueadoAuto = 'true';
    showToast('Área de reunião estava desbloqueada. Rebloqueando...');
  }
}

// Detecta e clica no botão de desbloqueio (sala aberta) para bloquear
function clicarBotaoDesbloqueio() {
  if (!ativado) return;
  
  if (!isUserAtOwnTable()) {
    console.log('[Gather Auto Block] Não está na própria mesa, não bloqueando sala aberta...');
    return;
  }
  
  // Procura pelo botão de desbloqueio (sala aberta)
  const btnDesbloqueio = document.querySelector('button[aria-label="botão de bloqueio da área atual"]:not([data-_bloqueado-auto])');
  if (btnDesbloqueio) {
    btnDesbloqueio.click();
    btnDesbloqueio.dataset._bloqueadoAuto = 'true';
    showToast('Sala estava aberta. Bloqueando...');
    console.log('[Gather Auto Block] Sala aberta detectada e bloqueada');
  }
}

// Observa mudanças no DOM
const observer = new MutationObserver((mutations) => {
  if (!ativado) return;
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      clicarBotaoAbrirMenu();
      clicarBotaoBloquear();
      clicarBotaoDesbloqueadoSeExistir();
      clicarBotaoDesbloqueio(); // Nova função
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Atalho manual para ativar/desativar
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
    ativado = !ativado;
    chrome.storage.local.set({ gatherAutoBlock: ativado });
    showToast(`Auto-bloqueio ${ativado ? 'ativado' : 'desativado'}`);
    console.log('[Gather Auto Block] Atalho usado. Estado agora:', ativado);
  }
});

// Recebe mensagens do popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TOGGLE_GATHER_BLOCK') {
    ativado = msg.ativo;
    showToast(`Auto-bloqueio ${ativado ? 'ativado' : 'desativado'}`);
    console.log('[Gather Auto Block] Estado alterado via popup:', ativado);
  }
});

// Execução inicial
clicarBotaoAbrirMenu();
clicarBotaoBloquear();
clicarBotaoDesbloqueadoSeExistir();
clicarBotaoDesbloqueio(); // Nova função
