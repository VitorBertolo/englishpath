# Leitura com compreensão e revisão

Os novos textos têm 100 a 200 palavras, com meta de 150, e alternam histórias, diálogos, e-mails e mensagens. Cada texto inclui três perguntas em inglês: ideia principal, detalhe e uma pergunta que pede um trecho como evidência. O aluno pode responder em português ou inglês.

A interpretação, as respostas e o trecho citado são salvos no rascunho e nas tentativas. A avaliação da IA considera compreensão, sem penalizar gramática. Respostas de referência ficam no servidor e aparecem apenas na avaliação. Falhas preservam o trabalho para uma nova tentativa. Textos anteriores continuam com o fluxo de interpretação livre.

## Vocabulário

Selecione uma expressão no texto ou digite-a no painel **Meu vocabulário**. Preencha o significado em português. O servidor confirma que a expressão pertence ao texto e salva uma frase de contexto. Salvar novamente atualiza a anotação sem duplicar a expressão ou reiniciar seu calendário.

Na revisão, o aluno escreve o que lembra antes de revelar o significado e se autoavalia com **Lembrei** ou **Preciso revisar**. Acertos agendam revisões em 1, 3, 7, 14 e 30 dias; dificuldade reinicia a sequência e agenda o dia seguinte. A autoavaliação de vocabulário não determina o nível da leitura. Cada revisão tem ID e versão para impedir avanço duplicado em reenvios ou abas concorrentes.

## Adaptação

A prática começa em A1 e tem quatro patamares: primeiros passos A1, ampliação A1, novos contextos A2 e consolidação A2. São patamares desta atividade, sem certificar o nível geral do aluno.

O sistema usa a última avaliação de cada texto distinto. Três leituras consecutivas no mesmo patamar, com compreensão completa e três respostas corretas, avançam um patamar. Duas leituras consecutivas com compreensão limitada ou até uma resposta correta reduzem um patamar. Avaliações antigas sem perguntas não alteram essa progressão.

A geração recebe expressões salvas, priorizando as que precisam de revisão, e dificuldades das avaliações recentes. A IA é orientada a reapresentar até três expressões em situações novas, quando compatíveis com o contexto e o nível. O servidor varia o formato, evitando os três formatos mais recentes, e evita os cinco temas mais recentes.

## Instalação e verificações

Execute `npm run db:migrate` para aplicar `008_reading_practice.sql`, que acrescenta perguntas, respostas e patamares às tabelas de leitura e cria as tabelas de vocabulário e suas revisões. O histórico existente é preservado. Depois execute `npm run build`.

`npm test` cobre limites de texto, perguntas, evidências, respostas, progressão e calendário de revisão. `npm run test:integration` exige um banco separado terminado em `_test`; cobre persistência, privacidade, reenvios, falhas e retomada, formatos, adaptação e compatibilidade com leituras antigas, com transporte de IA simulado.
