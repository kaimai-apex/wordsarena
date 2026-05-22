export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

export type UsernameIdentity = {
  fullName?: string | null;
  name?: string | null;
  userName?: string | null;
  email?: string | null;
};

/** Derive a base username from OAuth metadata or email local-part. */
export function deriveUsername(identity: UsernameIdentity): string {
  const raw = (
    identity.fullName ||
    identity.name ||
    identity.userName ||
    identity.email?.split('@')[0] ||
    'player'
  ).toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return cleaned.slice(0, 20) || 'player';
}
