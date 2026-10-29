(function () {
  "use strict";

  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");
  const addFileBtn = document.getElementById("btn-add-file");
  const statusMsg = document.getElementById("upload-status-msg");
  const tableBody = document.getElementById("tabela-exames-corpo");
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");

  const ALLOWED_EXTS = ["pdf", "png", "jpg", "jpeg", "webp", "txt"];
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

  function obterHeaders() {
    const headers = {};
    const token = localStorage.getItem("firebase_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  function carregarPerfilUsuario() {
    try {
      const dataStr = sessionStorage.getItem("farmaSUSUsuario");
      if (dataStr) {
        const user = JSON.parse(dataStr);
        if (user.name && userName) userName.textContent = user.name;
        if (user.name && userAvatar) {
          const parts = user.name.trim().split(" ");
          const initials = parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
          userAvatar.textContent = initials;
        } else if (user.email && userName) {
          userName.textContent = user.email.split("@")[0];
          if (userAvatar) userAvatar.textContent = user.email.slice(0, 2).toUpperCase();
        }
      }
    } catch (_) {}
  }

  function formatarTamanho(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function getStatusBadge(status) {
    switch (status) {
      case "approved":
        return '<span class="status-badge approved">Aprovado</span>';
      case "denied":
        return '<span class="status-badge denied">Recusado</span>';
      case "under_review":
      default:
        return '<span class="status-badge review">Em análise</span>';
    }
  }

  async function carregarExames() {
    try {
      const res = await fetch("/files", { headers: obterHeaders() });
      if (!res.ok) {
        tableBody.innerHTML = '<tr><td colspan="5" class="estado-vazio">Não foi possível carregar os exames.</td></tr>';
        return;
      }

      const data = await res.json();

      if (!data.files || data.files.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="estado-vazio">
              <strong>Nenhum laudo ou exame enviado ainda</strong>
              Arraste um arquivo PDF, JPG ou PNG para começar.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = data.files.map((file) => {
        const safeName = escapeHtml(file.fileName);
        const safeKey = encodeURI(file.key);
        const tamanho = formatarTamanho(file.size);

        return `
          <tr>
            <td>
              <div class="nome-arquivo">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>${safeName}</span>
                ${tamanho ? `<small style="color:var(--texto-secundario);font-weight:normal">(${tamanho})</small>` : ""}
              </div>
            </td>
            <td>${escapeHtml(file.submittedAt || "-")}</td>
            <td>${escapeHtml(file.expiresAt || "-")}</td>
            <td>${getStatusBadge(file.status)}</td>
            <td>
              <div class="acoes-tabela">
                <a href="/files/${safeKey}" target="_blank" class="btn-acao download" title="Baixar exame">
                  ↓ Baixar
                </a>
                <button type="button" class="btn-acao delete" data-key="${safeKey}" title="Excluir exame">
                  ✕ Excluir
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      tableBody.querySelectorAll("button.delete").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const key = btn.getAttribute("data-key");
          if (confirm("Deseja realmente excluir este exame?")) {
            await excluirExame(key);
          }
        });
      });
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="5" class="estado-vazio">Erro ao conectar com o servidor.</td></tr>';
    }
  }

  async function enviarArquivo(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) || file.size > MAX_BYTES) {
      statusMsg.textContent = "Use PDF, JPG, PNG ou TXT de até 10 MB.";
      statusMsg.style.color = "var(--erro)";
      return;
    }

    statusMsg.textContent = `Enviando ${file.name}...`;
    statusMsg.style.color = "var(--cor-principal)";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/files", {
        method: "POST",
        headers: obterHeaders(),
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Falha no envio.");
      }

      statusMsg.textContent = `✓ ${file.name} enviado com sucesso!`;
      statusMsg.style.color = "var(--sucesso)";
      await carregarExames();
    } catch (err) {
      statusMsg.textContent = `Erro ao enviar: ${err.message}`;
      statusMsg.style.color = "var(--erro)";
    }
  }

  async function excluirExame(key) {
    try {
      const res = await fetch(`/files/${key}`, {
        method: "DELETE",
        headers: obterHeaders(),
      });

      if (!res.ok) {
        throw new Error("Não foi possível excluir o arquivo.");
      }

      statusMsg.textContent = "Exame excluído com sucesso.";
      statusMsg.style.color = "var(--sucesso)";
      await carregarExames();
    } catch (err) {
      statusMsg.textContent = `Erro ao excluir: ${err.message}`;
      statusMsg.style.color = "var(--erro)";
    }
  }

  function configurarEventos() {
    if (addFileBtn && fileInput) {
      addFileBtn.addEventListener("click", () => fileInput.click());
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener("click", () => fileInput.click());

      ["dragenter", "dragover"].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.add("dragover");
        });
      });

      ["dragleave", "drop"].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.remove("dragover");
        });
      });

      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files[0]) {
          enviarArquivo(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener("change", () => {
        if (fileInput.files[0]) {
          enviarArquivo(fileInput.files[0]);
          fileInput.value = "";
        }
      });
    }
  }

  carregarPerfilUsuario();
  configurarEventos();
  carregarExames();
})();
