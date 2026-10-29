(function () {
  "use strict";

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
