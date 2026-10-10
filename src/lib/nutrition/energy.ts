export const kjPerKcal = 4.184;

export function kcalFromKj(kilojoules: number): number {
  return kilojoules / kjPerKcal;
}
