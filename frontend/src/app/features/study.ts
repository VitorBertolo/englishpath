import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Api, StudySession, Feedback, StudyActions } from "../core/api";
import { Icon } from "../shared/icon";
import { AnswerInput, answerIsComplete } from "../shared/answer-input";
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, Icon, AnswerInput],
  template: ` @if (error()) {
      <p class="error" role="alert">
        {{ error() }}
        <button class="text-button" (click)="load()">Retomar sessão</button>
      </p>
    }
    @if (session(); as s) {
      <div class="study-top">
        <a routerLink="/curso" class="back-link">← Meu percurso</a
        ><button
          class="text-button"
          (click)="leave('pause')"
          [disabled]="busy()"
        >
          <app-icon name="pause" />Salvar e sair
        </button>
      </div>
      <section class="study-shell">
        <div class="study-progress">
          <span class="eyebrow">{{
            s.mode === "review"
              ? "REVISÃO INTELIGENTE"
              : s.mode === "reading"
                ? "PRÁTICA DE LEITURA"
                : "SESSÃO DE ESTUDO"
          }}</span><strong>{{ index() }} / {{ s.total }}</strong>
        </div>
        <div class="progress-track">
          <span [style.width.%]="(index() / s.total) * 100"></span>
        </div>
        @if (index() < s.total && s.status !== "finished") {
          @if (exercise(); as e) {
            <div class="exercise-meta">
              <span class="badge">{{ typeNames[e.type] }}</span><span
                class="small muted"
                >Lição {{ e.lesson_id }} ·
                {{ e.topic || "To Be + Pronomes" }}</span
              >
            </div>
            <div class="exercise-body">
              <p class="exercise-instruction">{{ e.instruction }}</p>
              @if (e.passage) {
                <div class="reading-passage" lang="en">{{ e.passage }}</div>
              }
              @if (e.type !== "multi_gap") {
                <h1 [class.long-prompt]="e.prompt.length > 70">
                  {{ e.prompt }}
                </h1>
              }
              @if (e.type === "multi_gap") {
                <app-answer-input
                  [exercise]="e"
                  [value]="answer()"
                  (valueChange)="answer.set($event)"
                  [disabled]="!!feedback() || busy()"
                />
              } @else if (e.options?.length) {
                <div
                  class="answer-options"
                  role="group"
                  aria-label="Alternativas"
                >
                  @for (option of e.options; track option; let i = $index) {
                    <button
                      class="answer-option"
                      [class.selected]="answer() === option"
                      [disabled]="!!feedback() || busy()"
                      (click)="answer.set(option)"
                    >
                      <span>{{ letters[i] }}</span><strong>{{ option }}</strong>
                      @if (answer() === option) {
                        <app-icon name="check" />
                      }
                    </button>
                  }
                </div>
              } @else if (e.type === "order" && e.words) {
                <div class="word-answer" aria-label="Sua frase">
                  @if (!selected().length) {
                    <span class="muted">Sua frase aparece aqui…</span>
                  }
                  @for (i of selected(); track $index) {
                    <button
                      class="word-token chosen"
                      [disabled]="!!feedback() || busy()"
                      (click)="removeWord($index)"
                    >
                      {{ e.words[i] }}<span>×</span>
                    </button>
                  }
                </div>
                <div
                  class="word-bank"
                  role="group"
                  aria-label="Palavras disponíveis"
                >
                  @for (word of e.words; track $index; let i = $index) {
                    <button
                      class="word-token"
                      [disabled]="
                        selected().includes(i) || !!feedback() || busy()
                      "
                      (click)="addWord(i)"
                    >
                      {{ word }}
                    </button>
                  }
                </div>
                <p class="small muted">
                  Toque em uma palavra da frase para removê-la.
                </p>
              } @else {
                <label class="field-label" for="answer">Sua resposta</label
                ><input
                  id="answer"
                  class="exercise-input"
                  [ngModel]="answer()"
                  (ngModelChange)="answer.set($event)"
                  [disabled]="!!feedback() || busy()"
                  placeholder="Escreva em inglês…"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  lang="en"
                />
              }
            </div>
            @if (feedback(); as f) {
              <div
                class="feedback-box"
                [class.incorrect]="f.result === 'incorrect'"
                [class.pending]="f.result === 'needs_review'"
                role="status"
                aria-live="polite"
              >
                <div class="feedback-title">
                  <app-icon
                    [name]="
                      f.result === 'correct'
                        ? 'check'
                        : f.result === 'incorrect'
                          ? 'close'
                          : 'review'
                    "
                  />
                  <h2>
                    {{
                      f.result === "correct"
                        ? "Muito bem!"
                        : f.result === "incorrect"
                          ? "Quase lá. Vamos aprender com isso?"
                          : "Uma variação para revisar"
                    }}
                  </h2>
                  <span class="small">{{
                    f.method === "ai"
                      ? "Correção com IA"
                      : f.method === "deterministic"
                        ? "Correção do curso"
                        : "Salvo para revisão"
                  }}</span>
                </div>
                <p>
                  <strong>Resposta de referência:</strong>
                  <span lang="en">{{ f.reference }}</span>
                </p>
                @if (f.method === "ai" && f.suggestedAnswer !== f.reference) {
                  <p><strong>Sugestão:</strong> {{ f.suggestedAnswer }}</p>
                }
                <p>{{ f.explanation }}</p>
                @if (f.fields?.length) {
                  <p>
                    <strong
                      >{{ f.earnedPoints }} de {{ f.totalPoints }} lacunas
                      corretas.</strong
                    >
                  </p>
                  @for (field of f.fields; track field.id) {
                    <p>
                      {{ field.result === "correct" ? "✓" : "×" }}
                      {{ field.label }}: {{ field.answer }} · Referência:
                      {{ field.reference }}
                    </p>
                  }
                }
                @if (f.message) {
                  <p>{{ f.message }}</p>
                }
              </div>
            }
            <div class="exercise-actions">
              @if (!feedback()) {
                <span class="small muted">Enter para verificar</span
                ><button
                  class="button primary"
                  (click)="verify()"
                  [disabled]="!complete() || busy()"
                >
                  {{ busy() ? "Verificando…" : "Verificar resposta"
                  }}<app-icon name="check" />
                </button>
              } @else {
                <span class="small muted"
                  >Leia a explicação antes de seguir.</span
                ><button class="button primary" (click)="next()">
                  {{
                    index() + 1 === s.total
                      ? "Ver meu resultado"
                      : "Próximo exercício"
                  }}<app-icon name="arrow" />
                </button>
              }
            </div>
          }
        } @else {
          <div class="session-complete">
            <span class="complete-icon"><app-icon name="flag" /></span
            ><span class="eyebrow">MAIS UM PASSO NO SEU CAMINHO</span>
            <h1>
              {{
                s.status === "finished"
                  ? "Sessão encerrada."
                  : "Prática concluída!"
              }}
            </h1>
            @if (s.closure_reason === "catalog_refresh") {
              <p>
                O conteúdo desta lição foi renovado com situações mais variadas.
                Suas respostas anteriores estão salvas no histórico.
              </p>
              <button class="button primary" (click)="study.start(s.lesson_id)">
                Praticar o novo conteúdo
              </button>
            } @else {
              <p>
                Seu histórico está salvo. O que você pratica hoje vira confiança
                amanhã.
              </p>
            }
            <div class="session-results">
              <div>
                <strong>{{ counts().correct }}</strong><span>Acertos</span>
              </div>
              <div>
                <strong>{{ counts().incorrect }}</strong><span
                  >Para reforçar</span
                >
              </div>
              <div>
                <strong>{{ counts().review }}</strong><span
                  >Variações a revisar</span
                >
              </div>
            </div>
            <a routerLink="/" class="button primary"
              >Voltar ao meu painel <app-icon name="arrow" /></a
            ><a routerLink="/revisao" class="button secondary"
              >Ver minhas revisões</a
            >
          </div>
        }
      </section>
      <p class="study-footnote">
        <app-icon name="lock" />Cada resposta é salva no seu histórico. Você
        pode continuar depois.
      </p>
    } @else if (!error()) {
      <div class="loading-state">Preparando sua prática…</div>
    }`,
})
export class Study {
  api = inject(Api);
  route = inject(ActivatedRoute);
  router = inject(Router);
  study = inject(StudyActions);
  session = signal<StudySession | null>(null);
  index = signal(0);
  answer = signal("");
  selected = signal<number[]>([]);
  feedback = signal<Feedback | null>(null);
  busy = signal(false);
  error = signal("");
  letters = ["A", "B", "C", "D", "E", "F"];
  typeNames: Record<string, string> = {
    gap: "Complete a lacuna",
    choice: "Múltipla escolha",
    translate: "Tradução",
    order: "Ordene as palavras",
    transform: "Transforme a frase",
    reading: "Leitura e interpretação",
    multi_gap: "Múltiplas lacunas",
  };
  exercise = computed(() => this.session()?.exercises[this.index()]);
  complete = computed(() => answerIsComplete(this.exercise(), this.answer()));
  counts = computed(() => {
    const a = this.session()?.attempts ?? [];
    return {
      correct: a.filter((x) => x.result === "correct").length,
      incorrect: a.filter((x) => x.result === "incorrect").length,
      review: a.filter((x) => x.result === "needs_review").length,
    };
  });
  constructor() {
    this.load();
  }
  async load() {
    this.error.set("");
    try {
      const s = await this.api.get<StudySession>(
        "/study-sessions/" + this.route.snapshot.paramMap.get("id"),
      );
      this.session.set(s);
      this.index.set(s.cursor);
      this.reset();
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  reset() {
    this.answer.set("");
    this.selected.set([]);
    this.feedback.set(null);
  }
  addWord(i: number) {
    this.selected.update((a) => [...a, i]);
    this.syncWords();
  }
  removeWord(index: number) {
    this.selected.update((a) => a.filter((_, i) => i !== index));
    this.syncWords();
  }
  syncWords() {
    this.answer.set(
      this.selected()
        .map((i) => this.exercise()!.words![i])
        .join(" "),
    );
  }
  async verify() {
    if (this.busy() || this.feedback() || !this.complete()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      const f = await this.api.post<Feedback>(
        "/exercises/" + this.exercise()!.id + "/answer",
        { sessionId: this.session()!.id, answer: this.answer() },
      );
      this.feedback.set(f);
      this.session.update((s) =>
        s
          ? {
              ...s,
              attempts: [
                ...s.attempts,
                {
                  exercise_id: this.exercise()!.id,
                  result: f.result,
                  feedback: f,
                },
              ],
            }
          : s,
      );
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  next() {
    if (!this.feedback()) return;
    this.index.update((i) => i + 1);
    this.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async leave(action: "pause" | "finish") {
    this.busy.set(true);
    try {
      await this.api.post("/study-sessions/" + this.session()!.id + "/finish", {
        action,
      });
      await this.router.navigateByUrl("/");
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  @HostListener("document:keydown", ["$event"]) keydown(e: KeyboardEvent) {
    if (
      e.key !== "Enter" ||
      e.shiftKey ||
      (e.target as HTMLElement).tagName === "BUTTON" ||
      (e.target as HTMLElement).tagName === "SELECT" ||
      (e.target as HTMLElement).tagName === "A"
    )
      return;
    e.preventDefault();
    if (this.feedback()) this.next();
    else this.verify();
  }
}
