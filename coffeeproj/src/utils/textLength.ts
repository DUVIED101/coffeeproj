/**
 * Effective length of a multiline string when a line break is treated as if
 * it padded the remainder of its visible line. Prevents users from gaming a
 * character limit by spamming Enter to leave very short lines.
 *
 * For each line that is followed by a newline, the cost is at least the line
 * width (or the line's own length, whichever is larger — so a long wrapped
 * line still counts by its real character count). The final line (with no
 * trailing newline) costs only its own characters.
 *
 * Example: VIRTUAL_LINE_WIDTH=40, text="hi\nworld"
 *   "hi" + "\n" → max(2, 40) = 40
 *   "world"     → 5
 *   total = 45
 */
export const VIRTUAL_LINE_WIDTH = 40;

export function effectiveTextLength(text: string, lineWidth = VIRTUAL_LINE_WIDTH): number {
  if (text.length === 0) return 0;
  const lines = text.split('\n');
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length;
    const isLast = i === lines.length - 1;
    total += isLast ? lineLen : Math.max(lineLen, lineWidth);
  }
  return total;
}

/**
 * Returns text trimmed so its `effectiveTextLength` is ≤ `maxEffective`.
 * Used by `onChangeText` handlers to reject keystrokes that would exceed the
 * effective limit (raw `maxLength` can't express this).
 */
export function clampToEffectiveLength(
  text: string,
  maxEffective: number,
  lineWidth = VIRTUAL_LINE_WIDTH
): string {
  if (effectiveTextLength(text, lineWidth) <= maxEffective) return text;
  let result = '';
  for (const ch of text) {
    if (effectiveTextLength(result + ch, lineWidth) > maxEffective) break;
    result += ch;
  }
  return result;
}
