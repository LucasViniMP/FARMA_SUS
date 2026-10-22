(function () {
  "use strict";

  const MIN_PASSWORD_LENGTH = 8;

  const requiredMessages = {
    fullName: "Informe seu nome completo.",
    cpf: "Informe seu CPF.",
    birthDate: "Informe sua data de nascimento.",
    email: "Informe seu e-mail.",
    password: "Informe sua senha.",
    confirmPassword: "Confirme sua senha."
  };

  function getErrorElement(field) {
    const describedBy = (field.getAttribute("aria-describedby") || "").split(" ");
    const errorId = describedBy.find((id) => id.endsWith("-error"));
    return errorId ? document.getElementById(errorId) : null;
  }

  function setFieldError(field, message) {
    const errorElement = getErrorElement(field);
    field.setAttribute("aria-invalid", "true");
    if (errorElement) errorElement.textContent = message;
  }

  function clearFieldError(field) {
    const errorElement = getErrorElement(field);
    field.removeAttribute("aria-invalid");
    if (errorElement) errorElement.textContent = "";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function digitsOnly(value) {
    return value.replace(/\D/g, "");
  }

  function formatCpf(value) {
    return digitsOnly(value)
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function isValidCpf(value) {
    const cpf = digitsOnly(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calculateDigit = (length) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(cpf[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
  }

  function isStrongPassword(value) {
    return (
      value.length >= MIN_PASSWORD_LENGTH &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  }

  function getLocalToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function validateField(field, form) {
    const value = field.value.trim();
    let message = "";

    if (field.required && !value) {
      message = requiredMessages[field.name] || "Preencha este campo.";
    } else if (field.name === "email" && !isValidEmail(value)) {
      message = "Informe um e-mail válido.";
    } else if (field.name === "cpf" && !isValidCpf(value)) {
      message = "Informe um CPF válido com 11 números.";
    } else if (field.name === "birthDate" && value > getLocalToday()) {
      message = "A data de nascimento não pode estar no futuro.";
    } else if (field.name === "password" && !isStrongPassword(value)) {
      message = "Use 8 ou mais caracteres, com maiúscula, minúscula, número e caractere especial.";
    } else if (field.name === "confirmPassword") {
      const password = form.elements.password.value;
      if (value !== password) message = "As senhas não coincidem.";
    }

    if (message) {
      setFieldError(field, message);
      return false;
    }

    clearFieldError(field);
    return true;
  }

  function validateForm(form) {
    const fields = Array.from(form.querySelectorAll("input"));
    const invalidFields = fields.filter((field) => !validateField(field, form));

    return {
      isValid: invalidFields.length === 0,
      invalidFields
    };
  }

  function showFormMessage(form, type, message) {
    const messageArea = form.querySelector("[data-form-message]");
    messageArea.className = `form-message is-visible is-${type}`;
    messageArea.textContent = message;
  }

  function clearFormMessage(form) {
    const messageArea = form.querySelector("[data-form-message]");
    messageArea.className = "form-message";
    messageArea.textContent = "";
  }

  function getLoginCredentials(form) {
    return {
      email: form.elements.email.value.trim(),
      password: form.elements.password.value
    };
  }

  function getRegistrationData(form) {
    return {
      credentials: {
        email: form.elements.email.value.trim(),
        password: form.elements.password.value
      },
      profile: {
        fullName: form.elements.fullName.value.trim(),
        cpf: form.elements.cpf.value.trim(),
        birthDate: form.elements.birthDate.value,
        email: form.elements.email.value.trim()
      }
    };
  }

  // Ponto de integração futura: Firebase Authentication recebe somente as credenciais.
  async function signInWithFirebase(credentials) {
    return { mode: "demo", credentials: { email: credentials.email } };
  }

  // Primeiro fluxo a integrar. A senha fica exclusivamente no Authentication.
  async function registerWithFirebase(registrationData) {
    const { credentials, profile } = registrationData;

    // Futuro: createUserWithEmailAndPassword(auth, credentials.email, credentials.password)
    // Futuro: setDoc(doc(db, "users", uid), { ...profile, createdAt: serverTimestamp() })
    // Nunca inclua credentials.password no documento do Firestore.
    return {
      mode: "demo",
      authentication: { email: credentials.email },
      firestoreProfile: { ...profile }
    };
  }

  async function handleValidSubmit(form) {
    if (form.dataset.formType === "register") {
      await registerWithFirebase(getRegistrationData(form));
      showFormMessage(
        form,
        "success",
        "Cadastro validado com sucesso! Modo de demonstração: nenhum dado foi enviado."
      );
      return;
    }

    await signInWithFirebase(getLoginCredentials(form));
    showFormMessage(
      form,
      "success",
      "Login validado com sucesso! Modo de demonstração: nenhuma autenticação foi realizada."
    );
  }

  function setupForm(form) {
    const fields = Array.from(form.querySelectorAll("input"));

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validateField(field, form);
        clearFormMessage(form);

        if (field.name === "password" && form.elements.confirmPassword) {
          const confirmation = form.elements.confirmPassword;
          if (confirmation.value && confirmation.getAttribute("aria-invalid") === "true") {
            validateField(confirmation, form);
          }
        }
      });

      field.addEventListener("blur", () => {
        if (field.value || field.getAttribute("aria-invalid") === "true") {
          validateField(field, form);
        }
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFormMessage(form);

      const result = validateForm(form);
      if (!result.isValid) {
        showFormMessage(
          form,
          "error",
          "Revise os campos indicados antes de continuar."
        );
        result.invalidFields[0].focus();
        return;
      }

      await handleValidSubmit(form);
    });
  }

  function setupCpfMask() {
    const cpfField = document.getElementById("cpf");
    if (!cpfField) return;

    cpfField.addEventListener("input", () => {
      cpfField.value = formatCpf(cpfField.value);
    });
  }

  function setupBirthDateLimit() {
    const birthDateField = document.getElementById("birth-date");
    if (!birthDateField) return;
    birthDateField.max = getLocalToday();
  }

  function setupPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        button.setAttribute("aria-pressed", String(willShow));
        button.setAttribute(
          "aria-label",
          willShow ? "Ocultar senha" : "Mostrar senha"
        );
        input.focus();
      });
    });
  }

  setupCpfMask();
  setupBirthDateLimit();
  document.querySelectorAll("form[data-form-type]").forEach(setupForm);
  setupPasswordToggles();

  // API interna separada para facilitar a substituição pelos SDKs do Firebase.
  window.FarmaSUSAuth = {
    getLoginCredentials,
    getRegistrationData,
    signInWithFirebase,
    registerWithFirebase
  };
})();
