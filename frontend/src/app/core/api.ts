import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Router } from "@angular/router";
export interface Lesson {
  id: number;
  title: string;
  objective: string;
  explanation: string;
  examples: string[];
  total: number;
  completed: number;
  archivedPracticeAttempts?: number;
  progress: number;
  stage_id: number;
  isUnlocked: boolean;
  examPassed: boolean;
  examAttempts: number;
  bestExamScore: number | null;
  activeExamId: string | null;
  previousLessonId: number | null;
  examPassPercent: number;
  skills?: { id: number; title: string }[];
  supportActivities?: { id: string; title: string }[];
}
export interface Exercise {
  id: string;
  lesson_id: number;
  skill_id: number;
  type: string;
  prompt: string;
  instruction: string;
  passage: string | null;
  options: string[] | null;
  words: string[] | null;
  difficulty: number;
  topic?: string | null;
  blanks?: { id: string; label: string; options?: string[] }[] | null;
}
export interface Feedback {
  result: "correct" | "incorrect" | "needs_review";
  method: string;
  reference: string;
  suggestedAnswer: string;
  explanation: string;
  message: string;
  fields?: {
    id: string;
    label: string;
    answer: string;
    reference: string;
    result: "correct" | "incorrect";
  }[];
  earnedPoints?: number;
  totalPoints?: number;
}
export interface StudySession {
  id: string;
  lesson_id: number;
  mode: string;
  cursor: number;
  status: string;
  closure_reason?: string | null;
  total: number;
  exercises: Exercise[];
  attempts: { exercise_id: string; result: string; feedback: Feedback }[];
}
@Injectable({ providedIn: "root" })
export class Api {
  private http = inject(HttpClient);
  get<T = any>(url: string): Promise<T> {
    return firstValueFrom(
      this.http.get<T>("/api" + url, { withCredentials: true }),
    );
  }
  post<T = any>(url: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http.post<T>("/api" + url, body, { withCredentials: true }),
    );
  }
  message(error: unknown) {
    return error instanceof HttpErrorResponse
      ? (error.error?.error ??
          (error.status === 0
            ? "Não foi possível conectar à API. Verifique se o backend está em execução."
            : "Não foi possível concluir esta ação."))
      : "Ocorreu um erro. Tente novamente.";
  }
}
@Injectable({ providedIn: "root" })
export class Auth {
  private api = inject(Api);
  private router = inject(Router);
  user = signal<{ id: number; username: string } | null>(null);
  async check() {
    try {
      this.user.set(await this.api.get("/auth/me"));
      return true;
    } catch {
      return false;
    }
  }
  async login(username: string, password: string) {
    this.user.set(await this.api.post("/auth/login", { username, password }));
  }
  async logout() {
    await this.api.post("/auth/logout", {});
    this.user.set(null);
    await this.router.navigateByUrl("/entrar");
  }
}
@Injectable({ providedIn: "root" })
export class StudyActions {
  private api = inject(Api);
  private router = inject(Router);
  async start(lessonId: number, mode = "lesson") {
    const s = await this.api.post<StudySession>("/study-sessions", {
      lessonId,
      mode,
    });
    await this.router.navigate(["/estudar", s.id]);
  }
}
