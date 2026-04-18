import React, { useEffect, useMemo, useState } from 'react';
import { parseBadgeCode } from '../utils/badgeParser.js';
import { downloadAsZip } from '../utils/zipDownload.js';

export interface BadgeManagerProps {
  userId: string;
}

export interface Badge {
  id: string;
  name: string;
  imageUrl: string;
  earnedAt: string;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'quiz' | 'attendance' | 'streak' | 'special';
}

interface BadgeShare {
  recipientEmail: string;
  message: string;
  sentAt: string;
}

const DEFAULT_BADGE_BANK: Badge[] = [
  { id: 'b1', name: 'First Quiz', imageUrl: '/badges/quiz1.png', earnedAt: '', tier: 'bronze', category: 'quiz' },
  { id: 'b2', name: 'Ten Quizzes', imageUrl: '/badges/quiz10.png', earnedAt: '', tier: 'silver', category: 'quiz' },
  { id: 'b3', name: 'Streak', imageUrl: '/badges/streak.png', earnedAt: '', tier: 'gold', category: 'streak' },
];

/**
 * BadgeManager — WSYATM's gamified badge component. The real one is ~230 LOC
 * in production; this fixture trims that to ~110 to keep the whole snapshot
 * under the 50-file budget while still representing a meaningful
 * zero-coverage generation target for Vibe Test's dogfood test.
 */
export function BadgeManager({ userId }: BadgeManagerProps): JSX.Element {
  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGE_BANK);
  const [selected, setSelected] = useState<Badge | null>(null);
  const [shareEmail, setShareEmail] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [shareHistory, setShareHistory] = useState<BadgeShare[]>([]);
  const [codeInput, setCodeInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    // Simulated backend fetch — in the real app, this hits Firestore.
    if (!userId) return;
    setBadges(DEFAULT_BADGE_BANK);
  }, [userId]);

  const stats = useMemo(() => {
    const byTier = badges.reduce<Record<string, number>>((acc, b) => {
      acc[b.tier] = (acc[b.tier] ?? 0) + 1;
      return acc;
    }, {});
    const byCategory = badges.reduce<Record<string, number>>((acc, b) => {
      acc[b.category] = (acc[b.category] ?? 0) + 1;
      return acc;
    }, {});
    return { total: badges.length, byTier, byCategory };
  }, [badges]);

  function handleRedeemCode(): void {
    setError(null);
    try {
      const parsed = parseBadgeCode(codeInput);
      if (!parsed) {
        setError('Invalid code');
        return;
      }
      const nextBadge: Badge = {
        id: parsed.id,
        name: parsed.name,
        imageUrl: parsed.imageUrl,
        earnedAt: new Date().toISOString(),
        tier: parsed.tier,
        category: parsed.category,
      };
      setBadges((prev) => [...prev, nextBadge]);
      setCodeInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Redeem failed');
    }
  }

  function handleShare(): void {
    if (!selected) return;
    if (!shareEmail.includes('@')) {
      setError('Invalid email');
      return;
    }
    const entry: BadgeShare = {
      recipientEmail: shareEmail,
      message: shareMessage,
      sentAt: new Date().toISOString(),
    };
    setShareHistory((prev) => [...prev, entry]);
    setShareEmail('');
    setShareMessage('');
  }

  async function handleDownloadAll(): Promise<void> {
    setIsDownloading(true);
    try {
      await downloadAsZip(badges);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="badge-manager">
      <h2>Your Badges ({stats.total})</h2>
      <ul className="badge-grid">
        {badges.map((b) => (
          <li key={b.id} className={`badge badge-${b.tier}`}>
            <img src={b.imageUrl} alt={b.name} />
            <span>{b.name}</span>
            <button onClick={() => setSelected(b)}>Select</button>
          </li>
        ))}
      </ul>
      <div className="badge-redeem">
        <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Redemption code" />
        <button onClick={handleRedeemCode}>Redeem</button>
      </div>
      {selected && (
        <div className="badge-share">
          <h3>Share {selected.name}</h3>
          <input
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            placeholder="friend@example.com"
          />
          <textarea
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            placeholder="Message"
          />
          <button onClick={handleShare}>Send</button>
        </div>
      )}
      <button onClick={handleDownloadAll} disabled={isDownloading}>
        {isDownloading ? 'Downloading…' : 'Download all badges (.zip)'}
      </button>
      {error && <p className="error">{error}</p>}
      {shareHistory.length > 0 && <p>{shareHistory.length} shares sent</p>}
    </section>
  );
}

export default BadgeManager;
