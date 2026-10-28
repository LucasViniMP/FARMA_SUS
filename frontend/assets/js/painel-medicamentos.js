(function () {
  "use strict";

  const STORAGE_KEY = "farmaSUSDemoMedicamentosV1";

  const statusConfig = {
    pendente: { label: "Pendente", className: "pendente" },
    aceito: { label: "Aceito", className: "aceito" },
  };

  const defaultMedicamentos = [
    {
      id: "demo-ibuprofeno",
      nome: "Ibuprofeno",
      uso: "3 vezes ao dia",
      dose: "1 comprimido",
      status: "pendente",
    },
    {
      id: "demo-amoxicilina",
      nome: "Amoxicilina",
      uso: "2 vezes ao dia",
      dose: "2 comprimidos",
      status: "aceito",
    },
  ];

  const list = document.getElementById("lista-medicamentos");
  const emptyState = document.getElementById("estado-vazio");
  const totalLabel = document.getElementById("total-medicamentos");
  const dialog = document.getElementById("modal-medicamento");
  const form = document.getElementById("formulario-medicamento");
  const dialogError = document.getElementById("erro-modal");
  const toast = document.getElementById("aviso-flutuante");

  let toastTimer;
  let medicamentos = loadMedicamentos();

  function loadMedicamentos() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMedicamentos));
    } catch (error) {
      return [...defaultMedicamentos];
    }
    return [...defaultMedicamentos];
  }

  function saveMedicamentos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicamentos));
    } catch (error) {
      // A tela continua funcionando durante a sessão mesmo sem armazenamento local.
    }
  }

  function createInfo(label, value) {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    if (value instanceof Node) detail.appendChild(value);
    else detail.textContent = value;
    wrapper.append(term, detail);
    return wrapper;
  }

  function createCard(medicamento) {
    const status = statusConfig[medicamento.status] || statusConfig.pendente;

    const item = document.createElement("li");
    item.className = "cartao-medicamento";

    const photo = document.createElement("div");
    photo.className = "foto-produto";
    photo.setAttribute("role", "img");
    photo.setAttribute("aria-label", `Foto do produto ${medicamento.nome}`);
    photo.innerHTML =
      '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9.5" r="1.6"></circle><path d="m3 17 5.5-5 4 3.5 3-2.5L21 17"></path></svg><span>Foto do produto</span>';

    const badge = document.createElement("span");
    badge.className = `situacao ${status.className}`;
    badge.textContent = status.label;

    const data = document.createElement("dl");
    data.className = "dados-medicamento";
    data.append(
      createInfo("Nome do produto", medicamento.nome),
      createInfo("Uso indicado", medicamento.uso),
      createInfo("Dose", medicamento.dose),
      createInfo("Status", badge),
    );

    item.append(photo, data);
    return item;
  }

  function render() {
    list.replaceChildren(...medicamentos.map(createCard));
    emptyState.hidden = medicamentos.length > 0;
    const total = medicamentos.length;
    totalLabel.textContent = `${total} ${total === 1 ? "medicamento" : "medicamentos"}`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visivel");
    toastTimer = window.setTimeout(() => toast.classList.remove("visivel"), 3000);
  }

  function openDialog() {
    dialogError.textContent = "";
    dialog.showModal();
    document.getElementById("nome-medicamento").focus();
  }

  function closeDialog() {
    dialog.close();
    form.reset();
    dialogError.textContent = "";
  }

  function addMedicamento(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const nome = String(formData.get("nome") || "").trim();
    const uso = String(formData.get("uso") || "").trim();
    const dose = String(formData.get("dose") || "").trim();

    if (!nome || !uso || !dose) {
      dialogError.textContent = "Preencha nome, uso indicado e dose.";
      return;
    }

    // Todo medicamento novo começa pendente; a farmácia muda a situação depois.
    medicamentos.push({
      id: `medicamento-${Date.now()}`,
      nome,
      uso,
      dose,
      status: "pendente",
    });
    saveMedicamentos();
    render();
    closeDialog();
    showToast("Medicamento adicionado com sucesso.");
  }

  document
    .getElementById("abrir-modal-medicamento")
    .addEventListener("click", openDialog);
  document
    .getElementById("fechar-modal-medicamento")
    .addEventListener("click", closeDialog);
  document
    .getElementById("cancelar-medicamento")
    .addEventListener("click", closeDialog);
  form.addEventListener("submit", addMedicamento);
  form.addEventListener("input", () => {
    dialogError.textContent = "";
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  render();
})();
