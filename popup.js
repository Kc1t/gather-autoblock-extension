const statusEl = document.getElementById('status');
const toggleBtn = document.getElementById('toggleBtn');

// Atualiza UI
function updateStatus(ativo) {
  statusEl.textContent = 'Status: ' + (ativo ? 'Ativo' : 'Desativado');
  statusEl.style.color = ativo ? 'green' : 'red';
}

// Pega estado do storage
chrome.storage.local.get(['gatherAutoBlock'], (result) => {
  updateStatus(result.gatherAutoBlock ?? true);
});

// Alterna estado e envia msg pro content.js
toggleBtn.addEventListener('click', () => {
  chrome.storage.local.get(['gatherAutoBlock'], (result) => {
    const novo = !(result.gatherAutoBlock ?? true);
    chrome.storage.local.set({ gatherAutoBlock: novo }, () => {
      updateStatus(novo);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TOGGLE_GATHER_BLOCK',
          ativo: novo
        });
      });
    });
  });
});
