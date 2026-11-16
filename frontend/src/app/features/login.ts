import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Auth, Api } from "../core/api";
import { Icon } from "../shared/icon";
@Component({
  standalone: true,
  imports: [FormsModule, Icon],
  template: `<div class="login-page">
    <section class="login-story">
      <a class="brand"
        ><span class="brand-symbol"><app-icon name="leaf" /></span
        ><span>english<span class="brand-light">path</span></span></a
      >
      <div>
        <span class="eyebrow">SEU PRÓXIMO CAPÍTULO</span>
        <h1>O inglês começa<br />com um pequeno<br /><em>passo seu.</em></h1>
        <p>
          Aprenda no seu ritmo. Pratique de verdade.<br />Construa um caminho
          que é só seu.
        </p>
        <div class="login-example">
          <span>LET’S BEGIN</span><strong>I am ready.</strong
          ><small>Eu estou pronto.</small>
        </div>
      </div>
      <small>Writing · Reading · Grammar · Vocabulary</small>
    </section>
    <section class="login-form-area">
      <form class="login-form" (ngSubmit)="submit()">
        <span class="eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
        <h2>Vamos aprender?</h2>
        <p>Entre para continuar sua jornada no inglês.</p>
        <label for="username">Usuário</label
        ><input
          id="username"
          name="username"
          [(ngModel)]="username"
          autocomplete="username"
          required
          placeholder="Seu usuário"
        /><label for="password">Senha</label
        ><input
          id="password"
          name="password"
          [(ngModel)]="password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="Sua senha"
        />
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <button
          class="button primary full"
          [disabled]="busy() || !username || !password"
        >
          {{ busy() ? "Entrando…" : "Entrar e continuar"
          }}<app-icon name="arrow" />
        </button>
        <p class="login-help">
          <app-icon name="lock" />Um espaço privado. Seu progresso fica salvo.
        </p>
      </form>
    </section>
  </div>`,
})
export class Login {
  api = inject(Api);
  auth = inject(Auth);
  router = inject(Router);
  username = "";
  password = "";
  busy = signal(false);
  error = signal("");
  async submit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    try {
      await this.auth.login(this.username, this.password);
      await this.router.navigateByUrl("/");
    } catch (e) {
      this.error.set(this.api.message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
