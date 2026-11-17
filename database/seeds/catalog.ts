import { additionalExercises } from "./extended.js";
import {
  stageTwoLessons,
  stageTwoModules,
  stageTwoVocabulary,
} from "./stage2/curriculum.js";
import { actionExercises } from "./stage2/actions.js";
import { thirdPersonExercises } from "./stage2/third-person.js";
import { negativeExercises } from "./stage2/negatives.js";
import { doQuestionExercises } from "./stage2/questions.js";
import { habitExercises } from "./stage2/habits.js";
import { integratedExercises } from "./stage2/integration.js";
import {
  continuousLessons,
  continuousAffirmatives,
} from "./stage2/continuous.js";
import { continuousQuestions } from "./stage2/continuous-questions.js";
import { presentContrast } from "./stage2/present-contrast.js";
import {
  stageThreeLessons,
  stageThreeModules,
  stageThreeVocabulary,
} from "./stage3/curriculum.js";
import { identityQuestions } from "./stage3/identity.js";
import { placeTimeQuestions } from "./stage3/place-time.js";
import { reasonQuestions } from "./stage3/reasons.js";
import { currentActionQuestions } from "./stage3/current-actions.js";
import { demonstrativeExercises } from "./stage3/demonstratives.js";
import { existenceExercises } from "./stage3/existence.js";
import { quantityExercises } from "./stage3/quantities.js";
import { shoppingExercises } from "./stage3/shopping.js";
import { conversationExercises } from "./stage3/conversations.js";
export const stages = [
  [
    "Verbo To Be + Pronomes",
    "Dê seus primeiros passos: apresente-se, descreva pessoas e faça perguntas simples.",
  ],
  [
    "Simple Present + Present Continuous",
    "Fale sobre rotinas e preferências e descreva o que está acontecendo agora.",
  ],
  [
    "Perguntas + Palavras essenciais",
    "Use what, where, when e outras palavras para descobrir o mundo.",
  ],
  [
    "Passado: Did / Was / Were",
    "Conte histórias e fale sobre o que já aconteceu.",
  ],
  [
    "Futuro + Verbos modais",
    "Expresse planos, possibilidades, conselhos e necessidades.",
  ],
  [
    "Present Perfect + Integração de tempos",
    "Conecte experiências ao presente e aprofunde o contraste entre os tempos já aprendidos.",
  ],
  [
    "Imersão escrita intensiva",
    "Integre leitura, escrita e situações reais do cotidiano.",
  ],
];
export const modules = [
  { id: 1, stage_id: 1, position: 1, title: "Primeiras frases em inglês" },
  ...stageTwoModules,
  { id: 5, stage_id: 2, position: 4, title: "Da rotina ao que acontece agora" },
  ...stageThreeModules,
];
const stageOneLessons = [
  {
    id: 1,
    title: "Pronomes pessoais",
    objective: "Escolher I, you, he, she, it, we e they para cada contexto.",
    explanation:
      "Os pronomes substituem nomes. I = eu; you = você ou vocês; he = ele; she = ela; it = uma coisa ou animal quando não indicamos o gênero; we = nós; they = eles ou elas. I sempre é escrito com letra maiúscula. They também pode se referir a uma pessoa quando seu gênero não é conhecido; nesta lição praticamos o uso no plural.",
    examples: [
      "I am Ana. → Eu sou Ana.",
      "She is my friend. → Ela é minha amiga.",
      "We are students. → Nós somos estudantes.",
    ],
    skills: ["Identificar pronomes", "Substituir nomes por pronomes"],
  },
  {
    id: 2,
    title: "Am, Is, Are",
    objective: "Combinar cada pronome com a forma correta de To Be.",
    explanation:
      "To Be pode significar ser ou estar. Use I am; he, she e it is; you, we e they are. O contexto indica se falamos de identidade, profissão, localização ou estado.",
    examples: [
      "I am a student. → Eu sou estudante.",
      "It is cold. → Está frio.",
      "They are at home. → Eles estão em casa.",
    ],
    skills: ["Concordância com To Be", "Identidade e estado"],
  },
  {
    id: 3,
    title: "Frases afirmativas",
    objective: "Construir frases simples com sujeito + To Be + complemento.",
    explanation:
      "Comece pelo sujeito, depois use am, is ou are e complete a ideia. Antes de uma profissão no singular, normalmente usamos a ou an: a teacher, an engineer. Em inglês o adjetivo não vai para o plural.",
    examples: [
      "She is a teacher. → Ela é professora.",
      "We are happy. → Nós estamos felizes.",
      "He is an engineer. → Ele é engenheiro.",
    ],
    skills: ["Ordem da frase afirmativa", "Profissões e descrições"],
  },
  {
    id: 4,
    title: "Frases negativas",
    objective: "Negar informações com am not, is not e are not.",
    explanation:
      "Para negar, coloque not depois de am, is ou are. Is not pode virar isn’t; are not pode virar aren’t. Com I, use I am not ou I’m not. A ordem continua sendo sujeito + verbo + not + complemento.",
    examples: [
      "He is not tired. → Ele não está cansado.",
      "They aren’t doctors. → Eles não são médicos.",
      "I’m not late. → Eu não estou atrasado.",
    ],
    skills: ["Negação com To Be", "Contrações negativas"],
  },
  {
    id: 5,
    title: "Perguntas com To Be",
    objective: "Fazer perguntas e dar respostas curtas.",
    explanation:
      "Nas perguntas, coloque am, is ou are antes do sujeito. Para responder de forma curta, repita o pronome e a forma de To Be: Yes, I am. / No, I’m not. Em respostas afirmativas curtas não usamos a contração no fim: Yes, she is.",
    examples: [
      "Are you happy? → Você está feliz?",
      "Is she a teacher? → Ela é professora?",
      "Yes, she is. / No, she isn’t.",
    ],
    skills: ["Inversão em perguntas", "Respostas curtas"],
  },
  {
    id: 6,
    title: "Contrações e revisão geral",
    objective: "Usar contrações naturais e integrar o que você aprendeu.",
    explanation:
      "Na escrita informal, pronomes e To Be podem se unir: I’m, you’re, he’s, she’s, it’s, we’re e they’re. O apóstrofo indica letras omitidas. Você também pode escrever as formas completas. Revise afirmações, negações e perguntas prestando atenção à ordem.",
    examples: [
      "I’m ready. = I am ready.",
      "She isn’t tired. = She is not tired.",
      "Are they friends? → Eles são amigos?",
    ],
    skills: ["Contrações afirmativas", "Leitura integrada"],
  },
];
export const lessons = [
  ...stageOneLessons.map((l) => ({ ...l, module_id: 1, position: l.id })),
  ...stageTwoLessons,
  ...continuousLessons,
  ...stageThreeLessons,
];
export type Blank = {
  id: string;
  label: string;
  accepted_answers: string[];
  options?: string[];
  strict_form?: boolean;
};
export type Exercise = {
  id: string;
  lesson_id: number;
  skill_id: number;
  type: string;
  prompt: string;
  instruction: string;
  accepted_answers: string[];
  explanation: string;
  options?: string[];
  words?: string[];
  passage?: string;
  difficulty: number;
  strict_form?: boolean;
  purpose?: "practice" | "exam";
  blanks?: Blank[];
  family?: string;
  topic?: string;
};
export const exercises: Exercise[] = [
  ...additionalExercises(),
  ...actionExercises(),
  ...thirdPersonExercises(),
  ...negativeExercises(),
  ...doQuestionExercises(),
  ...habitExercises(),
  ...integratedExercises(),
  ...continuousAffirmatives(),
  ...continuousQuestions(),
  ...presentContrast(),
  ...identityQuestions(),
  ...placeTimeQuestions(),
  ...reasonQuestions(),
  ...currentActionQuestions(),
  ...demonstrativeExercises(),
  ...existenceExercises(),
  ...quantityExercises(),
  ...shoppingExercises(),
  ...conversationExercises(),
];
const stageOneVocabulary = [
  ["I", "eu", "I am ready."],
  ["you", "você / vocês", "You are kind."],
  ["he", "ele", "He is a doctor."],
  ["she", "ela", "She is a teacher."],
  ["it", "ele / ela (coisa ou animal)", "It is small."],
  ["we", "nós", "We are friends."],
  ["they", "eles / elas", "They are students."],
  ["friend", "amigo(a)", "She is my friend."],
  ["student", "estudante", "I am a student."],
  ["teacher", "professor(a)", "He is a teacher."],
  ["doctor", "médico(a)", "She is a doctor."],
  ["engineer", "engenheiro(a)", "He is an engineer."],
  ["happy", "feliz", "We are happy."],
  ["tired", "cansado(a)", "I am tired."],
  ["ready", "pronto(a)", "They are ready."],
  ["kind", "gentil", "You are kind."],
  ["home", "casa / lar", "I am at home."],
  ["school", "escola", "She is at school."],
  ["book", "livro", "The book is new."],
  ["new", "novo(a)", "It is new."],
  ["small", "pequeno(a)", "Our house is small."],
  ["cold", "frio(a)", "It is cold."],
  ["blue", "azul", "The books are blue."],
  ["brother", "irmão", "He is my brother."],
  ["sister", "irmã", "She is my sister."],
  ["name", "nome", "My name is Ana."],
  ["house", "casa (edificação)", "The house is small."],
  ["class", "aula / turma", "We are ready for class."],
  ["late", "atrasado(a)", "I am not late."],
  ["sick", "doente", "He is sick."],
  ["today", "hoje", "She is here today."],
  ["my", "meu / minha", "You are my friend."],
  ["our", "nosso / nossa", "Our house is new."],
  ["at", "em (localização)", "He is at school."],
  ["not", "não", "I am not tired."],
  ["yes", "sim", "Yes, I am."],
  ["no", "não", "No, she is not."],
  ["and", "e", "Emma and Leo are friends."],
  ["for", "para", "We are ready for class."],
  ["too", "também", "I am a student, too."],
];
export const vocabulary = [
  ...stageOneVocabulary.map((v, i) => ({
    id: i + 1,
    stage_id: 1,
    word: v[0],
    translation: v[1],
    example: v[2],
  })),
  ...stageTwoVocabulary.map((v, i) => ({
    id: 101 + i,
    stage_id: 2,
    word: v[0],
    translation: v[1],
    example: v[2],
  })),
  ...stageThreeVocabulary.map((v, i) => ({
    id: 201 + i,
    stage_id: 3,
    word: v[0],
    translation: v[1],
    example: v[2],
  })),
];
