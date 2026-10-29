(function () {
  "use strict";

  const TAMANHO_MINIMO_SENHA = 8;

  const mensagensObrigatorias = {
    nomeCompleto: "Informe seu nome completo.",
    cpf: "Informe seu CPF.",
    dataNascimento: "Informe sua data de nascimento.",
    email: "Informe seu e-mail.",
    senha: "Informe sua senha.",
    confirmarSenha: "Confirme sua senha.",
  };

  function obterElementoErro(field) {
    const describedBy = (field.getAttribute("aria-describedby") || "").split(
      " ",
    );
    const errorId = describedBy.find((id) => id.startsWith("erro-"));
    return errorId ? document.getElementById(errorId) : null;
  }

  function mostrarErroCampo(field, message) {
    const errorElement = obterElementoErro(field);
    field.setAttribute("aria-invalid", "true");
    if (errorElement) errorElement.textContent = message;
  }

  function limparErroCampo(field) {
    const errorElement = obterElementoErro(field);
    field.removeAttribute("aria-invalid");
    if (errorElement) errorElement.textContent = "";
  }

  function emailValido(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function somenteNumeros(value) {
    return value.replace(/\D/g, "");
  }

  function formatarCpf(value) {
    return somenteNumeros(value)
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function cpfValido(value) {
    const cpf = somenteNumeros(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calculateDigit = (length) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(cpf[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };

    return (
      calculateDigit(9) === Number(cpf[9]) &&
      calculateDigit(10) === Number(cpf[10])
    );
  }

  function senhaForte(value) {
    return (
      value.length >= TAMANHO_MINIMO_SENHA &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  }

  function obterDataAtual() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function validarCampo(field, form) {
    const value = field.value.trim();
    let message = "";

    if (field.required && !value) {
      message = mensagensObrigatorias[field.name] || "Preencha este campo.";
    } else if (field.name === "email" && !emailValido(value)) {
      message = "Informe um e-mail válido.";
    } else if (field.name === "cpf" && !cpfValido(value)) {
      message = "Informe um CPF válido com 11 números.";
    } else if (field.name === "dataNascimento" && value > obterDataAtual()) {
      message = "A data de nascimento não pode estar no futuro.";
    } else if (field.name === "senha" && !senhaForte(value)) {
      message =
        "Use 8 ou mais caracteres, com maiúscula, minúscula, número e caractere especial.";
    } else if (field.name === "confirmarSenha") {
      const password = form.elements.senha.value;
      if (value !== password) message = "As senhas não coincidem.";
    }

    if (message) {
      mostrarErroCampo(field, message);
      return false;
    }

    limparErroCampo(field);
    return true;
  }

  function validarFormulario(form) {
    const fields = Array.from(form.querySelectorAll("input"));
    const invalidFields = fields.filter((field) => !validarCampo(field, form));

    return {
      valido: invalidFields.length === 0,
      camposInvalidos: invalidFields,
    };
  }

  function mostrarMensagem(form, type, message) {
    const messageArea = form.querySelector("[data-mensagem-formulario]");
    messageArea.className = `mensagem-formulario visivel ${type}`;
    messageArea.textContent = message;
  }

  function limparMensagem(form) {
    const messageArea = form.querySelector("[data-mensagem-formulario]");
    messageArea.className = "mensagem-formulario";
    messageArea.textContent = "";
  }

  function obterCredenciaisLogin(form) {
    return {
      email: form.elements.email.value.trim(),
      senha: form.elements.senha.value,
    };
  }

  function obterDadosCadastro(form) {
    return {
      credenciais: {
        email: form.elements.email.value.trim(),
        senha: form.elements.senha.value,
      },
      perfil: {
        nomeCompleto: form.elements.nomeCompleto.value.trim(),
        cpf: form.elements.cpf.value.trim(),
        dataNascimento: form.elements.dataNascimento.value,
        email: form.elements.email.value.trim(),
      },
    };
  }

  // Ponto de integração futura: Firebase Authentication recebe somente as credenciais.
  async function entrarComFirebase(credenciais) {
    return { modo: "demonstracao", credenciais: { email: credenciais.email } };
  }

  // Primeiro fluxo a integrar. A senha fica exclusivamente no Authentication.
  async function cadastrarComFirebase(dadosCadastro) {
    const { credenciais, perfil } = dadosCadastro;

    // Futuro: createUserWithEmailAndPassword(auth, credenciais.email, credenciais.senha)
    // Futuro: setDoc(doc(db, "usuarios", uid), { ...perfil, criadoEm: serverTimestamp() })
    // Nunca inclua credenciais.senha no documento do Firestore.
    return {
      modo: "demonstracao",
      autenticacao: { email: credenciais.email },
      perfilFirestore: { ...perfil },
    };
  }

  async function processarFormularioValido(form) {
    if (form.dataset.tipoFormulario === "cadastro") {
      await cadastrarComFirebase(obterDadosCadastro(form));
      mostrarMensagem(
        form,
        "sucesso",
        "Cadastro validado com sucesso! Modo de demonstração: nenhum dado foi enviado.",
      );
      return;
    }

    await entrarComFirebase(obterCredenciaisLogin(form));
    sessionStorage.setItem(
      "farmaSUSUsuario",
      JSON.stringify({ email: form.elements.email.value.trim() }),
    );
    mostrarMensagem(
      form,
      "sucesso",
      "Login validado com sucesso! Abrindo área de início...",
    );
    window.setTimeout(() => {
      window.location.href = "inicio.html";
    }, 900);
  }

  function configurarFormulario(form) {
    const fields = Array.from(form.querySelectorAll("input"));

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true")
          validarCampo(field, form);
        limparMensagem(form);

        if (field.name === "senha" && form.elements.confirmarSenha) {
          const confirmation = form.elements.confirmarSenha;
          if (
            confirmation.value &&
            confirmation.getAttribute("aria-invalid") === "true"
          ) {
            validarCampo(confirmation, form);
          }
        }
      });

      field.addEventListener("blur", () => {
        if (field.value || field.getAttribute("aria-invalid") === "true") {
          validarCampo(field, form);
        }
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      limparMensagem(form);

      const result = validarFormulario(form);
      if (!result.valido) {
        mostrarMensagem(
          form,
          "erro",
          "Revise os campos indicados antes de continuar.",
        );
        result.camposInvalidos[0].focus();
        return;
      }

      await processarFormularioValido(form);
    });
  }

  function configurarMascaraCpf() {
    const cpfField = document.getElementById("cpf");
    if (!cpfField) return;

    cpfField.addEventListener("input", () => {
      cpfField.value = formatarCpf(cpfField.value);
    });
  }

  function configurarLimiteNascimento() {
    const birthDateField = document.getElementById("data-nascimento");
    if (!birthDateField) return;
    birthDateField.max = obterDataAtual();
  }

  function configurarBotoesSenha() {
    document.querySelectorAll("[data-campo-senha]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.campoSenha);
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        button.setAttribute("aria-pressed", String(willShow));
        button.setAttribute(
          "aria-label",
          willShow ? "Ocultar senha" : "Mostrar senha",
        );
        input.focus();
      });
    });
  }

  configurarMascaraCpf();
  configurarLimiteNascimento();
  document
    .querySelectorAll("form[data-tipo-formulario]")
    .forEach(configurarFormulario);
  configurarBotoesSenha();

  // API interna separada para facilitar a substituição pelos SDKs do Firebase.
  window.FarmaSUSAutenticacao = {
    obterCredenciaisLogin,
    obterDadosCadastro,
    entrarComFirebase,
    cadastrarComFirebase,
  };
})();
