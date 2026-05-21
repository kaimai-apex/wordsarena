export class SeededRandom {
  private state: bigint;

  constructor(seed: number) {
    this.state = BigInt(seed) || 1n;
    if (this.state === 0n) this.state = 1n;
  }

  next(): bigint {
    let x = this.state;
    x ^= x << 13n;
    x ^= x >> 7n;
    x ^= x << 17n;
    this.state = x & 0xffffffffffffffffn;
    return this.state;
  }

  nextInt(upperBound: number): number {
    if (upperBound <= 0) return 0;
    return Number(this.next() % BigInt(upperBound));
  }

  nextDouble(): number {
    return Number(this.next() & 0xffffffffn) / 0x100000000;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(arr.length)]!;
  }
}
