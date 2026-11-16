import { Component, computed, inject, signal, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Api, Exercise } from "../core/api";
import { AnswerInput, answerIsComplete } from "../shared/answer-input";
import { Icon } from "../shared/icon";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

interface Exam {
  id: string;
  lessonId: number;
  lessonTitle: string;
  stageId: number;
  status: string;
  questions: Exercise[];
  answers: Record<string, string>;
  total: number;
  passPercent: number;
  grading: any;
  nextLessonId: number | null;
}

@Component({
  standalone: true,
  imports: [RouterLink, AnswerInput, Icon],
  template: `
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (exam(); as e) {
      <div class="study-top">
        <button
          class="text-button back-link"
          [disabled]="busy()"
          (click)="leave()"
        >
          ← {{ e.lessonTitle }}
        </button>
        @if (e.status === "active") {
          <button class="text-button" [disabled]="busy()" (click)="leave()">
            <app-icon name="pause" />Salvar e sair
          </button>
        }
      </div>
      @if (e.status === "active") {
        <div class="page-heading">
          <div>
            <span class="eyebrow"
              >PROVA DE CONHECIMENTO · ETAPA
              {{ ("0" + e.stageId).slice(-2) }}</span
            >
            <h1>{{ e.lessonTitle }}<span class="green">.</span></h1>
            <p>
              {{ e.total }} questões · aprovação com {{ e.passPercent }}% ·
              correção ao finalizar
            </p>
          </div>
          <span class="badge" role="status">{{
            saving()
              ? "Salvando…"
              : dirty()
                ? "Resposta com alterações"
                : "Respostas salvas"
          }}</span>
        </div>
        <div class="exam-layout">
          <section class="study-shell exam-question">
            <div class="study-progress">
              <span class="eyebrow"
                >QUESTÃO {{ index() + 1 }} DE {{ e.total }}</span
              ><strong>{{ answered() }} respondidas</strong>
            </div>
            <div class="progress-track">
              <span [style.width.%]="(answered() / e.total) * 100"></span>
            </div>
            @if (question(); as q) {
              <div class="exercise-meta">
                <span class="badge">{{
                  q.type === "multi_gap"
                    ? "Múltiplas lacunas"
                    : q.type === "order"
                      ? "Construção de frases"
                      : q.type === "transform"
                        ? "Transformação de frases"
                        : "Análise de contexto"
                }}</span><span class="small muted">{{
                  q.topic || "Desafio de aplicação"
                }}</span>
              </div>
              <p class="exercise-instruction">{{ q.instruction }}</p>
              @if (q.passage) {
                <div class="reading-passage" lang="en">{{ q.passage }}</div>
              }
              @if (q.type !== "multi_gap") {
                <h2>{{ q.prompt }}</h2>
              }
              <app-answer-input
                [exercise]="q"
                [value]="answers()[q.id] ?? ''"
                (valueChange)="change($event)"
                [disabled]="submitting() || leaving()"
              />
              <div class="exercise-actions">
                <button
                  class="button secondary"
                  [disabled]="index() === 0 || busy()"
                  (click)="go(index() - 1)"
                >
                  ← Anterior
                </button>
                @if (index() + 1 < e.total) {
                  <button
                    class="button primary"
                    [disabled]="busy()"
                    (click)="go(index() + 1)"
                  >
                    Próxima <app-icon name="arrow" />
                  </button>
                } @else {
                  <button
                    class="button primary"
                    [disabled]="busy() || answered() !== e.total"
                    (click)="submit()"
                  >
                    Finalizar prova <app-icon name="check" />
                  </button>
                }
              </div>
            }
          </section>
          <aside class="panel exam-map">
            <h2>Sua prova</h2>
            <p class="small muted">
              Você pode voltar às questões e alterar as respostas antes de
              finalizar.
            </p>
            <div class="exam-numbers">
              @for (q of e.questions; track q.id; let i = $index) {
                <button
                  [class.current]="index() === i"
                  [class.answered]="complete(q)"
                  [attr.aria-label]="'Ir à questão ' + (i + 1)"
                  [disabled]="busy()"
                  (click)="go(i)"
                >
                  {{ i + 1 }}
                </button>
              }
            </div>
            <p class="small muted">
              {{ answered() }} de {{ e.total }} questões completas
            </p>
            <button
              class="button primary full"
              [disabled]="busy() || answered() !== e.total"
              (click)="submit()"
            >
              {{
                submitting() ? "Corrigindo…" : "Finalizar e ver resultado"
              }}</button><small class="muted"
              >As explicações aparecem depois da entrega. Cada lacuna vale um
              ponto.</small
            >
          </aside>
        </div>
      } @else if (e.grading; as g) {
        <section class="panel exam-result">
          <span class="complete-icon"
            ><app-icon [name]="g.passed ? 'flag' : 'target'" /></span
          ><span class="eyebrow">RESULTADO DA PROVA</span>
          <h1>
            {{
              g.passed
                ? "Você demonstrou domínio deste conteúdo."
                : "Mais prática vai fortalecer sua base."
            }}
          </h1>
          <div class="exam-score">{{ g.score }}<small>%</small></div>
          <p>
            {{ g.earnedPoints }} de {{ g.totalPoints }} pontos ·
            {{ g.correctQuestions }} de {{ g.totalQuestions }} questões
            totalmente corretas
          </p>
          <span class="badge" [class.muted-badge]="!g.passed">{{
            g.passed ? "Aprovado" : "Aprovação a partir de " + g.threshold + "%"
          }}</span>
          <div class="result-actions">
            <button
              class="button secondary"
              [disabled]="busy()"
              (click)="retry()"
            >
              Fazer outra prova <app-icon name="review" />
            </button>
            @if (g.passed && e.nextLessonId) {
              <a
                class="button primary"
                [routerLink]="['/licao', e.nextLessonId]"
                >Próxima lição liberada <app-icon name="arrow"
              /></a>
            } @else {
              <a class="button primary" [routerLink]="['/licao', e.lessonId]"
                >Voltar à lição <app-icon name="book"
              /></a>
            }
          </div>
          <small class="muted"
            >Você pode fazer quantas provas quiser. Os resultados ficam salvos
            no histórico desta lição.</small
          >
        </section>
        <section>
          <div class="section-top"><h2>Aprenda com cada resposta</h2></div>
          @for (result of g.results; track result.exerciseId; let i = $index) {
            <article class="panel exam-correction">
              <div class="section-top">
                <span
                  class="badge"
                  [class.muted-badge]="result.result !== 'correct'"
                  >Questão {{ i + 1 }} · {{ result.earnedPoints }} /
                  {{ result.totalPoints }} pontos</span
                ><span class="small muted">{{
                  result.result === "correct" ? "Correta" : "Para reforçar"
                }}</span>
              </div>
              <h3>{{ clean(result.prompt) }}</h3>
              @if (result.fields) {
                @for (field of result.fields; track field.id) {
                  <p>
                    {{ field.result === "correct" ? "✓" : "×" }}
                    <strong>{{ field.label }}:</strong> {{ field.answer }} ·
                    Referência: {{ field.reference }}
                  </p>
                }
              } @else {
                <p><strong>Sua resposta:</strong> {{ result.answer }}</p>
              }
              <p>
                <strong>Resposta de referência:</strong> {{ result.reference }}
              </p>
              <p class="notice">{{ result.explanation }}</p>
            </article>
          }
        </section>
      }
    } @else if (!error()) {
      <div class="loading-state">Preparando sua prova…</div>
    }
  `,
  styles: [
    `
      .exam-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 240px;
        gap: 22px;
        align-items: start;
      }
      .exam-question {
        width: 100%;
        max-width: none;
        margin: 0;
      }
      .exam-question h2 {
        font-size: 20px;
        line-height: 1.7;
        margin-bottom: 25px;
      }
      .exam-map {
        position: sticky;
        top: 24px;
      }
      .exam-numbers {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 9px;
        margin: 21px 0;
      }
      .exam-numbers button {
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 10px 4px;
        background: #fff;
        color: var(--text);
        font-size: 12px;
      }
      .exam-numbers button.answered {
        background: #edf4e6;
        color: var(--green);
        border-color: #bdd0ae;
      }
      .exam-numbers button.current {
        background: var(--green);
        border-color: var(--green);
        color: #fff;
      }
      .exam-map > small {
        display: block;
        margin-top: 15px;
        font-size: 10px;
        line-height: 1.8;
      }
      .exam-result {
        text-align: center;
        padding: 40px;
      }
      .exam-result h1 {
        font-size: 28px;
        max-width: 590px;
        margin: 20px auto;
      }
      .exam-score {
        font-family: Manrope, sans-serif;
        font-size: 64px;
        font-weight: 700;
        color: var(--green);
        letter-spacing: -3px;
        margin: 23px 0 9px;
      }
      .exam-score small {
        font-size: 28px;
      }
      .exam-result > p {
        font-size: 12px;
      }
      .result-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 14px;
        margin: 27px 0;
      }
      .exam-correction h3 {
        font-size: 14px;
        line-height: 1.9;
      }
      .exam-correction p {
        font-size: 12px;
      }
      .exam-correction .notice {
        display: block;
      }
      @media (max-width: 1100px) {
        .exam-layout {
          grid-template-columns: 1fr;
        }
        .exam-map {
          position: static;
        }
        .exam-numbers {
          grid-template-columns: repeat(6, 1fr);
        }
      }
      @media (max-width: 700px) {
        .exam-result {
          padding: 28px 20px;
        }
        .exam-result h1 {
          font-size: 23px;
        }
        .exam-score {
          font-size: 53px;
        }
        .result-actions > .button {
          width: 100%;
        }
        .exam-numbers {
          grid-template-columns: repeat(4, 1fr);
        }
        .exam-question h2 {
          font-size: 17px;
        }
      }
    `,
  ],
})
export class ExamPage implements OnDestroy {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  exam = signal<Exam | null>(null);
  answers = signal<Record<string, string>>({});
  saved = signal<Record<string, string>>({});
  index = signal(0);
  error = signal("");
  saving = signal(false);
  submitting = signal(false);
  leaving = signal(false);
  busy = computed(() => this.saving() || this.submitting() || this.leaving());
  question = computed(() => this.exam()?.questions[this.index()]);
  answered = computed(
    () =>
      this.exam()?.questions.filter((q) =>
        answerIsComplete(q, this.answers()[q.id] ?? ""),
      ).length ?? 0,
  );
  dirty = computed(
    () =>
      this.question() &&
      (this.answers()[this.question()!.id] ?? "") !==
        (this.saved()[this.question()!.id] ?? ""),
  );
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }
  async load() {
    const requestedId = this.route.snapshot.paramMap.get("id");
    try {
      const exam = await this.api.get<Exam>(
        "/exams/" + this.route.snapshot.paramMap.get("id"),
      );
      if (this.route.snapshot.paramMap.get("id") !== requestedId) return;
      this.exam.set(exam);
      this.answers.set({ ...exam.answers });
      this.saved.set({ ...exam.answers });
      this.index.set(
        Math.max(
          0,
          exam.questions.findIndex(
            (q) => !answerIsComplete(q, exam.answers[q.id] ?? ""),
          ),
        ),
      );
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  complete(q: Exercise) {
    return answerIsComplete(q, this.answers()[q.id] ?? "");
  }
  change(value: string) {
    const q = this.question();
    if (!q) return;
    this.answers.update((a) => ({ ...a, [q.id]: value }));
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.save().catch((e) => this.error.set(this.api.message(e))),
      600,
    );
  }
  private save() {
    clearTimeout(this.timer);
    const q = this.question();
    if (!q || this.exam()?.status !== "active" || !this.dirty())
      return this.queue;
    const value = this.answers()[q.id] ?? "";
    this.saving.set(true);
    const task = this.queue
      .catch(() => {})
      .then(async () => {
        await this.api.post("/exams/" + this.exam()!.id + "/answers", {
          exerciseId: q.id,
          answer: value,
        });
        this.saved.update((a) => ({ ...a, [q.id]: value }));
      });
    this.queue = task;
    return task.finally(() => {
      if (this.queue === task) this.saving.set(false);
    });
  }
  async persistBeforeExit() {
    this.leaving.set(true);
    try {
      await this.save();
      return true;
    } catch (e) {
      this.error.set(this.api.message(e));
      return false;
    } finally {
      this.leaving.set(false);
    }
  }
  async go(index: number) {
    if (this.busy()) return;
    this.error.set("");
    try {
      await this.save();
      this.index.set(index);
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  async leave() {
    if (this.busy()) return;
    try {
      await this.save();
      await this.router.navigate(["/licao", this.exam()!.lessonId]);
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  saveBeforeLeaving(event: Event) {
    if (this.exam()?.status === "active") {
      event.preventDefault();
      this.leave();
    }
  }
  async submit() {
    if (this.busy() || this.answered() !== this.exam()?.total) return;
    this.submitting.set(true);
    this.error.set("");
    try {
      await this.save();
      this.exam.set(
        await this.api.post<Exam>("/exams/" + this.exam()!.id + "/submit", {}),
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.submitting.set(false);
    }
  }
  async retry() {
    this.submitting.set(true);
    try {
      const exam = await this.api.post<Exam>("/exams", {
        lessonId: this.exam()!.lessonId,
      });
      await this.router.navigate(["/prova", exam.id]);
      this.index.set(0);
      this.answers.set({});
      this.saved.set({});
      this.exam.set(exam);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.submitting.set(false);
    }
  }
  clean(value: string) {
    return value.replace(/\[\[\w+\]\]/g, "___");
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
