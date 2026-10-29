(function () {
  "use strict";

  // Mesma chave usada por painel-informacoes.js, que grava os avisos.
  const STORAGE_KEY = "farmaSUSDemoNotificationsV2";

  // Carregar dados reais do usuário logado na barra lateral
  function carregarUsuarioLogado() {
    try {
      const salvo = sessionStorage.getItem("farmaSUSUsuario");
      if (salvo) {
        const user = JSON.parse(salvo);
        const nomeElem = document.querySelector(".nome-perfil");
        const avatarElem = document.querySelector(".avatar-perfil");
        if (nomeElem && user.name) {
          nomeElem.textContent = user.name;
        }
        if (avatarElem && user.name) {
          const partes = user.name.trim().split(" ");
          avatarElem.textContent = partes.length > 1
            ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
            : partes[0].slice(0, 2).toUpperCase();
        }
      }
    } catch (_) {}
  }
  carregarUsuarioLogado();

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
