import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Api, StudyActions } from "../core/api";
import { Icon } from "../shared/icon";
@Component({
  standalone: true,
  imports: [RouterLink, Icon],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">SEU APRENDIZADO, NO SEU RITMO</span>
        <h1>Um novo dia para evoluir<span class="green">.</span></h1>
        <p>Pequenos passos hoje. Mais confiança amanhã.</p>
      </div>
      <span class="date-pill">{{ date }}</span>
    </div>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }}
        <button class="text-button" (click)="load()">Tentar novamente</button>
      </div>
    }
    @if (data(); as d) {
      <section class="hero-study">
        <div class="hero-content">
          <span class="hero-kicker"
            ><span class="live-dot"></span> ETAPA
            {{ ("0" + d.currentLesson.stage_id).slice(-2) }} ·
            {{ d.currentLesson.stage_title }}</span
          >
          <h2>Uma boa base.<br />Um mundo de possibilidades.</h2>
          <p>
            {{
              d.currentLesson.stage_id === 2
                ? "Amplie sua base: conte suas rotinas, faça perguntas e fale de hábitos e preferências em inglês."
                : "Aprenda a se apresentar, descrever o mundo e construir suas primeiras frases em inglês."
            }}
          </p>
          <button class="button light" [disabled]="busy()" (click)="start()">
            {{
              busy()
                ? "Preparando…"
                : d.activeSession
                  ? "Retomar minha sessão"
                  : "Continuar estudando"
            }}<app-icon name="arrow" /></button
          ><small>{{
            d.activeSession
              ? "Seu ponto de parada está salvo."
              : "Próxima lição: " + d.currentLesson.title
          }}</small>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="word-card card-one">
            <span>HELLO, WORLD.</span><strong>I am <em>ready.</em></strong
            ><small>Um começo cheio de possibilidades.</small>
            <div><span>I</span><b>am</b><span>ready</span><i>✓</i></div>
          </div>
          <span class="floating-tag"
            ><app-icon name="spark" /> Let’s grow together</span
          >
        </div>
      </section>
      <div class="stats-grid">
        <article class="stat-card">
          <span class="stat-icon"><app-icon name="check" /></span
          ><span>Exercícios respondidos</span
          ><strong>{{ d.stats.attempts }}</strong
          ><small>{{
            d.stats.attempts
              ? "Cada tentativa faz parte do caminho."
              : "Sua primeira prática começa aqui."
          }}</small>
        </article>
        <article class="stat-card">
          <span class="stat-icon gold"><app-icon name="target" /></span
          ><span>Taxa de acertos</span
          ><strong>{{
            d.stats.accuracy === null ? "—" : d.stats.accuracy + "%"
          }}</strong
          ><small
            >{{ d.stats.correct }} acertos ·
            {{ d.stats.incorrect }} erros</small
          >
        </article>
        <article class="stat-card">
          <span class="stat-icon mauve"><app-icon name="review" /></span
          ><span>Revisões para hoje</span><strong>{{ d.due }}</strong
          ><a routerLink="/revisao">Reforce o que aprendeu <span>↗</span></a>
        </article>
      </div>
      <div class="dashboard-columns">
        <section class="panel">
          <div class="section-top">
            <h2>Seu próximo passo</h2>
            <a routerLink="/curso" class="text-link"
              >Ver percurso <app-icon name="arrow"
            /></a>
          </div>
          <div class="next-lesson">
            <span class="lesson-number">{{
              ("0" + d.currentLesson.id).slice(-2)
            }}</span>
            <div>
              <span class="eyebrow"
                >ETAPA {{ ("0" + d.currentLesson.stage_id).slice(-2) }} · LIÇÃO
                {{ d.currentLesson.id }}</span
              >
              <h3>{{ d.currentLesson.title }}</h3>
              <p>{{ d.currentLesson.objective }}</p>
            </div>
          </div>
          <div class="progress-label">
            <span>Acertos na prática desta lição</span
            ><strong
              >{{ d.currentLesson.completed }} /
              {{ d.currentLesson.total }}</strong
            >
          </div>
          <div
            class="progress-track"
            role="progressbar"
            [attr.aria-valuenow]="d.currentLesson.progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Progresso da lição"
          >
            <span [style.width.%]="d.currentLesson.progress"></span>
          </div>
          <a
            [routerLink]="['/licao', d.currentLesson.id]"
            class="button secondary full"
            >Explorar a lição <app-icon name="chevron"
          /></a>
        </section>
        <section class="panel progress-panel">
          <div class="section-top">
            <h2>Crescendo com a prática</h2>
            <app-icon name="leaf" />
          </div>
          <div class="progress-ring" [style.--progress]="d.progress + '%'">
            <div>
              <strong>{{ d.progress }}<small>%</small></strong
              ><span>do percurso</span>
            </div>
          </div>
          <p>{{ d.completed }} de {{ d.total }} exercícios acertados</p>
          <small
            >Domínio se constrói com prática e revisão.<br />Continue no seu
            ritmo.</small
          >
        </section>
      </div>
      <section class="panel skills-panel">
        <div class="section-top">
          <div>
            <h2>Um pouco de atenção faz diferença</h2>
            <p>Habilidades que merecem mais prática.</p>
          </div>
          <a routerLink="/revisao" class="text-link"
            >Revisar <app-icon name="arrow"
          /></a>
        </div>
        @if (d.difficultSkills.length) {
          <div class="skill-chips">
            @for (s of d.difficultSkills; track s.id) {
              <span class="skill-chip"
                ><app-icon name="target" />{{ s.title
                }}<strong>{{ Math.round(s.accuracy * 100) }}%</strong></span
              >
            }
          </div>
        } @else {
          <div class="empty-inline">
            <app-icon name="spark" /><span>{{
              d.stats.attempts
                ? "Siga praticando. Novas tentativas ajudam a avaliar seu domínio."
                : "Suas habilidades aparecerão aqui depois dos primeiros exercícios."
            }}</span>
          </div>
        }
      </section>
    } @else if (!error()) {
      <div class="loading-state">Preparando seu painel…</div>
    }`,
})
export class Dashboard {
  api = inject(Api);
  study = inject(StudyActions);
  data = signal<any>(null);
  error = signal("");
  busy = signal(false);
  Math = Math;
  date = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Cuiaba",
  }).format(new Date());
  constructor() {
    this.load();
  }
  async load() {
    this.error.set("");
    try {
      this.data.set(await this.api.get("/progress/dashboard"));
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  async start() {
    this.busy.set(true);
    try {
      await this.study.start(this.data().currentLesson.id);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
