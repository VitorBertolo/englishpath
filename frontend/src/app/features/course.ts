import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Api } from "../core/api";
import { Icon } from "../shared/icon";
@Component({
  standalone: true,
  imports: [RouterLink, Icon],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">DO PRIMEIRO HELLO À CONFIANÇA</span>
        <h1>Seu percurso de aprendizado<span class="green">.</span></h1>
        <p>
          Uma base por vez. O progresso de cada lição vem da prática iniciada
          por ela.
        </p>
      </div>
    </div>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (data(); as d) {
      <div class="course-path">
        @for (s of d.stages; track s.id) {
          <section class="stage-card" [class.unavailable]="!s.available">
            <div class="stage-heading">
              <span class="stage-number">{{ ("0" + s.id).slice(-2) }}</span>
              <div>
                <span class="eyebrow">ETAPA {{ ("0" + s.id).slice(-2) }}</span>
                <h2>{{ s.title }}</h2>
                <p>{{ s.description }}</p>
              </div>
              <span class="badge" [class.muted-badge]="!s.available">
                @if (s.available) {
                  Disponível
                } @else {
                  <app-icon name="lock" />Em breve
                }
              </span>
            </div>
            @if (s.available) {
              @if (s.id === 2) {
                <p class="stage-intro">
                  Você já sabe falar de quem é e de como está. Agora aprenda a
                  contar o que faz, perguntar sobre hábitos e falar de
                  preferências. No último módulo, compare rotinas com o que
                  acontece agora usando o Present Continuous. A primeira lição é
                  liberada pela aprovação na última prova da etapa 01.
                </p>
              }
              @for (m of modulesFor(s.id); track m.id) {
                <div class="module-title">
                  MÓDULO {{ ("0" + m.position).slice(-2) }}
                  <span>{{ m.title }}</span>
                </div>
                <div
                  class="lesson-grid"
                  [class.paired-lessons]="lessonsFor(m.id).length === 2"
                >
                  @for (l of lessonsFor(m.id); track l.id) {
                    <a
                      class="lesson-tile"
                      [class.locked-lesson]="!l.isUnlocked"
                      [routerLink]="['/licao', l.id]"
                      ><div>
                        <span class="tile-number">{{
                          ("0" + l.id).slice(-2)
                        }}</span><span class="small muted"
                          >{{ l.total }} exercícios</span
                        >
                      </div>
                      <h3>{{ l.title }}</h3>
                      <p>{{ l.objective }}</p>
                      <div class="progress-track">
                        <span [style.width.%]="l.progress"></span>
                      </div>
                      <div class="tile-footer">
                        <span
                          >{{ l.progress }}% da prática ·
                          {{
                            !l.isUnlocked
                              ? "Prova anterior pendente"
                              : l.examPassed
                                ? "Prova aprovada"
                                : "Prova pendente"
                          }}</span
                        ><app-icon name="arrow" /></div
                    ></a>
                  }
                </div>
              }
              @if (writingFor(s.id); as activity) {
                <div class="stage-writing">
                  <span class="eyebrow">PRODUÇÃO ESCRITA DA ETAPA</span>
                  <h3>{{ activity.title }}</h3>
                  <p>
                    Escreva com suas próprias ideias. Salve rascunhos, revise
                    seu texto e acompanhe suas versões.
                  </p>
                  <a
                    class="button secondary"
                    [routerLink]="['/atividade', activity.id]"
                    >{{
                      activity.isUnlocked
                        ? activity.submissions
                          ? "Voltar à minha produção"
                          : "Começar minha produção"
                        : "Conhecer a tarefa"
                    }}
                    <app-icon name="arrow"
                  /></a>
                  @if (!activity.isUnlocked) {
                    <p class="small muted">
                      A escrita será liberada quando você chegar à última lição
                      desta etapa.
                    </p>
                  }
                  @if (activity.submissions) {
                    <p class="small muted">
                      {{ activity.submissions }} versões entregues ·
                      acompanhamento separado das provas
                    </p>
                  }
                </div>
              }
            }
            <details class="support-plan">
              <summary>
                Conteúdos de apoio ·
                {{ s.available ? "estudar e revisar" : "sequência planejada" }}
              </summary>
              <ul>
                @for (topic of topicsFor(s.id); track topic) {
                  <li>{{ topic }}</li>
                }
              </ul>
              @for (activity of supportFor(s.id); track activity.id) {
                <a
                  class="support-link"
                  [routerLink]="['/atividade', activity.id]"
                  >{{ activity.title }} · lição {{ activity.lesson_id }}
                  <app-icon name="arrow"
                /></a>
              }
              @if (!s.available && writingFor(s.id); as activity) {
                <p>
                  Produção escrita planejada:
                  <strong>{{ activity.title }}</strong>
                </p>
              }
            </details>
          </section>
        }
      </div>
    } @else if (!error()) {
      <div class="loading-state">Carregando o percurso…</div>
    }`,
  styles: [
    `
      .locked-lesson {
        background: #f8f9f5;
        opacity: 0.75;
      }
      .tile-footer {
        gap: 10px;
        line-height: 1.8;
      }
      .stage-intro {
        margin: 24px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.8;
        max-width: 800px;
      }
      .paired-lessons {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .stage-writing {
        margin-top: 28px;
        padding: 24px;
        background: #f3f6ee;
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      .stage-writing p,
      .support-plan {
        font-size: 13px;
        line-height: 1.8;
      }
      .support-plan {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--border);
      }
      .support-plan summary {
        cursor: pointer;
        color: var(--green);
        font-weight: 600;
      }
      .support-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 0;
        color: var(--green);
      }
      @media (max-width: 700px) {
        .paired-lessons {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Course {
  topicsFor(stageId: number) {
    return (
      this.data()?.supportPlan.find((p: any) => p.stage_id === stageId)
        ?.topics ?? []
    );
  }
  supportFor(stageId: number) {
    return (
      this.data()?.activities.filter(
        (a: any) => a.stage_id === stageId && a.kind === "support",
      ) ?? []
    );
  }
  writingFor(stageId: number) {
    return this.data()?.activities.find(
      (a: any) => a.stage_id === stageId && a.kind === "writing",
    );
  }
  modulesFor(stageId: number) {
    return (
      this.data()?.modules.filter((m: any) => m.stage_id === stageId) ?? []
    );
  }
  lessonsFor(moduleId: number) {
    return (
      this.data()?.lessons.filter((l: any) => l.module_id === moduleId) ?? []
    );
  }
  api = inject(Api);
  data = signal<any>(null);
  error = signal("");
  constructor() {
    this.api
      .get("/stages")
      .then((d) => this.data.set(d))
      .catch((e) => this.error.set(this.api.message(e)));
  }
}
