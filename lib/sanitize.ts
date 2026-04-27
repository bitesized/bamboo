// Strip dangerous HTML while preserving safe formatting from Google Books descriptions.
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\s+on\w+=(["'])[^"']*\1/gi, "")
    .replace(/href=(["'])javascript:[^"']*\1/gi, 'href="#"');
}
