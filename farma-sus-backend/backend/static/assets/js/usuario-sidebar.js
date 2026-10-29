// Script global para sincronizar os dados do usuário logado na barra lateral de todas as páginas
(function () {
  "use strict";

  function sincronizarUsuarioLateral() {
    try {
      let user = null;
      const salvoSessao = sessionStorage.getItem("farmaSUSUsuario");
      if (salvoSessao) {
        user = JSON.parse(salvoSessao);
      } else {
        const salvoPerfil = localStorage.getItem("farmasus_dados_perfil");
        if (salvoPerfil) {
          user = JSON.parse(salvoPerfil);
        }
      }

      if (!user) return;

      const nome = user.name || user.nomeCompleto || (user.email ? user.email.split("@")[0] : "");
      if (!nome) return;

      const nomeElems = document.querySelectorAll(".nome-perfil, #user-name, #nome-usuario-lateral");
      nomeElems.forEach((elem) => {
        elem.textContent = nome;
      });

      const partes = nome.trim().split(" ");
      const iniciais = partes.length > 1
        ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
        : partes[0].slice(0, 2).toUpperCase();

      const avatarElems = document.querySelectorAll(".avatar-perfil, #user-avatar");
      avatarElems.forEach((elem) => {
        elem.textContent = iniciais;
      });
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sincronizarUsuarioLateral);
  } else {
    sincronizarUsuarioLateral();
  }
})();
