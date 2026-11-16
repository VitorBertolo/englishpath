import { Component, input, model, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Exercise } from "../core/api";
import { Icon } from "./icon";

export function answerIsComplete(
  exercise: Exercise | undefined,
  value: string,
) {
  if (!exercise) return false;
  if (exercise.type !== "multi_gap") return !!value.trim();
  try {
    const fields = JSON.parse(value);
    return (
      !!exercise.blanks?.length &&
      exercise.blanks.every(
        (blank) =>
          typeof fields[blank.id] === "string" && !!fields[blank.id].trim(),
      )
    );
  } catch {
    return false;
  }
}

@Component({
  selector: "app-answer-input",
  standalone: true,
  imports: [FormsModule, Icon],
  template: `
    @if (exercise().type === "multi_gap") {
      <div class="multi-gap-text" lang="en">
        @for (part of parts(); track $index) {
          @if (part.id) {
            @if (blank(part.id); as b) {
              @if (b.options?.length) {
                <select
                  [attr.aria-label]="b.label"
                  [disabled]="disabled()"
                  [ngModel]="values()[b.id] ?? ''"
                  (ngModelChange)="setBlank(b.id, $event)"
                >
                  <option value="">{{ b.label }}</option>
                  @for (option of b.options; track option) {
                    <option [value]="option">{{ option }}</option>
                  }
                </select>
              } @else {
                <input
                  type="text"
                  [attr.aria-label]="b.label"
                  [placeholder]="b.label"
                  [disabled]="disabled()"
                  [ngModel]="values()[b.id] ?? ''"
                  (ngModelChange)="setBlank(b.id, $event)"
                  maxlength="200"
                  autocomplete="off"
                  spellcheck="false"
                />
              }
            }
          } @else {
            <span>{{ part.text }}</span>
          }
        }
      </div>
      <p class="small muted">
        Preencha cada lacuna. Algumas pedem uma escolha; outras, uma resposta
        escrita.
      </p>
    } @else if (exercise().options?.length) {
      <div class="answer-options" role="group" aria-label="Alternativas">
        @for (option of exercise().options; track option; let i = $index) {
          <button
            class="answer-option"
            [class.selected]="value() === option"
            [disabled]="disabled()"
            (click)="value.set(option)"
          >
            <span>{{ letters[i] }}</span
            ><strong>{{ option }}</strong>
            @if (value() === option) {
              <app-icon name="check" />
            }
          </button>
        }
      </div>
    } @else if (exercise().type === "order" && exercise().words) {
      <div class="word-answer" aria-label="Sua frase">
        @if (!indices().length) {
          <span class="muted"
            >Toque nas palavras para montar sua resposta…</span
          >
        }
        @for (i of indices(); track $index) {
          <button
            class="word-token chosen"
            [disabled]="disabled()"
            (click)="removeWord($index)"
          >
            {{ exercise().words![i] }} <span>×</span>
          </button>
        }
      </div>
      <div class="word-bank">
        @for (word of exercise().words; track $index; let i = $index) {
          <button
            class="word-token"
            [disabled]="disabled() || indices().includes(i)"
            (click)="addWord(i)"
          >
            {{ word }}
          </button>
        }
      </div>
    } @else {
      <label class="field-label" [for]="'answer-' + exercise().id"
        >Sua resposta</label
      ><textarea
        [id]="'answer-' + exercise().id"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [disabled]="disabled()"
        maxlength="2000"
        rows="3"
        placeholder="Escreva em inglês…"
        lang="en"
        autocomplete="off"
        spellcheck="false"
      ></textarea>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .multi-gap-text {
        font-size: 17px;
        line-height: 2.8;
        color: var(--ink);
        margin-bottom: 20px;
        white-space: pre-wrap;
      }
      .multi-gap-text input,
      .multi-gap-text select {
        display: inline-block;
        width: auto;
        min-width: 90px;
        max-width: 210px;
        padding: 7px 9px;
        min-height: 38px;
        font-size: 14px;
        vertical-align: baseline;
        margin: 3px 5px;
        background: #f6f9ef;
        border-color: #abc29a;
      }
      .multi-gap-text input {
        width: 145px;
      }
      textarea {
        resize: vertical;
        line-height: 1.8;
        font-size: 16px;
      }
      .word-bank {
        margin-top: 18px;
      }
      .answer-option strong {
        line-height: 1.7;
      }
      @media (max-width: 700px) {
        .multi-gap-text {
          font-size: 15px;
          line-height: 3;
        }
        .multi-gap-text input,
        .multi-gap-text select {
          max-width: 160px;
          font-size: 13px;
        }
      }
    `,
  ],
})
export class AnswerInput {
  exercise = input.required<Exercise>();
  value = model("");
  disabled = input(false);
  letters = "ABCDEFGH".split("");
  values = computed<Record<string, string>>(() => {
    try {
      const value = JSON.parse(this.value() || "{}");
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  });
  parts = computed(() => {
    const text = this.exercise().prompt;
    const parts: { text?: string; id?: string }[] = [];
    const regex = /\[\[([a-z]\w*)\]\]/gi;
    let last = 0;
    let match;
    while ((match = regex.exec(text))) {
      if (match.index > last)
        parts.push({ text: text.slice(last, match.index) });
      parts.push({ id: match[1] });
      last = regex.lastIndex;
    }
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
  });
  blank(id: string) {
    return this.exercise().blanks?.find((b) => b.id === id);
  }
  setBlank(id: string, text: string) {
    this.value.set(JSON.stringify({ ...this.values(), [id]: text }));
  }
  indices = computed(() => {
    const words = this.exercise().words ?? [];
    const used: number[] = [];
    for (const token of this.value().trim().split(/\s+/).filter(Boolean)) {
      const index = words.findIndex((w, i) => w === token && !used.includes(i));
      if (index >= 0) used.push(index);
    }
    return used;
  });
  addWord(index: number) {
    this.value.set(
      [...this.indices(), index]
        .map((i) => this.exercise().words![i])
        .join(" "),
    );
  }
  removeWord(index: number) {
    this.value.set(
      this.indices()
        .filter((_, i) => i !== index)
        .map((i) => this.exercise().words![i])
        .join(" "),
    );
  }
}
