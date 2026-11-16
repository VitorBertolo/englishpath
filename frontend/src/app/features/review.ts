import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Api, StudyActions } from "../core/api";
import { Icon } from "../shared/icon";
@Component({
  standalone: true,
  imports: [RouterLink, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">APRENDER TAMBÉM É REVISITAR</span>
        <h1>Revisão inteligente<span class="green">.</span></h1>
        <p>Reforce seus pontos de atenção e mantenha o aprendizado vivo.</p>
      </div>
      @if (items().length) {
        <button class="button primary" (click)="start()" [disabled]="busy()">
          Revisar agora <app-icon name="review" />
        </button>
      }
    </div>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <div class="loading-state">Buscando revisões…</div>
    } @else if (items().length) {
      <p class="notice">
        {{ items().length }} exercícios aguardam revisão. Acertos espaçam a
        próxima prática em 1, 3, 7, 14 e 30 dias. Erros e variações não
        avaliadas voltam à prioridade.
      </p>
      <div class="review-list">
        @for (e of items(); track e.id) {
          <article class="panel review-item">
            <span class="stat-icon mauve"><app-icon name="review" /></span>
            <div>
              <span class="eyebrow">{{ e.lesson_title }}</span>
              <h3>{{ e.prompt }}</h3>
              <small>{{ e.skill_title }}</small>
            </div>
            <span
              class="badge"
              [class.muted-badge]="e.last_result === 'correct'"
              >{{
                e.last_result === "incorrect"
                  ? "Reforçar"
                  : e.last_result === "needs_review"
                    ? "Variação a revisar"
                    : "Revisão espaçada"
              }}</span
            >
          </article>
        }
      </div>
    } @else if (!error()) {
      <section class="panel empty-state">
        <app-icon name="check" />
        <h2>Tudo em dia por aqui.</h2>
        <p>
          As revisões aparecem após a prática, na hora de reforçar cada
          conteúdo.
        </p>
        <a routerLink="/curso" class="button primary"
          >Explorar o percurso <app-icon name="arrow"
        /></a>
      </section>
    }
    <section class="panel">
      <h2>Como saber se estou dominando?</h2>
      <p>
        O domínio considera suas 20 tentativas mais recentes em cada habilidade.
        É necessário praticar pelo menos {{ min() }} vezes e acertar
        {{ threshold() }}% para indicar domínio. Esse indicador orienta sua
        prática e não certifica proficiência.
      </p>
    </section>`,
})
export class Review {
  api = inject(Api);
  study = inject(StudyActions);
  items = signal<any[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal("");
  min = signal(8);
  threshold = signal(85);
  constructor() {
    this.api
      .get("/reviews/due")
      .then((d) => this.items.set(d))
      .catch((e) => this.error.set(this.api.message(e)))
      .finally(() => this.loading.set(false));
    this.api
      .get("/config")
      .then((c) => {
        this.min.set(c.masteryMin);
        this.threshold.set(Math.round(c.masteryThreshold * 100));
      })
      .catch(() => {});
  }
  async start() {
    this.busy.set(true);
    try {
      await this.study.start(this.items()[0].lesson_id, "review");
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
