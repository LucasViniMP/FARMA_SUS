const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const addFile = document.querySelector('#add-file');
const message = document.querySelector('#upload-message');
const examList = document.querySelector('#exam-list');
const modeBadge = document.querySelector('#system-mode-badge');

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getAuthHeaders(includeContentType = true) {
  const headers = {};
  if (includeContentType) {
    headers['Accept'] = 'application/json';
  }
  const firebaseToken = localStorage.getItem('firebase_token');
  if (firebaseToken) {
    headers['Authorization'] = `Bearer ${firebaseToken}`;
  }
  return headers;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function getStatusDetails(status) {
  switch (status) {
    case 'approved':
      return { label: 'Aprovado', className: 'status-approved' };
    case 'denied':
      return { label: 'Recusado', className: 'status-denied' };
    case 'under_review':
    default:
      return { label: 'Em análise', className: 'status-review' };
  }
}

async function loadFiles() {
  try {
    const res = await fetch('/files', {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      examList.innerHTML = '<tr><td colspan="5" class="empty-state">Não foi possível carregar os exames.</td></tr>';
      return;
    }

    const data = await res.json();

    if (modeBadge) {
      if (data.mode === 'firebase') {
        modeBadge.textContent = '● Modo Firebase Ativo';
        modeBadge.className = 'mode-badge firebase';
      } else {
        modeBadge.textContent = '● Armazenamento Local (100% Gratuito)';
        modeBadge.className = 'mode-badge';
      }
    }

    if (!data.files || data.files.length === 0) {
      examList.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <strong>Nenhum documento enviado ainda</strong>
            Arraste um arquivo PDF, JPG ou PNG para começar.
          </td>
        </tr>
      `;
      return;
    }

    examList.innerHTML = data.files.map((file) => {
      const status = getStatusDetails(file.status);
      const safeName = escapeHtml(file.fileName);
      const safeKey = encodeURI(file.key);

      return `
        <tr>
          <td data-label="Nome do arquivo">
            <strong>${safeName}</strong>
          </td>
          <td data-label="Data de envio">${escapeHtml(file.submittedAt || '-')}</td>
          <td data-label="Vencimento">${escapeHtml(file.expiresAt || '-')}</td>
          <td data-label="Status">
            <span class="status ${status.className}">${status.label}</span>
          </td>
          <td data-label="Ações" class="actions-cell">
            <a href="/files/${safeKey}" target="_blank" class="action-btn download" title="Baixar documento">
              ↓ Baixar
            </a>
            <button type="button" class="action-btn delete" data-key="${safeKey}" title="Excluir documento">
              ✕ Excluir
            </button>
          </td>
        </tr>
      `;
    }).join('');

    examList.querySelectorAll('button.delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.getAttribute('data-key');
        if (confirm('Deseja realmente excluir este exame?')) {
          await deleteFile(key);
        }
      });
    });

  } catch (err) {
    examList.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao conectar com o servidor.</td></tr>';
  }
}

async function uploadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt'];

  if (!allowedExts.includes(ext) || file.size > MAX_BYTES) {
    message.textContent = 'Use PDF, JPG, PNG ou TXT de até 10 MB.';
    message.style.color = '#d73035';
    return;
  }

  message.textContent = `Enviando ${file.name}...`;
  message.style.color = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/files', {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Falha no envio.');
    }

    message.textContent = `✓ ${file.name} enviado com sucesso!`;
    message.style.color = '#147149';
    await loadFiles();
  } catch (err) {
    message.textContent = `Erro ao enviar: ${err.message}`;
    message.style.color = '#d73035';
  }
}

async function deleteFile(key) {
  try {
    const res = await fetch(`/files/${key}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error('Não foi possível excluir o arquivo.');
    }

    message.textContent = 'Arquivo excluído com sucesso.';
    message.style.color = '#147149';
    await loadFiles();
  } catch (err) {
    message.textContent = `Erro ao excluir: ${err.message}`;
    message.style.color = '#d73035';
  }
}

function chooseFile() {
  fileInput.click();
}

addFile.addEventListener('click', chooseFile);
dropzone.addEventListener('click', chooseFile);

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) {
    uploadFile(fileInput.files[0]);
    fileInput.value = '';
  }
});

['dragenter', 'dragover'].forEach((event) => {
  dropzone.addEventListener(event, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((event) => {
  dropzone.addEventListener(event, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  if (event.dataTransfer.files[0]) {
    uploadFile(event.dataTransfer.files[0]);
  }
});

loadFiles();
