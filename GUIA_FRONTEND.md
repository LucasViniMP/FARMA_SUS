# FarmaSUS — Login e cadastro

Front-end estático, em modo de demonstração, das telas de login e cadastro do FarmaSUS. Foi implementado somente com HTML, CSS e JavaScript puro.

## Como executar

Opção mais simples: abra `frontend/index.html` diretamente no navegador.

Para servir por HTTP a partir da raiz do projeto, use uma destas opções:

```powershell
python -m http.server 8000
```

Depois acesse `http://localhost:8000/frontend/`. A navegação entre login e cadastro funciona pelos links abaixo dos botões.

## Arquivos

- `frontend/index.html`: tela de login.
- `frontend/cadastro.html`: tela de cadastro.
- `frontend/style.css`: identidade visual compartilhada, layout responsivo e estados de validação.
- `frontend/script.js`: validação compartilhada, mostrar/ocultar senha, mensagens de demonstração e pontos de integração futura.

## Validação e modo de demonstração

As duas páginas impedem o envio quando há campos obrigatórios vazios, e-mail inválido ou senha fraca. A senha precisa ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial. O cadastro também valida o CPF, bloqueia letras nesse campo, impede datas de nascimento futuras e verifica se a confirmação coincide com a senha. Os erros são exibidos junto aos campos e o conteúdo já digitado é preservado.

Quando todos os dados são válidos, uma notificação verde aparece no canto superior direito e confirma a validação. Nenhum dado é enviado ou persistido nesta versão.

## Resultados dos testes

| Cenário | Login | Cadastro |
| --- | --- | --- |
| Campos vazios | **Aprovado:** impediu o envio, marcou e informou e-mail e senha | **Aprovado:** impediu o envio, marcou e informou os 6 campos obrigatórios |
| Senha fora do padrão | **Aprovado:** exige 8 caracteres, maiúscula, minúscula, número e especial | **Aprovado:** exige 8 caracteres, maiúscula, minúscula, número e especial |
| Dados válidos | **Aprovado:** exibiu sucesso da validação em modo de demonstração | **Aprovado:** exibiu sucesso da validação em modo de demonstração |
| Tela pequena | **Aprovado em 320 × 640 px:** campos e botão permaneceram dentro da tela, sem rolagem horizontal | **Aprovado em 320 × 640 px:** mudou de duas para uma coluna; todos os campos e o botão permaneceram dentro da tela, sem rolagem horizontal |

Também foram testados CPF com letras, CPF inválido, data futura e divergência entre senha e confirmação. Os valores preenchidos foram preservados em todos os erros. O controle de mostrar/ocultar senha foi verificado, e não houve erros no console do navegador. As duas páginas couberam sem rolagem vertical ou horizontal no desktop em 1365 × 768 px; no celular, o cadastro continuou utilizável em uma coluna e sem rolagem horizontal.

Testes executados em 22/10/2026 no navegador Chromium integrado, em viewport desktop de 1265 px e móvel de 320 × 640 px. A sintaxe de `script.js` também foi verificada com `node --check`. Não foram executados testes em outros motores de navegador nem com leitores de tela reais.

## Integração prevista com Firebase

O **cadastro será o primeiro formulário a integrar**. Em `script.js`, `registerWithFirebase()` já está separado do tratamento visual do formulário.

Fluxo planejado para o cadastro:

1. Enviar `email` e `password` ao **Firebase Authentication** por `createUserWithEmailAndPassword`.
2. Usar o `uid` devolvido pelo Authentication como chave do perfil no **Cloud Firestore**.
3. Gravar no Firestore: `fullName`, `cpf`, `birthDate`, `email` e `createdAt`.
4. **Nunca gravar `password` nem `confirmPassword` no Firestore.**

Resposta de sucesso esperada: usuário criado no Authentication, perfil criado no Firestore e confirmação de cadastro na interface. Respostas de erro esperadas: e-mail já cadastrado, credenciais inválidas ou falha de rede/permissão; a interface deverá converter o código do Firebase em uma mensagem clara sem apagar o formulário.

Depois, o login usará `signInWithEmailAndPassword` com `email` e `password`. Em caso de sucesso, a aplicação seguirá para a área autenticada; em caso de erro, exibirá uma mensagem de credenciais inválidas ou indisponibilidade, mantendo o e-mail preenchido.
