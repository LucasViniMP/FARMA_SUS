(function () {
  "use strict";

  const STORAGE_KEY = "farmasus_farmaceutico_mvp_v1";
  const STORAGE_VERSION = 3;
  const PROFISSIONAL_ATUAL = "Marina Costa · CRF-PA 7842";
  const STATUS = Object.freeze({
    PENDENTE: "Pendente",
    ANALISE: "Em análise",
    APROVADO: "Aprovado",
    VINCULADO: "Vinculado",
    LIBERADO: "Liberado",
    REPROVADO: "Reprovado",
  });

  const STATUS_ORDEM = {
    [STATUS.PENDENTE]: 0,
    [STATUS.ANALISE]: 1,
    [STATUS.APROVADO]: 2,
    [STATUS.VINCULADO]: 3,
    [STATUS.REPROVADO]: 4,
    [STATUS.LIBERADO]: 5,
  };

  const ACOES_DE_ALTERACAO = new Set([
    "iniciar-analise",
    "aprovar-laudo",
    "abrir-reprovacao",
    "vincular-medicamento",
    "liberar-medicamento",
    "editar-medicamento",
    "alternar-disponibilidade",
    "pedido-manual-cliente",
  ]);

  const PRIORIDADE_ORDEM = { Alta: 0, Normal: 1, Baixa: 2 };

  const DADOS_INICIAIS = {
    version: STORAGE_VERSION,
    profissional: PROFISSIONAL_ATUAL,
    clientes: [
      {
        id: "PAC-0184",
        nome: "Ana Paula Ribeiro",
        cpf: "482.731.690-17",
        cns: "702 3050 1842 5678",
        nascimento: "1982-04-16",
        telefone: "(91) 98812-3045",
        email: "ana.ribeiro@email.com",
        endereco: "Travessa do Sol, 184, Centro, Belém - PA",
      },
      {
        id: "PAC-0261",
        nome: "Carlos Eduardo Lima",
        cpf: "731.209.480-02",
        cns: "898 0012 3901 4431",
        nascimento: "1975-09-03",
        telefone: "(91) 98104-7721",
        email: "",
        endereco: "Rua das Mangueiras, 261, Marco, Belém - PA",
      },
      {
        id: "PAC-0107",
        nome: "Francisca Souza Costa",
        cpf: "059.842.310-61",
        cns: "174 2250 6104 9810",
        nascimento: "1959-01-22",
        telefone: "(91) 98433-1058",
        email: "",
        endereco: "Passagem São Jorge, 107, Guamá, Belém - PA",
      },
    ],
    laudos: [
      {
        id: "LAU-2048",
        paciente: {
          id: "PAC-0184",
          nome: "Ana Paula Ribeiro",
          cns: "702 3050 •••• 5678",
          cpf: "***.482.***-17",
        },
        medicamento: "Losartana potássica 50 mg",
        dose: "1 comprimido por via oral uma vez ao dia",
        prescritor: "Dr. Rafael Nogueira",
        crm: "CRM-PA 18452",
        envio: "2026-11-10T08:42:00-03:00",
        validade: "2027-05-10",
        prioridade: "Alta",
        status: STATUS.PENDENTE,
        arquivo: "prescricao_hipertensao_ana_ribeiro.pdf",
        historico: [
          {
            data: "2026-11-10T08:42:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
        ],
      },
      {
        id: "LAU-2047",
        paciente: {
          id: "PAC-0261",
          nome: "Carlos Eduardo Lima",
          cns: "898 0012 •••• 4431",
          cpf: "***.731.***-02",
        },
        medicamento: "Insulina Glargina 100 UI/mL",
        dose: "24 UI por via subcutânea, uma vez ao dia",
        prescritor: "Dra. Helena Martins",
        crm: "CRM-PA 22109",
        envio: "2026-11-09T15:18:00-03:00",
        validade: "2027-02-09",
        prioridade: "Normal",
        status: STATUS.PENDENTE,
        arquivo: "prescricao_endocrino_carlos_lima.pdf",
        historico: [
          {
            data: "2026-11-09T15:18:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
        ],
      },
      {
        id: "LAU-2046",
        paciente: {
          id: "PAC-0107",
          nome: "Francisca Souza Costa",
          cns: "174 2250 •••• 9810",
          cpf: "***.059.***-61",
        },
        medicamento: "Amoxicilina 500 mg",
        dose: "1 cápsula por via oral a cada 8 horas",
        prescritor: "Dr. André Viana",
        crm: "CRM-PA 17604",
        envio: "2026-11-09T10:05:00-03:00",
        validade: "2027-03-09",
        prioridade: "Alta",
        status: STATUS.ANALISE,
        arquivo: "prescricao_amoxicilina_francisca_costa.pdf",
        historico: [
          {
            data: "2026-11-09T10:05:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
          {
            data: "2026-11-10T08:10:00-03:00",
            acao: "Análise iniciada",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Conferência de prescrição e documentos iniciada.",
          },
        ],
      },
      {
        id: "LAU-2045",
        paciente: {
          id: "PAC-0328",
          nome: "João Victor Mendes",
          cns: "923 7108 •••• 2024",
          cpf: "***.214.***-90",
        },
        medicamento: "Budesonida 200 mcg",
        dose: "Duas inalações a cada 12 horas",
        prescritor: "Dra. Camila Freire",
        crm: "CRM-PA 20318",
        envio: "2026-11-08T16:32:00-03:00",
        validade: "2027-02-08",
        prioridade: "Normal",
        status: STATUS.ANALISE,
        arquivo: "relatorio_pneumologia_joao_mendes.pdf",
        historico: [
          {
            data: "2026-11-08T16:32:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
          {
            data: "2026-11-09T09:24:00-03:00",
            acao: "Análise iniciada",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Conferência de prescrição e documentos iniciada.",
          },
        ],
      },
      {
        id: "LAU-2044",
        paciente: {
          id: "PAC-0415",
          nome: "Marta de Nazaré Silva",
          cns: "265 4099 •••• 1157",
          cpf: "***.602.***-44",
        },
        medicamento: "Metformina 850 mg",
        dose: "1 comprimido por via oral após almoço e jantar",
        prescritor: "Dr. Paulo Gama",
        crm: "CRM-PA 14573",
        envio: "2026-11-07T11:46:00-03:00",
        validade: "2027-05-07",
        prioridade: "Alta",
        status: STATUS.APROVADO,
        arquivo: "prescricao_metformina_marta_silva.pdf",
        aprovadoEm: "2026-11-10T07:55:00-03:00",
        aprovadoPor: PROFISSIONAL_ATUAL,
        historico: [
          {
            data: "2026-11-07T11:46:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
          {
            data: "2026-11-09T14:20:00-03:00",
            acao: "Análise iniciada",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Conferência de prescrição e documentos iniciada.",
          },
          {
            data: "2026-11-10T07:55:00-03:00",
            acao: "Laudo aprovado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Documentação e prescrição validadas.",
          },
        ],
      },
      {
        id: "LAU-2043",
        paciente: {
          id: "PAC-0029",
          nome: "Raimundo Nonato Pereira",
          cns: "610 8874 •••• 3398",
          cpf: "***.980.***-15",
        },
        medicamento: "Salbutamol 100 mcg/dose",
        dose: "Duas inalações quando necessário",
        prescritor: "Dra. Camila Freire",
        crm: "CRM-PA 20318",
        envio: "2026-11-06T09:12:00-03:00",
        validade: "2027-02-06",
        prioridade: "Normal",
        status: STATUS.VINCULADO,
        arquivo: "relatorio_asma_raimundo_pereira.pdf",
        aprovadoEm: "2026-11-08T10:30:00-03:00",
        aprovadoPor: PROFISSIONAL_ATUAL,
        vinculo: {
          medicamentoId: "MED-006",
          nome: "Salbutamol 100 mcg/dose",
          lote: "SAL26H04",
          pacienteId: "PAC-0029",
          pacienteNome: "Raimundo Nonato Pereira",
          vinculadoEm: "2026-11-09T13:40:00-03:00",
          vinculadoPor: PROFISSIONAL_ATUAL,
        },
        historico: [
          {
            data: "2026-11-06T09:12:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
          {
            data: "2026-11-07T10:08:00-03:00",
            acao: "Análise iniciada",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Conferência de prescrição e documentos iniciada.",
          },
          {
            data: "2026-11-08T10:30:00-03:00",
            acao: "Laudo aprovado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Documentação e prescrição validadas.",
          },
          {
            data: "2026-11-09T13:40:00-03:00",
            acao: "Medicamento vinculado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Lote SAL26H04 reservado para Raimundo Nonato Pereira.",
          },
        ],
      },
      {
        id: "LAU-2042",
        paciente: {
          id: "PAC-0196",
          nome: "Beatriz Oliveira Santos",
          cns: "845 1732 •••• 6670",
          cpf: "***.347.***-28",
        },
        medicamento: "Insulina Glargina 100 UI/mL",
        dose: "18 UI por via subcutânea à noite",
        prescritor: "Dra. Helena Martins",
        crm: "CRM-PA 22109",
        envio: "2026-11-04T14:22:00-03:00",
        validade: "2027-02-04",
        prioridade: "Normal",
        status: STATUS.LIBERADO,
        arquivo: "laudo_diabetes_beatriz_santos.pdf",
        aprovadoEm: "2026-11-05T11:30:00-03:00",
        aprovadoPor: PROFISSIONAL_ATUAL,
        vinculo: {
          medicamentoId: "MED-002",
          nome: "Insulina Glargina 100 UI/mL",
          lote: "IGL26J11",
          pacienteId: "PAC-0196",
          pacienteNome: "Beatriz Oliveira Santos",
          vinculadoEm: "2026-11-05T15:12:00-03:00",
          vinculadoPor: PROFISSIONAL_ATUAL,
        },
        liberadoEm: "2026-11-06T09:05:00-03:00",
        liberadoPor: PROFISSIONAL_ATUAL,
        historico: [
          {
            data: "2026-11-04T14:22:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
          {
            data: "2026-11-05T09:15:00-03:00",
            acao: "Análise iniciada",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Conferência de prescrição e documentos iniciada.",
          },
          {
            data: "2026-11-05T11:30:00-03:00",
            acao: "Laudo aprovado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Documentação e prescrição validadas.",
          },
          {
            data: "2026-11-05T15:12:00-03:00",
            acao: "Medicamento vinculado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Lote IGL26J11 reservado para Beatriz Oliveira Santos.",
          },
          {
            data: "2026-11-06T09:05:00-03:00",
            acao: "Medicamento liberado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Dispensação registrada e estoque atualizado.",
          },
        ],
      },
      {
        id: "LAU-2041",
        paciente: {
          id: "PAC-0374",
          nome: "Lucas Henrique Rocha",
          cns: "436 9510 •••• 7842",
          cpf: "***.118.***-73",
        },
        medicamento: "Omeprazol 20 mg",
        dose: "1 cápsula por via oral antes do café da manhã",
        prescritor: "Dr. Marcelo Neves",
        crm: "CRM-PA 19877",
        envio: "2026-11-03T08:38:00-03:00",
        validade: "2027-05-03",
        prioridade: "Baixa",
        status: STATUS.REPROVADO,
        arquivo: "prescricao_omeprazol_lucas_rocha.pdf",
        reprovacaoMotivo: "Prescrição sem assinatura digital válida. Solicitar novo documento ao paciente.",
        reprovadoEm: "2026-11-04T10:18:00-03:00",
        reprovadoPor: PROFISSIONAL_ATUAL,
        historico: [
          {
            data: "2026-11-03T08:38:00-03:00",
            acao: "Laudo recebido",
            responsavel: "Portal do paciente",
            detalhe: "Documento enviado para análise da unidade.",
          },
          {
            data: "2026-11-03T13:20:00-03:00",
            acao: "Análise iniciada",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Conferência de prescrição e documentos iniciada.",
          },
          {
            data: "2026-11-04T10:18:00-03:00",
            acao: "Laudo reprovado",
            responsavel: PROFISSIONAL_ATUAL,
            detalhe: "Prescrição sem assinatura digital válida. Solicitar novo documento ao paciente.",
          },
        ],
      },
    ],
    medicamentos: [
      {
        id: "MED-001",
        nome: "Losartana potássica 50 mg",
        principioAtivo: "Losartana potássica",
        apresentacao: "Comprimido",
        lote: "LOS26F18",
        quantidade: 120,
        validade: "2027-04-30",
        localizacao: "Armário 01 · Prateleira 02",
        disponivel: true,
      },
      {
        id: "MED-002",
        nome: "Insulina Glargina 100 UI/mL",
        principioAtivo: "Insulina glargina",
        apresentacao: "Caneta preenchida 3 mL",
        lote: "IGL26J11",
        quantidade: 31,
        validade: "2027-02-28",
        localizacao: "Geladeira B · Gaveta 01",
        disponivel: true,
      },
      {
        id: "MED-003",
        nome: "Amoxicilina 500 mg",
        principioAtivo: "Amoxicilina",
        apresentacao: "Cápsula",
        lote: "AMX26E07",
        quantidade: 0,
        validade: "2027-06-30",
        localizacao: "Armário 03 · Prateleira B",
        disponivel: false,
      },
      {
        id: "MED-004",
        nome: "Budesonida 200 mcg",
        principioAtivo: "Budesonida",
        apresentacao: "Cápsula para inalação",
        lote: "BUD26G22",
        quantidade: 46,
        validade: "2027-08-31",
        localizacao: "Armário 05 · Prateleira A",
        disponivel: true,
      },
      {
        id: "MED-005",
        nome: "Metformina 850 mg",
        principioAtivo: "Metformina",
        apresentacao: "Comprimido",
        lote: "MET26L09",
        quantidade: 5,
        validade: "2027-09-30",
        localizacao: "Armário 02 · Gaveta 04",
        disponivel: true,
      },
      {
        id: "MED-006",
        nome: "Salbutamol 100 mcg/dose",
        principioAtivo: "Salbutamol",
        apresentacao: "Aerossol inalatório",
        lote: "SAL26H04",
        quantidade: 12,
        validade: "2027-05-31",
        localizacao: "Armário 05 · Prateleira C",
        disponivel: true,
      },
      {
        id: "MED-007",
        nome: "Omeprazol 20 mg",
        principioAtivo: "Omeprazol",
        apresentacao: "Cápsula",
        lote: "OME26C13",
        quantidade: 0,
        validade: "2027-01-31",
        localizacao: "Geladeira A · Prateleira 04",
        disponivel: false,
      },
    ],
  };

  let estado = carregarEstado();
  let laudoEmReprovacao = null;
  let medicamentoEmEdicao = null;
  let vinculoPendente = null;
  let clientePreSelecionado = null;
  let toastTimer = null;

  function elemento(id) {
    return document.getElementById(id);
  }

  function copiarDados(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  function clientesDosLaudos(laudos) {
    const unicos = new Map();
    (laudos || []).forEach((laudo) => {
      const paciente = laudo?.paciente;
      if (!paciente?.id || unicos.has(paciente.id)) return;
      unicos.set(paciente.id, {
        id: paciente.id,
        nome: paciente.nome || "Cliente",
        cpf: paciente.cpf || "—",
        cns: paciente.cns || "—",
        nascimento: "",
        telefone: "",
        email: "",
        endereco: "",
      });
    });
    return Array.from(unicos.values());
  }

  function carregarEstado() {
    if (tokenFirebase()) {
      return {
        version: STORAGE_VERSION,
        profissional: PROFISSIONAL_ATUAL,
        clientes: [],
        laudos: [],
        medicamentos: [],
      };
    }
    try {
      const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (
        salvo &&
        Array.isArray(salvo.laudos) &&
        Array.isArray(salvo.medicamentos)
      ) {
        salvo.version = STORAGE_VERSION;
        if (!Array.isArray(salvo.clientes)) salvo.clientes = clientesDosLaudos(salvo.laudos);
        return salvo;
      }
    } catch (_) {
      // Um estado inválido não deve impedir a abertura do painel.
    }
    return copiarDados(DADOS_INICIAIS);
  }

  function persistirEstado() {
    if (tokenFirebase()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (_) {
      mostrarToast("Não foi possível salvar as alterações neste navegador.", "erro");
    }
  }

  function tokenFirebase() {
    return localStorage.getItem("firebase_token") || "";
  }

  async function renovarTokenFirebase() {
    const refreshToken = localStorage.getItem("firebase_refresh_token") || "";
    if (!refreshToken) return false;
    try {
      const resposta = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.token) return false;
      localStorage.setItem("firebase_token", dados.token);
      if (dados.refreshToken) localStorage.setItem("firebase_refresh_token", dados.refreshToken);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function requisitarBackend(caminho, opcoes, permitirRenovacao = true) {
    const token = tokenFirebase();
    if (!token) return null;
    const configuracao = { ...(opcoes || {}) };
    configuracao.headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(configuracao.headers || {}),
    };
    if (configuracao.body && !(configuracao.body instanceof FormData)) {
      configuracao.headers["Content-Type"] = "application/json";
      configuracao.body = JSON.stringify(configuracao.body);
    }

    const resposta = await fetch(caminho, configuracao);
    if (resposta.status === 401 && permitirRenovacao && await renovarTokenFirebase()) {
      return requisitarBackend(caminho, opcoes, false);
    }
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados.error || "Não foi possível concluir a operação no servidor.");
    }
    return dados;
  }

  async function carregarEstadoBackend() {
    if (!tokenFirebase()) return;
    try {
      const dados = await requisitarBackend("/api/pharmacist/state");
      estado = {
        version: STORAGE_VERSION,
        profissional: dados.professional || PROFISSIONAL_ATUAL,
        unidade: dados.unitName || "Unidade farmacêutica",
        clientes: Array.isArray(dados.clientes) ? dados.clientes : [],
        laudos: Array.isArray(dados.laudos) ? dados.laudos : [],
        medicamentos: Array.isArray(dados.medicamentos) ? dados.medicamentos : [],
      };
      aplicarIdentidadeBackend(dados);
      renderizarTudo();
    } catch (erro) {
      mostrarToast(erro.message || "Não foi possível carregar os dados do servidor.", "erro");
    }
  }

  function aplicarIdentidadeBackend(dados) {
    const profissional = String(dados.professional || "Farmacêutico");
    const nome = profissional.split(" · ")[0];
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    const iniciais = partes.length > 1
      ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
      : nome.slice(0, 2).toUpperCase();
    const primeiroNome = partes[0] || "Farmacêutico";
    const unidade = dados.unitName || "Unidade farmacêutica";

    const titulo = elemento("titulo-visao-geral");
    if (titulo) titulo.textContent = `Olá, ${primeiroNome}`;
    document.querySelectorAll(".dados-farmaceutico strong, .resumo-perfil h3").forEach((alvo) => {
      alvo.textContent = nome;
    });
    document.querySelectorAll(".avatar-farmaceutico, .avatar-perfil-ampliado").forEach((alvo) => {
      alvo.textContent = iniciais;
    });
    document.querySelectorAll(".unidade-painel strong").forEach((alvo) => {
      alvo.textContent = unidade;
    });
  }

  async function executarNoBackend(caminho, metodo, corpo) {
    if (!tokenFirebase()) return true;
    try {
      await requisitarBackend(caminho, { method: metodo, body: corpo });
      return true;
    } catch (erro) {
      mostrarToast(erro.message || "Não foi possível salvar a alteração.", "erro");
      return false;
    }
  }

  async function visualizarArquivo(id) {
    const laudo = obterLaudo(id);
    if (!laudo?.fileKey || !tokenFirebase()) {
      mostrarToast("O arquivo estará disponível quando o laudo estiver integrado ao servidor.", "aviso");
      return;
    }
    const novaJanela = window.open("", "_blank");
    try {
      const resposta = await fetch(`/files/${encodeURI(laudo.fileKey)}`, {
        headers: { Authorization: `Bearer ${tokenFirebase()}` },
      });
      if (!resposta.ok) throw new Error("Não foi possível abrir o arquivo.");
      const url = URL.createObjectURL(await resposta.blob());
      if (novaJanela) novaJanela.location.href = url;
      else window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      novaJanela?.close();
      mostrarToast(erro.message, "erro");
    }
  }

  function escaparHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizar(valor) {
    return String(valor == null ? "" : valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function slug(valor) {
    return normalizar(valor).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function dataValida(valor) {
    if (!valor) return null;
    const somenteData = /^\d{4}-\d{2}-\d{2}$/.test(valor);
    const data = new Date(somenteData ? `${valor}T12:00:00` : valor);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function formatarData(valor, opcoes) {
    const data = dataValida(valor);
    if (!data) return "—";
    return new Intl.DateTimeFormat("pt-BR", opcoes || {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(data);
  }

  function formatarDataHora(valor) {
    return formatarData(valor, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function agoraIso() {
    return new Date().toISOString();
  }

  function obterLaudo(id) {
    return estado.laudos.find((laudo) => laudo.id === id);
  }

  function obterMedicamento(id) {
    return estado.medicamentos.find((medicamento) => medicamento.id === id);
  }

  function obterCliente(id) {
    return estado.clientes.find((cliente) => cliente.id === id);
  }

  function somenteDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function formatarCpf(valor) {
    const digitos = somenteDigitos(valor).slice(0, 11);
    if (digitos.length !== 11) return valor || "—";
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  function formatarCns(valor) {
    const digitos = somenteDigitos(valor).slice(0, 15);
    if (digitos.length !== 15) return valor || "—";
    return digitos.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, "$1 $2 $3 $4");
  }

  function formatarTelefone(valor) {
    const digitos = somenteDigitos(valor).slice(0, 11);
    if (digitos.length === 11) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (digitos.length === 10) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return valor || "—";
  }

  function medicamentoPodeSerVinculado(medicamento) {
    return Boolean(medicamento && medicamento.disponivel && Number(medicamento.quantidade) > 0);
  }

  function medicamentoCorrespondeAoLaudo(laudo, medicamento) {
    if (!laudo || !medicamento) return false;
    const solicitado = normalizar(laudo.medicamento);
    const nome = normalizar(medicamento.nome);
    const principioAtivo = normalizar(medicamento.principioAtivo);
    return solicitado.includes(principioAtivo) || nome.includes(solicitado) || solicitado.includes(nome);
  }

  function badgeStatus(status) {
    const classe = slug(status);
    return `<span class="status ${classe} status-${classe}" data-status="${classe}">${escaparHtml(status)}</span>`;
  }

  function badgePrioridade(prioridade) {
    return `<span class="badge-prioridade prioridade-${slug(prioridade)}">${escaparHtml(prioridade)}</span>`;
  }

  function mostrarToast(mensagem, tipo) {
    const toast = elemento("toast-farmaceutico");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = mensagem;
    const classeTipo = tipo === "erro" ? "erro" : tipo === "aviso" ? "alerta" : "sucesso";
    toast.dataset.tipo = classeTipo;
    toast.classList.remove("sucesso", "erro", "alerta", "toast--sucesso", "toast--erro", "toast--aviso");
    toast.classList.add(classeTipo, `toast--${tipo || "sucesso"}`, "visivel");
    toast.hidden = false;
    toast.setAttribute("role", tipo === "erro" ? "alert" : "status");
    toast.setAttribute("aria-live", tipo === "erro" ? "assertive" : "polite");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("visivel");
      toast.hidden = true;
    }, 4200);
  }

  function abrirDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function fecharDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function registrarHistorico(laudo, acao, detalhe) {
    if (!Array.isArray(laudo.historico)) laudo.historico = [];
    laudo.historico.push({
      data: agoraIso(),
      acao,
      responsavel: estado.profissional || PROFISSIONAL_ATUAL,
      detalhe,
    });
  }

  function salvarERenderizar(mensagem, tipo) {
    persistirEstado();
    renderizarTudo();
    if (mensagem) mostrarToast(mensagem, tipo || "sucesso");
  }

  function definirTexto(id, valor) {
    const alvo = elemento(id);
    if (alvo) alvo.textContent = String(valor);
  }

  function ordenarLaudos(lista) {
    return lista.slice().sort((a, b) => {
      const statusA = STATUS_ORDEM[a.status] == null ? 99 : STATUS_ORDEM[a.status];
      const statusB = STATUS_ORDEM[b.status] == null ? 99 : STATUS_ORDEM[b.status];
      if (statusA !== statusB) return statusA - statusB;
      const prioridadeA = PRIORIDADE_ORDEM[a.prioridade] == null ? 99 : PRIORIDADE_ORDEM[a.prioridade];
      const prioridadeB = PRIORIDADE_ORDEM[b.prioridade] == null ? 99 : PRIORIDADE_ORDEM[b.prioridade];
      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
      return (dataValida(b.envio)?.getTime() || 0) - (dataValida(a.envio)?.getTime() || 0);
    });
  }

  function acoesLaudo(laudo, compacto) {
    const botoes = [
      `<button class="acao-tabela acao-secundaria" type="button" data-action="ver-laudo" data-id="${escaparHtml(laudo.id)}">Ver detalhes</button>`,
    ];

    if (!compacto && laudo.status === STATUS.PENDENTE) {
      botoes.push(`<button class="acao-tabela acao-principal" type="button" data-action="iniciar-analise" data-id="${escaparHtml(laudo.id)}">Iniciar análise</button>`);
    }
    if (!compacto && laudo.status === STATUS.ANALISE) {
      botoes.push(`<button class="acao-tabela acao-principal" type="button" data-action="aprovar-laudo" data-id="${escaparHtml(laudo.id)}">Aprovar</button>`);
      botoes.push(`<button class="acao-tabela acao-perigo" type="button" data-action="abrir-reprovacao" data-id="${escaparHtml(laudo.id)}">Reprovar</button>`);
    }

    return botoes.join("");
  }

  function renderizarDashboard() {
    const hoje = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());
    definirTexto("data-atual", hoje.charAt(0).toUpperCase() + hoje.slice(1));
    definirTexto("total-pendentes", estado.laudos.filter((item) => item.status === STATUS.PENDENTE).length);
    definirTexto("total-analise", estado.laudos.filter((item) => item.status === STATUS.ANALISE).length);
    definirTexto(
      "total-liberacao",
      estado.laudos.filter((item) => item.status === STATUS.APROVADO || item.status === STATUS.VINCULADO).length,
    );
    definirTexto("total-disponiveis", estado.medicamentos.filter(medicamentoPodeSerVinculado).length);

    const fila = elemento("fila-resumo-corpo");
    if (fila) {
      const abertos = ordenarLaudos(
        estado.laudos.filter((item) => ![STATUS.LIBERADO, STATUS.REPROVADO].includes(item.status)),
      ).slice(0, 5);
      fila.innerHTML = abertos.length
        ? abertos.map((laudo) => `
          <tr>
            <td><div class="celula-principal"><strong>${escaparHtml(laudo.paciente.nome)}</strong><span>${escaparHtml(laudo.id)}</span></div></td>
            <td><div class="celula-principal"><strong>${escaparHtml(laudo.medicamento)}</strong><span>${escaparHtml(laudo.prioridade)} prioridade</span></div></td>
            <td>${formatarDataHora(laudo.envio)}</td>
            <td>${badgeStatus(laudo.status)}</td>
            <td><div class="acoes-linha"><button class="acao-tabela acao-secundaria" type="button" data-view="laudos">Abrir em Laudos</button></div></td>
          </tr>
        `).join("")
        : '<tr><td colspan="5" class="estado-vazio">Nenhum laudo aguardando atendimento.</td></tr>';
    }

    const alertas = elemento("estoque-alertas");
    if (alertas) {
      const limite = new Date();
      limite.setDate(limite.getDate() + 60);
      const itens = estado.medicamentos.filter((medicamento) => {
        const validade = dataValida(medicamento.validade);
        return !medicamentoPodeSerVinculado(medicamento) || (validade && validade <= limite);
      });

      alertas.innerHTML = itens.length
        ? itens.map((medicamento) => {
          const semEstoque = Number(medicamento.quantidade) <= 0;
          const titulo = semEstoque ? "Sem estoque" : "Validade próxima";
          const detalhe = semEstoque
            ? "Reposição necessária"
            : `Vence em ${formatarData(medicamento.validade)}`;
          return `
            <article class="alerta-painel alerta-estoque ${semEstoque ? "alerta-critico" : "alerta-atencao"}">
              <span class="alerta-icone" aria-hidden="true">${semEstoque ? "!" : "i"}</span>
              <div>
                <strong>${escaparHtml(titulo)} · ${escaparHtml(medicamento.nome)}</strong>
                <span>${escaparHtml(detalhe)}</span>
              </div>
              <button type="button" class="acao-tabela acao-secundaria" data-view="medicamentos">Abrir em Medicamentos</button>
            </article>
          `;
        }).join("")
        : '<p class="estado-vazio">Estoque regular, sem alertas no momento.</p>';
    }
  }

  function laudosFiltrados() {
    const termo = normalizar(elemento("busca-laudos")?.value);
    const filtro = elemento("filtro-status-laudos")?.value || "todos";
    return ordenarLaudos(estado.laudos.filter((laudo) => {
      const texto = normalizar([
        laudo.id,
        laudo.paciente.nome,
        laudo.paciente.cns,
        laudo.paciente.cpf,
        laudo.medicamento,
        laudo.prescritor,
        laudo.crm,
      ].join(" "));
      const correspondeBusca = !termo || texto.includes(termo);
      const correspondeStatus = slug(filtro) === "todos" || slug(filtro) === slug(laudo.status);
      return correspondeBusca && correspondeStatus;
    }));
  }

  function renderizarLaudos() {
    const lista = laudosFiltrados();
    definirTexto("contador-laudos", lista.length);
    const corpo = elemento("lista-laudos-corpo");
    const vazio = elemento("estado-vazio-laudos");
    if (vazio) vazio.hidden = lista.length > 0;
    if (!corpo) return;
    corpo.innerHTML = lista.map((laudo) => `
      <tr class="linha-clicavel" data-action="ver-laudo" data-id="${escaparHtml(laudo.id)}" tabindex="0" aria-label="Abrir detalhes do laudo de ${escaparHtml(laudo.paciente.nome)}">
        <td>
          <div class="celula-principal">
            <strong>${escaparHtml(laudo.paciente.nome)}</strong>
            <span>${escaparHtml(laudo.paciente.cns)} · ${escaparHtml(laudo.id)}</span>
          </div>
        </td>
        <td><div class="celula-principal"><strong>${escaparHtml(laudo.medicamento)}</strong><span>${escaparHtml(laudo.dose)}</span></div></td>
        <td>${formatarDataHora(laudo.envio)}</td>
        <td>${badgeStatus(laudo.status)}</td>
        <td><div class="acoes-linha">${acoesLaudo(laudo, false)}</div></td>
      </tr>
    `).join("");
  }

  function clientesFiltrados() {
    const termo = normalizar(elemento("busca-clientes")?.value);
    return estado.clientes.filter((cliente) => {
      const texto = normalizar([
        cliente.nome,
        cliente.cpf,
        cliente.cns,
        cliente.telefone,
        cliente.email,
      ].join(" "));
      return !termo || texto.includes(termo);
    }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function renderizarClientes() {
    const lista = clientesFiltrados();
    definirTexto("contador-clientes", lista.length);
    const corpo = elemento("lista-clientes-corpo");
    const vazio = elemento("estado-vazio-clientes");
    if (vazio) vazio.hidden = lista.length > 0;
    if (!corpo) return;
    corpo.innerHTML = lista.map((cliente) => `
      <tr>
        <td>
          <div class="celula-principal">
            <strong>${escaparHtml(cliente.nome)}</strong>
            <span>${cliente.nascimento ? `Nascimento: ${formatarData(cliente.nascimento)}` : escaparHtml(cliente.id)}</span>
          </div>
        </td>
        <td>${escaparHtml(formatarCpf(cliente.cpf))}</td>
        <td>${escaparHtml(formatarCns(cliente.cns))}</td>
        <td><div class="celula-principal"><strong>${escaparHtml(formatarTelefone(cliente.telefone))}</strong><span>${escaparHtml(cliente.email || "Sem e-mail")}</span></div></td>
        <td><div class="acoes-linha"><button class="acao-tabela acao-principal" type="button" data-action="pedido-manual-cliente" data-id="${escaparHtml(cliente.id)}">Fazer pedido</button></div></td>
      </tr>
    `).join("");
  }

  function medicamentosFiltrados() {
    const termo = normalizar(elemento("busca-medicamentos")?.value);
    const filtro = normalizar(elemento("filtro-disponibilidade")?.value || "todos");
    return estado.medicamentos.filter((medicamento) => {
      const pacientes = estado.laudos
        .filter((laudo) => laudo.vinculo?.medicamentoId === medicamento.id)
        .map((laudo) => laudo.vinculo.pacienteNome)
        .join(" ");
      const texto = normalizar([
        medicamento.nome,
        medicamento.principioAtivo,
        medicamento.apresentacao,
        medicamento.lote,
        medicamento.localizacao,
        pacientes,
      ].join(" "));
      const disponivel = medicamentoPodeSerVinculado(medicamento);
      const correspondeBusca = !termo || texto.includes(termo);
      const correspondeFiltro = filtro === "todos" ||
        (filtro === "disponivel" && disponivel) ||
        (filtro === "indisponivel" && !disponivel) ||
        (filtro === "estoque-baixo" && Number(medicamento.quantidade) <= 5);
      return correspondeBusca && correspondeFiltro;
    }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function renderizarMedicamentos() {
    const lista = medicamentosFiltrados();
    definirTexto("contador-medicamentos", lista.length);
    const corpo = elemento("lista-medicamentos-corpo");
    const vazio = elemento("estado-vazio-medicamentos");
    if (vazio) vazio.hidden = lista.length > 0;
    if (!corpo) return;
    corpo.innerHTML = lista.map((medicamento) => {
      const disponivel = medicamentoPodeSerVinculado(medicamento);
      const quantidade = Number(medicamento.quantidade) || 0;
      const classeEstoque = quantidade === 0 ? "estoque-esgotado" : quantidade <= 5 ? "estoque-baixo" : "estoque-regular";
      return `
        <tr class="linha-medicamento linha-clicavel ${disponivel ? "medicamento-disponivel" : "medicamento-indisponivel"}" data-action="ver-medicamento" data-id="${escaparHtml(medicamento.id)}" tabindex="0" aria-label="Abrir detalhes de ${escaparHtml(medicamento.nome)}">
          <td>
            <div class="celula-principal">
              <strong>${escaparHtml(medicamento.nome)}</strong>
            </div>
          </td>
          <td><span class="quantidade-estoque ${classeEstoque}"><strong>${quantidade}</strong><small>unidades</small></span></td>
          <td><span class="status ${disponivel ? "disponivel" : "indisponivel"}" data-status="${disponivel ? "disponivel" : "indisponivel"}">${disponivel ? "Disponível" : "Indisponível"}</span></td>
          <td>
            <div class="acoes-linha">
              <button class="acao-tabela acao-secundaria" type="button" data-action="ver-medicamento" data-id="${escaparHtml(medicamento.id)}">Ver detalhes</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function abrirDetalheMedicamento(id) {
    const medicamento = obterMedicamento(id);
    const conteudo = elemento("conteudo-detalhe-medicamento");
    if (!medicamento || !conteudo) return;
    const disponivel = medicamentoPodeSerVinculado(medicamento);
    const vinculos = estado.laudos
      .filter((laudo) => laudo.vinculo?.medicamentoId === medicamento.id)
      .map((laudo) => `${escaparHtml(laudo.vinculo.pacienteNome)} (${escaparHtml(laudo.id)})`);
    conteudo.innerHTML = `
      <div class="cabecalho-detalhe-medicamento">
        <div>
          <h3>${escaparHtml(medicamento.nome)}</h3>
          <p>${escaparHtml(medicamento.principioAtivo)} · ${escaparHtml(medicamento.apresentacao)}</p>
        </div>
        <span class="status ${disponivel ? "disponivel" : "indisponivel"}">${disponivel ? "Disponível" : "Indisponível"}</span>
      </div>
      <div class="grade-detalhes">
        <div><span>Lote</span><strong>${escaparHtml(medicamento.lote)}</strong></div>
        <div><span>Quantidade</span><strong>${Number(medicamento.quantidade) || 0} unidades</strong></div>
        <div><span>Validade</span><strong>${formatarData(medicamento.validade)}</strong></div>
        <div><span>Localização</span><strong>${escaparHtml(medicamento.localizacao)}</strong></div>
        <div class="detalhe-largura-total"><span>Paciente(s) vinculado(s)</span><strong>${vinculos.length ? vinculos.join(", ") : "Nenhum vínculo registrado"}</strong></div>
      </div>
      <div class="acoes-detalhe-medicamento">
        <button class="botao-secundario" type="button" data-action="editar-medicamento" data-id="${escaparHtml(medicamento.id)}">Editar dados</button>
        <button class="${disponivel ? "botao-perigo" : "botao-primario"}" type="button" data-action="alternar-disponibilidade" data-id="${escaparHtml(medicamento.id)}">${disponivel ? "Indisponibilizar" : "Disponibilizar"}</button>
      </div>
    `;
    abrirDialog(elemento("modal-detalhe-medicamento"));
  }

  function opcoesVinculo(laudo) {
    const compativeis = estado.medicamentos.filter(
      (medicamento) => medicamentoPodeSerVinculado(medicamento) && medicamentoCorrespondeAoLaudo(laudo, medicamento),
    );
    if (!compativeis.length) {
      return `<p class="aviso-inline">Não há lote disponível para ${escaparHtml(laudo.medicamento)}. Atualize o estoque antes de continuar.</p>`;
    }
    const opcoes = compativeis.map((medicamento) =>
      `<option value="${escaparHtml(medicamento.id)}">${escaparHtml(medicamento.nome)} · lote ${escaparHtml(medicamento.lote)} · ${medicamento.quantidade} un.</option>`,
    ).join("");
    return `
      <div class="campo-vinculo">
        <label for="selecao-vinculo-medicamento">Medicamento e lote disponível</label>
        <select id="selecao-vinculo-medicamento" data-vinculo-medicamento>${opcoes}</select>
      </div>
      <button class="botao-primario" type="button" data-action="vincular-medicamento" data-id="${escaparHtml(laudo.id)}">Vincular ao paciente</button>
    `;
  }

  function acoesDetalhe(laudo) {
    if (laudo.status === STATUS.PENDENTE) {
      return `<button class="botao-primario" type="button" data-action="iniciar-analise" data-id="${escaparHtml(laudo.id)}">Iniciar análise</button>`;
    }
    if (laudo.status === STATUS.ANALISE) {
      return `
        <button class="botao-secundario botao-perigo" type="button" data-action="abrir-reprovacao" data-id="${escaparHtml(laudo.id)}">Reprovar laudo</button>
        <button class="botao-primario" type="button" data-action="aprovar-laudo" data-id="${escaparHtml(laudo.id)}">Aprovar laudo</button>
      `;
    }
    if (laudo.status === STATUS.APROVADO) return opcoesVinculo(laudo);
    if (laudo.status === STATUS.VINCULADO) {
      return `<button class="botao-primario" type="button" data-action="liberar-medicamento" data-id="${escaparHtml(laudo.id)}">Liberar para o paciente</button>`;
    }
    return "";
  }

  function renderizarHistorico(laudo) {
    const historico = Array.isArray(laudo.historico) ? laudo.historico.slice().reverse() : [];
    return historico.length
      ? historico.map((item) => `
        <li class="item-historico">
          <span class="marcador-historico" aria-hidden="true"></span>
          <div>
            <strong>${escaparHtml(item.acao)}</strong>
            <span>${formatarDataHora(item.data)} · ${escaparHtml(item.responsavel)}</span>
            <p>${escaparHtml(item.detalhe)}</p>
          </div>
        </li>
      `).join("")
      : '<li class="estado-vazio">Nenhum evento registrado.</li>';
  }

  function abrirDetalheLaudo(id) {
    const laudo = obterLaudo(id);
    const conteudo = elemento("conteudo-modal-laudo");
    if (!laudo || !conteudo) return;

    const reprovacao = laudo.status === STATUS.REPROVADO
      ? `<div class="bloco-motivo"><strong>Motivo da reprovação</strong><p>${escaparHtml(laudo.reprovacaoMotivo)}</p></div>`
      : "";
    const vinculo = laudo.vinculo
      ? `<div class="bloco-vinculo"><strong>Medicamento vinculado</strong><p>${escaparHtml(laudo.vinculo.nome)} · lote ${escaparHtml(laudo.vinculo.lote)}</p><span>Paciente: ${escaparHtml(laudo.vinculo.pacienteNome)}</span></div>`
      : "";

    conteudo.innerHTML = `
      <header class="cabecalho-detalhe-laudo">
        <div>
          <span class="rotulo-modal">${escaparHtml(laudo.id)}</span>
          <h2>${escaparHtml(laudo.paciente.nome)}</h2>
          <p>${escaparHtml(laudo.paciente.cns)} · CPF ${escaparHtml(laudo.paciente.cpf)}</p>
        </div>
        <div>${badgeStatus(laudo.status)} ${badgePrioridade(laudo.prioridade)}</div>
      </header>
      <div class="grade-detalhes">
        <div><span>Medicamento solicitado</span><strong>${escaparHtml(laudo.medicamento)}</strong></div>
        <div><span>Posologia</span><strong>${escaparHtml(laudo.dose)}</strong></div>
        <div><span>Prescritor</span><strong>${escaparHtml(laudo.prescritor)} · ${escaparHtml(laudo.crm)}</strong></div>
        <div><span>Enviado em</span><strong>${formatarDataHora(laudo.envio)}</strong></div>
        <div><span>Validade do laudo</span><strong>${formatarData(laudo.validade)}</strong></div>
        <div><span>Arquivo</span><button class="link-arquivo" type="button" data-action="visualizar-arquivo" data-id="${escaparHtml(laudo.id)}">${escaparHtml(laudo.arquivo)}</button></div>
      </div>
      ${reprovacao}
      ${vinculo}
      <section class="secao-historico" aria-labelledby="titulo-historico-laudo">
        <h3 id="titulo-historico-laudo">Histórico do atendimento</h3>
        <ol class="lista-historico">${renderizarHistorico(laudo)}</ol>
      </section>
      <footer class="acoes-modal-laudo">${acoesDetalhe(laudo)}</footer>
    `;
    abrirDialog(elemento("modal-laudo"));
  }

  async function iniciarAnalise(id) {
    const laudo = obterLaudo(id);
    if (!laudo || laudo.status !== STATUS.PENDENTE) {
      mostrarToast("Este laudo não pode iniciar análise no estado atual.", "erro");
      return;
    }
    if (!await executarNoBackend(`/api/pharmacist/exams/${encodeURIComponent(id)}/actions`, "POST", {
      action: "start_analysis",
    })) return;
    laudo.status = STATUS.ANALISE;
    registrarHistorico(laudo, "Análise iniciada", "Conferência de prescrição e documentos iniciada.");
    salvarERenderizar("Laudo movido para análise.");
    abrirDetalheLaudo(id);
  }

  async function aprovarLaudo(id) {
    const laudo = obterLaudo(id);
    if (!laudo || laudo.status !== STATUS.ANALISE) {
      mostrarToast("Somente laudos em análise podem ser aprovados.", "erro");
      return;
    }
    if (!await executarNoBackend(`/api/pharmacist/exams/${encodeURIComponent(id)}/actions`, "POST", {
      action: "approve",
    })) return;
    laudo.status = STATUS.APROVADO;
    laudo.aprovadoEm = agoraIso();
    laudo.aprovadoPor = estado.profissional || PROFISSIONAL_ATUAL;
    registrarHistorico(laudo, "Laudo aprovado", "Documentação e prescrição validadas.");
    salvarERenderizar("Laudo aprovado com sucesso.");
    abrirDetalheLaudo(id);
  }

  function abrirReprovacao(id) {
    const laudo = obterLaudo(id);
    if (!laudo || laudo.status !== STATUS.ANALISE) {
      mostrarToast("Somente laudos em análise podem ser reprovados.", "erro");
      return;
    }
    laudoEmReprovacao = id;
    const motivo = elemento("motivo-reprovacao");
    const erro = elemento("erro-motivo");
    if (motivo) {
      motivo.value = "";
      motivo.removeAttribute("aria-invalid");
    }
    if (erro) erro.textContent = "";
    fecharDialog(elemento("modal-laudo"));
    abrirDialog(elemento("modal-reprovacao"));
    window.setTimeout(() => motivo?.focus(), 0);
  }

  async function concluirReprovacao(evento) {
    evento.preventDefault();
    const laudo = obterLaudo(laudoEmReprovacao);
    const campo = elemento("motivo-reprovacao");
    const erro = elemento("erro-motivo");
    const motivo = campo?.value.trim() || "";
    if (!laudo || laudo.status !== STATUS.ANALISE) {
      fecharDialog(elemento("modal-reprovacao"));
      mostrarToast("Não foi possível reprovar este laudo.", "erro");
      return;
    }
    if (!motivo) {
      if (erro) erro.textContent = "Informe o motivo da reprovação.";
      campo?.setAttribute("aria-invalid", "true");
      campo?.focus();
      return;
    }
    campo?.removeAttribute("aria-invalid");
    if (erro) erro.textContent = "";
    if (!await executarNoBackend(`/api/pharmacist/exams/${encodeURIComponent(laudo.id)}/actions`, "POST", {
      action: "reject",
      reason: motivo,
    })) return;
    laudo.status = STATUS.REPROVADO;
    laudo.reprovacaoMotivo = motivo;
    laudo.reprovadoEm = agoraIso();
    laudo.reprovadoPor = estado.profissional || PROFISSIONAL_ATUAL;
    registrarHistorico(laudo, "Laudo reprovado", motivo);
    const id = laudo.id;
    laudoEmReprovacao = null;
    fecharDialog(elemento("modal-reprovacao"));
    salvarERenderizar("Laudo reprovado e motivo registrado.", "aviso");
    abrirDetalheLaudo(id);
  }

  function vincularMedicamento(id, botao) {
    const laudo = obterLaudo(id);
    const seletor = botao.closest("#conteudo-modal-laudo")?.querySelector("[data-vinculo-medicamento]");
    const medicamento = obterMedicamento(seletor?.value);
    if (!laudo || laudo.status !== STATUS.APROVADO) {
      mostrarToast("Apenas laudos aprovados podem receber um vínculo.", "erro");
      return;
    }
    if (!medicamentoPodeSerVinculado(medicamento) || !medicamentoCorrespondeAoLaudo(laudo, medicamento)) {
      mostrarToast("Selecione um lote disponível do medicamento solicitado no laudo.", "erro");
      seletor?.focus();
      return;
    }
    vinculoPendente = { laudoId: laudo.id, medicamentoId: medicamento.id };
    const detalhes = elemento("detalhes-confirmar-vinculo");
    if (detalhes) detalhes.innerHTML = `
      <div><span>Paciente</span><strong>${escaparHtml(laudo.paciente.nome)}</strong></div>
      <div><span>Medicamento</span><strong>${escaparHtml(medicamento.nome)}</strong></div>
      <div><span>Apresentação</span><strong>${escaparHtml(medicamento.apresentacao)}</strong></div>
      <div><span>Lote</span><strong>${escaparHtml(medicamento.lote)}</strong></div>
      <div><span>Validade</span><strong>${formatarData(medicamento.validade)}</strong></div>
      <div><span>Estoque atual</span><strong>${Number(medicamento.quantidade) || 0} unidades</strong></div>
    `;
    fecharDialog(elemento("modal-laudo"));
    abrirDialog(elemento("modal-confirmar-vinculo"));
  }

  async function concluirVinculo(evento) {
    evento.preventDefault();
    const laudo = obterLaudo(vinculoPendente?.laudoId);
    const medicamento = obterMedicamento(vinculoPendente?.medicamentoId);
    if (
      !laudo ||
      laudo.status !== STATUS.APROVADO ||
      !medicamentoPodeSerVinculado(medicamento) ||
      !medicamentoCorrespondeAoLaudo(laudo, medicamento)
    ) {
      vinculoPendente = null;
      fecharDialog(elemento("modal-confirmar-vinculo"));
      mostrarToast("Os dados mudaram. Revise o laudo e o estoque antes de vincular.", "erro");
      return;
    }
    if (!await executarNoBackend(`/api/pharmacist/exams/${encodeURIComponent(laudo.id)}/actions`, "POST", {
      action: "link_medicine",
      medicineId: medicamento.id,
    })) return;
    const data = agoraIso();
    laudo.status = STATUS.VINCULADO;
    laudo.vinculo = {
      medicamentoId: medicamento.id,
      nome: medicamento.nome,
      lote: medicamento.lote,
      pacienteId: laudo.paciente.id,
      pacienteNome: laudo.paciente.nome,
      vinculadoEm: data,
      vinculadoPor: estado.profissional || PROFISSIONAL_ATUAL,
    };
    registrarHistorico(
      laudo,
      "Medicamento vinculado",
      `Lote ${medicamento.lote} reservado para ${laudo.paciente.nome}.`,
    );
    vinculoPendente = null;
    fecharDialog(elemento("modal-confirmar-vinculo"));
    salvarERenderizar("Medicamento e lote vinculados ao paciente.");
    abrirDetalheLaudo(laudo.id);
  }

  function cancelarConfirmacaoVinculo() {
    const laudoId = vinculoPendente?.laudoId;
    vinculoPendente = null;
    fecharDialog(elemento("modal-confirmar-vinculo"));
    if (laudoId) abrirDetalheLaudo(laudoId);
  }

  async function liberarMedicamento(id) {
    const laudo = obterLaudo(id);
    const medicamento = obterMedicamento(laudo?.vinculo?.medicamentoId);
    if (!laudo || laudo.status !== STATUS.VINCULADO || !laudo.vinculo) {
      mostrarToast("O medicamento precisa estar vinculado antes da liberação.", "erro");
      return;
    }
    if (!medicamento || Number(medicamento.quantidade) <= 0) {
      mostrarToast("O lote vinculado não possui estoque para liberação.", "erro");
      return;
    }
    if (!await executarNoBackend(`/api/pharmacist/exams/${encodeURIComponent(id)}/actions`, "POST", {
      action: "release_medicine",
    })) return;
    medicamento.quantidade = Math.max(0, Number(medicamento.quantidade) - 1);
    if (medicamento.quantidade === 0) medicamento.disponivel = false;
    laudo.status = STATUS.LIBERADO;
    laudo.liberadoEm = agoraIso();
    laudo.liberadoPor = estado.profissional || PROFISSIONAL_ATUAL;
    registrarHistorico(laudo, "Medicamento liberado", "Dispensação registrada e estoque atualizado em uma unidade.");
    salvarERenderizar("Medicamento liberado e estoque atualizado.");
    abrirDetalheLaudo(id);
  }

  function abrirEdicaoMedicamento(id) {
    const medicamento = obterMedicamento(id);
    if (!medicamento) return;
    fecharDialog(elemento("modal-detalhe-medicamento"));
    medicamentoEmEdicao = id;
    const campos = {
      "medicamento-nome": medicamento.nome,
      "medicamento-lote": medicamento.lote,
      "medicamento-quantidade": medicamento.quantidade,
      "medicamento-validade": medicamento.validade,
      "medicamento-localizacao": medicamento.localizacao,
    };
    Object.entries(campos).forEach(([campoId, valor]) => {
      const campo = elemento(campoId);
      if (campo) campo.value = valor;
    });
    const disponivel = elemento("medicamento-disponivel");
    if (disponivel) disponivel.checked = Boolean(medicamento.disponivel);
    abrirDialog(elemento("modal-medicamento"));
    window.setTimeout(() => elemento("medicamento-lote")?.focus(), 0);
  }

  async function salvarMedicamento(evento) {
    evento.preventDefault();
    const medicamento = obterMedicamento(medicamentoEmEdicao);
    if (!medicamento) {
      fecharDialog(elemento("modal-medicamento"));
      mostrarToast("Medicamento não encontrado.", "erro");
      return;
    }
    const estavaSemEstoque = Number(medicamento.quantidade) <= 0;
    const lote = elemento("medicamento-lote")?.value.trim() || "";
    const quantidadeCampo = elemento("medicamento-quantidade");
    const quantidade = Number.parseInt(quantidadeCampo?.value, 10);
    const validade = elemento("medicamento-validade")?.value || "";
    const localizacao = elemento("medicamento-localizacao")?.value.trim() || "";
    const disponivel = Boolean(elemento("medicamento-disponivel")?.checked);

    if (!lote || !Number.isInteger(quantidade) || quantidade < 0 || !validade || !localizacao) {
      mostrarToast("Preencha lote, quantidade, validade e localização corretamente.", "erro");
      if (!lote) elemento("medicamento-lote")?.focus();
      else if (!Number.isInteger(quantidade) || quantidade < 0) quantidadeCampo?.focus();
      else if (!validade) elemento("medicamento-validade")?.focus();
      else elemento("medicamento-localizacao")?.focus();
      return;
    }
    if (disponivel && quantidade === 0) {
      mostrarToast("Um medicamento sem estoque não pode ser marcado como disponível.", "erro");
      quantidadeCampo?.focus();
      return;
    }

    if (!await executarNoBackend(`/api/pharmacist/medicines/${encodeURIComponent(medicamento.id)}`, "PATCH", {
      lote,
      quantidade,
      validade,
      localizacao,
      disponivel: quantidade > 0 && (disponivel || estavaSemEstoque),
    })) return;

    medicamento.lote = lote;
    medicamento.quantidade = quantidade;
    medicamento.validade = validade;
    medicamento.localizacao = localizacao;
    medicamento.disponivel = quantidade > 0 && (disponivel || estavaSemEstoque);
    medicamentoEmEdicao = null;
    fecharDialog(elemento("modal-medicamento"));
    salvarERenderizar("Dados do medicamento atualizados.");
  }

  async function alternarDisponibilidade(id) {
    const medicamento = obterMedicamento(id);
    if (!medicamento) return;
    if (!medicamento.disponivel && Number(medicamento.quantidade) <= 0) {
      mostrarToast("Atualize o estoque antes de disponibilizar este medicamento.", "erro");
      abrirEdicaoMedicamento(id);
      return;
    }
    const novaDisponibilidade = !medicamento.disponivel;
    if (!await executarNoBackend(`/api/pharmacist/medicines/${encodeURIComponent(id)}`, "PATCH", {
      disponivel: novaDisponibilidade,
    })) return;
    medicamento.disponivel = novaDisponibilidade;
    salvarERenderizar(
      medicamento.disponivel ? "Medicamento marcado como disponível." : "Medicamento marcado como indisponível.",
      medicamento.disponivel ? "sucesso" : "aviso",
    );
    abrirDetalheMedicamento(id);
  }

  function abrirCadastroCliente() {
    const form = elemento("form-cadastro-cliente");
    form?.reset();
    definirTexto("erro-cadastro-cliente", "");
    abrirDialog(elemento("modal-cadastro-cliente"));
    window.setTimeout(() => elemento("cliente-nome")?.focus(), 0);
  }

  function preencherOpcoesPedidoManual() {
    const seletor = elemento("pedido-cliente");
    if (seletor) {
      const opcoes = estado.clientes.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      seletor.innerHTML = opcoes.length
        ? `<option value="">Selecione um cliente</option>${opcoes.map((cliente) => `<option value="${escaparHtml(cliente.id)}">${escaparHtml(cliente.nome)} · CPF ${escaparHtml(formatarCpf(cliente.cpf))}</option>`).join("")}`
        : '<option value="">Nenhum cliente cadastrado</option>';
      seletor.value = clientePreSelecionado && obterCliente(clientePreSelecionado) ? clientePreSelecionado : "";
    }
    const lista = elemento("lista-medicamentos-pedido");
    if (lista) {
      lista.innerHTML = estado.medicamentos.map((medicamento) => `<option value="${escaparHtml(medicamento.nome)}"></option>`).join("");
    }
  }

  function abrirPedidoManual(clienteId) {
    clientePreSelecionado = clienteId || null;
    if (!estado.clientes.length) {
      mostrarToast("Cadastre o cliente antes de criar o pedido manual.", "aviso");
      exibirView("clientes", true);
      abrirCadastroCliente();
      return;
    }
    const form = elemento("form-pedido-manual");
    form?.reset();
    definirTexto("erro-pedido-manual", "");
    preencherOpcoesPedidoManual();
    abrirDialog(elemento("modal-pedido-manual"));
    window.setTimeout(() => elemento("pedido-cliente")?.focus(), 0);
  }

  async function salvarCliente(evento) {
    evento.preventDefault();
    const nome = elemento("cliente-nome")?.value.trim() || "";
    const cpf = formatarCpf(elemento("cliente-cpf")?.value);
    const cns = formatarCns(elemento("cliente-cns")?.value);
    const nascimento = elemento("cliente-nascimento")?.value || "";
    const telefone = formatarTelefone(elemento("cliente-telefone")?.value);
    const email = elemento("cliente-email")?.value.trim() || "";
    const endereco = elemento("cliente-endereco")?.value.trim() || "";
    const erro = elemento("erro-cadastro-cliente");

    if (nome.length < 3 || somenteDigitos(cpf).length !== 11 || somenteDigitos(cns).length !== 15 || !nascimento || somenteDigitos(telefone).length < 10 || !endereco) {
      if (erro) erro.textContent = "Preencha nome, CPF, Cartão SUS, nascimento, telefone e endereço corretamente.";
      return;
    }
    if (dataValida(nascimento) > new Date()) {
      if (erro) erro.textContent = "A data de nascimento não pode estar no futuro.";
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (erro) erro.textContent = "Informe um e-mail válido ou deixe o campo vazio.";
      return;
    }
    if (estado.clientes.some((cliente) => somenteDigitos(cliente.cpf) === somenteDigitos(cpf))) {
      if (erro) erro.textContent = "Já existe um cliente cadastrado com este CPF.";
      return;
    }

    const payload = { nome, cpf, cns, nascimento, telefone, email, endereco };
    let cliente;
    try {
      if (tokenFirebase()) {
        const resposta = await requisitarBackend("/api/pharmacist/clients", { method: "POST", body: payload });
        cliente = resposta.cliente;
      } else {
        cliente = { id: `CLI-${Date.now().toString(36).toUpperCase()}`, ...payload };
      }
    } catch (falha) {
      if (erro) erro.textContent = falha.message || "Não foi possível cadastrar o cliente.";
      return;
    }

    estado.clientes.push(cliente);
    persistirEstado();
    renderizarClientes();
    fecharDialog(elemento("modal-cadastro-cliente"));
    mostrarToast("Cliente cadastrado com sucesso.");
  }

  async function salvarPedidoManual(evento) {
    evento.preventDefault();
    const cliente = obterCliente(elemento("pedido-cliente")?.value);
    const medicamento = elemento("pedido-medicamento")?.value.trim() || "";
    const dose = elemento("pedido-dose")?.value.trim() || "";
    const prescritor = elemento("pedido-prescritor")?.value.trim() || "";
    const crm = elemento("pedido-crm")?.value.trim() || "";
    const validade = elemento("pedido-validade")?.value || "";
    const prioridade = elemento("pedido-prioridade")?.value || "Normal";
    const observacoes = elemento("pedido-observacoes")?.value.trim() || "";
    const erro = elemento("erro-pedido-manual");

    if (!cliente || !medicamento || !dose || !prescritor || !crm || !validade) {
      if (erro) erro.textContent = "Selecione o cliente e preencha todos os dados obrigatórios do laudo.";
      return;
    }
    const fimValidade = dataValida(validade);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (!fimValidade || fimValidade < hoje) {
      if (erro) erro.textContent = "A validade do laudo deve ser igual ou posterior à data de hoje.";
      return;
    }

    const payload = {
      clienteId: cliente.id,
      medicamento,
      dose,
      prescritor,
      crm,
      validade,
      prioridade,
      observacoes,
    };
    let laudo;
    try {
      if (tokenFirebase()) {
        const resposta = await requisitarBackend("/api/pharmacist/manual-orders", { method: "POST", body: payload });
        laudo = resposta.laudo;
      } else {
        const agora = agoraIso();
        laudo = {
          id: `MAN-${Date.now().toString(36).toUpperCase()}`,
          paciente: { id: cliente.id, nome: cliente.nome, cpf: cliente.cpf, cns: cliente.cns },
          medicamento,
          dose,
          prescritor,
          crm,
          envio: agora,
          validade,
          prioridade,
          status: STATUS.PENDENTE,
          arquivo: "Laudo físico entregue na unidade",
          origem: "manual",
          observacoes,
          historico: [{
            data: agora,
            acao: "Pedido manual registrado",
            responsavel: estado.profissional || PROFISSIONAL_ATUAL,
            detalhe: observacoes || "Laudo físico recebido presencialmente na unidade.",
          }],
        };
      }
    } catch (falha) {
      if (erro) erro.textContent = falha.message || "Não foi possível criar o pedido manual.";
      return;
    }

    estado.laudos.push(laudo);
    persistirEstado();
    renderizarTudo();
    fecharDialog(elemento("modal-pedido-manual"));
    clientePreSelecionado = null;
    exibirView("laudos", true);
    mostrarToast("Pedido manual criado e adicionado à fila de laudos.");
  }

  function renderizarTudo() {
    renderizarDashboard();
    renderizarLaudos();
    renderizarClientes();
    renderizarMedicamentos();
  }

  function viewInicial() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    const views = Array.from(document.querySelectorAll("[data-painel]")).map((painel) => painel.dataset.painel);
    if (hash && views.includes(hash)) return hash;
    const nav = document.querySelector(".item-menu-farmaceutico[data-view]");
    return nav?.dataset.view || views[0] || "";
  }

  function exibirView(view, atualizarHash) {
    const paineis = Array.from(document.querySelectorAll("[data-painel]"));
    if (!view || !paineis.some((painel) => painel.dataset.painel === view)) return;
    paineis.forEach((painel) => {
      const ativo = painel.dataset.painel === view;
      painel.hidden = !ativo;
      painel.classList.toggle("ativo", ativo);
    });
    document.querySelectorAll(".item-menu-farmaceutico[data-view]").forEach((link) => {
      const ativo = link.dataset.view === view;
      link.classList.toggle("ativo", ativo);
      if (ativo) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const restaurarDemonstracao = elemento("restaurar-demonstracao");
    if (restaurarDemonstracao) restaurarDemonstracao.hidden = view === "visao-geral" || Boolean(tokenFirebase());
    if (atualizarHash && window.location.hash !== `#${view}`) {
      window.history.replaceState(null, "", `#${encodeURIComponent(view)}`);
    }
  }

  function executarAcao(botao) {
    const acao = botao.dataset.action;
    const id = botao.dataset.id;
    const viewAtiva = document.querySelector("[data-painel].ativo")?.dataset.painel;
    if (viewAtiva === "visao-geral" && ACOES_DE_ALTERACAO.has(acao)) {
      mostrarToast("Para fazer alterações, acesse as telas de Laudos ou Medicamentos.", "aviso");
      return;
    }
    switch (acao) {
      case "ver-laudo":
        abrirDetalheLaudo(id);
        break;
      case "ver-medicamento":
        abrirDetalheMedicamento(id);
        break;
      case "iniciar-analise":
        iniciarAnalise(id);
        break;
      case "aprovar-laudo":
        aprovarLaudo(id);
        break;
      case "abrir-reprovacao":
        abrirReprovacao(id);
        break;
      case "vincular-medicamento":
        vincularMedicamento(id, botao);
        break;
      case "liberar-medicamento":
        liberarMedicamento(id);
        break;
      case "editar-medicamento":
        abrirEdicaoMedicamento(id);
        break;
      case "alternar-disponibilidade":
        alternarDisponibilidade(id);
        break;
      case "visualizar-arquivo":
        visualizarArquivo(id);
        break;
      case "pedido-manual-cliente":
        abrirPedidoManual(id);
        break;
      default:
        break;
    }
  }

  function configurarEventos() {
    document.addEventListener("click", (evento) => {
      const nav = evento.target.closest("[data-view]");
      if (nav) {
        evento.preventDefault();
        exibirView(nav.dataset.view, true);
        return;
      }
      const acao = evento.target.closest("[data-action]");
      if (acao) {
        evento.preventDefault();
        executarAcao(acao);
      }
    });

    document.addEventListener("keydown", (evento) => {
      if (!["Enter", " "].includes(evento.key) || evento.target.closest("button, a, input, select, textarea")) return;
      const linha = evento.target.closest("tr[data-action]");
      if (!linha) return;
      evento.preventDefault();
      executarAcao(linha);
    });

    window.addEventListener("hashchange", () => exibirView(viewInicial(), false));
    elemento("busca-laudos")?.addEventListener("input", renderizarLaudos);
    elemento("filtro-status-laudos")?.addEventListener("change", renderizarLaudos);
    elemento("busca-clientes")?.addEventListener("input", renderizarClientes);
    elemento("busca-medicamentos")?.addEventListener("input", renderizarMedicamentos);
    elemento("filtro-disponibilidade")?.addEventListener("change", renderizarMedicamentos);
    elemento("abrir-perfil-farmaceutico")?.addEventListener("click", () => abrirDialog(elemento("modal-perfil-farmaceutico")));
    elemento("fechar-modal-perfil")?.addEventListener("click", () => fecharDialog(elemento("modal-perfil-farmaceutico")));
    elemento("fechar-modal-laudo")?.addEventListener("click", () => fecharDialog(elemento("modal-laudo")));
    elemento("fechar-detalhe-medicamento")?.addEventListener("click", () => fecharDialog(elemento("modal-detalhe-medicamento")));
    elemento("abrir-cadastro-cliente")?.addEventListener("click", abrirCadastroCliente);
    elemento("abrir-pedido-manual")?.addEventListener("click", () => abrirPedidoManual());
    elemento("fechar-cadastro-cliente")?.addEventListener("click", () => fecharDialog(elemento("modal-cadastro-cliente")));
    elemento("cancelar-cadastro-cliente")?.addEventListener("click", () => fecharDialog(elemento("modal-cadastro-cliente")));
    elemento("fechar-pedido-manual")?.addEventListener("click", () => fecharDialog(elemento("modal-pedido-manual")));
    elemento("cancelar-pedido-manual")?.addEventListener("click", () => fecharDialog(elemento("modal-pedido-manual")));
    elemento("cancelar-reprovacao")?.addEventListener("click", () => {
      laudoEmReprovacao = null;
      fecharDialog(elemento("modal-reprovacao"));
    });
    elemento("cancelar-medicamento")?.addEventListener("click", () => {
      medicamentoEmEdicao = null;
      fecharDialog(elemento("modal-medicamento"));
    });
    elemento("cancelar-vinculo")?.addEventListener("click", cancelarConfirmacaoVinculo);
    elemento("form-confirmar-vinculo")?.addEventListener("submit", concluirVinculo);
    elemento("modal-confirmar-vinculo")?.addEventListener("cancel", (evento) => {
      evento.preventDefault();
      cancelarConfirmacaoVinculo();
    });
    elemento("form-reprovacao")?.addEventListener("submit", concluirReprovacao);
    elemento("form-medicamento")?.addEventListener("submit", salvarMedicamento);
    elemento("form-cadastro-cliente")?.addEventListener("submit", salvarCliente);
    elemento("form-pedido-manual")?.addEventListener("submit", salvarPedidoManual);
    elemento("cliente-cpf")?.addEventListener("input", (evento) => {
      evento.target.value = formatarCpf(evento.target.value);
    });
    elemento("cliente-cns")?.addEventListener("input", (evento) => {
      evento.target.value = formatarCns(evento.target.value);
    });
    elemento("cliente-telefone")?.addEventListener("input", (evento) => {
      evento.target.value = formatarTelefone(evento.target.value);
    });
    elemento("motivo-reprovacao")?.addEventListener("input", (evento) => {
      if (evento.target.value.trim()) {
        evento.target.removeAttribute("aria-invalid");
        definirTexto("erro-motivo", "");
      }
    });

    ["modal-perfil-farmaceutico", "modal-laudo", "modal-reprovacao", "modal-detalhe-medicamento", "modal-medicamento", "modal-cadastro-cliente", "modal-pedido-manual"].forEach((id) => {
      const dialog = elemento(id);
      dialog?.addEventListener("click", (evento) => {
        if (evento.target === dialog) fecharDialog(dialog);
      });
    });

    elemento("restaurar-demonstracao")?.addEventListener("click", () => {
      const confirmado = window.confirm("Restaurar todos os dados da demonstração? As alterações feitas serão perdidas.");
      if (!confirmado) return;
      estado = copiarDados(DADOS_INICIAIS);
      persistirEstado();
      renderizarTudo();
      mostrarToast("Dados da demonstração restaurados.");
    });
  }

  async function iniciar() {
    configurarEventos();
    renderizarTudo();
    exibirView(viewInicial(), false);
    await carregarEstadoBackend();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
