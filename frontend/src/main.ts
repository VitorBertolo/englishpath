import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter, CanActivateFn, Router } from "@angular/router";
import { inject, LOCALE_ID } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { registerLocaleData } from "@angular/common";
import pt from "@angular/common/locales/pt";
import { App } from "./app/app";
import { Auth } from "./app/core/api";
registerLocaleData(pt);
const guard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return (await auth.check()) || router.createUrlTree(["/entrar"]);
};
bootstrapApplication(App, {
  providers: [
    { provide: LOCALE_ID, useValue: "pt-BR" },
    provideHttpClient(
      withInterceptors([
        (req, next) => {
          const router = inject(Router);
          return next(req).pipe(
            catchError((error) => {
              if (
                error.status === 401 &&
                !req.url.endsWith("/auth/login") &&
                !req.url.endsWith("/auth/me")
              )
                router.navigateByUrl("/entrar");
              return throwError(() => error);
            }),
          );
        },
      ]),
    ),
    provideRouter([
      {
        path: "entrar",
        loadComponent: () =>
          import("./app/features/login").then((m) => m.Login),
      },
      {
        path: "",
        canActivate: [guard],
        children: [
          {
            path: "atividade/:id",
            canDeactivate: [
              (component: { persistBeforeExit: () => Promise<boolean> }) =>
                component.persistBeforeExit(),
            ],
            loadComponent: () =>
              import("./app/features/activity").then((m) => m.ActivityPage),
          },
          {
            path: "prova/:id",
            canDeactivate: [
              (component: { persistBeforeExit: () => Promise<boolean> }) =>
                component.persistBeforeExit(),
            ],
            loadComponent: () =>
              import("./app/features/exam").then((m) => m.ExamPage),
          },
          {
            path: "",
            pathMatch: "full",
            loadComponent: () =>
              import("./app/features/dashboard").then((m) => m.Dashboard),
          },
          {
            path: "curso",
            loadComponent: () =>
              import("./app/features/course").then((m) => m.Course),
          },
          {
            path: "licao/:id",
            loadComponent: () =>
              import("./app/features/lesson").then((m) => m.Lesson),
          },
          {
            path: "estudar/:id",
            loadComponent: () =>
              import("./app/features/study").then((m) => m.Study),
          },
          {
            path: "revisao",
            loadComponent: () =>
              import("./app/features/review").then((m) => m.Review),
          },
          {
            path: "historico",
            loadComponent: () =>
              import("./app/features/history").then((m) => m.History),
          },
          {
            path: "leitura",
            loadComponent: () =>
              import("./app/features/reading").then((m) => m.Reading),
          },
          {
            path: "vocabulario",
            data: { kind: "vocabulary" },
            loadComponent: () =>
              import("./app/features/library").then((m) => m.Library),
          },
        ],
      },
      { path: "**", redirectTo: "" },
    ]),
  ],
}).catch(console.error);
