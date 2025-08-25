export type StartOptions = {
  instructions: string;
  voice: string;
  temperature: number;
  tools: any[];
};

export class VoiceSession {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  async start(_options: StartOptions): Promise<void> {
    // Placeholder implementation to satisfy type checks and prevent build-time errors.
    // Replace with actual voice session implementation as needed.
    return;
  }

  stop(): void {
    // Placeholder stop method
  }
}
