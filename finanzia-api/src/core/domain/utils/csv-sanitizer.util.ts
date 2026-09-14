/**
 * Neutraliza intentos de CSV Formula Injection (ej. =cmd|' /C calc'!A0, @SUM, +cmd, etc.)
 * anteponiendo un apóstrofe si la cadena comienza con caracteres de comando de hoja de cálculo.
 */
export function sanitizeCsvField(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];

  if (dangerousChars.some((char) => trimmed.startsWith(char))) {
    return `'${trimmed}`;
  }

  return trimmed;
}
