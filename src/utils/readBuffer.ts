export function getUint8ArrayReader(
  buffer: ArrayBuffer
): { reader: (length: number) => Uint8Array; isEnd: () => boolean } {
  let offset = 0;
  const totalUi8a = new Uint8Array(buffer);

  return {
    reader: (length: number): Uint8Array => {
      const ui8a = new Uint8Array(length);
      for (let index = 0; index < length; index++) {
        ui8a[index] = totalUi8a[offset];
        offset++;
      }
      return ui8a;
    },
    isEnd: () => offset === buffer.byteLength,
  };
}
