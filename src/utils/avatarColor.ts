export const avatarColors = [
  '#e53935', '#8e24aa', '#3949ab', '#00897b',
  '#43a047', '#f4511e', '#6d4c41', '#546e7a',
];

export function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
