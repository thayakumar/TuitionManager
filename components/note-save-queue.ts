/** Serial, revision-aware persistence for one scoped lesson note. */
export class NoteSaveQueue {
  private latest: string;
  private persisted: string;
  private pending: Promise<void> | null = null;
  constructor(
    initial: string,
    private write: (value: string) => Promise<void>,
  ) {
    this.latest = initial;
    this.persisted = initial;
  }
  update(value: string) {
    this.latest = value;
  }
  get dirty() {
    return this.latest !== this.persisted;
  }
  async flush(onSaved?: (current: boolean) => void): Promise<void> {
    if (this.pending) return this.pending;
    const work = (async () => {
      while (this.dirty) {
        const value = this.latest;
        await this.write(value);
        this.persisted = value;
        onSaved?.(!this.dirty);
      }
    })();
    this.pending = work;
    try {
      await work;
    } finally {
      this.pending = null;
    }
  }
}
