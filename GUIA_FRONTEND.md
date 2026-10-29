# FarmaSUS — Login e cadastro

Esta é a primeira etapa do front-end do FarmaSUS, com as telas de login e cadastro desenvolvidas em HTML, CSS e JavaScript puro.

As telas já permitem preencher os formulários e testar as validações. Por enquanto, tudo funciona em modo de demonstração: nenhuma conta é criada e os dados não são enviados nem salvos.

## Como abrir

Abra `frontend/index.html` no navegador. Para acessar o cadastro ou voltar ao login, use os links abaixo dos botões.

## Organização dos arquivos

| Arquivo | Função |
| --- | --- |
| `frontend/index.html` | Página de login. |
| `frontend/cadastro.html` | Página de cadastro. |
| `frontend/style.css` | Cores, fontes, espaçamentos e adaptação para celular. |
| `frontend/script.js` | Validações, controle da senha e mensagens dos formulários. |

## Como os formulários funcionam

As duas telas verificam os campos obrigatórios, o formato do e-mail e os requisitos da senha.

A senha deve ter pelo menos **8 caracteres**, incluindo letra maiúscula, letra minúscula, número e caractere especial.

No cadastro, também são verificados o CPF, a data de nascimento e a confirmação da senha. O formulário bloqueia letras no CPF, datas futuras e senhas que não coincidem.

Quando alguma informação precisa ser corrigida, o erro aparece próximo ao campo. Os dados já preenchidos são mantidos para facilitar a correção. Quando está tudo certo, uma notificação verde confirma a validação em modo de demonstração.

Também é possível mostrar ou ocultar a senha durante o preenchimento.

## Testes realizados

Os testes abaixo foram feitos nas duas páginas:

| Teste | Resultado |
| --- | --- |
| Enviar campos vazios | O envio foi bloqueado e os campos necessários foram indicados. |
| Informar senha fora do padrão | Os requisitos da senha foram apresentados. |
| Preencher dados válidos | A mensagem de sucesso foi exibida. |
| Abrir no celular | Campos e botões continuaram utilizáveis, sem rolagem horizontal. |

Também foram conferidos CPF inválido, data futura, confirmação de senha diferente e o controle de mostrar/ocultar senha.

Os testes foram realizados no Chromium, incluindo uma tela de celular de **320 × 640 px**, sem erros no console.

## Próxima etapa: Firebase

O cadastro será o primeiro formulário conectado ao Firebase. O planejamento é usar:

- **Firebase Authentication:** para criar contas e autenticar o login.
- **Cloud Firestore:** para guardar o perfil do usuário, vinculado ao identificador da conta, o `uid`.

O perfil terá nome completo, CPF, nascimento, e-mail e data de criação. **A senha e sua confirmação não serão gravadas no Firestore.**

Após a integração, a interface deverá confirmar o cadastro ou informar problemas, como e-mail já cadastrado e falha de conexão. O login seguirá o mesmo padrão, liberando o acesso quando as credenciais forem válidas.
