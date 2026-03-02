export type RandomFn = () => number;

export function shuffleInPlace<T>(items: T[], random: RandomFn): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j] as T;
    items[j] = tmp as T;
  }
  return items;
}
