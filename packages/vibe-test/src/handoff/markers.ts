/**
 * Marker utilities for Builder-Sustainable Handoff writers.
 *
 * Every Vibe Test-managed section of a generated artifact (TESTING.md, etc.)
 * is wrapped in a pair of HTML comments:
 *
 *   <!-- vibe-test:start:<section> -->
 *   ...managed content...
 *   <!-- vibe-test:end:<section> -->
 *
 * On re-write, the writer parses the existing file, locates every marker pair,
 * and swaps only the managed region. Builder edits outside markers — and new
 * markers-less sections the builder adds — are preserved verbatim.
 */
export const MARKER_PREFIX = 'vibe-test';

export function startMarker(section: string): string {
  return `<!-- ${MARKER_PREFIX}:start:${section} -->`;
}

export function endMarker(section: string): string {
  return `<!-- ${MARKER_PREFIX}:end:${section} -->`;
}

/** Wrap content in start/end markers for a given section name. */
export function wrapSection(section: string, content: string): string {
  return `${startMarker(section)}\n${content}\n${endMarker(section)}`;
}

/**
 * Replace (or insert) the marker-delimited region for a section in `source`.
 * - If the marker pair exists, only the inner region is swapped.
 * - If the pair is missing, the whole wrapped section is appended.
 *
 * Content between the markers in the existing source is discarded — callers
 * who want to preserve builder edits must place those edits OUTSIDE the
 * markers.
 */
export function replaceSection(source: string, section: string, newContent: string): string {
  const start = startMarker(section);
  const end = endMarker(section);
  const startIdx = source.indexOf(start);
  const endIdx = source.indexOf(end, startIdx >= 0 ? startIdx : 0);
  const replacement = wrapSection(section, newContent);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    // No existing pair — append. Ensure a blank line separator.
    const sep = source.length > 0 && !source.endsWith('\n\n') ? (source.endsWith('\n') ? '\n' : '\n\n') : '';
    return `${source}${sep}${replacement}\n`;
  }
  const before = source.slice(0, startIdx);
  const after = source.slice(endIdx + end.length);
  return `${before}${replacement}${after}`;
}

/**
 * Extract the current inner content of a marker-delimited section, or null if
 * the section is absent. Whitespace trimmed.
 */
export function extractSection(source: string, section: string): string | null {
  const start = startMarker(section);
  const end = endMarker(section);
  const startIdx = source.indexOf(start);
  if (startIdx === -1) return null;
  const innerStart = startIdx + start.length;
  const endIdx = source.indexOf(end, innerStart);
  if (endIdx === -1) return null;
  return source.slice(innerStart, endIdx).replace(/^\n/, '').replace(/\n$/, '');
}
