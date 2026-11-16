# Etapa 02 — Simple Present + Present Continuous

Esta etapa amplia o que o aluno já domina: de **I am a student** para **I study English** e **I am studying now**, preservando o uso de To Be para identidade, estado e localização. O aluno aprende a descrever ações habituais e ações em andamento, negar informações, perguntar e escrever pequenos perfis no presente.

## Sequência de ensino

| Módulo | Lições | Aplicação |
| --- | --- | --- |
| 01 — Do ser e estar às ações | 07. I, you, we, they; 08. He, she, it | Construir afirmativas; usar -s, -es, -ies e have/has; distinguir descrição e ação. |
| 02 — Negar e perguntar com do / does | 09. Don't / doesn't; 10. Perguntas e respostas curtas | Usar o verbo base após auxiliares; responder com o pronome correto; manter am/is/are nas descrições. |
| 03 — Hábitos, preferências e integração | 11. Frequência e preferências; 12. To Be + Simple Present | Posicionar advérbios; interpretar rotinas; apresentar pessoas e combinar afirmações, negativas e perguntas. |
| 04 — Da rotina ao que acontece agora | 13. Afirmativas com -ing; 14. Negativas, perguntas e respostas curtas; 15. Rotina ou agora? | Reutilizar To Be, descrever ações em andamento e contrastar os dois tempos do presente. |

As explicações e instruções são em português. Exemplos traduzidos e vocabulário de apoio acompanham cada avanço. As tarefas abordam casa, trabalho, estudos, transporte, alimentação, comércio, tecnologia, lazer e serviços, sem exigir passado, futuro ou perguntas com palavras interrogativas da etapa 03.

## Atividades e avaliação

- **30 exercícios por lição**, totalizando **270 práticas na etapa**, em sete formatos: múltiplas lacunas, lacuna simples, escolha, ordenação, transformação, tradução e leitura com interpretação objetiva.
- **24 questões independentes por lição** no banco exclusivo de provas: **216 questões na etapa**. A configuração padrão sorteia 12, misturando seis de múltiplas lacunas com seis de outros formatos.
- Cada situação tem identidade própria; as provas usam contextos diferentes da prática.
- A prática mantém sessões de até 20 questões, retomada, correção com explicação e revisões de conteúdos já iniciados. São necessárias outras sessões para cobrir o banco inteiro.
- **48 palavras e expressões novas** no vocabulário, com tradução, exemplo e filtro por etapa.
- A aprovação exige **85%**, conforme a configuração existente. A última prova da etapa 01 libera a lição 07; as provas seguintes liberam uma lição por vez. A prova da lição 12 libera o módulo de Continuous; a lição 15 encerra o conteúdo disponível. A etapa 03 continua futura.
- Cinco conteúdos de apoio, com 15 questões curtas corrigidas, trabalham números e horários, preposições de tempo, artigo the, expressões de interação e marcadores de rotina ou momento.
- A produção **Minha rotina e meu momento** é liberada ao chegar à última lição. Ela inclui rascunho, versões entregues, autorrevisão e feedback opcional de IA. Suas estatísticas são separadas das provas.

Formas completas e contraídas de do not / don't e does not / doesn't são equivalentes na correção, exceto quando a atividade exige uma forma específica. Pessoa, polaridade e ordem continuam sendo verificadas: **She doesn't work** não aceita **She doesn't works**. Variações abertas sem referência exata seguem o fluxo existente de IA ou revisão; as provas usam as referências determinísticas.

## Integração e preservação

O catálogo usa IDs `s2-v1-l7-*` a `s2-v1-l15-*`. As IDs e respostas existentes permanecem iguais. As três novas lições são acrescentadas depois da lição 12. A migration `006_stage_two.sql` adiciona a posição dos módulos; `007_curriculum_activities.sql` cria atividades de apoio, rascunhos e produções. O seed pode ser repetido sem duplicação. Histórico, aprovações e snapshots das provas anteriores são preservados.

O percurso consulta os módulos da API. Lição, prova e dashboard mostram a etapa correspondente; a prova final da etapa 01 aponta para a primeira lição da etapa 02. A geração opcional de exercícios com IA recebe a etapa real da lição.

## Validação

Os testes unitários verificam as 15 lições, os 810 exercícios ativos, referências, alternativas únicas, lacunas, diversidade, seleção e correção de provas, contrações, Continuous e estrutura dos módulos. A integração percorre as duas etapas com bloqueio antes da aprovação, prática, provas e navegação entre etapas, além de persistência e privacidade dos apoios e textos livres.

Os testes completos usam um banco separado terminado em `_test`; nunca geram aprovações fictícias no banco de estudos.
