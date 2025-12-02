/// <reference types="astro/client" />
import type { User } from "./lib/server/webhook/type";

declare global {
	namespace App {
		interface Locals extends Record<any> {
			currentUser: User | null;
		}
	}

	namespace astroHTML.JSX {
		// Alpine.js attributes interface
		interface AlpineAttributes {
			// Core directives
			"x-data"?: string;
			"x-show"?: string | boolean;
			"x-if"?: string;
			"x-for"?: string;
			"x-bind"?: string;
			"x-on"?: string;
			"x-text"?: string;
			"x-html"?: string;
			"x-model"?: string;
			"x-cloak"?: boolean | string;
			"x-transition"?: string | boolean;
			"x-ref"?: string;
			"x-init"?: string;
			"x-effect"?: string;
			"x-ignore"?: boolean | string;
			"x-teleport"?: string;
			"x-collapse"?: string | boolean;
			"x-id"?: string;

			// Shorthand bindings (:attribute) - including :class
			[key: `:${string}`]: string | boolean | number | undefined;

			// Shorthand event listeners (@event)
			[key: `@${string}`]: string | undefined;

			// x-on:event syntax
			[key: `x-on:${string}`]: string | undefined;

			// x-bind:attribute syntax
			[key: `x-bind:${string}`]: string | boolean | number | undefined;
		}

		// Extend specific elements with Alpine attributes
		interface DefinedIntrinsicElements {
			div: HTMLAttributes<HTMLDivElement> & AlpineAttributes;
			span: HTMLAttributes<HTMLSpanElement> & AlpineAttributes;
			p: HTMLAttributes<HTMLParagraphElement> & AlpineAttributes;
			a: HTMLAttributes<HTMLAnchorElement> & AlpineAttributes;
			button: HTMLAttributes<HTMLButtonElement> & AlpineAttributes;
			input: HTMLAttributes<HTMLInputElement> & AlpineAttributes;
			textarea: HTMLAttributes<HTMLTextAreaElement> & AlpineAttributes;
			select: HTMLAttributes<HTMLSelectElement> & AlpineAttributes;
			option: HTMLAttributes<HTMLOptionElement> & AlpineAttributes;
			form: HTMLAttributes<HTMLFormElement> & AlpineAttributes;
			label: HTMLAttributes<HTMLLabelElement> & AlpineAttributes;
			img: HTMLAttributes<HTMLImageElement> & AlpineAttributes;
			ul: HTMLAttributes<HTMLUListElement> & AlpineAttributes;
			ol: HTMLAttributes<HTMLOListElement> & AlpineAttributes;
			li: HTMLAttributes<HTMLLIElement> & AlpineAttributes;
			nav: HTMLAttributes<HTMLElement> & AlpineAttributes;
			header: HTMLAttributes<HTMLElement> & AlpineAttributes;
			footer: HTMLAttributes<HTMLElement> & AlpineAttributes;
			main: HTMLAttributes<HTMLElement> & AlpineAttributes;
			section: HTMLAttributes<HTMLElement> & AlpineAttributes;
			article: HTMLAttributes<HTMLElement> & AlpineAttributes;
			aside: HTMLAttributes<HTMLElement> & AlpineAttributes;
			h1: HTMLAttributes<HTMLHeadingElement> & AlpineAttributes;
			h2: HTMLAttributes<HTMLHeadingElement> & AlpineAttributes;
			h3: HTMLAttributes<HTMLHeadingElement> & AlpineAttributes;
			h4: HTMLAttributes<HTMLHeadingElement> & AlpineAttributes;
			h5: HTMLAttributes<HTMLHeadingElement> & AlpineAttributes;
			h6: HTMLAttributes<HTMLHeadingElement> & AlpineAttributes;
			table: HTMLAttributes<HTMLTableElement> & AlpineAttributes;
			thead: HTMLAttributes<HTMLTableSectionElement> & AlpineAttributes;
			tbody: HTMLAttributes<HTMLTableSectionElement> & AlpineAttributes;
			tr: HTMLAttributes<HTMLTableRowElement> & AlpineAttributes;
			td: HTMLAttributes<HTMLTableCellElement> & AlpineAttributes;
			th: HTMLAttributes<HTMLTableCellElement> & AlpineAttributes;
			svg: HTMLAttributes<SVGElement> & AlpineAttributes;
			path: HTMLAttributes<SVGPathElement> & AlpineAttributes;
		}
	}
}
