# FarmaSUS

Trabalho Semestral — Profº João Victor

Sistema web para acompanhamento e solicitação de medicamentos disponibilizados pelo SUS/SESPA, desde o envio de laudos e exames até a consulta do status para retirada.

---

## 👥 Integrantes e Responsabilidades

- **Felipe Deivid**: Tela de Perfil e integrações.
- **Gabriel Cardoso**: Tela de Medicamentos e integrações.
- **João Antônio**: Tela de Laudos e Exames e integrações.
- **Lucas Vinicius**: Telas de Login, Cadastro, Informações e integrações.
- **Yasmin Rios**: Tela de Início e integrações.

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

#### 2. Iniciando o servidor pelo terminal (PowerShell ou CMD)

Abra o terminal na pasta raiz do projeto e execute:

```powershell
cd farma-sus-backend
.\.venv\Scripts\python.exe run.py
```

> **Dica:** Se o ambiente virtual (`.venv`) ainda não estiver ativo ou configurado na sua máquina:
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
