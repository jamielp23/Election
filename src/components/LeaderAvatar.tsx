import { useState } from 'react';
import { leaderPhotoUrl, initials } from '../data/leaders';
import { hexA } from '../lib/format';

/**
 * Party-leader headshot with a graceful fallback: shows the photo when
 * available, party-coloured initials when there's a name but no image, and a
 * neutral placeholder when there is no leader yet.
 */
export function LeaderAvatar({
  photo,
  name,
  color,
  size = 48,
  className = '',
}: {
  photo: string | null;
  name: string | null;
  color: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = photo && name && !failed;
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border ${className}`}
      style={{ width: size, height: size, borderColor: hexA(color, 0.5), background: hexA(color, 0.14) }}
    >
      {showImg ? (
        <img
          src={leaderPhotoUrl(photo)}
          alt={name ?? ''}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : name ? (
        <span className="num font-bold" style={{ color, fontSize: size * 0.32 }}>
          {initials(name)}
        </span>
      ) : (
        <span className="text-white/25" style={{ fontSize: size * 0.4 }}>
          —
        </span>
      )}
    </div>
  );
}
