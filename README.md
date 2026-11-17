# English Path

Plataforma pessoal de inglês em português: Angular 22 + Express/TypeScript + MariaDB. O fluxo inicial funciona sem OpenRouter. Não há recursos de voz.

A prática de [Leitura](docs/reading-practice.md) inclui textos de 100 a 200 palavras, três perguntas de compreensão, vocabulário pessoal com revisões espaçadas e adaptação gradual dos próximos textos.

## Repositório e atualizações

Repositório: [VitorBertolo/englishpath](https://github.com/VitorBertolo/englishpath). A branch principal é `main`. A versão inicial é `1.0.0`, identificada pela tag anotada `v1.0.0`.

Para salvar novas alterações, execute os comandos abaixo **na raiz do projeto**, em ordem. Continue para o próximo comando somente se o anterior terminar com sucesso:

```powershell
cd D:\2027\english-learning
git add .
git commit -m " 🌐 Atualização 13-11-2026-1 - Web 🌐"
npm version patch
git push origin main --follow-tags
```

A data e o contador na mensagem são texto livre: ajuste-os a cada atualização. `npm version patch` aumenta a versão do projeto na raiz, atualiza `package.json` e `package-lock.json`, cria um segundo commit com a mensagem `chore: versão X.Y.Z` e gera uma tag anotada `vX.Y.Z`. A partir da versão inicial, a próxima será `1.0.1`. As versões internas dos workspaces permanecem independentes. `git push origin main --follow-tags` envia os commits e as novas tags. A configuração de versionamento está em `.npmrc`.

O comando de versão exige que as alterações já estejam commitadas. Se ele falhar, resolva o erro antes do push. Se apenas o push falhar, repita **somente o push**, para não criar outra versão sem necessidade. Você pode conferir o resultado com `git status -sb` e `git log -3 --oneline`.

O GitHub guarda o código, migrations, seeds, configurações de exemplo e documentação. `.env`, senhas, chaves, `.runtime`, dependências, builds e backups locais ficam ignorados. O progresso do aluno continua no MariaDB; copiar o repositório não substitui o backup do banco. Ao clonar em outro computador, configure seu próprio `.env`, instale com `npm ci` e siga o setup descrito abaixo.

## Abrir a instalação preparada neste computador

Com os processos em execução, acesse **http://localhost:4200**.

O banco utilizado é o **MariaDB da sua VPS Hostinger**, confirmado em `187.41.120.114:3308/curso_ingles_db`, com usuário `master`. As migrations e os seeds já foram aplicados nesse banco. A aplicação não depende de MariaDB local.

Usuário: `aluno`. A senha inicial aleatória está em `INITIAL_PASSWORD` no arquivo **`.env`** da raiz. A senha de login é diferente da senha do banco. `.env` e `.runtime` estão ignorados pelo Git.

Para iniciar novamente no PowerShell:

```powershell
cd D:\2027\english-learning
npm run dev
```

`npm run dev` mantém Angular e Express juntos no terminal; o backend se conecta ao banco da VPS. Ctrl+C encerra frontend/backend. O histórico permanece no MariaDB remoto.

## Primeira instalação em outro computador

Requisitos: Node 24.15 ou superior na série 24, npm e acesso de rede ao MariaDB da VPS. A instalação de dependências usa `npm ci` e o lockfile versionado.

### Banco da VPS Hostinger

```powershell
npm ci
# Configure .env com os dados abaixo e sua senha privada.
npm run db:check
npm run setup
npm run dev
```

Configure `.env` na raiz, preservando a senha em arquivo privado:

```dotenv
DB_HOST=187.41.120.114
DB_PORT=3308
DB_USER=master
DB_PASSWORD=senha-do-banco
DB_NAME=curso_ingles_db
INITIAL_USERNAME=aluno
INITIAL_PASSWORD=uma-senha-pessoal-com-12-caracteres-ou-mais
```

O banco deve existir antes das migrations. O usuário precisa de SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX e REFERENCES **somente nesse banco**. O setup não cria ou remove bancos remotos. Execute `npm run setup` para migrations, seeds e usuário inicial. Reexecutar não duplica exercícios, não apaga tentativas e não troca a senha de usuários existentes.

Para o backend rodando neste computador, o endereço confirmado é `187.41.120.114:3308`. Se o backend for instalado na mesma rede do serviço no EasyPanel, use `DB_HOST=curso_ingles_db_curso_ingles_db` e `DB_PORT=3306`. Ambos os endereços correspondem ao banco `curso_ingles_db` da foto. A porta `3000` atende HTTP e a porta pública `3307` corresponde a outra instância; elas não são o destino desta aplicação. Nenhuma tabela foi criada nessa outra instância. Configure a senha fornecida apenas nas variáveis privadas do ambiente; não a copie para arquivos versionados.

`npm run db:check` mostra o destino, a identidade do servidor e as tabelas, sem exibir senhas. O comando de migration também informa o destino antes de escrever no banco. `DB_HOST` e `DB_PORT` são obrigatórios; não há substituição automática por localhost.

Os antigos helpers de MariaDB portátil e Docker continuam como opções explícitas de desenvolvimento isolado, mas não participam do setup ou da execução desta instalação. Não execute `setup:local` para este projeto configurado com a VPS.

Para conexão remota com TLS, use `DB_SSL=true` e, se necessário, `DB_SSL_CA_FILE` com o caminho do certificado CA. A verificação do certificado permanece habilitada.

## Usar o curso

1. Faça login e abra **Meu percurso**.
2. Escolha uma das lições liberadas nas etapas 01, 02 e 03 e leia explicação e exemplos.
3. Selecione **Praticar esta lição**. Uma sessão anterior ativa será retomada primeiro.
4. Responda, verifique e leia a explicação. Avance pelo botão; em campos de texto, Enter verifica e depois avança.
5. Use **Salvar e sair** para voltar depois. Fechar o navegador também preserva as respostas já enviadas.
6. Consulte **Meu histórico**, **Revisão inteligente**, **Leitura** e **Vocabulário**.

Cada uma das 24 lições disponíveis tem **30 exercícios de prática**, com situações próprias de viagens, compras, alimentação, serviços, tecnologia, natureza, lazer e vida em casa. Os enunciados incluem múltiplas lacunas com seleção e escrita, interpretação de avisos e diálogos, correção de informações, construção de frases e transformações. Um mesmo caso não é reapresentado apenas com outro formato. Cada sessão apresenta até 20 perguntas, prioriza o conteúdo ainda não praticado e alterna formatos e temas quando há alternativas. Continue em outras sessões para cobrir o catálogo inteiro. Revisões de conteúdos já iniciados podem entrar na sequência.

## Etapa 02: Simple Present + Present Continuous

A segunda etapa continua a base do To Be: de **I am a student** para **I study English** e **I am studying now**. São quatro módulos e nove lições:

| Módulo | Lições |
| --- | --- |
| Do ser e estar às ações | 07. Ações com I, you, we, they; 08. He, she, it: -s, -es, -ies e have/has |
| Negar e perguntar com do / does | 09. Don't / doesn't; 10. Perguntas e respostas curtas |
| Hábitos, preferências e integração | 11. Frequência e preferências; 12. To Be + Simple Present |
| Da rotina ao que acontece agora | 13. Afirmativas no Continuous; 14. Negativas e perguntas; 15. Simple Present versus Continuous |

A etapa oferece **270 práticas**, **216 questões no banco de provas**, explicações em português, exemplos traduzidos e **48 palavras e expressões** com filtro por etapa em Vocabulário. As lições 13–15 acrescentam 90 práticas e 72 questões de prova. O aluno combina identidade, estado e localização com hábitos, preferências e ações em andamento. Present Perfect permanece reservado à etapa 06.

A aprovação na prova da lição 06 libera a lição 07. Cada prova seguinte libera a próxima lição, mantendo a exigência de 85%. O percurso, o dashboard e as provas identificam a etapa correta. Não há liberação artificial de lições nem alteração das respostas e aprovações da etapa 01. Detalhes em [docs/stage2.md](docs/stage2.md).

Para atualizar uma instalação existente, execute `npm run db:migrate` e `npm run db:seed`. Esses comandos já foram aplicados ao banco configurado nesta instalação.

## Etapa 03: Perguntas + Palavras essenciais

A terceira etapa usa To Be, Simple Present e Present Continuous para ir além das respostas sim/não: **Where do you study?**, **Why does she work here?** e **What are you doing now?**. São quatro módulos e nove lições:

| Módulo | Lições |
| --- | --- |
| De respostas curtas a novas informações | 16. What/who/which com To Be; 17. Where/when/what time com To Be e do/does |
| Motivos, frequência e o momento atual | 18. Why/because, how, how often e idade; 19. Perguntas no Continuous e contraste com hábitos |
| Apontar, identificar e localizar | 20. This/that/these/those, whose e posse; 21. There is/are e preposições de lugar |
| Quantidades e conversas do cotidiano | 22. How many/how much e unidades; 23. Some/any, disponibilidade e preços; 24. Diálogos e esclarecimentos |

São **270 práticas**, **216 questões no banco de provas**, **48 palavras e expressões**, quatro apoios com 12 questões e a produção **Uma conversa para conhecer alguém**. A escrita propõe um diálogo com perguntas relacionadas, rotina e ação atual, localização ou quantidade e um pedido de esclarecimento. Rascunhos, versões e autorrevisão continuam disponíveis sem IA.

A aprovação na prova 15 libera a lição 16, mantendo o mínimo de 85% e a liberação de uma lição por vez. Os apoios acompanham as lições 20–23; a produção escrita é liberada ao chegar à lição 24. Histórico, respostas, aprovações e provas abertas anteriores são preservados. Para atualizar, execute `npm run db:migrate`, `npm run db:seed` e `npm run build`; reinicie o servidor quando usar o build compilado. A etapa não precisa de nova migration. Detalhes em [docs/stage3.md](docs/stage3.md).

## Produção escrita e conteúdos de apoio

No percurso, cada etapa tem uma proposta de escrita. Nas três etapas disponíveis, **Minha apresentação**, **Minha rotina e meu momento** e **Uma conversa para conhecer alguém** permitem escrever em inglês sem um texto pronto para copiar, salvar rascunhos, entregar versões e revisar critérios. A atividade é liberada quando o aluno chega à última lição da etapa. A IA pode oferecer feedback formativo após a entrega; sem IA, os textos e a autorrevisão continuam salvos. A escrita tem acompanhamento próprio e não concede nota ou aprovação nas provas.

Use **Salvar rascunho** antes de fechar ou recarregar a página. Navegar por uma rota interna também salva alterações no texto. A autorrevisão é preservada em cada versão entregue. O histórico permite voltar a uma versão e reescrevê-la sem apagar as anteriores.

São **14 conteúdos de apoio** nas etapas 01–03, com explicações, exemplos e **42 questões curtas adicionais**: artigos, possessivos, plurais, números, idade, horários, preposições, expressões de interação, marcadores do presente, demonstrativos, existência, quantidades, some/any e preços. Eles aparecem nas lições relacionadas e na seção **Conteúdos de apoio** do percurso. A sequência das etapas futuras está planejada, com prática ainda bloqueada. Veja [docs/curriculum-evolution.md](docs/curriculum-evolution.md).

O catálogo da etapa 01 foi renovado por completo. Os exercícios antigos estão arquivados, com enunciados, referências e tentativas preservados no histórico. Os percentuais de prática consideram os 180 exercícios novos; acertos antigos não são transferidos para questões ainda não respondidas. Aprovações e lições já liberadas continuam válidas. Sessões de prática antigas são encerradas com aviso e podem dar lugar a uma nova sessão; provas já abertas mantêm seu conteúdo e respostas, e a tentativa seguinte usa o banco novo.

O progresso da lição conta acertos feitos na prática iniciada por ela. Uma revisão pode consolidar um exercício que você já respondeu pelo percurso daquela lição. Leituras extras e revisões de exercícios ainda não apresentados pelo percurso não concluem lições futuras. Os registros antigos permanecem no histórico; os percentuais são calculados com essa regra, sem apagar tentativas.

## Provas por lição

Na página da lição, clique em **Fazer Teste**. Cada prova tem 12 questões mais exigentes, sorteadas de um banco separado de **24 situações independentes por lição**. Cada contexto aparece uma única vez por prova; a seleção padrão mistura seis questões de múltiplas lacunas com seis de outros formatos. Alternativas, palavras e ordem dos contextos variam entre tentativas. Esse banco não é exibido nas sessões normais de prática.

Você pode navegar entre as questões e editar suas respostas. Elas são salvas automaticamente; **Salvar e sair** permite retomar a mesma prova. Ao terminar todas as questões, clique em **Finalizar e ver resultado**. As respostas oficiais e explicações aparecem somente após a entrega. Cada lacuna vale um ponto, permitindo identificar acertos parciais. A nota é a porcentagem de pontos obtidos, calculada exclusivamente pelo backend.

**Aprovação: 85% ou mais.** Uma prova aprovada libera a próxima lição. Você pode fazer quantas novas provas quiser após finalizar uma tentativa, mesmo se já tiver sido aprovado. O histórico da lição mostra as tentativas, datas, notas e o melhor resultado. A aprovação anterior permanece válida se uma nova tentativa tiver nota menor. Não há limite de tempo.

As provas funcionam sem IA, não consomem o OpenRouter e não criam acertos fictícios nas estatísticas de prática ou nos indicadores de domínio. Seus enunciados e referências ficam registrados como uma cópia da versão usada naquela tentativa, preservando a coerência do resultado se o catálogo crescer depois. O critério e o tamanho de novas provas podem ser configurados no backend com `EXAM_PASS_PERCENT=85` e `EXAM_QUESTIONS=12` (máximo inicial 12).

Endpoints autenticados: `POST /api/exams` com `lessonId`, `GET /api/exams/:id`, `POST /api/exams/:id/answers`, `POST /api/exams/:id/submit` e `GET /api/exams/lessons/:lessonId/history`. A correção é idempotente; depois da entrega, as respostas ficam imutáveis. O bloqueio da próxima lição também é aplicado na API, inclusive para tentativas de acesso por URL direta.

## Leitura independente com IA

Abra **Leitura** e clique em **Gerar próximo texto**. O sistema sorteia um tema e pede à IA um texto original de 100 a 200 palavras, com meta de 150. A prática começa em A1 e adapta gradualmente a dificuldade até A2 conforme avaliações de textos distintos. Histórias, diálogos, e-mails e mensagens se alternam, evitando os formatos e temas mais recentes.

Depois de ler, escreva no campo **O que você entendeu do texto?** e responda às três perguntas, em português ou inglês. Uma delas pede um trecho em inglês que comprove sua resposta. Você pode **Salvar rascunho** ou enviar em **Avaliar minha interpretação**. A avaliação considera a interpretação e cada resposta, com referências para comparar. A gramática não recebe uma nota nesta prática. Textos antigos continuam com interpretação livre.

No painel **Meu vocabulário**, salve expressões do texto com seu significado em português. A revisão pede que você escreva o que lembra antes de revelar a anotação e se autoavaliar. As revisões são espaçadas; expressões que precisam de reforço também orientam a geração dos próximos textos. Consulte as [regras de perguntas, revisão e adaptação](docs/reading-practice.md).

Textos, rascunhos e interpretações ficam salvos no MariaDB, em `reading_passages` e `reading_attempts`. A lista **Minhas leituras** permite voltar aos textos anteriores. Antes de solicitar uma avaliação externa, a interpretação já é persistida. Se a IA falhar, você pode tentar a correção novamente sem perder o texto; repetir uma requisição já concluída não faz outra chamada à IA.

Esta prática não cria sessões de exercícios do curso, não altera a posição da sessão ativa e não avança o progresso das lições. Os exercícios de interpretação que pertencem às próprias lições continuam fazendo parte do percurso normal.

Endpoints autenticados: `GET /api/readings`, `POST /api/readings/generate`, `GET /api/readings/:id`, `POST /api/readings/:id/draft` e `POST /api/readings/:id/interpretations`. A geração recebe `{}`; a avaliação recebe `attemptId` (UUID) e `interpretation`. O texto avaliado é sempre o que está salvo no servidor.

## OpenRouter opcional

```dotenv
AI_ENABLED=true
OPENROUTER_API_KEY=sua-chave-privada
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_MAX_TOKENS=3500
AI_RESPONSE_FORMAT=auto
AI_TIMEOUT_MS=20000
```

Reinicie o backend após alterar `.env`. `AI_RESPONSE_FORMAT=auto` prefere JSON Schema e, quando o provedor rejeita esse formato, usa modo JSON com o esquema no prompt e validação obrigatória no backend. A compatibilidade é lembrada durante a execução para evitar repetir o pedido recusado. É possível fixar `json_schema` ou `json_object` se necessário. O modelo é configurável e o exemplo não garante preço ou disponibilidade; consulte o catálogo do provedor. A integração segue a [documentação oficial de saídas estruturadas](https://openrouter.ai/docs/guides/features/structured-outputs) e [modo JSON](https://openrouter.ai/docs/api_reference/parameters).

Erros de autenticação, saldo, limite de uso, timeout, formato inválido e provedor indisponível agora têm mensagens distintas. O diagnóstico sanitizado fica no terminal do backend e em `ai_generations.payload.diagnostics`, sem a chave. Os logs de sucesso registram o formato efetivamente usado em `usage_data._app.responseFormat`. O modo automático só tenta outro formato para incompatibilidade; não repete pedidos recusados por saldo ou limite de uso e não troca o modelo configurado.

A IA avalia somente respostas abertas que não coincidem com referências aceitas. Sem chave, desativada ou em falha, a resposta é salva como variação que precisa de revisão; não é tratada automaticamente como erro. Exercícios objetivos continuam funcionando.

Na página da lição, **Gerar 4 novos exercícios** cria um rascunho validado. Revise referências e explicações e use **Revisei: adicionar ao curso** para incluí-lo. IA nunca altera respostas oficiais. Uso/custo retornados pelo provedor são registrados em `ai_generations`.

A geração de leitura e a avaliação da interpretação estão integradas à interface. Na investigação de compatibilidade, uma chamada real de correção usando `google/gemma-4-31b-it:free` em modo JSON respondeu HTTP 200 e passou na validação, com custo informado zero. A tentativa ao vivo de geração de leitura encontrou limite de uso no provedor gratuito (429); esse limite é externo à aplicação. O fluxo de leitura, persistência e avaliação foi validado com MariaDB real em banco separado e respostas de IA simuladas.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm ci` | Instalar dependências pelo lockfile |
| `npm run dev` | Iniciar frontend :4200 e API :3000 |
| `npm run db:check` | Confirmar o banco configurado e listar suas tabelas |
| `npm run setup` | Aplicar migrations, seeds e usuário no banco configurado |
| `npm run db:migrate` | Aplicar migrations incrementais |
| `npm run db:seed` | Inserir conteúdo inicial sem duplicar ou apagar histórico |
| `npm run setup:user` | Criar usuário das variáveis INITIAL_* se ainda não existir |
| `npm test` | Testes unitários de correção, domínio, revisão e validação IA |
| `npm run test:integration` | Fluxo Supertest com MariaDB real em banco separado |
| `npm run test:smoke` | Verificar o build compilado, rotas e login (execute o build antes) |
| `npm run build` | Compilar backend e Angular para produção |
| `npm start` | Servir API e Angular compilado na porta 3000 |
| `npm run format` | Formatar os arquivos de código |

## Testes e verificação desta entrega

Verificações mais recentes no Windows/Node 24 e em um banco MariaDB de testes separado:

- 43 testes unitários: correção, domínio, revisão, diversidade de situações e formatos nas 24 lições, perguntas no presente, demonstrativos, existência, quantidades e preços, Present Continuous, apoios, propostas de escrita, validação de feedback sem nota, contrações, compatibilidade do OpenRouter, leitura com perguntas e evidências, adaptação de dificuldade, revisão de vocabulário, múltiplas lacunas, seleção de provas, pontuação parcial e nota mínima.
- Oito cenários de integração em banco MariaDB separado: preservação de histórico e provas abertas; fluxo de estudo; prática e provas das 24 lições, passagem 15 → 16, apoios 20–23, escrita na lição 24 e preservação da prova aberta da etapa 02; escrita e apoios com bloqueio, rascunho, versões, privacidade, seed idempotente e falha/retomada de feedback; correção IA com falhas simuladas; leitura independente; adaptação, formatos e revisão de vocabulário; provas com reprovação/aprovação e retomada. A IA é simulada, sem chamadas externas ou custos reais.
- Build TypeScript do backend e build de produção Angular.
- Resposta HTTP da aplicação e healthcheck conectado ao MariaDB.
- Verificação HTTP do build compilado: HTML, bundle Angular, fallback de rotas, login, dashboard e logout, sem criar tentativas de estudo.
- Auditoria npm sem vulnerabilidades conhecidas na versão instalada.

Na configuração atual da Hostinger, também foram executados migrations, seed e a verificação HTTP do build compilado. São 22 tabelas após `008_reading_practice.sql`, com 7 etapas, 3 disponíveis, 9 módulos, 24 lições, 48 habilidades, 720 exercícios de prática, 576 questões de prova ativas e 136 palavras e expressões. Há ainda 14 apoios com 42 questões e sete propostas de escrita, das quais três pertencem às etapas disponíveis. As 324 questões antigas permanecem arquivadas. As verificações do banco de estudos não criaram respostas ou aprovações fictícias; os testes completos usam somente banco separado.

A verificação visual automatizada das etapas 02 e 03 foi interrompida pelo controle de navegador, que não conseguiu confirmar a URL da janela no Windows. A interface compila, mas não foi validada visualmente em desktop/mobile. Não foram feitos novos testes ao vivo de OpenRouter ou Docker nesta etapa.

Na entrega da etapa 03, os 43 testes unitários, os oito cenários de integração e o build passaram. A integração foi executada em um novo banco local isolado, `curso_ingles_stage3_test`. O seed foi aplicado ao banco configurado da Hostinger, comparando o conteúdo das tabelas de estudo antes e depois: tentativas, sessões, provas, revisões, rascunhos, entregas e leituras permaneceram iguais, assim como os exercícios das etapas 01–02. O smoke test compilado e o healthcheck HTTP também passaram, sem criar respostas de estudo.

O teste de integração exige `TEST_DB_NAME` terminado em `_test`, diferente de `DB_NAME`. É necessário provisionar um banco de testes separado antes de executá-lo. Para fornecer suas credenciais isoladas, copie `.env.test.example` para `.env.test`; esse arquivo privado é lido antes de `.env`. Na entrega da etapa 02, o acesso a `curso_ingles_test` na VPS foi recusado. A integração foi executada no MariaDB local, em `curso_ingles_stage2_test`, usando variáveis de processo e preservando `.env` e o banco de estudos remoto. Os testes não apagam tabelas ou bancos e usam um usuário novo por execução. Não aponte os testes para dados de estudo.

## Produção na VPS

O build de produção é servido pelo Express. Configure `NODE_ENV=production`, `BIND_HOST=0.0.0.0` no container, `APP_ORIGIN=https://seu-dominio`, as variáveis do banco e HTTPS no proxy. Cookies em produção são `Secure`. Defina `TRUST_PROXY=true` somente se houver exatamente um proxy confiável entre a internet e a aplicação.

```powershell
npm ci
npm run setup
npm run build
npm start
```

Há um Dockerfile pronto para construir a aplicação. Na imagem, aplique primeiro os scripts compilados, usando o mesmo ambiente privado de produção e diretório `/app/backend`:

```sh
node dist/backend/src/scripts/migrate.js
node dist/backend/src/scripts/seed.js
node dist/backend/src/scripts/user.js
node dist/backend/src/server.js
```

A imagem não contém `.env`, dados locais nem senhas. O Dockerfile e Compose foram preparados, mas não executados porque Docker não está instalado neste ambiente. Nenhuma publicação foi feita na VPS nem no Sites: o backend exige Node e conexão TCP com MariaDB.

Faça backups periódicos de `curso_ingles_db` com a ferramenta de backup do provedor ou `mariadb-dump` e preserve-os fora da VPS. Consulte [docs/architecture.md](docs/architecture.md) para o modelo de dados e regras.

## Escopo entregue e próxima tarefa

Etapas 01–03: 24 lições com 30 exercícios cada, banco próprio de provas, sete formatos de exercício, 48 habilidades e 136 palavras e expressões. Present Continuous foi antecipado para a etapa 02. Apoios e produção livre complementam as lições com acompanhamento separado. Leitura independente com IA, sessões retomáveis, histórico, dashboard, domínio e revisão espaçada continuam disponíveis. A aprovação em prova libera a próxima lição. Etapas 04–07 têm propostas de escrita e sequência de apoio planejadas; suas lições e práticas permanecem futuras.

Correção e geração via OpenRouter estão implementadas, incluindo leitura independente, avaliação de interpretação e feedback formativo de escrita, com timeout, validação e diagnóstico. A geração de exercícios recebe a etapa real da lição. A chave e o modo JSON foram validados ao vivo na entrega anterior; a disponibilidade depende do provedor. Ainda não há lições das etapas 04–07, tutor por texto ou painel para julgar variações antigas do motor de exercícios. Não há áudio.

Conclua a verificação visual nos navegadores de desktop e celular quando o controle do navegador estiver disponível. O banco da VPS já está conectado; publicar o backend no EasyPanel permitirá usar o host interno do serviço.
