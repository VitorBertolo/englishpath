export type ActivityContent = {
  objective: string;
  explanation: string;
  examples: string[];
  prompt: string;
  checklist: string[];
  suggestedWords?: [number, number];
  questions?: {
    id: string;
    prompt: string;
    accepted_answers: string[];
    explanation: string;
  }[];
};
export type LearningActivity = {
  id: string;
  stage_id: number;
  lesson_id: number | null;
  position: number;
  kind: "support" | "writing";
  title: string;
  content: ActivityContent;
};
export const supportPlan = [
  {
    stage_id: 1,
    topics: [
      "Pronomes e possessivos: my, your, his, her, our, their",
      "Artigos a/an e profissões",
      "Singular e plural: -s, -es e exceções frequentes",
      "Preposições de lugar: in, on, at",
      "Números de 0 a 20 e idade",
    ],
  },
  {
    stage_id: 2,
    topics: [
      "Horários e números de 21 a 100",
      "Preposições de tempo: in, on, at",
      "Artigo the e referências já conhecidas",
      "Expressões para pedir ajuda e agradecer",
      "Expressões de rotina e de momento: every day, now, at the moment",
    ],
  },
  {
    stage_id: 3,
    topics: [
      "Demonstrativos: this, that, these, those",
      "There is/are e localização",
      "Quantidades, preços e how much/how many",
      "Some/any e nomes contáveis ou incontáveis",
    ],
  },
  {
    stage_id: 4,
    topics: [
      "Datas, meses e anos",
      "Expressões de passado: yesterday, last, ago",
      "Conectores para narrar: first, then, after that",
      "Verbos irregulares frequentes em contexto",
    ],
  },
  {
    stage_id: 5,
    topics: [
      "Datas futuras e compromissos",
      "Expressões para pedidos, sugestões e convites",
      "Preposições de movimento: to, from, into",
      "Comparações para escolher e justificar",
    ],
  },
  {
    stage_id: 6,
    topics: [
      "Marcadores de experiência: ever, never, already, yet",
      "Since/for e duração",
      "Paráfrases e famílias de palavras",
      "Conectores para explicar e contrastar ideias",
    ],
  },
  {
    stage_id: 7,
    topics: [
      "Registro de mensagens pessoais e profissionais",
      "Organização de parágrafos e coesão",
      "Revisão de clareza, pontuação e escolha de palavras",
      "Expressões frequentes em situações autênticas",
    ],
  },
];
const writingTasks: [string, string, string[], [number, number]][] = [
  [
    "Minha apresentação",
    "Escreva uma apresentação em inglês para alguém que está conhecendo você. Diga quem é, como está e onde está. Acrescente uma descrição de alguém ou de algo importante para você. Pode inventar os dados. Escreva de quatro a seis frases, usando apenas estruturas que já estudou.",
    [
      "Apresentei a mim mesmo com I am ou I'm.",
      "Usei To Be para estado ou localização.",
      "Descrevi outra pessoa ou coisa com a concordância correta.",
      "Incluí uma negativa e revisei artigos, pronomes e plurais.",
    ],
    [25, 60],
  ],
  [
    "Minha rotina e meu momento",
    "Escreva uma mensagem em inglês para um amigo: apresente-se brevemente, conte sua rotina, diga do que gosta e descreva o que você e outra pessoa estão fazendo agora. Inclua uma negativa e uma pergunta ao amigo. Use suas próprias ideias; você pode inventar a situação.",
    [
      "Usei Simple Present para hábitos e preferências.",
      "Usei am/is/are + -ing para ações em andamento.",
      "Incluí uma negativa e uma pergunta coerentes.",
      "Mantive os horários e marcadores de tempo claros.",
    ],
    [50, 100],
  ],
  [
    "Uma conversa para conhecer alguém",
    "Crie um diálogo em inglês entre duas pessoas que estão se conhecendo em um curso. Inclua perguntas e respostas sobre rotina, lugar onde moram, horários e interesses. Faça cada resposta contribuir para a conversa.",
    [
      "Usei perguntas com palavras interrogativas.",
      "As respostas correspondem às perguntas.",
      "Usei expressões de interação e pedidos de esclarecimento.",
      "Revisei possessivos, quantidades e localização.",
    ],
    [60, 120],
  ],
  [
    "Um acontecimento do meu dia",
    "Conte em inglês um acontecimento real ou inventado do fim de semana passado. Explique onde estava, com quem estava, o que aconteceu e como se sentiu. Organize os acontecimentos em uma sequência compreensível.",
    [
      "Localizei os acontecimentos no passado.",
      "Combinei was/were e verbos de ação no passado.",
      "Liguei os fatos com marcadores de sequência.",
      "Incluí detalhes suficientes para o leitor entender.",
    ],
    [70, 130],
  ],
  [
    "Um plano e um convite",
    "Escreva em inglês a um amigo propondo uma atividade futura. Diga quando e onde, explique o plano, faça um convite e apresente uma sugestão ou alternativa. Considere o que a outra pessoa pode precisar.",
    [
      "Expressei um plano futuro com clareza.",
      "Fiz um convite ou pedido adequado.",
      "Usei um modal estudado com sentido apropriado.",
      "Informei horário, lugar e uma alternativa.",
    ],
    [80, 140],
  ],
  [
    "Uma experiência e o que aprendi",
    "Conte em inglês uma experiência importante real ou inventada. Apresente sua relação com o presente e descreva um episódio específico no passado. Explique o que aprendeu e como isso influencia você hoje.",
    [
      "Usei Present Perfect quando a experiência se relaciona ao presente.",
      "Usei Simple Past para um momento passado definido.",
      "Mantive os marcadores de tempo coerentes.",
      "Organizei ideias com exemplos e conectores.",
    ],
    [100, 170],
  ],
  [
    "Resolver uma situação por escrito",
    "Escolha uma situação: pedir informações para uma viagem, resolver um problema com uma compra ou organizar um projeto com amigos. Escreva a primeira mensagem e uma resposta plausível. Explique o contexto, faça pedidos claros e proponha uma solução.",
    [
      "Adaptei o tom ao destinatário.",
      "Expliquei o problema ou objetivo com clareza.",
      "Integrei as estruturas necessárias sem forçá-las.",
      "Revisei organização, sentido e naturalidade.",
    ],
    [120, 220],
  ],
];
export const writingActivities: LearningActivity[] = writingTasks.map(
  ([title, prompt, checklist, suggestedWords], i) => ({
    id: `writing-s${i + 1}-v1`,
    stage_id: i + 1,
    lesson_id: null,
    position: 100,
    kind: "writing",
    title,
    content: {
      objective:
        "Construir uma mensagem em inglês com suas próprias ideias e revisar o que aprendeu nesta etapa.",
      explanation:
        "Escreva primeiro sem copiar os exemplos das lições. Depois releia usando os critérios de revisão. A faixa de palavras é uma orientação, não uma nota. Você pode salvar rascunhos, entregar versões e voltar para reescrever. A entrega registra sua produção; a avaliação com IA é opcional e não substitui as provas.",
      examples: [],
      prompt,
      checklist,
      suggestedWords,
    },
  }),
);
function support(
  id: string,
  stage_id: number,
  lesson_id: number,
  position: number,
  title: string,
  explanation: string,
  examples: string[],
  questions: [string, string, string][],
): LearningActivity {
  return {
    id,
    stage_id,
    lesson_id,
    position,
    kind: "support",
    title,
    content: {
      objective: `Aplicar ${title.toLowerCase()} às frases desta etapa.`,
      explanation,
      examples,
      prompt:
        "Complete as frases com a palavra ou expressão pedida. Depois confira a explicação e tente usar a ideia em uma frase sua.",
      checklist: [
        "Li os exemplos.",
        "Entendi por que cada resposta completa a frase.",
      ],
      questions: questions.map(([prompt, answer, explanation], i) => ({
        id: `q${i + 1}`,
        prompt,
        accepted_answers: [answer],
        explanation,
      })),
    },
  };
}
export const supportActivities: LearningActivity[] = [
  support(
    "support-possessives-v1",
    1,
    2,
    1,
    "Possessivos: de quem é?",
    "My = meu/minha; your = seu/sua, de você; his = dele; her = dela; our = nosso/nossa; their = deles/delas. Eles vêm antes do nome e concordam com quem possui, sem mudar entre masculino, feminino e plural em português. His não significa que o objeto é masculino. Não confunda he (ele) com his (dele).",
    [
      "She is my sister. → Ela é minha irmã.",
      "Ana is here. Her bag is blue. → Ana está aqui. A bolsa dela é azul.",
      "They are our friends. → Eles são nossos amigos.",
    ],
    [
      [
        "Ana is a student. ___ book is new. Use dela.",
        "Her",
        "Her indica que o livro pertence a Ana.",
      ],
      [
        "We are brothers. ___ house is small. Use nossa.",
        "Our",
        "Our indica que a casa pertence ao grupo que fala.",
      ],
      [
        "They are teachers. ___ classroom is here. Use deles.",
        "Their",
        "Their acompanha classroom e indica os professores como possuidores.",
      ],
    ],
  ),
  support(
    "support-articles-v1",
    1,
    3,
    2,
    "Artigos a e an",
    "Use a/an antes de profissão ou nome contável no singular quando apresentar um exemplar: a teacher, an engineer. A escolha depende do som seguinte: a university começa com som de /y/; an hour começa com vogal porque o h é mudo. No plural, não use a/an: They are teachers. O artigo the será aprofundado na etapa 2.",
    [
      "He is a doctor. → Ele é médico.",
      "She is an artist. → Ela é artista.",
      "They are students. → Eles são estudantes.",
    ],
    [
      [
        "She is ___ engineer. Use a ou an.",
        "an",
        "Engineer começa com som de vogal.",
      ],
      [
        "He is ___ university student. Use a ou an.",
        "a",
        "University começa com som de /y/, como you.",
      ],
      [
        "Complete com a profissão teacher no plural: They are ___.",
        "teachers",
        "No plural, use teachers sem a/an.",
      ],
    ],
  ),
  support(
    "support-plurals-v1",
    1,
    3,
    3,
    "Singular e plural",
    "Em geral, acrescente -s ao nome: book/books. Nomes em -s, -sh, -ch ou -x recebem frequentemente -es: box/boxes. Consoante + y vira -ies: city/cities; vogal + y mantém y: boy/boys. Há exceções: child/children, person/people. O verbo acompanha o sujeito: The book is new; the books are new. Adjetivos como new não ganham plural.",
    [
      "One book is blue. Two books are blue.",
      "The boxes are small.",
      "The children are at home.",
    ],
    [
      [
        "Escreva o plural de box: two ___.",
        "boxes",
        "Box termina em -x e recebe -es.",
      ],
      [
        "Escreva o plural de city: three ___.",
        "cities",
        "Consoante + y vira -ies.",
      ],
      [
        "Escreva o plural de child: The ___ are happy.",
        "children",
        "Children é o plural irregular de child.",
      ],
    ],
  ),
  support(
    "support-place-v1",
    1,
    2,
    4,
    "Lugar: in, on e at",
    "In indica estar dentro de um espaço ou em cidades e países: in the room, in Brazil. On indica contato com uma superfície: on the table. At aponta um local ou referência: at school, at home. Aprenda essas combinações pelo contexto; nem todo em do português corresponde à mesma preposição.",
    [
      "The book is on the table. → O livro está sobre a mesa.",
      "She is in Brazil. → Ela está no Brasil.",
      "We are at home. → Estamos em casa.",
    ],
    [
      [
        "O livro está sobre a mesa: The book is ___ the table.",
        "on",
        "On indica contato com a superfície.",
      ],
      ["Ela está no Brasil: She is ___ Brazil.", "in", "Use in com países."],
      [
        "Estamos em casa: We are ___ home.",
        "at",
        "At home é a expressão usual para em casa.",
      ],
    ],
  ),
  support(
    "support-numbers-v1",
    1,
    2,
    5,
    "Números de 0 a 20 e idade",
    "0–10: zero, one, two, three, four, five, six, seven, eight, nine, ten. 11–20: eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty. Para idade use To Be: I am twenty years old. Em inglês, idade não usa have. Com quantidade plural, revise are: Two books are here.",
    [
      "I am eighteen years old. → Tenho dezoito anos.",
      "She is twelve. → Ela tem doze anos.",
      "Two students are ready. → Dois alunos estão prontos.",
    ],
    [
      [
        "Escreva 12 por extenso em inglês.",
        "twelve",
        "12 corresponde a twelve.",
      ],
      [
        "Escreva 18 por extenso em inglês.",
        "eighteen",
        "18 corresponde a eighteen.",
      ],
      [
        "Use am ou have para idade: I ___ twenty years old.",
        "am",
        "Idade usa To Be: I am twenty years old.",
      ],
    ],
  ),
  support(
    "support-time-v1",
    2,
    7,
    1,
    "Horários e números de 21 a 100",
    "Dezenas: twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred. Combine com hífen: twenty-one, forty-two. Para horários, uma forma simples é ler hora e minutos: seven thirty = 7:30; eight fifteen = 8:15; nine o'clock = 9:00. Também existem half past seven e a quarter past eight. Com hora específica use at. AM indica antes do meio-dia; PM, depois do meio-dia.",
    [
      "I study at seven thirty. → Estudo às 7h30.",
      "The book costs twenty-five dollars. → O livro custa vinte e cinco dólares.",
      "She works at nine o'clock. → Ela trabalha às nove.",
    ],
    [
      [
        "Escreva 40 por extenso em inglês.",
        "forty",
        "A grafia é forty, sem u.",
      ],
      [
        "Use at, in ou on: We work ___ eight o'clock.",
        "at",
        "Uma hora específica usa at.",
      ],
      [
        "Escreva 21 por extenso, com hífen.",
        "twenty-one",
        "Combine a dezena e a unidade com hífen.",
      ],
    ],
  ),
  support(
    "support-time-prepositions-v1",
    2,
    11,
    2,
    "Tempo: in, on e at",
    "Use in com meses, anos e períodos do dia: in July, in 2027, in the morning. Use on com dias e datas: on Monday, on Sundays, on 5 May. Use at com horas e expressões como at night. Expressões com every dispensam preposição: every day, não on every day. Relacione essas expressões às rotinas do Simple Present.",
    [
      "I work in the morning.",
      "She studies on Mondays.",
      "We eat at seven. They read at night.",
    ],
    [
      [
        "Use in, on ou at: He studies ___ the morning.",
        "in",
        "Período do dia: in the morning.",
      ],
      [
        "Use in, on ou at: They play ___ Fridays.",
        "on",
        "Dias da semana usam on.",
      ],
      ["Use in, on ou at: We read ___ night.", "at", "A expressão é at night."],
    ],
  ),
  support(
    "support-the-v1",
    2,
    12,
    3,
    "Artigo the: uma referência conhecida",
    "A/an apresenta um exemplar; the aponta algo que o leitor consegue identificar: I have a bike. The bike is blue. The não muda com gênero ou plural: the book, the books. Em generalizações com nomes no plural, muitas vezes não há artigo: I like books. Aprenda o contraste pelo contexto, sem traduzir todo o/a do português automaticamente.",
    [
      "She has a cat. The cat is small.",
      "The students in this room study English.",
      "I like books. → Gosto de livros em geral.",
    ],
    [
      [
        "I have a dog. ___ dog is black. Use a, an ou the.",
        "The",
        "O cão já foi apresentado; agora é uma referência conhecida.",
      ],
      [
        "She is ___ artist. Use a, an ou the para apresentar a profissão.",
        "an",
        "A profissão é apresentada com an antes do som de vogal.",
      ],
      [
        "Use book no plural para falar em geral: I like ___.",
        "books",
        "A generalização é I like books, sem the.",
      ],
    ],
  ),
  support(
    "support-expressions-v1",
    2,
    10,
    4,
    "Expressões para interagir",
    "Aprenda pequenas expressões completas: Excuse me = com licença/para chamar atenção; please = por favor; thank you = obrigado(a); you're welcome = de nada; I don't understand = não entendo. Elas ajudam a manter a interação mesmo com vocabulário limitado. Use o que conhece e peça ajuda quando precisar.",
    [
      "Excuse me. Do you work here?",
      "I don't understand. Please help me.",
      "Thank you. — You're welcome.",
    ],
    [
      [
        "Traduza por favor para completar: Help me, ___.",
        "please",
        "Please torna o pedido mais cortês.",
      ],
      [
        "Complete a expressão obrigado(a): ___ you.",
        "Thank",
        "Thank you é a expressão completa.",
      ],
      [
        "Complete não entendo com don't ou doesn't: I ___ understand.",
        "don't",
        "A expressão usa I don't understand.",
      ],
    ],
  ),
  support(
    "support-time-markers-v1",
    2,
    15,
    5,
    "Rotina ou momento: marcadores de tempo",
    "Every day, usually e on Mondays costumam acompanhar rotinas no Simple Present. Now, right now e at the moment ajudam a marcar o que está em andamento no Present Continuous. Essas pistas ajudam, mas o significado da mensagem decide o tempo: I work at home pode ser minha rotina; I am working at home now descreve este momento.",
    [
      "I cook every day. → Cozinho todos os dias.",
      "I am cooking right now. → Estou cozinhando agora mesmo.",
      "She usually walks, but she is taking the bus today.",
    ],
    [
      [
        "Traduza agora: She is reading ___.",
        "now",
        "Now situa a leitura no momento atual.",
      ],
      [
        "Use work ou am working: I ___ every day.",
        "work",
        "Every day descreve um hábito.",
      ],
      [
        "Use studies ou is studying: She ___ at the moment.",
        "is studying",
        "At the moment situa a ação em andamento.",
      ],
    ],
  ),
];
export const learningActivities = [...supportActivities, ...writingActivities];
