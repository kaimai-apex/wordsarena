export function getWebUrl(): string {
  if (process.env.WEB_URL) return process.env.WEB_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
