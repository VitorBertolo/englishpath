# Etapa 03 — Perguntas + Palavras essenciais

A etapa transforma as respostas curtas das etapas anteriores em conversas que procuram e compartilham informações. O aluno passa de **Do you study?** para **Where do you study?** e de **Are you studying?** para **What are you studying?**. To Be, Simple Present e Present Continuous continuam sendo a base; passado, futuro, modais e Present Perfect ficam nas etapas seguintes.

## Sequência de ensino

| Módulo | Lições | Aplicação |
| --- | --- | --- |
| 01 — De respostas curtas a novas informações | 16. What, who e which com To Be; 17. Where, when e what time | Identificar pessoas e coisas, escolher entre opções e perguntar sobre origem, lugares, dias e horários com To Be ou do/does. |
| 02 — Motivos, frequência e o momento atual | 18. Why, how e how often; 19. Perguntas no Continuous | Explicar motivos com because, perguntar modo, idade e frequência e distinguir profissão/hábito de ação em andamento. |
| 03 — Apontar, identificar e localizar | 20. This/that/these/those e whose; 21. There is/are e localização | Distinguir distância e número, descobrir a posse, apresentar o que existe e localizar objetos e lugares. |
| 04 — Quantidades e conversas do cotidiano | 22. How many/how much e unidades; 23. Some/any e preços; 24. Conversas integradas | Contar e medir, verificar disponibilidade, perguntar preços, manter diálogos e pedir esclarecimentos. |

As explicações são em português, com exemplos traduzidos e vocabulário de apoio. Cada lição retoma uma estrutura anterior e acrescenta uma aplicação. As pistas diferenciam proximidade/distância de quem fala, quantidade/preço e valor unitário/total. Some em ofertas é apresentado como um uso contextual, além do padrão de afirmativas, negativas e perguntas neutras.

## Prática, provas e produção

- **270 exercícios de prática**, 30 por lição, nos sete formatos do curso: múltiplas lacunas, lacuna simples, escolha, ordenação, transformação, tradução e leitura objetiva.
- **216 questões no banco exclusivo de provas**, 24 por lição. Por padrão, cada tentativa sorteia 12 situações independentes, seis de múltiplas lacunas e seis de outros formatos. A nota mínima continua sendo 85%.
- **48 palavras e expressões** com tradução e exemplo, acessíveis pelo filtro da etapa 03 em Vocabulário.
- **Quatro apoios e 12 questões curtas**: demonstrativos e posse (lição 20), existência e localização (21), quantidades (22), some/any e preços (23). A teoria pode ser consultada; a prática segue a liberação da lição associada.
- **Uma conversa para conhecer alguém**: diálogo livre de oito a doze falas, orientado por 60–120 palavras, com perguntas relacionadas, rotina, ação atual, localização ou quantidade e um pedido de esclarecimento ou confirmação. O aluno cria o texto sem modelo pronto, salva rascunhos, entrega versões e faz autorrevisão. O feedback de IA é opcional e não concede nota ou aprovação.

As sessões continuam com até 20 perguntas e priorizam conteúdo ainda não praticado, alternando formatos e temas. São necessárias outras sessões para percorrer as 30 práticas da lição. Situações de prova e prática são diferentes. O banco de provas não aparece nas sessões normais, nas revisões ou no catálogo público de exercícios.

A aprovação na prova 15 libera a lição 16. Cada prova seguinte libera apenas a próxima lição, incluindo as passagens entre módulos. A produção escrita fica disponível ao chegar à lição 24, depois de aprovar a prova 23. Consultar teoria ou entregar apoios não substitui aprovação nas provas. A etapa 04 permanece planejada.

## Integração e preservação

O catálogo acrescenta os módulos 6–9, lições 16–24, habilidades 161–242 e vocabulário 201–248. As questões têm IDs `s3-v1-l16-*` a `s3-v1-l24-*`. As IDs, enunciados e respostas dos catálogos `s1-v2` e `s2-v1` permanecem preservados. O seed não altera tentativas, aprovações, rascunhos ou snapshots de provas abertas e concluídas.

Não há alteração de schema nesta etapa: as migrations existentes já suportam o currículo e as atividades. A disponibilidade da etapa vem da presença de módulos no catálogo. Para atualizar uma instalação existente, execute, na raiz:

```powershell
npm run db:migrate
npm run db:seed
npm run build
```

Reinicie o backend quando estiver usando o build compilado. No modo `npm run dev`, o código é recarregado automaticamente; atualize a página do percurso para consultar o conteúdo novo.

O percurso mostra os módulos e uma introdução específica da etapa. Lição, prova e dashboard usam os metadados da API. A geração de exercícios e o feedback da produção escrita recebem a etapa 03. Escrita e apoios continuam com estatísticas próprias, sem afetar notas ou criar acertos na prática.

A correção também reconhece **what's/what is**, **who's/who is**, **where's/where is** e **there's/there is** antes de complementos, mantendo a exigência de forma quando solicitada. **Whose** continua distinto de **who's**; pessoa, plural, polaridade, auxiliar e verbo base continuam sendo verificados.

## Validação

Os testes unitários cobrem os 1.296 exercícios ativos das três etapas: contagens, IDs, referências, alternativas únicas, lacunas, diversidade, mistura das provas e correção. Os testes específicos verificam os módulos, as nove lições, os quatro apoios, a produção e as novas contrações.

A integração usa MariaDB em banco separado terminado em `_test`. Percorre as 24 lições com bloqueio, prática e prova; verifica a liberação 15 → 16, os apoios nas lições correspondentes, a escrita ao chegar à lição 24 e a preservação de respostas, aprovações e prova aberta da etapa 02 após repetir o seed. Também verifica rascunho e entrega da escrita da etapa 03 sem alterar as estatísticas de prática. A IA é simulada, sem chamadas externas.

O smoke test do build verifica as três etapas, vocabulário e atividades sem criar respostas ou aprovações no banco de estudos.
