export function invitationSlug(value) {
  const text = String(value || '').trim();
  let slug = text;
  if (/^https?:\/\//i.test(text) || text.startsWith('?')) {
    const url = new URL(text, 'https://invitation.invalid/');
    slug = url.searchParams.get('w') || '';
  }
  slug = slug.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    throw new Error('invalid-invitation');
  }
  return slug;
}

export function weddingLink(base, slug, admin = false) {
  const url = new URL(base);
  url.search = '';
  url.searchParams.set('w', invitationSlug(slug));
  url.hash = admin ? 'admin' : '';
  return url.href;
}
