export function buildDuplicateInfoMessage(
  transformDate: any,
  dubs: {
    date: Date;
    userName: string;
    amount: number;
  }[],
): string {
  const html = dubs
    .map((d) => `- ${transformDate(d.date)} - ${d.userName} - ${d.amount}`)
    .join('\n');
  return html;
}
