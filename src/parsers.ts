export function parse16BitValue(
  registers: number[],
  index: number,
  scale: number = 1
): number {
  return registers[index] / scale;
}

export function parse32BitValue(
  registers: number[],
  index: number,
  scale: number = 1
): number {
  return ((registers[index] << 16) | registers[index + 1]) / scale;
}

export function parseSignedValue(
  registers: number[],
  index: number,
  scale: number = 1
): number {
  let value = registers[index];
  if (value > 32767) value -= 65536;
  return value / scale;
}

export function decodeString(registers: number[]): string {
  const bytes: number[] = [];
  registers.forEach((register) => {
    bytes.push((register >> 8) & 0xff);
    bytes.push(register & 0xff);
  });
  return String.fromCharCode(...bytes).replace(/\0/g, "");
}
