import { Component, inject, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Api } from "../core/api";
@Component({
  standalone: true,
  imports: [FormsModule],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">PALAVRAS COM CONTEXTO</span>
        <h1>Seu vocabulário<span class="green">.</span></h1>
        <p>Conheça as palavras e expressões de cada etapa do percurso.</p>
      </div>
    </div>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <div class="loading-state">Carregando vocabulário…</div>
    } @else {
      <div class="library-search">
        <label for="search">Encontrar uma palavra</label
        ><input
          id="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          placeholder="Busque em inglês ou português…"
        />
        <label for="vocabulary-stage">Etapa do curso</label>
        <select
          id="vocabulary-stage"
          [ngModel]="stage()"
          (ngModelChange)="stage.set(+$event)"
        >
          <option [ngValue]="0">Todas as etapas</option>
          @for (id of stages(); track id) {
            <option [ngValue]="id">Etapa {{ ("0" + id).slice(-2) }}</option>
          }
        </select>
        <span class="small muted"
          >{{ filtered().length }} palavras e expressões</span
        >
      </div>
      <div class="vocabulary-grid">
        @for (word of filtered(); track word.id) {
          <article class="panel word-card-small">
            <span class="eyebrow"
              >ETAPA {{ ("0" + word.stage_id).slice(-2) }} · VOCABULÁRIO</span
            >
            <h2 lang="en">{{ word.word }}</h2>
            <p>{{ word.translation }}</p>
            <div lang="en">{{ word.example }}</div>
          </article>
        } @empty {
          <p>Nenhuma palavra encontrada.</p>
        }
      </div>
    }`,
})
export class Library {
  api = inject(Api);
  items = signal<any[]>([]);
  loading = signal(true);
  error = signal("");
  search = signal("");
  stage = signal(0);
  stages = computed(() => [
    ...new Set(this.items().map((w) => w.stage_id as number)),
  ]);
  filtered = computed(() =>
    this.items().filter(
      (word) =>
        (!this.stage() || word.stage_id === this.stage()) &&
        (word.word + " " + word.translation)
          .toLowerCase()
          .includes(this.search().toLowerCase()),
    ),
  );
  constructor() {
    this.api
      .get("/vocabulary")
      .then((items) => this.items.set(items))
      .catch((error) => this.error.set(this.api.message(error)))
      .finally(() => this.loading.set(false));
  }
}
