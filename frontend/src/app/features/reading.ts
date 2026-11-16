import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { Api } from "../core/api";
import { Icon } from "../shared/icon";

interface ReadingFeedback {
  understanding: "complete" | "partial" | "limited";
  feedbackPtBr: string;
  understoodCorrectlyPtBr: string[];
  missingIdeasPtBr: string[];
  misunderstoodIdeasPtBr: string[];
  referenceSummaryPtBr: string;
}
interface ReadingAttempt {
  id: string;
  interpretation: string;
  status: string;
  feedback: ReadingFeedback | null;
  error_message: string | null;
  created_at: string;
}
interface ReadingSummary {
  id: string;
  title: string;
  theme: string;
  level: string;
  word_count: number;
  created_at: string;
  latest_status: string | null;
}
interface Passage extends ReadingSummary {
  content: string;
  draft_interpretation: string | null;
  attempts: ReadingAttempt[];
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, Icon],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">LEIA, DESCUBRA, ENTENDA</span>
        <h1>Uma nova história para ler<span class="green">.</span></h1>
        <p>
          Textos em inglês, temas surpresa e um espaço para contar o que você
          entendeu.
        </p>
      </div>
      <button
        class="button primary"
        [disabled]="busy() || loading() || !aiEnabled()"
        (click)="generate()"
      >
        <app-icon name="spark" />{{
          generating() ? "Criando seu texto…" : "Gerar texto aleatório"
        }}
      </button>
    </div>
    @if (error()) {
      <div class="error" role="alert">{{ error() }}</div>
    }
    @if (!loading() && !aiEnabled()) {
      <p class="notice">
        <app-icon name="info" />Ative a IA para gerar novos textos e avaliar sua
        interpretação. Você pode continuar lendo os textos já salvos.
      </p>
    }
    @if (loading()) {
      <div class="loading-state">Abrindo seu espaço de leitura…</div>
    } @else {
      <div class="reading-workspace">
        <div class="reading-main">
          @if (passage(); as p) {
            <article class="panel free-reading">
              <div class="section-top">
                <span class="badge"
                  >{{ p.level }} · {{ p.word_count }} palavras</span
                ><span class="small muted">Prática independente do curso</span>
              </div>
              <span class="eyebrow">{{ p.theme }}</span>
              <h2 lang="en">{{ p.title }}</h2>
              <div class="passage-content" lang="en">{{ p.content }}</div>
              <p class="reading-hint">
                <app-icon name="leaf" />Leia no seu ritmo. Tente reconhecer
                palavras e conectar as ideias antes de continuar.
              </p>
            </article>
            <section class="panel interpretation-panel">
              <span class="eyebrow">COM SUAS PRÓPRIAS PALAVRAS</span>
              <h2>O que você entendeu do texto?</h2>
              <p>
                Conte a ideia principal e os detalhes que conseguiu identificar.
                Pode escrever em português ou inglês.
              </p>
              <label class="field-label" for="interpretation"
                >Minha interpretação</label
              ><textarea
                id="interpretation"
                name="interpretation"
                [ngModel]="interpretation()"
                (ngModelChange)="interpretation.set($event)"
                maxlength="5000"
                rows="7"
                [disabled]="busy()"
                placeholder="Eu entendi que…"
              ></textarea>
              <div class="draft-status">
                <span role="status">{{ draftState() }}</span
                ><span>{{ interpretation().length }} / 5000</span>
              </div>
              <div class="interpretation-actions">
                <button
                  class="button secondary"
                  [disabled]="busy() || !dirty()"
                  (click)="saveDraft()"
                >
                  {{ saving() ? "Salvando…" : "Salvar rascunho" }}</button
                ><button
                  class="button primary"
                  [disabled]="
                    busy() ||
                    interpretation().trim().length < 5 ||
                    !aiEnabled() ||
                    alreadyEvaluated()
                  "
                  (click)="evaluate()"
                >
                  <app-icon name="spark" />{{
                    evaluating()
                      ? "Analisando sua interpretação…"
                      : retryable()
                        ? "Tentar correção novamente"
                        : "Avaliar minha interpretação"
                  }}
                </button>
              </div>
              <small class="muted"
                >A avaliação considera o que você compreendeu. Sua escrita em
                português ou inglês não recebe uma nota de gramática nesta
                atividade.</small
              >
            </section>
            @if (feedback(); as f) {
              <section class="panel reading-feedback" aria-live="polite">
                <div class="section-top">
                  <div>
                    <span class="eyebrow">SUA ÚLTIMA AVALIAÇÃO</span>
                    <h2>{{ feedbackTitles[f.understanding] }}</h2>
                  </div>
                  <span class="stat-icon"><app-icon name="check" /></span>
                </div>
                <p>{{ f.feedbackPtBr }}</p>
                @if (f.understoodCorrectlyPtBr.length) {
                  <div class="feedback-section">
                    <h3>O que você entendeu bem</h3>
                    <ul>
                      @for (item of f.understoodCorrectlyPtBr; track $index) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                  </div>
                }
                @if (f.misunderstoodIdeasPtBr.length) {
                  <div class="feedback-section attention">
                    <h3>Vamos ajustar estas ideias</h3>
                    <ul>
                      @for (item of f.misunderstoodIdeasPtBr; track $index) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                  </div>
                }
                @if (f.missingIdeasPtBr.length) {
                  <div class="feedback-section">
                    <h3>Detalhes que vale observar</h3>
                    <ul>
                      @for (item of f.missingIdeasPtBr; track $index) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                  </div>
                }
                <div class="reference-summary">
                  <h3>Um resumo para comparar</h3>
                  <p>{{ f.referenceSummaryPtBr }}</p>
                </div>
              </section>
            }
            @if (p.attempts.length) {
              <section class="panel">
                <h2>Suas interpretações deste texto</h2>
                @for (a of p.attempts; track a.id) {
                  <details class="reading-attempt">
                    <summary>
                      <span>{{
                        a.status === "evaluated"
                          ? "Avaliada"
                          : a.status === "failed"
                            ? "Salva · correção pendente"
                            : "Avaliação pendente"
                      }}</span
                      ><time>{{
                        a.created_at | date: "dd/MM/yyyy · HH:mm"
                      }}</time>
                    </summary>
                    <p class="saved-interpretation">{{ a.interpretation }}</p>
                    @if (a.feedback) {
                      <p>{{ a.feedback.feedbackPtBr }}</p>
                      <p>
                        <strong>Resumo de referência:</strong>
                        {{ a.feedback.referenceSummaryPtBr }}
                      </p>
                    }
                    @if (a.error_message) {
                      <p class="small muted">{{ a.error_message }}</p>
                    }
                  </details>
                }
              </section>
            }
          } @else {
            <section class="panel empty-reading">
              <span class="complete-icon"><app-icon name="text" /></span
              ><span class="eyebrow">UM TEMA SURPRESA A CADA LEITURA</span>
              <h2>Uma história nova espera por você.</h2>
              <p>
                Clique em “Gerar texto aleatório” para receber um texto curto em
                inglês. Depois, escreva o que entendeu e receba comentários da
                IA.
              </p>
              <div class="reading-steps">
                <span>01 · Leia em inglês</span
                ><span>02 · Conte o que entendeu</span
                ><span>03 · Compare com o feedback</span>
              </div>
            </section>
          }
        </div>
        <aside class="panel reading-history">
          <div class="section-top">
            <h2>Minhas leituras</h2>
            <span class="badge">{{ items().length }}</span>
          </div>
          <p class="small muted">
            Os textos e suas interpretações ficam salvos para você voltar quando
            quiser.
          </p>
          @for (item of items(); track item.id) {
            <button
              class="reading-history-item"
              [class.selected]="passage()?.id === item.id"
              [attr.aria-pressed]="passage()?.id === item.id"
              [disabled]="busy()"
              (click)="open(item.id)"
            >
              <span class="small"
                >{{ item.created_at | date: "dd/MM/yyyy" }} ·
                {{ item.word_count }} palavras</span
              ><strong lang="en">{{ item.title }}</strong
              ><small
                >{{
                  item.latest_status === "evaluated"
                    ? "Interpretação avaliada"
                    : item.latest_status === "failed"
                      ? "Interpretação salva"
                      : "Continue sua leitura"
                }}<app-icon name="chevron"
              /></small>
            </button>
          } @empty {
            <div class="empty-inline">
              <app-icon name="book" /><span
                >Sua primeira leitura vai aparecer aqui.</span
              >
            </div>
          }
        </aside>
      </div>
    }
  `,
  styles: [
    `
      .reading-workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 270px;
        gap: 23px;
        align-items: start;
      }
      .reading-main {
        min-width: 0;
      }
      .free-reading {
        padding: 34px;
      }
      .free-reading .eyebrow {
        font-size: 9px;
        margin-top: 24px;
      }
      .free-reading h2 {
        font-size: 29px;
        letter-spacing: -0.8px;
        line-height: 1.35;
        margin: 14px 0 27px;
      }
      .passage-content {
        font-size: 18px;
        line-height: 2;
        white-space: pre-line;
        color: #314e3d;
      }
      .reading-hint {
        border-top: 1px solid var(--border);
        padding-top: 20px;
        margin: 26px 0 0;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 11px;
        color: var(--muted);
      }
      .reading-hint app-icon {
        flex-shrink: 0;
        margin-top: 3px;
      }
      .interpretation-panel > p {
        font-size: 12px;
      }
      .interpretation-panel textarea {
        resize: vertical;
        line-height: 1.8;
        font-size: 14px;
        min-height: 170px;
      }
      .draft-status {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: var(--muted);
        margin: 9px 0 20px;
        gap: 10px;
      }
      .interpretation-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 19px;
      }
      .interpretation-panel > small {
        display: block;
        font-size: 10px;
        line-height: 1.8;
      }
      .reading-history {
        position: sticky;
        top: 24px;
        padding: 23px;
      }
      .reading-history-item {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px 13px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
        text-align: left;
        color: var(--text);
        margin-top: 12px;
      }
      .reading-history-item.selected {
        border-color: #91af7d;
        background: #f4f8ee;
      }
      .reading-history-item > .small {
        font-size: 9px;
        color: var(--muted);
      }
      .reading-history-item strong {
        font-size: 13px;
        line-height: 1.6;
        color: var(--ink);
      }
      .reading-history-item small {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 9px;
        color: var(--green);
      }
      .empty-reading {
        text-align: center;
        padding: 55px 32px;
      }
      .empty-reading h2 {
        font-size: 25px;
        line-height: 1.4;
      }
      .empty-reading > p {
        max-width: 440px;
        margin: 17px auto;
        font-size: 13px;
      }
      .reading-steps {
        display: flex;
        flex-direction: column;
        gap: 13px;
        border-top: 1px solid var(--border);
        margin-top: 28px;
        padding-top: 24px;
        font-size: 11px;
        color: var(--green);
      }
      .reading-feedback .eyebrow {
        font-size: 9px;
      }
      .reading-feedback h2 {
        font-size: 20px;
      }
      .reading-feedback > p {
        font-size: 13px;
      }
      .feedback-section {
        border-top: 1px solid var(--border);
        padding-top: 20px;
        margin-top: 20px;
      }
      .feedback-section h3 {
        font-size: 13px;
        color: var(--green);
      }
      .feedback-section.attention h3 {
        color: #9a643e;
      }
      .feedback-section ul {
        padding-left: 19px;
        margin-bottom: 0;
        color: var(--text);
        font-size: 13px;
        line-height: 1.9;
      }
      .feedback-section li + li {
        margin-top: 9px;
      }
      .reference-summary {
        background: #f3f6ed;
        border-radius: 8px;
        padding: 20px;
        margin-top: 25px;
      }
      .reference-summary h3 {
        font-size: 13px;
      }
      .reference-summary p {
        font-size: 13px;
        margin-bottom: 0;
      }
      .reading-attempt {
        border-top: 1px solid var(--border);
        padding: 18px 0 0;
        margin-top: 18px;
      }
      .reading-attempt summary {
        cursor: pointer;
        font-size: 11px;
        color: var(--green);
      }
      .reading-attempt time {
        font-size: 9px;
        color: var(--muted);
        margin-left: 14px;
      }
      .reading-attempt p {
        font-size: 12px;
        margin: 15px 0 0;
      }
      .saved-interpretation {
        white-space: pre-line;
        border-left: 2px solid #b7c9a6;
        padding-left: 13px;
        color: var(--ink);
      }
      @media (max-width: 1100px) {
        .reading-workspace {
          grid-template-columns: minmax(0, 1fr);
        }
        .reading-history {
          position: static;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .reading-history > .section-top,
        .reading-history > p,
        .reading-history > .empty-inline {
          grid-column: 1/-1;
        }
        .reading-history-item {
          margin: 0;
        }
        .interpretation-actions {
          flex-wrap: wrap;
        }
        .free-reading {
          padding: 29px;
        }
      }
      @media (max-width: 700px) {
        .free-reading {
          padding: 24px;
        }
        .free-reading .section-top {
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .free-reading h2 {
          font-size: 25px;
          margin-bottom: 22px;
        }
        .passage-content {
          font-size: 17px;
          line-height: 1.95;
        }
        .reading-history {
          display: block;
          padding: 22px;
        }
        .reading-history-item {
          margin-top: 12px;
        }
        .interpretation-actions > .button {
          width: 100%;
        }
        .reading-attempt time {
          display: block;
          margin: 7px 0 0 15px;
        }
        .empty-reading {
          padding: 35px 22px;
        }
        .empty-reading h2 {
          font-size: 22px;
        }
        .draft-status {
          font-size: 9px;
        }
        .reading-feedback h2 {
          font-size: 18px;
        }
      }
    `,
  ],
})
export class Reading {
  private api = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  items = signal<ReadingSummary[]>([]);
  passage = signal<Passage | null>(null);
  interpretation = signal("");
  loading = signal(true);
  generating = signal(false);
  evaluating = signal(false);
  saving = signal(false);
  opening = signal(false);
  aiEnabled = signal(false);
  error = signal("");
  busy = computed(
    () =>
      this.generating() || this.evaluating() || this.saving() || this.opening(),
  );
  dirty = computed(
    () =>
      !!this.passage() &&
      this.interpretation() !== (this.passage()?.draft_interpretation ?? ""),
  );
  draftState = computed(() =>
    this.saving()
      ? "Salvando rascunho…"
      : this.dirty()
        ? "Rascunho com alterações não salvas"
        : "Rascunho salvo",
  );
  alreadyEvaluated = computed(
    () =>
      this.passage()?.attempts.some(
        (a) =>
          a.status === "evaluated" &&
          a.interpretation === this.interpretation().trim(),
      ) ?? false,
  );
  retryable = computed(
    () =>
      this.passage()?.attempts.some(
        (a) =>
          a.status !== "evaluated" &&
          a.interpretation === this.interpretation().trim(),
      ) ?? false,
  );
  feedback = computed(
    () =>
      this.passage()?.attempts.find((a) => a.status === "evaluated")
        ?.feedback ?? null,
  );
  feedbackTitles = {
    complete: "Você captou muito bem o texto.",
    partial: "Você entendeu parte das ideias.",
    limited: "Vamos descobrir o texto juntos.",
  };
  constructor() {
    this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      const [config, items] = await Promise.all([
        this.api.get("/config"),
        this.api.get<ReadingSummary[]>("/readings"),
      ]);
      this.aiEnabled.set(config.aiEnabled);
      this.items.set(items);
      const id = this.route.snapshot.queryParamMap.get("texto") ?? items[0]?.id;
      if (id) await this.open(id);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.loading.set(false);
    }
  }
  private select(p: Passage) {
    this.passage.set(p);
    this.interpretation.set(p.draft_interpretation ?? "");
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { texto: p.id },
      replaceUrl: true,
    });
  }
  private async refreshList() {
    this.items.set(await this.api.get<ReadingSummary[]>("/readings"));
  }
  async open(id: string) {
    if (this.busy()) return;
    this.opening.set(true);
    this.error.set("");
    try {
      if (this.dirty()) await this.persistDraft();
      this.select(await this.api.get<Passage>("/readings/" + id));
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.opening.set(false);
    }
  }
  private async persistDraft() {
    if (!this.passage() || !this.dirty()) return;
    const text = this.interpretation();
    await this.api.post("/readings/" + this.passage()!.id + "/draft", {
      interpretation: text,
    });
    this.passage.update((p) => (p ? { ...p, draft_interpretation: text } : p));
  }
  async saveDraft() {
    if (this.busy()) return;
    this.saving.set(true);
    this.error.set("");
    try {
      await this.persistDraft();
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.saving.set(false);
    }
  }
  async generate() {
    if (this.busy()) return;
    this.generating.set(true);
    this.error.set("");
    try {
      await this.persistDraft();
      this.select(await this.api.post<Passage>("/readings/generate", {}));
      await this.refreshList();
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.generating.set(false);
    }
  }
  async evaluate() {
    if (this.busy() || !this.passage() || this.alreadyEvaluated()) return;
    this.evaluating.set(true);
    this.error.set("");
    const id = this.passage()!.id;
    const interpretation = this.interpretation().trim();
    const pending = this.passage()!.attempts.find(
      (a) => a.status !== "evaluated" && a.interpretation === interpretation,
    );
    try {
      await this.api.post("/readings/" + id + "/interpretations", {
        attemptId: pending?.id ?? crypto.randomUUID(),
        interpretation,
      });
      this.select(await this.api.get<Passage>("/readings/" + id));
      await this.refreshList();
    } catch (e) {
      this.error.set(this.api.message(e));
      try {
        const p = await this.api.get<Passage>("/readings/" + id);
        this.passage.set(p);
        await this.refreshList();
      } catch {
        /* Preserve the current input when the network is unavailable. */
      }
    } finally {
      this.evaluating.set(false);
    }
  }
}
