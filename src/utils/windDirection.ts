/**
 * Convert degrees to 16-point compass direction text.
 */
export function dirText(deg: number): string {
  const dirs = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO',
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}
