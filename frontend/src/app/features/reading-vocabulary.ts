import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Api } from "../core/api";
import { Icon } from "../shared/icon";

interface VocabularyCard {
  id: string;
  term: string;
  meaning_pt_br: string;
  context_en: string;
  review_version: number;
  next_review_at: string;
  is_due: boolean;
}
interface VocabularyList {
  total: number;
  dueCount: number;
  items: VocabularyCard[];
}
interface ReviewInput {
  reviewId: string;
  version: number;
  answer: string;
  remembered: boolean;
}

@Component({
  selector: "app-reading-vocabulary",
  standalone: true,
  imports: [FormsModule, DatePipe, Icon],
  template: `
    <section
      class="panel vocabulary-panel"
      aria-label="Vocabulário das leituras"
    >
      <span class="eyebrow">GUARDE E RELEMBRE</span>
      <h2>Meu vocabulário</h2>
      <p class="small">
        {{ total() }} expressões salvas · {{ dueCount() }} para revisar
      </p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="small green" role="status">{{ notice() }}</p>
      }
      @if (loading()) {
        <p class="small" role="status">Abrindo seu vocabulário…</p>
      } @else {
        @if (passageId()) {
          <button
            class="button secondary full"
            [disabled]="locked()"
            (click)="adding.set(!adding())"
            [attr.aria-expanded]="adding()"
          >
            <app-icon name="word" />Guardar expressão
          </button>
          @if (adding()) {
            <form (ngSubmit)="save()" class="vocabulary-form">
              <p class="small muted">
                Selecione uma expressão no texto ou digite aqui. Registre o
                significado para revisar depois.
              </p>
              <label class="field-label" for="reading-term"
                >Palavra ou expressão em inglês</label
              >
              <input
                id="reading-term"
                name="term"
                [ngModel]="term()"
                (ngModelChange)="term.set($event)"
                maxlength="120"
                [disabled]="locked()"
                required
              />
              <label class="field-label" for="reading-meaning"
                >Significado em português</label
              >
              <textarea
                id="reading-meaning"
                name="meaning"
                [ngModel]="meaning()"
                (ngModelChange)="meaning.set($event)"
                maxlength="500"
                rows="3"
                [disabled]="locked()"
                required
              ></textarea>
              <button
                class="button primary full"
                [disabled]="
                  locked() || !term().trim() || meaning().trim().length < 2
                "
              >
                {{ saving() ? "Salvando…" : "Salvar no vocabulário" }}
              </button>
            </form>
          }
        }
        @if (!reviewing()) {
          <button
            class="button primary full review-button"
            [disabled]="locked() || !dueCount()"
            (click)="startReview()"
          >
            <app-icon name="review" />Revisar vocabulário
          </button>
          <p class="small muted">
            Tente lembrar antes de revelar. As revisões voltam em 1, 3, 7, 14 e
            30 dias conforme você lembra.
          </p>
        }
        @if (reviewing()) {
          @if (current(); as card) {
            <div class="review-card">
              <span class="eyebrow">O QUE SIGNIFICA?</span>
              <h3 lang="en">{{ card.term }}</h3>
              <blockquote lang="en">{{ card.context_en }}</blockquote>
              <label class="field-label" for="vocabulary-recall"
                >O que você lembra?</label
              >
              <textarea
                id="vocabulary-recall"
                name="recall"
                [ngModel]="guess()"
                (ngModelChange)="guess.set($event)"
                maxlength="1000"
                rows="3"
                [disabled]="revealed() || locked()"
                placeholder="Escreva o significado ou diga que não lembra."
              ></textarea>
              @if (!revealed()) {
                <button
                  class="button secondary full"
                  [disabled]="locked() || !guess().trim()"
                  (click)="revealed.set(true)"
                >
                  Revelar significado
                </button>
              } @else {
                <div class="meaning">
                  <strong>Significado</strong>
                  <p>{{ card.meaning_pt_br }}</p>
                </div>
                <p class="small muted">
                  Compare com sua resposta e indique como foi lembrar.
                </p>
                <div class="review-actions">
                  <button
                    class="button secondary"
                    [disabled]="locked()"
                    (click)="review(false)"
                  >
                    Preciso revisar
                  </button>
                  <button
                    class="button primary"
                    [disabled]="locked()"
                    (click)="review(true)"
                  >
                    Lembrei
                  </button>
                </div>
              }
              @if (pending()) {
                <button
                  class="button primary full"
                  [disabled]="saving() || disabled()"
                  (click)="retryReview()"
                >
                  Tentar salvar revisão
                </button>
              }
            </div>
          }
          <button
            class="button secondary full"
            [disabled]="locked()"
            (click)="reviewing.set(false)"
          >
            Voltar ao vocabulário
          </button>
        }
        @if (items().length && !reviewing()) {
          <details class="saved-words">
            <summary>Consultar expressões salvas</summary>
            @for (card of items(); track card.id) {
              <div class="saved-word">
                <strong lang="en">{{ card.term }}</strong>
                <p>{{ card.meaning_pt_br }}</p>
                <small class="muted">{{
                  card.is_due
                    ? "Revisão disponível"
                    : "Revisar em " + (card.next_review_at | date: "dd/MM/yyyy")
                }}</small>
              </div>
            }
          </details>
        }
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .vocabulary-panel {
        padding: 23px;
        margin-bottom: 0;
      }
      .full {
        width: 100%;
        justify-content: center;
        white-space: normal;
      }
      .vocabulary-form,
      .review-card {
        margin: 18px 0;
      }
      input,
      textarea {
        width: 100%;
        min-width: 0;
        margin-bottom: 14px;
      }
      textarea {
        resize: vertical;
      }
      .review-button {
        margin: 14px 0 10px;
      }
      .eyebrow {
        font-size: 9px;
      }
      h3,
      blockquote,
      .saved-word {
        overflow-wrap: anywhere;
      }
      blockquote {
        margin: 12px 0 18px;
        border-left: 2px solid #b7c9a6;
        padding-left: 12px;
        font-size: 13px;
        line-height: 1.8;
        color: var(--text);
      }
      .meaning {
        padding: 14px;
        background: var(--pale);
        border-radius: 8px;
        margin: 14px 0;
      }
      .meaning p {
        margin: 6px 0 0;
        font-size: 13px;
      }
      .review-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .review-actions button {
        flex: 1;
        white-space: normal;
      }
      .saved-words {
        margin-top: 18px;
        font-size: 12px;
      }
      summary {
        cursor: pointer;
        color: var(--green);
      }
      .saved-word {
        border-top: 1px solid var(--border);
        padding: 14px 0;
      }
      .saved-word p {
        font-size: 12px;
        margin: 5px 0;
      }
      .saved-words {
        max-height: 420px;
        overflow-y: auto;
      }
    `,
  ],
})
export class ReadingVocabulary {
  private api = inject(Api);
  passageId = input<string | null>(null);
  suggestedTerm = input("");
  disabled = input(false);
  changed = output<void>();
  items = signal<VocabularyCard[]>([]);
  total = signal(0);
  dueCount = signal(0);
  loading = signal(true);
  saving = signal(false);
  adding = signal(false);
  reviewing = signal(false);
  revealed = signal(false);
  term = signal("");
  meaning = signal("");
  guess = signal("");
  error = signal("");
  notice = signal("");
  pending = signal<{ id: string; body: ReviewInput } | null>(null);
  current = computed(() => this.items().find((c) => c.is_due));
  locked = computed(() => this.disabled() || this.saving() || !!this.pending());
  constructor() {
    effect(() => {
      this.passageId();
      const term = this.suggestedTerm();
      this.term.set(term);
      this.meaning.set("");
      this.adding.set(!!term);
    });
    this.load();
  }
  private apply(data: VocabularyList) {
    this.items.set(data.items);
    this.total.set(data.total);
    this.dueCount.set(data.dueCount);
  }
  async load() {
    try {
      this.apply(await this.api.get<VocabularyList>("/readings/vocabulary"));
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.loading.set(false);
    }
  }
  async save() {
    if (this.locked() || !this.passageId()) return;
    this.saving.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      this.apply(
        await this.api.post<VocabularyList>("/readings/vocabulary", {
          passageId: this.passageId(),
          term: this.term().trim(),
          meaningPtBr: this.meaning().trim(),
        }),
      );
      this.term.set("");
      this.meaning.set("");
      this.adding.set(false);
      this.notice.set(
        "Expressão salva. Sua primeira revisão já está disponível.",
      );
      this.changed.emit();
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.saving.set(false);
    }
  }
  startReview() {
    this.reviewing.set(true);
    this.adding.set(false);
    this.guess.set("");
    this.revealed.set(false);
    this.notice.set("");
  }
  async review(remembered: boolean) {
    const card = this.current();
    if (!card || this.locked() || !this.revealed() || !this.guess().trim())
      return;
    this.pending.set({
      id: card.id,
      body: {
        reviewId: crypto.randomUUID(),
        version: card.review_version,
        answer: this.guess().trim(),
        remembered,
      },
    });
    await this.retryReview();
  }
  async retryReview() {
    const pending = this.pending();
    if (!pending || this.saving() || this.disabled()) return;
    this.saving.set(true);
    this.error.set("");
    try {
      this.apply(
        await this.api.post<VocabularyList>(
          `/readings/vocabulary/${pending.id}/reviews`,
          pending.body,
        ),
      );
      this.pending.set(null);
      this.guess.set("");
      this.revealed.set(false);
      if (!this.dueCount()) {
        this.reviewing.set(false);
        this.notice.set(
          "Revisões em dia! Volte amanhã para continuar praticando.",
        );
      }
      this.changed.emit();
    } catch (e) {
      this.error.set(this.api.message(e));
      if (e instanceof HttpErrorResponse && e.status === 409) {
        this.pending.set(null);
        this.guess.set("");
        this.revealed.set(false);
        await this.load();
        if (!this.dueCount()) this.reviewing.set(false);
      }
    } finally {
      this.saving.set(false);
    }
  }
}
