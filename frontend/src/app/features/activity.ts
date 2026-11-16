import { Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Api } from "../core/api";
@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <a routerLink="/curso" class="back-link">← Meu percurso</a>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (data(); as a) {
      <div class="page-heading">
        <div>
          <span class="eyebrow"
            >ETAPA {{ ("0" + a.stage_id).slice(-2) }} ·
            {{
              a.kind === "writing" ? "PRODUÇÃO ESCRITA" : "CONTEÚDO DE APOIO"
            }}</span
          >
          <h1>{{ a.title }}<span class="green">.</span></h1>
          <p>{{ a.content.objective }}</p>
        </div>
      </div>
      <section class="panel">
        <h2>{{ a.kind === "writing" ? "Sua tarefa" : "Entenda e aplique" }}</h2>
        <p class="theory-text">{{ a.content.explanation }}</p>
        @for (example of a.content.examples; track example) {
          <p class="activity-example" lang="en">{{ example }}</p>
        }
        <p class="task-prompt">{{ a.content.prompt }}</p>
        @if (!a.isUnlocked) {
          <p class="notice">
            {{
              a.available
                ? "Conclua as lições anteriores para liberar esta prática. Você já pode conhecer a proposta."
                : "Esta atividade faz parte de uma etapa futura."
            }}
          </p>
        }
        @if (a.isUnlocked) {
          @if (a.kind === "writing") {
            <p class="small muted">
              Sugestão: {{ a.content.suggestedWords[0] }}–{{
                a.content.suggestedWords[1]
              }}
              palavras. Seu texto tem {{ words() }} palavras.
            </p>
            <label class="field-label" for="free-writing"
              >Meu texto em inglês</label
            >
            <textarea
              id="free-writing"
              lang="en"
              rows="10"
              maxlength="5000"
              [disabled]="busy()"
              [ngModel]="response()"
              (ngModelChange)="changeText($event)"
              placeholder="Escreva com suas próprias palavras…"
            ></textarea>
            <h3>Minha autorrevisão</h3>
            <p class="small muted">
              Marque o que você já conseguiu fazer. Critérios desmarcados ajudam
              a planejar a reescrita.
            </p>
            @for (item of a.content.checklist; track $index) {
              <label class="review-check"
                ><input
                  type="checkbox"
                  [disabled]="busy()"
                  [ngModel]="checks()[$index]"
                  (ngModelChange)="check($index, $event)"
                />{{ item }}</label
              >
            }
          } @else {
            @for (q of a.content.questions; track q.id) {
              <div class="support-question">
                <label [for]="q.id">{{ q.prompt }}</label
                ><input
                  [id]="q.id"
                  lang="en"
                  maxlength="200"
                  [disabled]="busy()"
                  [ngModel]="answers()[q.id] ?? ''"
                  (ngModelChange)="answer(q.id, $event)"
                  autocomplete="off"
                />
              </div>
            }
          }
          <div class="activity-actions">
            <button
              class="button secondary"
              (click)="save()"
              [disabled]="busy() || !dirty()"
            >
              Salvar rascunho</button
            ><button
              class="button primary"
              (click)="submit()"
              [disabled]="busy() || !complete()"
            >
              {{
                a.kind === "writing"
                  ? "Entregar esta versão"
                  : "Conferir respostas"
              }}
            </button>
          </div>
          <p class="small muted" role="status">
            {{
              message() ||
                (dirty()
                  ? "Há alterações ainda não salvas."
                  : "Seu rascunho está salvo.")
            }}
          </p>
        }
      </section>
      @if (a.submissions.length) {
        <section class="panel">
          <h2>
            {{
              a.kind === "writing"
                ? "Minhas versões e revisões"
                : "Minhas tentativas"
            }}
          </h2>
          @for (s of a.submissions; track s.id) {
            <article class="submission">
              <div class="section-top">
                <strong>{{ s.created_at | date: "dd/MM/yyyy · HH:mm" }}</strong
                ><span class="badge">{{
                  a.kind === "support"
                    ? "Corrigida"
                    : s.status === "reviewed"
                      ? "Feedback disponível"
                      : "Versão entregue"
                }}</span>
              </div>
              @if (a.kind === "writing") {
                <p class="saved-response" lang="en">{{ s.response }}</p>
                <details>
                  <summary>Minha autorrevisão desta versão</summary>
                  <ul>
                    @for (item of a.content.checklist; track $index) {
                      <li>
                        {{ s.self_review[$index] ? "✓" : "○" }} {{ item }}
                      </li>
                    }
                  </ul>
                </details>
                @if (s.feedback) {
                  <div class="writing-feedback">
                    <h3>Devolutiva para reescrever</h3>
                    <p>{{ s.feedback.feedbackPtBr }}</p>
                    <h4>O que funcionou</h4>
                    <ul>
                      @for (item of s.feedback.strengthsPtBr; track item) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                    <h4>Próximos ajustes</h4>
                    <ul>
                      @for (item of s.feedback.nextStepsPtBr; track item) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                    <details>
                      <summary>Comparar com uma revisão sugerida</summary>
                      <p class="saved-response" lang="en">
                        {{ s.feedback.revisedTextEn }}
                      </p>
                    </details>
                    <small
                      >Feedback formativo de IA. Revise as sugestões; ele não
                      atribui nota nem aprovação.</small
                    >
                  </div>
                } @else if (aiEnabled()) {
                  <button
                    class="button secondary"
                    (click)="review(s.id)"
                    [disabled]="busy()"
                  >
                    Pedir feedback de IA
                  </button>
                } @else {
                  <p class="small muted">
                    A IA está desativada. Seu texto e sua autorrevisão estão
                    salvos para você continuar a reescrita.
                  </p>
                }
                <button
                  class="text-button"
                  (click)="rewrite(s)"
                  [disabled]="busy()"
                >
                  Reescrever a partir desta versão
                </button>
              } @else {
                <p>
                  {{ s.feedback.correct }} de {{ s.feedback.total }} respostas
                  corretas.
                </p>
                @for (f of s.feedback.fields; track f.id) {
                  <div class="field-feedback">
                    <strong
                      >{{ f.correct ? "✓ Correta" : "Revisar" }} ·
                      {{ f.prompt }}</strong
                    >
                    <p>
                      Sua resposta: {{ f.answer }} · Referência:
                      {{ f.reference }}
                    </p>
                    <p>{{ f.explanation }}</p>
                  </div>
                }
              }
            </article>
          }
        </section>
      }
    } @else if (!error()) {
      <p class="loading-state">Abrindo atividade…</p>
    }
  `,
  styles: [
    `
      .task-prompt {
        font-size: 16px;
        line-height: 1.8;
        padding: 18px;
        background: #f3f6ee;
        border-radius: 8px;
      }
      .activity-example {
        padding: 12px 16px;
        border-left: 3px solid var(--green);
        background: #f8faf5;
      }
      textarea {
        width: 100%;
        resize: vertical;
        line-height: 1.8;
      }
      .review-check {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: 14px;
        line-height: 1.7;
        margin: 12px 0;
      }
      .review-check input {
        width: 18px;
        flex: 0 0 18px;
        margin-top: 4px;
      }
      .activity-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }
      .support-question {
        margin: 22px 0;
      }
      .support-question label {
        display: block;
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 8px;
      }
      .submission {
        border-top: 1px solid var(--border);
        padding: 24px 0;
      }
      .saved-response {
        white-space: pre-wrap;
        line-height: 1.9;
        overflow-wrap: anywhere;
      }
      .field-feedback,
      .writing-feedback {
        padding: 18px;
        margin: 16px 0;
        background: #f6f8f1;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.8;
      }
      details {
        margin: 15px 0;
        font-size: 14px;
        line-height: 1.8;
      }
      summary {
        cursor: pointer;
        color: var(--green);
      }
    `,
  ],
})
export class ActivityPage {
  api = inject(Api);
  route = inject(ActivatedRoute);
  data = signal<any>(null);
  error = signal("");
  message = signal("");
  busy = signal(false);
  aiEnabled = signal(false);
  response = signal("");
  answers = signal<Record<string, string>>({});
  checks = signal<boolean[]>([]);
  dirty = signal(false);
  submissionId = crypto.randomUUID();
  words = computed(() =>
    this.response().trim() ? this.response().trim().split(/\s+/).length : 0,
  );
  complete = computed(() =>
    this.data()?.kind === "writing"
      ? this.response().trim().length >= 5
      : this.data()?.content.questions.every((q: any) =>
          this.answers()[q.id]?.trim(),
        ),
  );
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => {
      this.data.set(null);
      this.error.set("");
      this.load();
    });
    this.api
      .get("/config")
      .then((c: any) => this.aiEnabled.set(c.aiEnabled))
      .catch(() => {});
  }
  async load() {
    try {
      const a: any = await this.api.get(
        "/activities/" + this.route.snapshot.paramMap.get("id"),
      );
      this.data.set(a);
      this.response.set(a.kind === "writing" ? (a.draft?.response ?? "") : "");
      let values = {};
      if (a.kind === "support" && a.draft?.response) {
        try {
          values = JSON.parse(a.draft.response);
        } catch {}
      }
      this.answers.set(values);
      this.checks.set(a.content.checklist.map(() => false));
      this.dirty.set(false);
      this.message.set(a.draft ? "Rascunho recuperado." : "");
      this.submissionId = crypto.randomUUID();
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  edited() {
    this.dirty.set(true);
    this.message.set("");
    this.submissionId = crypto.randomUUID();
  }
  changeText(value: string) {
    this.response.set(value);
    this.edited();
  }
  answer(id: string, value: string) {
    this.answers.update((a) => ({ ...a, [id]: value }));
    this.edited();
  }
  check(index: number, value: boolean) {
    this.checks.update((a) => a.map((v, i) => (i === index ? value : v)));
    this.submissionId = crypto.randomUUID();
  }
  payload() {
    return this.data().kind === "writing"
      ? this.response()
      : JSON.stringify(this.answers());
  }
  async save() {
    this.busy.set(true);
    this.error.set("");
    try {
      await this.api.post("/activities/" + this.data().id + "/draft", {
        response: this.payload(),
      });
      this.dirty.set(false);
      this.message.set("Rascunho salvo.");
      return true;
    } catch (e) {
      this.error.set(this.api.message(e));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async persistBeforeExit() {
    return !this.dirty() || (await this.save());
  }
  async submit() {
    this.busy.set(true);
    this.error.set("");
    try {
      const a = await this.api.post(
        "/activities/" + this.data().id + "/submissions",
        {
          submissionId: this.submissionId,
          response: this.payload(),
          selfReview: this.data().kind === "writing" ? this.checks() : [],
        },
      );
      this.data.set(a);
      this.dirty.set(false);
      this.message.set("Versão salva no histórico.");
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async review(id: string) {
    this.busy.set(true);
    this.error.set("");
    try {
      this.data.set(
        await this.api.post(
          "/activities/" + this.data().id + "/submissions/" + id + "/review",
          {},
        ),
      );
      this.message.set(
        "Feedback recebido. Compare e reescreva com suas palavras.",
      );
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  rewrite(s: any) {
    this.response.set(s.response);
    this.checks.set(s.self_review);
    this.edited();
    this.message.set(
      "Versão carregada no campo de escrita. Revise e entregue uma nova versão.",
    );
  }
}
