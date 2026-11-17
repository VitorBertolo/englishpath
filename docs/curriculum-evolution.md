# Evolução do percurso em sete etapas

O Present Continuous entra no módulo 04 da etapa 02, após as lições de Simple Present e perguntas básicas com do/does. O aluno reaproveita am/is/are antes de avançar para passado, futuro e Present Perfect. A etapa 06 passa a chamar-se **Present Perfect + Integração de tempos**.

O posicionamento no nível inicial é compatível com o [catálogo A1–A2 do British Council](https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar). A organização específica do projeto é uma decisão pedagógica própria; não representa certificação de nível.

## Escrita desde o início

| Etapa | Produção | Conteúdos de apoio planejados |
| --- | --- | --- |
| 01 — To Be e pronomes | Minha apresentação | Possessivos, artigos a/an, plurais, lugar, números 0–20 e idade |
| 02 — Dois tempos do presente | Minha rotina e meu momento | Horários e números 21–100, tempo, artigo the, interação, rotina versus momento |
| 03 — Perguntas e palavras essenciais | Uma conversa para conhecer alguém | Demonstrativos, there is/are, quantidades, preços e some/any |
| 04 — Passado | Um acontecimento do meu dia | Datas, marcadores de passado, sequência e verbos irregulares |
| 05 — Futuro e modais | Um plano e um convite | Compromissos, pedidos, movimento e comparações |
| 06 — Present Perfect e integração | Uma experiência e o que aprendi | Experiência, duração, paráfrases e conectores |
| 07 — Imersão escrita | Resolver uma situação por escrito | Registro, parágrafos, coesão, clareza e expressões autênticas |

As etapas 01, 02 e 03 têm atividades funcionais. A [etapa 03](stage3.md) amplia as perguntas no presente e acrescenta demonstrativos, posse, existência, localização, quantidades e preços. As etapas 04–07 têm propostas de escrita e sequência de apoio definidas, mas permanecem bloqueadas até a implementação das lições correspondentes. O curso mostra essa distinção.

A escrita é liberada quando a última lição da etapa fica disponível. Não há modelo pronto para copiar. O aluno escreve em inglês, usa uma faixa orientadora de palavras e marca os critérios que já conseguiu atender. Critérios desmarcados são permitidos e orientam a reescrita. A autorrevisão fica salva junto à versão entregue.

O rascunho é salvo pelo botão **Salvar rascunho** e antes de navegar por uma rota interna. Fechar ou recarregar a página antes de salvar pode perder alterações ainda não enviadas. Cada entrega cria uma versão imutável; repetir a mesma requisição não duplica a entrega. Uma nova versão pode partir de um texto anterior. Os textos e feedbacks são privados por usuário.

O feedback opcional com IA aponta acertos e próximos ajustes e sugere uma revisão mínima do texto. Ele não concede nota, aprovação nem fluência. O texto é entregue e persistido antes de qualquer chamada externa; erros do provedor permitem nova tentativa sem perder a produção. Sem IA, escrita, rascunho, histórico e autorrevisão continuam funcionando.

## Apoios das etapas disponíveis

São 14 atividades de apoio: cinco na etapa 01, cinco na 02 e quatro na 03. Cada uma tem explicação em português, exemplos e três questões curtas, totalizando 42 questões adicionais. Os apoios aparecem no percurso e nas lições às quais se relacionam. A teoria pode ser consultada antecipadamente; a prática segue a liberação da lição associada.

As respostas oficiais ficam no backend e só aparecem no feedback após o envio. Cada tentativa é preservada, com explicação e referência. Apoios e escrita têm registros próprios, sem criar acertos no progresso das lições ou alterar notas e aprovações.

## Dados e atualização

`007_curriculum_activities.sql` adiciona `learning_activities`, `activity_drafts` e `activity_submissions`. As entregas guardam um snapshot da tarefa e dos critérios para que o feedback continue coerente com a versão usada. O seed acrescenta o módulo 5 e as lições 13–15, preservando as questões e os resultados anteriores.

A etapa 03 acrescenta os módulos 6–9 e as lições 16–24 pelo mesmo seed, sem precisar de nova migration. Os quatro apoios se vinculam às lições 20–23; a produção livre é liberada quando a lição 24 fica disponível. As questões anteriores permanecem intactas.

Endpoints autenticados: `GET /api/activities/:id`, `POST /api/activities/:id/draft`, `POST /api/activities/:id/submissions` e `POST /api/activities/:id/submissions/:submissionId/review`. Entregas usam um UUID e não podem ser reescritas com o mesmo identificador. A IA avalia exclusivamente o texto salvo no servidor. O limite de IA é compartilhado entre recursos por usuário autenticado.
