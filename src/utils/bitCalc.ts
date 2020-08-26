export function combineBits(bits: number[]): number {
  const step = bits.length - 1;
  const interval = 8;

  return bits
    .map((bit, i) => {
      return bit << ((step - i) * interval);
    })
    .reduce((v1, v2) => v1 | v2);
}
