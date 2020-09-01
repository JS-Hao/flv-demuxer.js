export default function mergeBuffer(
  ...buffers: Array<Uint8Array>
): ArrayBuffer {
  const length = buffers.map(v => v.byteLength).reduce((v1, v2) => v1 + v2);
  const mergedBuffer = new ArrayBuffer(length);
  const mergedUi8a = new Uint8Array(mergedBuffer);

  let offset = 0;

  buffers.forEach(buffer => {
    mergedUi8a.set(buffer, offset);
    offset += buffer.byteLength;
  });

  return mergedBuffer;
}
