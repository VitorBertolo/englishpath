import { Component, input } from "@angular/core";
@Component({
  selector: "app-icon",
  standalone: true,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()] || paths['book']" />
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.25em;
        height: 1.25em;
        flex-shrink: 0;
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class Icon {
  name = input("book");
  paths: Record<string, string> = {
    home: "M3 10 12 3l9 7v11h-6v-7H9v7H3z",
    book: "M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2z",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    review: "M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2",
    history: "M12 8v5l3 2M3 11a9 9 0 1 1 2 7M3 5v6h6",
    text: "M4 5h16M4 10h16M4 15h10M4 20h10",
    spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
    lock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3",
    logout: "M9 4H4v16h5M10 12h11m-4-4 4 4-4 4",
    target: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l9-9M17 3h4v4",
    flag: "M5 21V3m0 0c4-3 9 3 14 0v10c-5 3-10-3-14 0",
    close: "m6 6 12 12M6 18 18 6",
    pause: "M8 5v14M16 5v14",
    chevron: "m9 5 7 7-7 7",
    word: "M4 20 12 4l8 16M7 14h10",
    leaf: "M5 19C-1 6 12 1 21 3c1 12-5 21-16 16Zm0 0L16 8",
    chart: "M4 20V10m8 10V4m8 16v-6",
    info: "M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  };
}
