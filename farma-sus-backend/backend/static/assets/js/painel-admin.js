/* Área administrativa — FarmaSUS
 * Toda a comunicação com dados passa pelo objeto `api` (seção 2).
 * Sem token do Firebase = modo demonstração (dados salvos no navegador).
 * Com token = chama as rotas /api/admin/* do Flask. A tela não muda nos dois casos. */
(function () {
  "use strict";

  /* ============ 1. CONFIGURAÇÃO ============ */
  const API_BASE = "/api/admin";
  const CHAVE_DEMO = "farmasus_admin_demo";
  const token = () => localStorage.getItem("firebase_token") || "";
  const modoDemo = () => !token();

  // Bloqueio visual: quem está logado e não é admin volta ao login.
  // (A proteção real está no backend, com require_roles("admin").)
  try {
    const sessao = JSON.parse(
      sessionStorage.getItem("farmaSUSUsuario") || "null",
    );
    if (sessao && sessao.role && sessao.role !== "admin")
      location.replace("index.html");
  } catch (_) {}

  function limparSessao() {
    localStorage.removeItem("firebase_token");
    localStorage.removeItem("firebase_refresh_token");
    sessionStorage.removeItem("farmaSUSUsuario");
  }

  /* ============ 2. CAMADA DE DADOS (trocar aqui = ligar o banco) ============
   * NÍVEIS DE ACESSO (do menor para o maior privilégio):
   *   patient    -> padrão; todo cadastro novo (cadastro.html) nasce assim
   *   pharmacist -> só o admin concede, elevando uma conta que já existe
   *   admin      -> criado fora da tela (python create_user.py ... admin)
   * Por isso "Novo farmacêutico" NÃO cria conta nem senha: escolhe um paciente
   * já cadastrado e grava crf + unidade nele. Quem define o papel é sempre o
   * servidor; o navegador nunca envia "role".
   *
   * Rotas esperadas do backend (todas exigem papel "admin"):
   *   GET   /api/admin/summary           -> resumo (formato em resumoDemo)
   *   GET   /api/admin/units             -> { units: [{ id, name }] }
   *   GET   /api/admin/pharmacists       -> { pharmacists: [{ id, name, cpf, email,
   *                                          crf, unitId, unitName, active }] }
   *   POST  /api/admin/pharmacists       -> body: { userId, crf, unitId }
   *          Servidor: confirma que userId existe e hoje é "patient"; grava em
   *          users/<userId> role="pharmacist", active=true, crf, unitId, unitName
   *          (e quem concedeu + data). Resposta: { pharmacist }.
   *          Erros: 404 usuário não existe · 409 já é farmacêutico/admin · 422 dados.
   *   PATCH /api/admin/pharmacists/<id>  -> body: { crf?, unitId?, active? }
   *          Aceitar só esses 3 campos e só se o alvo já for farmacêutico.
   *          Nome, CPF e e-mail pertencem ao perfil do próprio usuário.
   *   GET   /api/admin/users             -> { users: [{ id, name, cpf, email,
   *                                          unitName, examStatus, medStatus,
   *                                          medicine }] }  (apenas role "patient")
   *   GET   /api/admin/stock             -> { stock: [{ id, medicine, unitName,
   *                                          quantity, minimum }] }
   *   PATCH /api/admin/stock/<id>        -> body: { quantity, minimum }
   * Erros: { "error": "mensagem em português" }. Use 401 só para sessão
   * inválida e 403 só para "não é admin" (a tela redireciona nesses casos);
   * regras de negócio devem usar 404/409/422. */
  const PADRAO = {
    versao: 3,
    notifications: 897,
    units: [{ id: "altamira", name: "Altamira" }],
    weeks: [38, 52, 31, 64, 45, 60, 68],
    pharmacists: [
      {
        id: "f1",
        name: "Rafael Nunes",
        cpf: "111.222.333-44",
        email: "rafael@exemplo.com",
        crf: "CRF-PA 1001",
        unitId: "altamira",
        unitName: "Altamira",
        active: true,
      },
      {
        id: "f2",
        name: "Beatriz Lima",
        cpf: "222.333.444-55",
        email: "beatriz@exemplo.com",
        crf: "CRF-PA 1002",
        unitId: "altamira",
        unitName: "Altamira",
        active: true,
      },
      {
        id: "f3",
        name: "Tiago Rocha",
        cpf: "333.444.555-66",
        email: "tiago@exemplo.com",
        crf: "CRF-PA 1003",
        unitId: "altamira",
        unitName: "Altamira",
        active: false,
      },
    ],
    users: [
      {
        id: "u1",
        name: "Maria da Silva",
        cpf: "123.456.789-00",
        email: "maria@exemplo.com",
        unitName: "Altamira",
        examStatus: "under_review",
        medStatus: "out",
        medicine: "Adalimumabe 40mg",
      },
      {
        id: "u2",
        name: "João Pereira",
        cpf: "234.567.891-00",
        email: "joao@exemplo.com",
        unitName: "Altamira",
        examStatus: "approved",
        medStatus: "available",
        medicine: "Insulina Glargina",
      },
      {
        id: "u3",
        name: "Ana Costa",
        cpf: "345.678.912-00",
        email: "ana@exemplo.com",
        unitName: "Altamira",
        examStatus: "approved",
        medStatus: "withdrawn",
        medicine: "Etanercepte 50mg",
      },
      {
        id: "u4",
        name: "Carlos Souza",
        cpf: "456.789.123-00",
        email: "carlos@exemplo.com",
        unitName: "Altamira",
        examStatus: "denied",
        medStatus: "out",
        medicine: "Metotrexato 25mg",
      },
      {
        id: "u5",
        name: "Fernanda Alves",
        cpf: "567.891.234-00",
        email: "fernanda@exemplo.com",
        unitName: "Altamira",
        examStatus: "approved",
        medStatus: "withdrawn",
        medicine: "Rituximabe 500mg",
      },
    ],
    stock: [
      {
        id: "m1",
        medicine: "Adalimumabe 40mg",
        unitName: "Altamira",
        quantity: 0,
        minimum: 20,
      },
      {
        id: "m2",
        medicine: "Insulina Glargina",
        unitName: "Altamira",
        quantity: 14,
        minimum: 30,
      },
      {
        id: "m3",
        medicine: "Etanercepte 50mg",
        unitName: "Altamira",
        quantity: 68,
        minimum: 25,
      },
      {
        id: "m4",
        medicine: "Metotrexato 25mg",
        unitName: "Altamira",
        quantity: 0,
        minimum: 40,
      },
      {
        id: "m5",
        medicine: "Rituximabe 500mg",
        unitName: "Altamira",
        quantity: 52,
        minimum: 15,
      },
    ],
  };
  let demo = null;
  try {
    demo = JSON.parse(localStorage.getItem(CHAVE_DEMO));
  } catch (_) {}
  // Dados salvos por uma versão antiga da tela não têm e-mail nem unidades.
  if (!demo || demo.versao !== PADRAO.versao)
    demo = JSON.parse(JSON.stringify(PADRAO));
  const salvarDemo = () =>
    localStorage.setItem(CHAVE_DEMO, JSON.stringify(demo));

  function resumoDemo() {
    const conta = (campo, valor) =>
      demo.users.filter((u) => u[campo] === valor).length;
    return {
      patients: demo.users.length,
      reportsMonth: demo.users.length,
      notifications: demo.notifications,
      activePharmacists: demo.pharmacists.filter((f) => f.active).length,
      awaitingMedicine: demo.users.filter(
        (u) => u.examStatus === "approved" && u.medStatus !== "withdrawn",
      ).length,
      exams: {
        approved: conta("examStatus", "approved"),
        under_review: conta("examStatus", "under_review"),
        denied: conta("examStatus", "denied"),
      },
      medicines: {
        withdrawn: conta("medStatus", "withdrawn"),
        available: conta("medStatus", "available"),
        out: conta("medStatus", "out"),
      },
      weeks: demo.weeks,
    };
  }

  async function renovarToken() {
    const refreshToken = localStorage.getItem("firebase_refresh_token");
    if (!refreshToken) return false;
    try {
      const r = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!r.ok) return false;
      const d = await r.json();
      localStorage.setItem("firebase_token", d.token);
      if (d.refreshToken)
        localStorage.setItem("firebase_refresh_token", d.refreshToken);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function http(metodo, caminho, corpo, jaRenovou) {
    const r = await fetch(API_BASE + caminho, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token(),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (r.status === 401) {
      // O token do Firebase dura ~1 h: tenta renovar uma vez antes de desistir.
      if (!jaRenovou && (await renovarToken()))
        return http(metodo, caminho, corpo, true);
      limparSessao();
      location.replace("index.html");
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const erro = new Error(
        d.error || "Erro " + r.status + " ao falar com o servidor.",
      );
      erro.status = r.status;
      throw erro;
    }
    return d;
  }

  const api = {
    resumo: async () => (modoDemo() ? resumoDemo() : http("GET", "/summary")),
    listarFarmaceuticos: async () =>
      modoDemo()
        ? demo.pharmacists
        : (await http("GET", "/pharmacists")).pharmacists,
    listarUnidades: async () =>
      modoDemo() ? demo.units : (await http("GET", "/units")).units,
    listarUsuarios: async () =>
      modoDemo() ? demo.users : (await http("GET", "/users")).users,
    listarEstoque: async () =>
      modoDemo() ? demo.stock : (await http("GET", "/stock")).stock,
    // Sem id: concede acesso de farmacêutico a um paciente ({ userId, crf, unitId }).
    // Com id: ajusta crf/unidade de quem já é farmacêutico ({ crf, unitId }).
    salvarFarmaceutico: async (dados, id) => {
      if (!modoDemo())
        return http(
          id ? "PATCH" : "POST",
          "/pharmacists" + (id ? "/" + id : ""),
          dados,
        );
      const unidade = demo.units.find((u) => u.id === dados.unitId);
      if (!unidade) throw new Error("Selecione uma unidade válida.");
      if (id) {
        Object.assign(
          demo.pharmacists.find((f) => f.id === id),
          {
            crf: dados.crf,
            unitId: unidade.id,
            unitName: unidade.name,
          },
        );
      } else {
        const i = demo.users.findIndex((u) => u.id === dados.userId);
        if (i < 0)
          throw new Error(
            "Usuário não encontrado ou já possui acesso elevado.",
          );
        const [u] = demo.users.splice(i, 1);
        demo.pharmacists.push({
          id: u.id,
          name: u.name,
          cpf: u.cpf,
          email: u.email,
          crf: dados.crf,
          unitId: unidade.id,
          unitName: unidade.name,
          active: true,
        });
      }
      salvarDemo();
    },
    alternarFarmaceutico: async (id, ativo) => {
      if (!modoDemo())
        return http("PATCH", "/pharmacists/" + id, { active: ativo });
      demo.pharmacists.find((f) => f.id === id).active = ativo;
      salvarDemo();
    },
    ajustarEstoque: async (id, dados) => {
      if (!modoDemo()) return http("PATCH", "/stock/" + id, dados);
      Object.assign(
        demo.stock.find((m) => m.id === id),
        dados,
      );
      salvarDemo();
    },
  };

  /* ============ 3. UTILITÁRIOS ============ */
  const $ = (id) => document.getElementById(id);
  const esc = (t) =>
    String(t ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const norm = (t) =>
    String(t ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const num = (n) => Number(n || 0).toLocaleString("pt-BR");
  const EXAME = {
    under_review: ["Em análise", "pendente"],
    approved: ["Aprovado", "aprovado"],
    denied: ["Reprovado", "reprovado"],
  };
  const MED = {
    out: ["Em falta", "indisponivel"],
    available: ["Disponível", "disponivel"],
    withdrawn: ["Retirado", "aprovado"],
  };
  const SITUACAO = {
    esgotado: ["Esgotado", "reprovado"],
    baixo: ["Estoque baixo", "pendente"],
    ok: ["Disponível", "disponivel"],
  };
  const situacao = (m) =>
    m.quantity === 0 ? "esgotado" : m.quantity < m.minimum ? "baixo" : "ok";
  const selo = ([rotulo, classe]) =>
    `<span class="status ${classe}">${rotulo}</span>`;

  function toast(msg, tipo) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast-farmaceutico visivel " + (tipo || "");
    clearTimeout(toast.id);
    toast.id = setTimeout(() => (t.className = "toast-farmaceutico"), 3600);
  }
  const CRF_VALIDO = /^CRF[-/\s]?[A-Za-z]{2}[\s-]?\d{2,8}$/i;

  /* ============ 4. TELAS ============ */
  const estado = {
    resumo: {},
    farmaceuticos: [],
    usuarios: [],
    estoque: [],
    unidades: [],
  };
  const indicador = (valor, rotulo) =>
    `<article class="cartao-indicador"><div><span class="valor-indicador">${num(valor)}</span><span class="rotulo-indicador">${rotulo}</span></div></article>`;
  const vazio = (cols) =>
    `<tr><td colspan="${cols}"><div class="estado-vazio"><strong>Nada encontrado</strong><span>Ajuste a busca ou o filtro.</span></div></td></tr>`;

  function renderPainel() {
    const r = estado.resumo,
      semanas = r.weeks || [],
      max = Math.max(1, ...semanas);
    $("indicadores").innerHTML =
      indicador(r.patients, "Pacientes cadastrados") +
      indicador(r.reportsMonth, "Laudos este mês") +
      indicador(r.notifications, "Notificações enviadas") +
      indicador(r.activePharmacists, "Farmacêuticos ativos");
    $("grafico").innerHTML = semanas
      .map(
        (v, i) =>
          `<div title="${v} laudos"><i style="height:${(v / max) * 130}px"></i>S${i + 1}</div>`,
      )
      .join("");
    $("indicadores-usuarios").innerHTML =
      indicador(r.patients, "Total de usuários") +
      indicador((r.exams || {}).approved, "Com laudo aprovado") +
      indicador(r.awaitingMedicine, "Aguardando medicamento");
  }
  function renderFarmaceuticos() {
    const q = norm($("busca-farmaceuticos").value);
    const itens = estado.farmaceuticos.filter((f) =>
      norm(f.name + f.cpf + f.email + f.unitName + f.crf).includes(q),
    );
    $("lista-farmaceuticos").innerHTML =
      itens
        .map(
          (f) =>
            `<tr><td><div class="celula-principal"><strong>${esc(f.name)}</strong><span>${esc(f.crf || "Sem CRF")}</span></div></td><td>${esc(f.cpf)}</td><td>${esc(f.unitName)}</td><td><span class="status ${f.active ? "aprovado" : "desativado"}">${f.active ? "Ativo" : "Desativado"}</span></td><td><div class="acoes-linha"><button class="acao-tabela acao-secundaria" data-editar="${esc(f.id)}" type="button">Editar</button><button class="acao-tabela acao-secundaria${f.active ? " acao-desativar" : ""}" data-alternar="${esc(f.id)}" type="button">${f.active ? "Desativar" : "Reativar"}</button></div></td></tr>`,
        )
        .join("") || vazio(5);
  }
  function renderUsuarios() {
    const q = norm($("busca-usuarios").value);
    const itens = estado.usuarios.filter((u) =>
      norm(u.name + u.cpf + u.email + u.unitName).includes(q),
    );
    $("lista-usuarios").innerHTML =
      itens
        .map(
          (u) =>
            `<tr><td><div class="celula-principal"><strong>${esc(u.name)}</strong><span>${esc(u.cpf)}</span></div></td><td>${esc(u.unitName)}</td><td>${EXAME[u.examStatus] ? selo(EXAME[u.examStatus]) : "—"}</td><td>${MED[u.medStatus] ? selo(MED[u.medStatus]) : "—"}</td></tr>`,
        )
        .join("") || vazio(4);
  }
  function renderEstoque() {
    const q = norm($("busca-estoque").value),
      filtro = $("filtro-estoque").value;
    const itens = estado.estoque.filter(
      (m) =>
        norm(m.medicine + m.unitName).includes(q) &&
        (!filtro || situacao(m) === filtro),
    );
    $("lista-estoque").innerHTML =
      itens
        .map((m) => {
          const s = situacao(m),
            pct = Math.min(
              100,
              Math.round((m.quantity / Math.max(1, m.minimum * 2)) * 100),
            );
          return `<tr><td><div class="celula-principal"><strong>${esc(m.medicine)}</strong><span>Mínimo: ${num(m.minimum)} un.</span></div></td><td>${esc(m.unitName)}</td><td><span class="quantidade-estoque ${s === "baixo" ? "estoque-baixo" : s === "esgotado" ? "estoque-esgotado" : ""}"><strong>${num(m.quantity)}</strong><small>un.</small></span></td><td style="min-width:140px"><div class="trilho"><b class="${{ ok: "ok", baixo: "alerta", esgotado: "erro" }[s]}" style="width:${pct}%"></b></div></td><td>${selo(SITUACAO[s])}</td><td><button class="acao-tabela acao-secundaria" data-ajustar="${esc(m.id)}" type="button">Ajustar</button></td></tr>`;
        })
        .join("") || vazio(6);
  }
  function renderRelatorios() {
    const r = estado.resumo,
      e = r.exams || {},
      m = r.medicines || {};
    const bloco = (titulo, linhas) => {
      const total = Math.max(
        1,
        linhas.reduce((s, l) => s + (l[1] || 0), 0),
      );
      return `<div class="cartao-conteudo bloco-barras"><h2>${titulo}</h2>${linhas.map(([rot, v, cor]) => `<div class="linha-barra"><span><em style="font-style:normal">${rot}</em><strong>${num(v)}</strong></span><div class="trilho"><b class="${cor}" style="width:${((v || 0) / total) * 100}%"></b></div></div>`).join("")}</div>`;
    };
    $("barras-relatorio").innerHTML =
      bloco("Laudos por status", [
        ["Aprovados", e.approved, "ok"],
        ["Em análise", e.under_review, "alerta"],
        ["Reprovados", e.denied, "erro"],
      ]) +
      bloco("Medicamentos por status", [
        ["Retirados", m.withdrawn, "ok"],
        ["Disponíveis", m.available, "alerta"],
        ["Em falta", m.out, "erro"],
      ]);
    $("lista-relatorio").innerHTML =
      estado.usuarios
        .map(
          (u) =>
            `<tr><td><div class="celula-principal"><strong>${esc(u.medicine)}</strong></div></td><td>${esc(u.name)}</td><td>${MED[u.medStatus] ? selo(MED[u.medStatus]) : "—"}</td></tr>`,
        )
        .join("") || vazio(3);
  }
  const renderTudo = () => {
    renderPainel();
    renderFarmaceuticos();
    renderUsuarios();
    renderEstoque();
    renderRelatorios();
  };

  async function carregar() {
    try {
      const [resumo, farmaceuticos, usuarios, estoque, unidades] =
        await Promise.all([
          api.resumo(),
          api.listarFarmaceuticos(),
          api.listarUsuarios(),
          api.listarEstoque(),
          api.listarUnidades(),
        ]);
      Object.assign(estado, {
        resumo,
        farmaceuticos,
        usuarios,
        estoque,
        unidades,
      });
      renderTudo();
    } catch (erro) {
      // 403 = logado, mas sem papel de administrador.
      if (erro.status === 403) return location.replace("index.html");
      toast(erro.message, "erro");
    }
  }

  /* ============ 5. FORMULÁRIOS ============ */
  let editandoId = null,
    estoqueId = null;

  let usuarioEscolhidoId = "";

  function mostrarUsuario(u) {
    const form = $("form-farmaceutico");
    $("fm-name").value = u ? u.name || "" : "";
    $("fm-cpf").value = u ? u.cpf || "" : "";
    $("fm-email").value = u ? u.email || "" : "";
    usuarioEscolhidoId = u ? u.id : "";
    form.elements.userId.value = usuarioEscolhidoId;
  }
  function renderOpcoesUsuario() {
    const q = norm($("fm-busca").value);
    const itens = estado.usuarios.filter((u) =>
      norm(u.name + u.cpf + u.email).includes(q),
    );
    $("fm-usuario").innerHTML =
      itens
        .map(
          (u) =>
            `<option value="${esc(u.id)}">${esc(u.name)} — ${esc(u.cpf)}</option>`,
        )
        .join("") ||
      `<option value="" disabled>Nenhum paciente encontrado</option>`;
    if (itens.some((u) => u.id === usuarioEscolhidoId))
      $("fm-usuario").value = usuarioEscolhidoId;
    else mostrarUsuario(null);
  }
  function abrirFarmaceutico(f) {
    editandoId = f ? f.id : null;
    const form = $("form-farmaceutico");
    form.reset();
    $("erro-farmaceutico").textContent = "";
    $("titulo-farmaceutico").textContent = f
      ? "Editar farmacêutico"
      : "Novo farmacêutico";
    $("salvar-farmaceutico").textContent = f
      ? "Salvar alterações"
      : "Conceder acesso";
    $("fm-unitId").innerHTML =
      `<option value="">Selecione a unidade</option>` +
      estado.unidades
        .map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`)
        .join("");
    // Edição: só CRF e unidade mudam. Identidade vem do perfil do próprio usuário.
    $("bloco-busca-usuario").hidden = Boolean(f);
    $("fm-usuario").disabled = Boolean(f);
    if (f) {
      mostrarUsuario(f);
      usuarioEscolhidoId = "";
      form.elements.crf.value = f.crf || "";
      const unidade = estado.unidades.find(
        (u) => u.id === f.unitId || u.name === f.unitName,
      );
      form.elements.unitId.value = unidade ? unidade.id : "";
      $("fm-nivel").value = "Farmacêutico";
    } else {
      mostrarUsuario(null);
      renderOpcoesUsuario();
      $("fm-nivel").value = "Paciente → Farmacêutico";
      if (estado.unidades.length === 1)
        form.elements.unitId.value = estado.unidades[0].id;
    }
    $("modal-farmaceutico").showModal();
    (f ? form.elements.crf : $("fm-busca")).focus();
  }
  async function enviarFarmaceutico(evento) {
    evento.preventDefault();
    const form = evento.target;
    const dados = {
      crf: form.elements.crf.value.trim(),
      unitId: form.elements.unitId.value,
    };
    if (!editandoId) dados.userId = usuarioEscolhidoId;
    const erro =
      !editandoId && !dados.userId
        ? "Selecione o usuário que receberá o acesso."
        : !CRF_VALIDO.test(dados.crf)
          ? 'Informe o CRF no formato "CRF-PA 0000".'
          : !dados.unitId
            ? "Selecione a unidade."
            : "";
    $("erro-farmaceutico").textContent = erro;
    if (erro) return;
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;
    try {
      const eraEdicao = Boolean(editandoId);
      const alvo = eraEdicao
        ? null
        : estado.usuarios.find((u) => u.id === dados.userId);
      await api.salvarFarmaceutico(dados, editandoId);
      $("modal-farmaceutico").close();
      await carregar();
      toast(
        eraEdicao
          ? "Farmacêutico atualizado."
          : (alvo ? alvo.name : "O usuário") +
              " agora tem acesso de farmacêutico.",
      );
    } catch (e) {
      $("erro-farmaceutico").textContent = e.message;
    }
    botao.disabled = false;
  }
  let desativarId = null;
  function pedirConfirmacao(f) {
    desativarId = f.id;
    $("texto-confirmar").textContent =
      f.name +
      " perderá o acesso ao sistema. Você poderá reativar o cadastro depois.";
    $("modal-confirmar").showModal();
  }
  async function alternar(f) {
    try {
      await api.alternarFarmaceutico(f.id, !f.active);
      toast(f.name + (f.active ? " desativado." : " reativado."));
      await carregar();
    } catch (erro) {
      toast(erro.message, "erro");
    }
  }
  function abrirEstoque(m) {
    estoqueId = m.id;
    $("erro-estoque").textContent = "";
    $("est-nome").value = m.medicine + " — " + m.unitName;
    $("est-qtd").value = m.quantity;
    $("est-min").value = m.minimum;
    $("modal-estoque").showModal();
  }
  async function enviarEstoque(evento) {
    evento.preventDefault();
    const dados = {
      quantity: Number($("est-qtd").value),
      minimum: Number($("est-min").value),
    };
    const invalido = [dados.quantity, dados.minimum].some(
      (n) => !Number.isInteger(n) || n < 0,
    );
    $("erro-estoque").textContent = invalido
      ? "Use números inteiros iguais ou maiores que zero."
      : "";
    if (invalido) return;
    try {
      await api.ajustarEstoque(estoqueId, dados);
      $("modal-estoque").close();
      toast("Estoque atualizado.");
      await carregar();
    } catch (e) {
      $("erro-estoque").textContent = e.message;
    }
  }

  /* ============ 6. EXPORTAÇÃO, NAVEGAÇÃO E EVENTOS ============ */
  function exportar(tipo) {
    // Nomes vêm de cadastros feitos por qualquer pessoa: células que começam com
    // = + - @ viram fórmula no Excel. O apóstrofo força o texto literal.
    const S = (c) => {
      let t = String(c ?? "");
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return '"' + t.replace(/"/g, '""') + '"';
    };
    const tabelas = {
      usuarios: [
        ["Paciente", "CPF", "Unidade", "Laudo", "Medicamento"],
        ...estado.usuarios.map((u) => [
          u.name,
          u.cpf,
          u.unitName,
          (EXAME[u.examStatus] || [""])[0],
          (MED[u.medStatus] || [""])[0],
        ]),
      ],
      relatorio: [
        ["Medicamento", "Paciente", "Situação"],
        ...estado.usuarios.map((u) => [
          u.medicine,
          u.name,
          (MED[u.medStatus] || [""])[0],
        ]),
      ],
      estoque: [
        ["Medicamento", "Unidade", "Quantidade", "Mínimo", "Situação"],
        ...estado.estoque.map((m) => [
          m.medicine,
          m.unitName,
          m.quantity,
          m.minimum,
          SITUACAO[situacao(m)][0],
        ]),
      ],
    };
    const csv =
      "\ufeff" + tabelas[tipo].map((l) => l.map(S).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = "farmasus-" + tipo + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Arquivo exportado.");
  }
  function exibir(view) {
    const paineis = [...document.querySelectorAll("[data-painel]")];
    if (!paineis.some((p) => p.dataset.painel === view)) view = "painel";
    paineis.forEach((p) => {
      const a = p.dataset.painel === view;
      p.hidden = !a;
      p.classList.toggle("ativo", a);
    });
    document
      .querySelectorAll(".item-menu-farmaceutico[data-view]")
      .forEach((l) => {
        const a = l.dataset.view === view;
        l.classList.toggle("ativo", a);
        a
          ? l.setAttribute("aria-current", "page")
          : l.removeAttribute("aria-current");
      });
  }

  document.addEventListener("click", async (e) => {
    // "Sair" precisa encerrar a sessão, senão o token continua no navegador.
    if (e.target.closest(".botao-sair")) limparSessao();
    const alvo = (attr) => e.target.closest("[" + attr + "]");
    const nav = alvo("data-view");
    if (nav) {
      e.preventDefault();
      history.replaceState(null, "", "#" + nav.dataset.view);
      return exibir(nav.dataset.view);
    }
    if (alvo("data-fechar"))
      return $(alvo("data-fechar").dataset.fechar).close();
    if (alvo("data-exportar"))
      return exportar(alvo("data-exportar").dataset.exportar);
    if (alvo("data-editar"))
      return abrirFarmaceutico(
        estado.farmaceuticos.find(
          (f) => f.id === alvo("data-editar").dataset.editar,
        ),
      );
    if (alvo("data-ajustar"))
      return abrirEstoque(
        estado.estoque.find(
          (m) => m.id === alvo("data-ajustar").dataset.ajustar,
        ),
      );
    if (alvo("data-alternar")) {
      const f = estado.farmaceuticos.find(
        (x) => x.id === alvo("data-alternar").dataset.alternar,
      );
      return f.active ? pedirConfirmacao(f) : alternar(f); // desativar pede confirmação; reativar não
    }
  });
  $("confirmar-desativar").addEventListener("click", async () => {
    const f = estado.farmaceuticos.find((x) => x.id === desativarId);
    $("modal-confirmar").close();
    if (f) await alternar(f);
  });
  $("novo-farmaceutico").addEventListener("click", () =>
    abrirFarmaceutico(null),
  );
  $("form-farmaceutico").addEventListener("submit", enviarFarmaceutico);
  $("form-estoque").addEventListener("submit", enviarEstoque);
  $("fm-busca").addEventListener("input", renderOpcoesUsuario);
  $("fm-usuario").addEventListener("change", (e) =>
    mostrarUsuario(estado.usuarios.find((u) => u.id === e.target.value)),
  );
  $("busca-farmaceuticos").addEventListener("input", renderFarmaceuticos);
  $("busca-usuarios").addEventListener("input", renderUsuarios);
  $("busca-estoque").addEventListener("input", renderEstoque);
  $("filtro-estoque").addEventListener("change", renderEstoque);
  window.addEventListener("hashchange", () => exibir(location.hash.slice(1)));

  exibir(location.hash.slice(1));
  carregar().then(
    () =>
      modoDemo() &&
      toast(
        "Modo demonstração: os dados ficam salvos só neste navegador.",
        "alerta",
      ),
  );
})();
