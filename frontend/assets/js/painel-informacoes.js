(function () {
  "use strict";

  const STORAGE_KEY = "farmaSUSDemoNotificationsV2";
  const SUMMARY_KEY = "farmaSUSSummaryDismissed";

  const categoryConfig = {
    medication: {
      label: "Medicamento disponível",
      icon: '<path d="M8.5 4.5a4 4 0 0 1 5.7 0l5.3 5.3a4 4 0 0 1-5.7 5.7l-5.3-5.3a4 4 0 0 1 0-5.7Z"></path><path d="m10 12 4-4"></path>'
    },
    pickup: {
      label: "Lembrete de retirada",
      icon: '<path d="M6 8h12l-1 12H7L6 8Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path>'
    },
    guidance: {
      label: "Orientação farmacêutica",
      icon: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"></path><path d="M12 11v5M12 8h.01"></path>'
    },
    exam: {
      label: "Exames",
      icon: '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 3v3h6V3M9 11h6M9 15h6"></path>'
    },
    general: {
      label: "Informação geral",
      icon: '<path d="M4 5h16v14H4z"></path><path d="m4 7 8 6 8-6"></path>'
    }
  };

  const now = Date.now();
  const defaultNotifications = [
    {
      id: "demo-medication",
      type: "medication",
      title: "Seu medicamento está disponível",
      message: "A retirada já pode ser realizada na unidade selecionada. Leve um documento com foto e a receita válida.",
      createdAt: new Date(now - 32 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: "demo-guidance",
      type: "guidance",
      title: "Orientação importante",
      message: "Confira os horários de uso informados na receita e procure a equipe farmacêutica caso tenha alguma dúvida.",
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: "demo-pickup",
      type: "pickup",
      title: "Lembrete para retirada",
      message: "Sua retirada está prevista para amanhã. Confira o horário de funcionamento antes de ir até a unidade.",
      createdAt: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: "demo-exam",
      type: "exam",
      title: "Resultado atualizado",
      message: "Há uma nova informação disponível sobre o acompanhamento do seu atendimento na unidade de saúde.",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: "demo-general",
      type: "general",
      title: "Horário de atendimento",
      message: "Nesta sexta-feira, a farmácia funcionará em horário ampliado para retirada de medicamentos.",
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    }
  ];

  const page = document.body;
  const main = document.getElementById("conteudo-informacoes");
  const list = document.getElementById("lista-avisos");
  const emptyState = document.getElementById("estado-vazio");
  const unreadSummary = document.getElementById("resumo-nao-lidas");
  const totalLabel = document.getElementById("total-avisos");
  const summary = document.getElementById("resumo-notificacoes");
  const loadMoreButton = document.getElementById("botao-ver-mais");
  const loadMoreText = loadMoreButton.querySelector("span");
  const addDialog = document.getElementById("modal-aviso");
  const detailsDialog = document.getElementById("modal-detalhes");
  const form = document.getElementById("formulario-aviso");
  const messageField = document.getElementById("mensagem-aviso");
  const messageCount = document.getElementById("contagem-mensagem");
  const dialogError = document.getElementById("erro-modal");
  const toast = document.getElementById("aviso-flutuante");
  const detailsCategory = document.getElementById("categoria-detalhes");
  const detailsIcon = document.getElementById("icone-detalhes");
  const detailsTitle = document.getElementById("titulo-detalhes");
  const detailsMessage = document.getElementById("mensagem-detalhes");
  const detailsDate = document.getElementById("data-detalhes");
  const detailsReadButton = document.getElementById("marcar-como-lida");

  let currentFilter = "todos";
  let expanded = false;
  let selectedNotificationId = null;
  let toastTimer;
  let resizeTimer;
  let notifications = loadNotifications();

  function loadNotifications() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultNotifications));
    } catch (error) {
      return [...defaultNotifications];
    }
    return [...defaultNotifications];
  }

  function saveNotifications() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      // A tela continua funcionando durante a sessão mesmo sem armazenamento local.
    }
  }

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }

  function formatRelativeDate(isoDate) {
    const date = new Date(isoDate);
    const difference = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.floor(difference / 60000));
    if (minutes < 1) return "Agora";
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} ${pluralize(hours, "hora", "horas")}`;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  }

  function formatFullDate(isoDate) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date(isoDate));
  }

  function getVisibleLimit() {
    if (window.matchMedia("(max-width: 760px)").matches) return 3;
    return window.innerHeight < 820 ? 2 : 4;
  }

  function getCategory(type) {
    return categoryConfig[type] || categoryConfig.general;
  }

  function createSvg(type) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = getCategory(type).icon;
    return svg;
  }

  function createNotificationCard(notification) {
    const card = document.createElement("button");
    card.className = `cartao-aviso${notification.read ? "" : " nao-lido"}`;
    card.type = "button";
    card.dataset.avisoId = notification.id;
    card.setAttribute("aria-label", `Abrir aviso: ${notification.title}`);
    card.addEventListener("click", () => openDetails(notification.id));

    const topline = document.createElement("div");
    topline.className = "topo-cartao";

    const badge = document.createElement("span");
    badge.className = "etiqueta-categoria";
    badge.dataset.tipo = notification.type;
    badge.textContent = getCategory(notification.type).label;
    topline.appendChild(badge);

    if (!notification.read) {
      const unreadDot = document.createElement("span");
      unreadDot.className = "indicador-nao-lido";
      unreadDot.title = "Não lida";
      topline.appendChild(unreadDot);
    }

    const title = document.createElement("h3");
    title.textContent = notification.title;

    const message = document.createElement("p");
    message.className = "mensagem-aviso";
    message.textContent = notification.message;

    const footer = document.createElement("div");
    footer.className = "rodape-cartao";

    const date = document.createElement("time");
    date.className = "data-aviso";
    date.dateTime = notification.createdAt;
    date.textContent = formatRelativeDate(notification.createdAt);

    const openLabel = document.createElement("span");
    openLabel.className = "abrir-aviso";
    openLabel.textContent = "Abrir aviso";

    footer.append(date, openLabel);
    card.append(topline, title, message, footer);
    return card;
  }

  function getFilteredNotifications() {
    return notifications
      .filter((notification) => currentFilter === "todos" || !notification.read)
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  }

  function renderNotifications() {
    const filtered = getFilteredNotifications();
    const limit = getVisibleLimit();
    if (filtered.length <= limit) expanded = false;
    const displayed = expanded ? filtered : filtered.slice(0, limit);

    list.replaceChildren(...displayed.map(createNotificationCard));
    emptyState.hidden = filtered.length > 0;

    const unreadCount = notifications.filter((notification) => !notification.read).length;
    unreadSummary.textContent = unreadCount
      ? `${unreadCount} ${pluralize(unreadCount, "notificação não lida", "notificações não lidas")}`
      : "Nenhuma notificação não lida";

    totalLabel.textContent = currentFilter === "nao-lidas"
      ? `${filtered.length} ${pluralize(filtered.length, "não lida", "não lidas")}`
      : `${notifications.length} ${pluralize(notifications.length, "aviso", "avisos")}`;

    loadMoreButton.hidden = filtered.length <= limit;
    loadMoreText.textContent = expanded ? "Mostrar menos" : "Ver mais avisos";
    page.classList.toggle("expandido", expanded);
  }

  function updateFilterButtons() {
    document.querySelectorAll("[data-filtro]").forEach((button) => {
      const isActive = button.dataset.filtro === currentFilter;
      button.classList.toggle("ativo", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function openDetails(id) {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;

    selectedNotificationId = id;
    detailsIcon.replaceChildren(createSvg(notification.type));
    detailsCategory.dataset.tipo = notification.type;
    detailsCategory.textContent = getCategory(notification.type).label;
    detailsTitle.textContent = notification.title;
    detailsMessage.textContent = notification.message;
    detailsDate.dateTime = notification.createdAt;
    detailsDate.textContent = formatFullDate(notification.createdAt);
    detailsReadButton.disabled = notification.read;
    detailsReadButton.textContent = notification.read ? "Aviso lido" : "Marcar como lida";
    detailsDialog.showModal();
  }

  function closeDetails() {
    detailsDialog.close();
    selectedNotificationId = null;
  }

  function markSelectedAsRead() {
    if (!selectedNotificationId) return;
    notifications = notifications.map((notification) =>
      notification.id === selectedNotificationId ? { ...notification, read: true } : notification
    );
    saveNotifications();
    renderNotifications();
    detailsReadButton.disabled = true;
    detailsReadButton.textContent = "Aviso lido";
    showToast("Aviso marcado como lido.");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visivel");
    toastTimer = window.setTimeout(() => toast.classList.remove("visivel"), 3000);
  }

  function openAddDialog() {
    dialogError.textContent = "";
    addDialog.showModal();
    document.getElementById("titulo-aviso").focus();
  }

  function closeAddDialog() {
    addDialog.close();
    form.reset();
    messageCount.textContent = "0";
    dialogError.textContent = "";
  }

  function addNotification(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const title = String(formData.get("titulo") || "").trim();
    const message = String(formData.get("mensagem") || "").trim();

    if (!title || !message) {
      dialogError.textContent = "Preencha o título e a mensagem antes de publicar.";
      return;
    }

    notifications.unshift({
      id: `notice-${Date.now()}`,
      type: String(formData.get("tipo") || "general"),
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false
    });
    saveNotifications();
    currentFilter = "todos";
    expanded = false;
    updateFilterButtons();
    renderNotifications();
    closeAddDialog();
    showToast("Aviso adicionado com sucesso.");
  }

  function toggleMore() {
    expanded = !expanded;
    renderNotifications();
    if (!expanded) main.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("fechar-resumo").addEventListener("click", () => {
    summary.hidden = true;
    sessionStorage.setItem(SUMMARY_KEY, "true");
  });

  document.querySelectorAll("[data-filtro]").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filtro;
      expanded = false;
      updateFilterButtons();
      renderNotifications();
    });
  });

  loadMoreButton.addEventListener("click", toggleMore);
  document.getElementById("abrir-modal-aviso").addEventListener("click", openAddDialog);
  document.getElementById("fechar-modal-aviso").addEventListener("click", closeAddDialog);
  document.getElementById("cancelar-aviso").addEventListener("click", closeAddDialog);
  form.addEventListener("submit", addNotification);

  messageField.addEventListener("input", () => {
    messageCount.textContent = String(messageField.value.length);
    dialogError.textContent = "";
  });

  document.getElementById("fechar-modal-detalhes").addEventListener("click", closeDetails);
  document.getElementById("fechar-detalhes").addEventListener("click", closeDetails);
  detailsReadButton.addEventListener("click", markSelectedAsRead);

  [addDialog, detailsDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      if (dialog === addDialog) closeAddDialog();
      else closeDetails();
    });
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderNotifications, 100);
  });

  if (sessionStorage.getItem(SUMMARY_KEY) === "true") summary.hidden = true;
  renderNotifications();
})();
