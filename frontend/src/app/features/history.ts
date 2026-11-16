import { Component, inject, signal } from "@angular/core";
import { DatePipe } from "@angular/common";
import { Api } from "../core/api";
import { Icon } from "../shared/icon";
@Component({
  standalone: true,
  imports: [DatePipe, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">CADA TENTATIVA CONTA</span>
        <h1>Seu histórico de prática<span class="green">.</span></h1>
        <p>Acertos para celebrar. Erros para aprender. Tudo fica registrado.</p>
      </div>
    </div>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <div class="loading-state">Buscando seu histórico…</div>
    } @else if (items().length) {
      <div class="history-list">
        @for (a of items(); track a.id) {
          <article class="panel history-item">
            <div class="section-top">
              <span
                class="badge"
                [class.error-badge]="a.result === 'incorrect'"
                [class.muted-badge]="a.result === 'needs_review'"
                >{{
                  a.result === "correct"
                    ? "Acerto"
                    : a.result === "incorrect"
                      ? "Erro"
                      : "Precisa de revisão"
                }}</span><time>{{
                a.created_at | date: "dd/MM/yyyy · HH:mm"
              }}</time>
            </div>
            <span class="eyebrow"
              >{{ a.lesson_title }} · {{ a.skill_title }}</span
            >
            <p class="small muted">
              {{
                a.session_mode === "reading"
                  ? "Leitura anterior · prática extra"
                  : a.session_mode === "review"
                    ? "Revisão · reforço de habilidades"
                    : "Prática pelo percurso da lição"
              }}
            </p>
            <h3>{{ a.prompt }}</h3>
            <p><strong>Sua resposta:</strong> {{ a.answer }}</p>
            <p class="muted">
              <strong>Referência:</strong> {{ a.feedback.reference }}
            </p>
            <details>
              <summary>Rever a explicação</summary>
              <p>{{ a.feedback.explanation }}</p>
              @if (a.feedback.message) {
                <p>{{ a.feedback.message }}</p>
              }
            </details>
          </article>
        }
      </div>
    } @else if (!error()) {
      <section class="panel empty-state">
        <app-icon name="history" />
        <h2>Sua história começa na prática.</h2>
        <p>Depois do primeiro exercício, suas tentativas aparecerão aqui.</p>
      </section>
    }
    <div class="pagination">
      <button
        class="button secondary"
        [disabled]="page() === 1 || loading()"
        (click)="change(-1)"
      >
        ← Anterior</button
      ><span>Página {{ page() }}</span
      ><button
        class="button secondary"
        [disabled]="items().length < 25 || loading()"
        (click)="change(1)"
      >
        Próxima →
      </button>
    </div>`,
})
export class History {
  api = inject(Api);
  items = signal<any[]>([]);
  loading = signal(true);
  error = signal("");
  page = signal(1);
  constructor() {
    this.load();
  }
  change(n: number) {
    this.page.update((p) => p + n);
    this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.items.set(await this.api.get("/attempts?page=" + this.page()));
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.loading.set(false);
    }
  }
}
