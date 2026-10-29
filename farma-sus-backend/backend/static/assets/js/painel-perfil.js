document.addEventListener("DOMContentLoaded", () => {
  const CHAVE_PERFIL = "farmasus_dados_perfil";

  const formulario = document.getElementById("formulario-perfil");
  const campoNome = document.getElementById("nome-completo");
  const campoEmail = document.getElementById("email-perfil");
  const campoTelefone = document.getElementById("telefone");
  const campoCpf = document.getElementById("cpf");

  const erroNome = document.getElementById("erro-nome-completo");
  const erroEmail = document.getElementById("erro-email-perfil");
  const erroTelefone = document.getElementById("erro-telefone");
  const erroCpf = document.getElementById("erro-cpf");

  const botaoEditar = document.getElementById("botao-editar-perfil");
  const botaoCancelar = document.getElementById("cancelar-edicao");
  const containerAcoes = document.getElementById("acoes-perfil");
  const avisoFlutuante = document.getElementById("aviso-flutuante");

  const campos = [campoNome, campoEmail, campoTelefone, campoCpf];
  let editando = false;
  let temporizadorAviso = null;

  function obterDadosAutenticados() {
    try {
      const salvoSessao = sessionStorage.getItem("farmaSUSUsuario");
      if (salvoSessao) {
        return JSON.parse(salvoSessao);
      }
    } catch (_) {}

    try {
      const salvoPerfil = localStorage.getItem(CHAVE_PERFIL);
      if (salvoPerfil) {
        return JSON.parse(salvoPerfil);
      }
    } catch (_) {}

    return null;
  }

  function carregarPerfil() {
    const dados = obterDadosAutenticados();

    // Se não há usuário logado, redireciona para a tela de login
    if (!dados || (!dados.email && !dados.name && !dados.nomeCompleto)) {
      window.location.href = "index.html";
      return;
    }

    const nome = dados.name || dados.nomeCompleto || dados.email.split("@")[0];
    const email = dados.email || "";
    const telefone = dados.telefone || "";
    const cpf = dados.cpf || "";

    campoNome.value = nome;
    campoEmail.value = email;
    campoTelefone.value = telefone;
    campoCpf.value = cpf;

    // Atualizar visualmente o topo da página de perfil
    const tituloPerfil = document.getElementById("titulo-perfil");
    if (tituloPerfil) tituloPerfil.textContent = nome;

    const emailTopo = document.querySelector(".email-perfil-topo");
    if (emailTopo) emailTopo.textContent = email;

    // Atualizar avatares com as iniciais do nome real
    const partes = nome.trim().split(" ");
    const iniciais = partes.length > 1
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : partes[0].slice(0, 2).toUpperCase();

    const avatarGrande = document.querySelector(".avatar-perfil-grande");
    if (avatarGrande) avatarGrande.textContent = iniciais;

    const avatarMenu = document.querySelector(".avatar-perfil");
    if (avatarMenu) avatarMenu.textContent = iniciais;

    const nomeMenu = document.querySelector(".nome-perfil");
    if (nomeMenu) nomeMenu.textContent = nome;
  }

  function formatarTelefone(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  }

  function formatarCpf(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function limparErros() {
    if (erroNome) erroNome.textContent = "";
    if (erroEmail) erroEmail.textContent = "";
    if (erroTelefone) erroTelefone.textContent = "";
    if (erroCpf) erroCpf.textContent = "";
  }

  function alternarModoEdicao(ativo) {
    editando = ativo;

    campos.forEach((input) => {
      if (input) {
        if (ativo) {
          input.removeAttribute("readonly");
        } else {
          input.setAttribute("readonly", "readonly");
        }
      }
    });

    if (containerAcoes) containerAcoes.hidden = !ativo;
    if (botaoEditar) {
      botaoEditar.hidden = ativo;
      botaoEditar.setAttribute("aria-pressed", String(ativo));
    }

    limparErros();

    if (ativo) {
      campoNome.focus();
    } else {
      carregarPerfil();
    }
  }

  function validarCampos() {
    limparErros();
    let valido = true;

    if (campoNome.value.trim().length < 3) {
      if (erroNome) erroNome.textContent = "Informe seu nome completo.";
      valido = false;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campoEmail.value.trim());
    if (!emailValido) {
      if (erroEmail) erroEmail.textContent = "Informe um e-mail válido.";
      valido = false;
    }

    if (campoTelefone.value && campoTelefone.value.replace(/\D/g, "").length < 10) {
      if (erroTelefone) erroTelefone.textContent = "Informe um telefone válido com DDD.";
      valido = false;
    }

    if (campoCpf.value && campoCpf.value.replace(/\D/g, "").length !== 11) {
      if (erroCpf) erroCpf.textContent = "Informe um CPF válido com 11 dígitos.";
      valido = false;
    }

    return valido;
  }

  function mostrarAviso(texto) {
    if (!avisoFlutuante) return;
    avisoFlutuante.textContent = texto;
    avisoFlutuante.classList.add("visivel");

    if (temporizadorAviso) clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => {
      avisoFlutuante.classList.remove("visivel");
    }, 3000);
  }

  if (campoTelefone) {
    campoTelefone.addEventListener("input", (evento) => {
      if (!editando) return;
      evento.target.value = formatarTelefone(evento.target.value);
      if (erroTelefone) erroTelefone.textContent = "";
    });
  }

  if (campoCpf) {
    campoCpf.addEventListener("input", (evento) => {
      if (!editando) return;
      evento.target.value = formatarCpf(evento.target.value);
      if (erroCpf) erroCpf.textContent = "";
    });
  }

  if (botaoEditar) {
    botaoEditar.addEventListener("click", () => {
      alternarModoEdicao(true);
    });
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", () => {
      alternarModoEdicao(false);
    });
  }

  if (formulario) {
    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      if (!editando || !validarCampos()) return;

      const dadosAtualizados = {
        name: campoNome.value.trim(),
        nomeCompleto: campoNome.value.trim(),
        email: campoEmail.value.trim(),
        telefone: campoTelefone.value.trim(),
        cpf: campoCpf.value.trim(),
      };

      try {
        localStorage.setItem(CHAVE_PERFIL, JSON.stringify(dadosAtualizados));
        const salvoSessao = sessionStorage.getItem("farmaSUSUsuario");
        const objSessao = salvoSessao ? JSON.parse(salvoSessao) : {};
        sessionStorage.setItem("farmaSUSUsuario", JSON.stringify({ ...objSessao, ...dadosAtualizados }));
      } catch (_) {}

      alternarModoEdicao(false);
      mostrarAviso("Perfil atualizado com sucesso.");
    });
  }

  carregarPerfil();
});
