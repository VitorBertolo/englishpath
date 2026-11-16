import { Component, inject } from "@angular/core";
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from "@angular/router";
import { Auth, Api } from "./core/api";
import { Icon } from "./shared/icon";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: ` @if (router.url.startsWith("/entrar")) {
      <router-outlet />
    } @else {
      <div class="app-layout">
        <aside class="sidebar">
          <a routerLink="/" class="brand"
            ><span class="brand-symbol"><app-icon name="leaf" /></span
            ><span
              >english<span class="brand-light">path</span
              ><small>UM PASSO POR VEZ</small></span
            ></a
          >
          <div class="nav-label">SEU ESPAÇO DE ESTUDO</div>
          <nav aria-label="Navegação principal">
            @for (item of nav; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                ><app-icon [name]="item.icon" />{{ item.label
                }}<span class="active-dot"></span
              ></a>
            }
          </nav>
          <div class="sidebar-bottom">
            <div class="daily-note">
              <app-icon name="spark" /><strong>Um pouco, todos os dias.</strong>
              <p>
                Consistência transforma pequenos passos em grandes conquistas.
              </p>
            </div>
            <div class="user-row">
              <span class="avatar">{{
                auth.user()?.username?.slice(0, 1)?.toUpperCase()
              }}</span>
              <div>
                <strong>{{ auth.user()?.username }}</strong><small
                  >Meu aprendizado pessoal</small
                >
              </div>
              <button
                class="icon-button"
                (click)="logout()"
                aria-label="Sair da conta"
              >
                <app-icon name="logout" />
              </button>
            </div>
            @if (error) {
              <p class="error small">{{ error }}</p>
            }
          </div>
        </aside>
        <div class="main-area">
          <header class="topbar">
            <span>Seu espaço para aprender e evoluir.</span
            ><span class="private-badge"><span></span> Curso pessoal</span>
          </header>
          <main id="main"><router-outlet /></main>
          <footer>
            Feito de prática, descobertas e um passo de cada vez.
            <span>English Path</span>
          </footer>
        </div>
      </div>
    }`,
})
export class App {
  router = inject(Router);
  auth = inject(Auth);
  api = inject(Api);
  error = "";
  nav = [
    { path: "/", icon: "home", label: "Meu painel" },
    { path: "/curso", icon: "book", label: "Meu percurso" },
    { path: "/revisao", icon: "review", label: "Revisão inteligente" },
    { path: "/leitura", icon: "text", label: "Leitura" },
    { path: "/vocabulario", icon: "word", label: "Vocabulário" },
    { path: "/historico", icon: "history", label: "Meu histórico" },
  ];
  async logout() {
    try {
      await this.auth.logout();
    } catch (e) {
      this.error = this.api.message(e);
    }
  }
}
