/**
 * Party leaders (name + headshot).
 *
 * Photos are loaded at runtime from `public/leaders/<file>` so the app builds
 * and runs even before the image files are added; a clean initials avatar is
 * shown as a fallback when a photo is missing. Keyed by the model party name.
 */
export interface LeaderInfo {
  name: string | null;
  /** File under public/leaders/, or null to always show the fallback. */
  photo: string | null;
}

export const LEADERS: Record<string, LeaderInfo> = {
  'Social-Democrats': { name: 'Jason MacPherson', photo: 'jason-macpherson.jpg' },
  Conservatives: { name: 'John Sunderland', photo: 'john-sunderland.jpg' },
  Liberals: { name: 'Elizabeth Merson', photo: 'elizabeth-merson.jpg' },
  Nationalist: { name: 'Mark Boyd', photo: 'mark-boyd.jpg' },
  Independent: { name: null, photo: null },
  'BP First': { name: null, photo: null },
};

/** Resolve a photo filename to a URL under the app's base path. */
export function leaderPhotoUrl(file: string): string {
  return `${import.meta.env.BASE_URL}leaders/${file}`;
}

/** Initials for the fallback avatar (e.g. "Jason MacPherson" -> "JM"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}
