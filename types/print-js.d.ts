declare module "print-js" {
  export type Printable =
    | string
    | HTMLElement
    | HTMLElement[]
    | Record<string, unknown>[];

  export interface PrintJSOptions {
    printable: Printable;
    type?: "json" | "html" | "pdf" | "image" | "raw-html";
    style?: string;
    targetStyles?: string[];
    properties?: string[];
    header?: string;
  }

  export default function printJS(options: PrintJSOptions): void;
}