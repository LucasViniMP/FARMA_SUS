# FarmaSUS

Trabalho Semestral — Profº João Victor

Sistema web para acompanhamento e solicitação de medicamentos disponibilizados pelo SUS/SESPA, desde o envio de laudos e exames até a consulta do status para retirada.

---

## 👥 Integrantes e Responsabilidades

- **Felipe Deivid**: Tela de Perfil e integrações.
- **Gabriel Cardoso**: Tela de Medicamentos e integrações.
- **João Antônio**: Tela de Laudos e Exames e integrações.
- **Lucas Vinicius**: Telas de Login, Cadastro, Informações, Área do farmacêutico e integrações.
  - Área do farmacêutico: análise de laudos (aprovação ou reprovação), vínculo do laudo com o
    medicamento, liberação e atualização do estoque, cadastro de clientes e pedidos manuais.
  - Integração da área com as rotas `/api/pharmacist/*` e com as coleções `users`, `exams`,
    `medicines` e `dispensations`.
- **Yasmin Rios**: Tela de Início, Área do administrador e integrações.
  - Área do administrador: painel com resumo, gestão de farmacêuticos, lista de pacientes e ajuste
    de estoque, com exportação em CSV.
  - Níveis de acesso: concessão do acesso de farmacêutico a partir de um paciente já cadastrado,
    com CRF e unidade, edição, desativação e reativação.
  - Backend do administrador: rotas `/api/admin/*` (`backend/routes/admin.py`), com acesso restrito
    ao papel `admin`.
  - Testes automatizados do administrador (`tests/test_admin.py`).

---

## 🛠️ Tecnologias Utilizadas

- **Front-end**: HTML5, CSS3, JavaScript (Vanilla).
- **Back-end**: Python (Flask).
- **Banco de Dados & Autenticação**: Google Firebase (Authentication & Cloud Firestore).

---

## 🚀 Como Executar e Acessar o Projeto

Você pode rodar o projeto de duas formas: **com o servidor backend** (recomendado para autenticação e persistência no Firebase/Firestore) ou **apenas visualizando o front-end** diretamente no navegador.

### Opção 1: Rodando com o Back-end (Completo com Firebase/Firestore)

Esta opção permite testar o fluxo real de cadastro, login, leitura de dados no Firestore e upload/listagem de exames.

#### 1. Pré-requisitos

- Python 3.10+ instalado no computador.
- Arquivo `service-account.json` (credenciais do Firebase Admin SDK) e `.env` configurados dentro da pasta `farma-sus-backend/`.

Copie `farma-sus-backend/.env.example` para `farma-sus-backend/.env` e preencha:

- `FIREBASE_PROJECT_ID`: ID do projeto Firebase.
- `FIREBASE_WEB_API_KEY`: chave Web usada para validar e renovar a sessão do usuário.
- `GOOGLE_APPLICATION_CREDENTIALS`: caminho local da conta de serviço.
- `DEFAULT_UNIT_ID`: unidade usada quando o paciente ainda não possui `unitId` no perfil.

As credenciais reais são ignoradas pelo Git e não devem ser versionadas.

#### 2. Iniciando o servidor pelo terminal (PowerShell ou CMD)

Abra o terminal na pasta raiz do projeto e execute:

```powershell
cd farma-sus-backend
.\.venv\Scripts\python.exe run.py
```

> **Dica:** Se o ambiente virtual (`.venv`) ainda não estiver ativo ou configurado na sua máquina:
>
> ```powershell
> cd farma-sus-backend
> python -m venv .venv
> .\.venv\Scripts\Activate.ps1
> pip install -r requirements.txt
> python run.py
> ```

Quando o servidor iniciar, você verá uma mensagem similar a:

```text
 * Running on http://127.0.0.1:5000
```

#### 3. Acessando pelo Navegador

Abra o seu navegador e acesse as rotas:

- **Login (Página Inicial padrão):** [http://localhost:5000/](http://localhost:5000/) ou [http://localhost:5000/index.html](http://localhost:5000/index.html)
- **Cadastro:** [http://localhost:5000/cadastro.html](http://localhost:5000/cadastro.html)
- **Início (Visão Geral):** [http://localhost:5000/inicio.html](http://localhost:5000/inicio.html)
- **Laudos e Exames:** [http://localhost:5000/exames.html](http://localhost:5000/exames.html)
- **Medicamentos:** [http://localhost:5000/medicamentos.html](http://localhost:5000/medicamentos.html)
- **Informações / Avisos:** [http://localhost:5000/informacoes.html](http://localhost:5000/informacoes.html)
- **Meu Perfil:** [http://localhost:5000/perfil.html](http://localhost:5000/perfil.html)
- **Área do farmacêutico (MVP demonstrativo):** [http://localhost:5000/farmaceutico](http://localhost:5000/farmaceutico)
- **Área do administrador:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

### Opção 2: Acesso Rápido apenas pelo Front-end (Sem Servidor)

Para navegar apenas na interface visual sem precisar iniciar o Python:

1. Acesse a pasta `frontend/`.
2. Dê dois cliques em **`index.html`** (ou `inicio.html`) para abrir diretamente no seu navegador padrão.
3. Todas as telas já possuem menus laterais conectados entre si para livre navegação.

---

## 🔄 Fluxo de Uso da Aplicação

1. **Cadastro (`cadastro.html`)**: Preencha nome completo, CPF, data de nascimento, e-mail e senha. Os dados são salvos no Firebase Authentication e na coleção `users` do Firestore.
2. **Login (`index.html`)**: Informe e-mail e senha cadastrados para autenticar.
3. **Início (`inicio.html`)**: Visualize os resumos e atalhos rápidos com o nome e iniciais do usuário logado na barra lateral.
4. **Exames (`exames.html`)**: Acompanhe e envie laudos médicos para validação.
5. **Medicamentos (`medicamentos.html`)**: Consulte a lista e o status de liberação dos medicamentos solicitados.
6. **Informações (`informacoes.html`)**: Central de avisos e notificações de saúde.
7. **Meu Perfil (`perfil.html`)**: Exibe e edita os dados cadastrais do paciente autenticado.

### MVP do farmacêutico

A área do farmacêutico fica isolada da jornada do paciente e pode ser aberta diretamente em
`frontend/farmaceutico.html` ou em `http://localhost:5000/farmaceutico` quando o Flask estiver rodando.
Ela usa dados demonstrativos persistidos no navegador para permitir testar o fluxo completo de
análise, aprovação ou reprovação, vínculo com medicamento, liberação e atualização do estoque.
Use **Restaurar demonstração** no menu lateral para voltar ao estado inicial.

Quando existe uma sessão Firebase válida, a área do farmacêutico deixa o modo demonstrativo e usa
as rotas `/api/pharmacist/*`. Os dados são lidos das coleções `users`, `exams` e `medicines`; cada
liberação também cria um registro em `dispensations`. O perfil farmacêutico precisa conter
`role: "pharmacist"`, `active: true`, `unitId` e, opcionalmente, `crf` e `unitName`.

### Área do administrador

A área do administrador pode ser aberta diretamente em `frontend/admin.html` ou em
`http://localhost:5000/admin.html` quando o Flask estiver rodando. Sem sessão Firebase ela usa dados
demonstrativos persistidos no navegador (chave `farmasus_admin_demo` do `localStorage`), o que permite
testar o painel, a concessão de acesso, a edição de farmacêuticos e o ajuste de estoque sem banco de
dados. Para voltar ao estado inicial, limpe os dados do site no navegador.

Quando existe uma sessão Firebase válida, a tela deixa o modo demonstrativo e usa as rotas
`/api/admin/*`. Apenas contas com `role: "admin"` acessam essas rotas; quem está logado com outro
papel é devolvido ao login. O primeiro administrador é criado fora da tela, com
`python create_user.py email senha admin "Nome"`.

#### Níveis de acesso

O sistema trabalha do menor para o maior privilégio:

- **Paciente (`patient`):** nível padrão. Todo cadastro feito em `cadastro.html` nasce assim, e o papel
  é definido pelo servidor, nunca pelo navegador.
- **Farmacêutico (`pharmacist`):** só o administrador concede, elevando uma conta que já existe.
- **Administrador (`admin`):** maior nível, criado fora da tela.

#### Novo farmacêutico

O botão **Novo farmacêutico** não cria conta nem senha. O administrador busca, por nome, CPF ou
e-mail, uma conta de paciente já cadastrada e preenche apenas o que pertence ao nível de farmacêutico:
**CRF** (obrigatório, no formato `CRF-PA 0000`) e **Unidade** (lista vinda da coleção `units`). Nome,
CPF e e-mail aparecem somente para leitura, pois pertencem ao perfil da própria pessoa. Quem ainda não
tem conta precisa se cadastrar antes. Ao confirmar, o servidor grava em `users/<id>` os campos
`role: "pharmacist"`, `active: true`, `crf`, `unitId`, `unitName`, `grantedBy` e `grantedAt`.

Na edição, apenas CRF e unidade podem ser alterados. **Desativar** grava `active: false` e derruba as
sessões abertas do profissional; o acesso pode ser reativado depois.

#### Rotas `/api/admin/*`

Todas exigem `role: "admin"` e respondem `{ "error": "mensagem" }` em caso de falha.

- `GET /summary`: totais do painel (pacientes, laudos do mês, farmacêuticos ativos, laudos e
  medicamentos por status e laudos analisados por semana).
- `GET /units`: unidades disponíveis para o formulário.
- `GET /pharmacists`: lista de farmacêuticos.
- `POST /pharmacists`: recebe `{ userId, crf, unitId }` e eleva um paciente existente. Responde `404`
  se o usuário não existe, `409` se ele já é farmacêutico ou administrador e `422` para dados inválidos.
- `PATCH /pharmacists/<id>`: aceita somente `crf`, `unitId` e `active`, e só se o alvo já for farmacêutico.
- `GET /users`: pacientes, com o laudo mais recente e a situação do medicamento de cada um.
- `GET /stock` e `PATCH /stock/<id>`: consulta e ajuste de `quantity` e `minimum` (inteiros maiores
  ou iguais a zero).

Qualquer `role` enviado no corpo de uma requisição é ignorado. A tela também renova o token do Firebase
automaticamente por `/api/auth/refresh`, o botão **Sair** apaga a sessão do navegador e as exportações
em CSV neutralizam células que começam com `=`, `+`, `-` ou `@`.

#### Dados utilizados

As rotas leem `users`, `units`, `exams` e `medicines`. Para a conexão com o banco, a coleção `units`
(documentos com o campo `name`) precisa existir e, por enquanto, tem uma única unidade: **Altamira**
(sugestão de id: `altamira`; use o mesmo valor em `DEFAULT_UNIT_ID` no `.env`); `medicines` precisa ter `name`, `quantity`, `unitId` e
`minimum`; e `exams` usa `patientId`, `status`, `medicineName`, `unitId`, `submittedAt` e `reviewedAt`
(este último alimenta o gráfico de laudos por semana). Se algum nome de campo for diferente no banco
real, ajuste em `farma-sus-backend/backend/routes/admin.py`.

#### Testes

Na pasta `farma-sus-backend`, com o ambiente virtual ativo, rode `python -m pytest`. Os 69 testes
passam sem acesso ao banco, pois `tests/test_admin.py` usa um Firestore simulado e cobre permissões,
elevação de paciente a farmacêutico, validações de CRF e unidade, edição e estoque.

Comprovação da execução (`python -m pytest` em `farma-sus-backend`): 69 testes aprovados, sendo 46 de
`tests/test_admin.py` e 23 dos testes já existentes (`test_app.py`, `test_auth.py`,
`test_pharmacist.py` e `test_storage.py`).
