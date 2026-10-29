document.addEventListener("DOMContentLoaded", () => {
  const CHAVE_PERFIL = "farmasus_dados_perfil";

  const dadosIniciais = {
    nomeCompleto: "Yasmin Rios",
    email: "yasmin.rios@exemplo.com",
    telefone: "(93) 99124-8840",
    cpf: "048.921.652-10",
  };

  const formulario = document.getElementById("formulario-perfil");
  const campoNome = document.getElementById("nome-completo");
  const campoEmail = document.getElementById("email-perfil");
  const campoTelefone = document.getElementById("telefone");
  const campoCpf = document.getElementById("cpf");

  const erroNome = document.getElementById("erro-nome-completo");
  const erroEmail = document.getElementById("erro-email-perfil");
  const erroTelefone = document.getElementById("erro-telefone");
  const erroCpf = document.getElementById("erro-cpf");

  const nomeLateral = document.getElementById("nome-usuario-lateral");
  const botaoEditar = document.getElementById("botao-editar-perfil");
  const botaoCancelar = document.getElementById("cancelar-edicao");
  const containerAcoes = document.getElementById("acoes-perfil");
  const avisoFlutuante = document.getElementById("aviso-flutuante");

  const campos = [campoNome, campoEmail, campoTelefone, campoCpf];
  let editando = false;
  let temporizadorAviso = null;

  function carregarPerfil() {
    try {
      const salvo = localStorage.getItem(CHAVE_PERFIL);
      const dados = salvo ? JSON.parse(salvo) : dadosIniciais;

      campoNome.value = dados.nomeCompleto || dadosIniciais.nomeCompleto;
      campoEmail.value = dados.email || dadosIniciais.email;
      campoTelefone.value = dados.telefone || dadosIniciais.telefone;
      campoCpf.value = dados.cpf || dadosIniciais.cpf;

      if (nomeLateral) {
        nomeLateral.textContent = campoNome.value;
      }
    } catch {
      if (nomeLateral) {
        nomeLateral.textContent = dadosIniciais.nomeCompleto;
      }
    }
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
    erroNome.textContent = "";
    erroEmail.textContent = "";
    erroTelefone.textContent = "";
    erroCpf.textContent = "";
  }

  function alternarModoEdicao(ativo) {
    editando = ativo;

    campos.forEach((input) => {
      if (ativo) {
        input.removeAttribute("readonly");
      } else {
        input.setAttribute("readonly", "readonly");
      }
    });

    containerAcoes.hidden = !ativo;
    botaoEditar.hidden = ativo;
    botaoEditar.setAttribute("aria-pressed", String(ativo));

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
      erroNome.textContent = "Informe seu nome completo.";
      valido = false;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campoEmail.value.trim());
    if (!emailValido) {
      erroEmail.textContent = "Informe um e-mail válido.";
      valido = false;
    }

    if (campoTelefone.value.replace(/\D/g, "").length < 10) {
      erroTelefone.textContent = "Informe um telefone válido com DDD.";
      valido = false;
    }

    if (campoCpf.value.replace(/\D/g, "").length !== 11) {
      erroCpf.textContent = "Informe um CPF válido com 11 dígitos.";
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

  campoTelefone.addEventListener("input", (evento) => {
    if (!editando) return;
    evento.target.value = formatarTelefone(evento.target.value);
    erroTelefone.textContent = "";
  });

  campoCpf.addEventListener("input", (evento) => {
    if (!editando) return;
    evento.target.value = formatarCpf(evento.target.value);
    erroCpf.textContent = "";
  });

  botaoEditar.addEventListener("click", () => {
    alternarModoEdicao(true);
  });

  botaoCancelar.addEventListener("click", () => {
    alternarModoEdicao(false);
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!editando || !validarCampos()) return;

    const dadosAtualizados = {
      nomeCompleto: campoNome.value.trim(),
      email: campoEmail.value.trim(),
      telefone: campoTelefone.value.trim(),
      cpf: campoCpf.value.trim(),
    };

    try {
      localStorage.setItem(CHAVE_PERFIL, JSON.stringify(dadosAtualizados));
    } catch {
      // Ignora erro caso o armazenamento esteja desabilitado
    }

    if (nomeLateral) {
      nomeLateral.textContent = dadosAtualizados.nomeCompleto;
    }

    alternarModoEdicao(false);
    mostrarAviso("Perfil atualizado com sucesso.");
  });

  carregarPerfil();
});