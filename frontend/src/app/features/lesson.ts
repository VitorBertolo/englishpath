import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Api, Lesson as LessonData, StudyActions } from "../core/api";
import { Icon } from "../shared/icon";
import { DatePipe } from "@angular/common";
@Component({
  standalone: true,
  imports: [RouterLink, Icon, FormsModule, DatePipe],
  template: `<a routerLink="/curso" class="back-link">← Meu percurso</a>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (lesson(); as l) {
      <div class="page-heading">
        <div>
          <span class="eyebrow"
            >ETAPA {{ ("0" + l.stage_id).slice(-2) }} · LIÇÃO {{ l.id }}</span
          >
          <h1>{{ l.title }}<span class="green">.</span></h1>
          <p>{{ l.objective }}</p>
        </div>
        <span class="badge"
          >{{ l.completed }} / {{ l.total }} exercícios acertados</span
        >
      </div>
      @if (l.archivedPracticeAttempts) {
        <p class="notice">
          Esta lição ganhou novos exercícios. O percentual de prática considera
          o conteúdo atual. Suas respostas e aprovações anteriores continuam
          salvas.
        </p>
      }
      <div class="lesson-layout">
        <section class="panel lesson-theory">
          <span class="eyebrow">ENTENDA A IDEIA</span>
          <h2>Uma base para praticar</h2>
          <p class="theory-text">{{ l.explanation }}</p>
          <h3>Veja na prática</h3>
          <div class="example-list">
            @for (ex of l.examples; track ex) {
              <div>
                <app-icon name="text" /><span>{{ ex }}</span>
              </div>
            }
          </div>
          <h3>O que você vai desenvolver</h3>
          <div class="skill-chips">
            @for (s of l.skills; track s.id) {
              <span class="skill-chip"
                ><app-icon name="check" />{{ s.title }}</span
              >
            }
          </div>
          @if (l.supportActivities?.length) {
            <h3>Conteúdos de apoio desta lição</h3>
            <p>
              Use estas explicações e práticas curtas para ampliar suas frases.
            </p>
            @for (activity of l.supportActivities; track activity.id) {
              <a class="support-link" [routerLink]="['/atividade', activity.id]"
                >{{ activity.title }} <app-icon name="arrow"
              /></a>
            }
          }
        </section>
        <aside class="panel practice-summary">
          <span class="stat-icon"><app-icon name="book" /></span>
          <h2>Agora é com você</h2>
          <p>Pratique com lacunas, frases, traduções e pequenos textos.</p>
          <div class="progress-label">
            <span>Prática desta lição</span><strong>{{ l.progress }}%</strong>
          </div>
          <div class="progress-track">
            <span [style.width.%]="l.progress"></span>
          </div>
          <button
            class="button primary full"
            (click)="start()"
            [disabled]="busy() || !l.isUnlocked"
          >
            {{ busy() ? "Preparando…" : "Praticar esta lição"
            }}<app-icon name="arrow" /></button
          ><small
            >Seu progresso é salvo a cada resposta.<br />A prática desta lição
            pode ser retomada depois.</small
          >
        </aside>
      </div>
      @if (!l.isUnlocked) {
        <p class="notice">
          <app-icon name="lock" />Esta lição será liberada após aprovação na
          prova da lição anterior, com pelo menos {{ l.examPassPercent }}%.
        </p>
      }
      <section class="panel">
        <div class="section-top">
          <div>
            <span class="eyebrow">APLIQUE O QUE VOCÊ APRENDEU</span>
            <h2>Pronto para fazer o teste?</h2>
            <p>
              Questões mais exigentes, com contextos novos e múltiplas lacunas.
              A correção aparece depois da entrega.
            </p>
          </div>
          <app-icon name="target" />
        </div>
        <p>
          Atinja pelo menos <strong>{{ l.examPassPercent }}%</strong> para
          liberar a próxima lição. Você pode repetir a prova quantas vezes
          quiser. As provas têm histórico próprio e não substituem seus
          exercícios de prática.
        </p>
        <div class="skill-chips">
          <span class="skill-chip">{{ l.examAttempts }} provas concluídas</span>
          @if (l.bestExamScore !== null) {
            <span class="skill-chip"
              >Melhor resultado: {{ l.bestExamScore }}%</span
            >
          }
          @if (l.examPassed) {
            <span class="badge"><app-icon name="check" />Aprovado</span>
          }
        </div>
        <button
          class="button primary"
          style="margin-top:22px"
          [disabled]="busy() || !l.isUnlocked"
          (click)="startExam()"
        >
          {{ l.activeExamId ? "Retomar prova" : "Fazer Teste"
          }}<app-icon name="arrow" />
        </button>
      </section>
      @if (examHistory().length) {
        <section class="panel">
          <h2>Histórico de provas desta lição</h2>
          @for (exam of examHistory(); track exam.id) {
            <a class="exam-history-row" [routerLink]="['/prova', exam.id]"
              ><span>{{
                exam.status === "active"
                  ? "Prova em andamento"
                  : exam.passed
                    ? "Aprovado"
                    : "Reforçar e tentar novamente"
              }}</span
              ><span class="small muted">{{
                exam.created_at | date: "dd/MM/yyyy · HH:mm"
              }}</span
              ><strong>{{
                exam.score === null ? "Retomar" : exam.score + "%"
              }}</strong
              ><app-icon name="chevron"
            /></a>
          }
        </section>
      }
      <section class="panel ai-panel">
        <div class="section-top">
          <div>
            <span class="eyebrow">PRÁTICA QUE PODE IR ALÉM</span>
            <h2>Novos desafios com IA</h2>
            <p>Gere exercícios alinhados às habilidades desta lição.</p>
          </div>
          <app-icon name="spark" />
        </div>
        @if (aiEnabled() && l.isUnlocked) {
          <label class="field-label" for="skill">Habilidade</label
          ><select id="skill" [(ngModel)]="skillId">
            @for (s of l.skills; track s.id) {
              <option [ngValue]="s.id">{{ s.title }}</option>
            }</select
          ><button
            class="button secondary"
            (click)="generate()"
            [disabled]="generating()"
          >
            {{ generating() ? "Gerando…" : "Gerar 4 novos exercícios"
            }}<app-icon name="spark" />
          </button>
          <p class="small muted">
            O conteúdo gerado passa por validação estrutural. Revise as
            respostas antes de adicionar ao seu curso.
          </p>
        } @else {
          <p class="notice">
            <app-icon name="info" />{{
              l.isUnlocked
                ? "Ative a IA para gerar desafios adicionais. Os exercícios iniciais e as provas já funcionam sem IA."
                : "Conclua a prova anterior para liberar a prática e os desafios desta lição."
            }}
          </p>
        }
        @if (draft(); as d) {
          <div class="draft-list">
            @for (e of d.exercises; track $index) {
              <article>
                <span class="badge">{{ e.type }}</span>
                <h3>{{ e.prompt }}</h3>
                @if (e.passage) {
                  <p>{{ e.passage }}</p>
                }
                @if (e.options) {
                  <p>{{ e.options.join(" · ") }}</p>
                }
                <p>
                  <strong>Referência:</strong>
                  {{ e.accepted_answers.join(" / ") }}
                </p>
                <small>{{ e.explanation }}</small>
              </article>
            }
          </div>
          <button
            class="button primary"
            (click)="approve()"
            [disabled]="generating()"
          >
            Revisei: adicionar ao curso <app-icon name="check" />
          </button>
        }
        @if (success()) {
          <p class="success" role="status">{{ success() }}</p>
        }
      </section>
    }`,
  styles: [
    `
      .support-link {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 0;
        border-bottom: 1px solid var(--border);
        font-size: 14px;
        color: var(--green);
      }
      .exam-history-row {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 17px 4px;
        border-top: 1px solid var(--border);
        font-size: 12px;
      }
      .exam-history-row strong {
        margin-left: auto;
        color: var(--green);
      }
      .exam-history-row:hover {
        background: #f8faf4;
      }
    `,
  ],
})
export class Lesson {
  api = inject(Api);
  route = inject(ActivatedRoute);
  study = inject(StudyActions);
  router = inject(Router);
  examHistory = signal<any[]>([]);
  lesson = signal<LessonData | null>(null);
  error = signal("");
  busy = signal(false);
  generating = signal(false);
  aiEnabled = signal(false);
  draft = signal<any>(null);
  success = signal("");
  skillId = 0;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => {
      this.error.set("");
      this.draft.set(null);
      this.load();
    });
    this.api
      .get("/config")
      .then((c) => this.aiEnabled.set(c.aiEnabled))
      .catch(() => {});
  }
  async load() {
    try {
      const l = await this.api.get<LessonData>(
        "/lessons/" + this.route.snapshot.paramMap.get("id"),
      );
      this.lesson.set(l);
      this.skillId = l.skills?.[0]?.id ?? 0;
      this.examHistory.set(
        await this.api.get("/exams/lessons/" + l.id + "/history"),
      );
    } catch (e) {
      this.error.set(this.api.message(e));
    }
  }
  async start() {
    this.busy.set(true);
    try {
      await this.study.start(this.lesson()!.id);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async startExam() {
    this.busy.set(true);
    this.error.set("");
    try {
      const exam = await this.api.post<{ id: string }>("/exams", {
        lessonId: this.lesson()!.id,
      });
      await this.router.navigate(["/prova", exam.id]);
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async generate() {
    this.generating.set(true);
    this.error.set("");
    this.success.set("");
    try {
      this.draft.set(
        await this.api.post("/ai/generate-exercises", {
          lessonId: this.lesson()!.id,
          skillId: this.skillId,
          quantity: 4,
          difficulty: 1,
          types: ["gap", "choice", "translate", "order"],
        }),
      );
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.generating.set(false);
    }
  }
  async approve() {
    this.generating.set(true);
    try {
      await this.api.post(
        "/ai/generations/" + this.draft().id + "/approve",
        {},
      );
      this.draft.set(null);
      this.success.set(
        "Exercícios adicionados. Eles já podem entrar nas próximas sessões.",
      );
      await this.load();
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.generating.set(false);
    }
  }
}
