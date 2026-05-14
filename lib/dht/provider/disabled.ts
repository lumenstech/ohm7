import {
  MessageProvider,
  ProviderUnavailableError,
  SendMessageInput,
  SendMessageResult,
} from "./types";

export class DisabledProvider implements MessageProvider {
  readonly mode = "disabled" as const;

  isLive(): boolean {
    return false;
  }

  async send(_input: SendMessageInput): Promise<SendMessageResult> {
    throw new ProviderUnavailableError(
      "Messaging provider is disabled. Set DHT_MESSAGE_PROVIDER to enable.",
    );
  }
}
