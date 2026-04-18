// Deliberately uncovered utility — parses redemption codes into Badge shape.
// Shape is mirrored in BadgeManager.tsx; real WSYATM parser is a signed JWT.

/**
 * @param {string} code
 * @returns {null | {id:string; name:string; imageUrl:string; tier:'bronze'|'silver'|'gold'; category:'quiz'|'attendance'|'streak'|'special'}}
 */
export function parseBadgeCode(code) {
  if (!code || typeof code !== 'string') return null;
  const parts = code.split(':');
  if (parts.length < 4) return null;
  const [id, name, tier, category] = parts;
  const validTiers = ['bronze', 'silver', 'gold'];
  const validCategories = ['quiz', 'attendance', 'streak', 'special'];
  if (!validTiers.includes(tier)) return null;
  if (!validCategories.includes(category)) return null;
  return {
    id,
    name,
    imageUrl: `/badges/${id}.png`,
    tier,
    category,
  };
}
