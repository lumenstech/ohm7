import {
  MessageProvider,
  SendMessageInput,
  SendMessageResult,
} from "./types";

type OutboxEntry = SendMessageInput & { sentAt: Date; id: string };

// Process-local outbox so tests can assert what was "sent".
const _outbox: OutboxEntry[] = [];

export class SimulatedProvider implements MessageProvider {
  readonly mode = "simulated" as const;

  isLive(): boolean {
    return false;
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    _outbox.push({ ...input, sentAt: new Date(), id });
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(
        `[SimulatedProvider] → ${input.to}`,
        input.template ?? input.freeform,
      );
    }
    return { providerMessageId: id, acceptedAt: new Date() };
  }

  static drainOutbox(): OutboxEntry[] {
    return _outbox.splice(0, _outbox.length);
  }

  static peekOutbox(): OutboxEntry[] {
    return [..._outbox];
  }
}
