(function () {
  "use strict";

  // Carrega dados do usuário logado se disponíveis
  try {
    const dataStr = sessionStorage.getItem("farmaSUSUsuario");
    if (dataStr) {
      const user = JSON.parse(dataStr);
      const nomeEl = document.querySelector(".nome-perfil");
      const avatarEl = document.querySelector(".avatar-perfil");
      const textoIntro = document.querySelector(".texto-introducao");
      const displayName = user.name || (user.email ? user.email.split("@")[0] : "Usuário");
      if (nomeEl) nomeEl.textContent = displayName;
      if (textoIntro) textoIntro.textContent = `Olá, ${displayName}. Aqui está seu resumo de hoje.`;
      if (avatarEl && displayName) {
        const parts = displayName.trim().split(" ");
        avatarEl.textContent = parts.length > 1
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : displayName.slice(0, 2).toUpperCase();
      }
    }
  } catch (_) {}

  // Mesma chave usada por painel-informacoes.js, que grava os avisos.
  const STORAGE_KEY = "farmaSUSDemoNotificationsV2";

  const titulo = document.getElementById("titulo-ultimo-aviso");
  const texto = document.getElementById("texto-ultimo-aviso");
  if (!titulo || !texto) return;

  function carregarAvisos() {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      const avisos = salvo ? JSON.parse(salvo) : [];
      return Array.isArray(avisos) ? avisos : [];
    } catch (erro) {
      return [];
    }
  }

  function obterUltimoAviso(avisos) {
    return [...avisos].sort(
      (primeiro, segundo) =>
        new Date(segundo.createdAt) - new Date(primeiro.createdAt),
    )[0];
  }

  const ultimo = obterUltimoAviso(carregarAvisos());
  if (!ultimo) return; // Sem avisos: mantém a mensagem padrão do HTML.

  titulo.textContent = ultimo.title;
  titulo.hidden = false;
  texto.textContent = ultimo.message;
})();
