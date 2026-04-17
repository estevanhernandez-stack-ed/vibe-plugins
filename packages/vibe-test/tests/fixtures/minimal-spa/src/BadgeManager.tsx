import { memo, useCallback } from 'react';

interface BadgeManagerProps {
  userId: string;
  onBadgeEarned: (badgeId: string) => void;
}

function BadgeManagerImpl({ userId, onBadgeEarned }: BadgeManagerProps) {
  const award = useCallback(() => {
    onBadgeEarned(`badge-${userId}`);
  }, [userId, onBadgeEarned]);
  return (
    <div>
      <span>{userId}</span>
      <button onClick={award}>Award Badge</button>
    </div>
  );
}

export const BadgeManager = memo(BadgeManagerImpl);
