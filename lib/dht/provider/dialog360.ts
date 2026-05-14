import {
  MessageProvider,
  ProviderMisconfiguredError,
  SendMessageInput,
  SendMessageResult,
} from "./types";

export class Dialog360Provider implements MessageProvider {
  readonly mode = "dialog360" as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://waba-v2.360dialog.io",
  ) {
    void this.apiKey;
    void this.baseUrl;
  }

  isLive(): boolean {
    return true;
  }

  async send(_input: SendMessageInput): Promise<SendMessageResult> {
    // TODO(v0.4): wire POST {baseUrl}/messages with the `D360-API-KEY` header.
    // Reference: https://docs.360dialog.com/whatsapp-cloud-api/sending-messages
    // For templates: body should be { messaging_product: 'whatsapp', to,
    //   type: 'template', template: { name, language: { code }, components: [...] } }
    throw new ProviderMisconfiguredError(
      "Dialog360Provider.send not implemented. Wire API call before going live.",
    );
  }
}

type Dialog360Env = { DHT_DIALOG360_API_KEY?: string; DHT_DIALOG360_BASE_URL?: string } & Record<string, string | undefined>;

export function buildDialog360FromEnv(env: Dialog360Env = process.env as unknown as Dialog360Env): Dialog360Provider {
  const apiKey = env.DHT_DIALOG360_API_KEY;
  if (!apiKey) {
    throw new ProviderMisconfiguredError(
      "DHT_DIALOG360_API_KEY required when DHT_MESSAGE_PROVIDER=dialog360",
    );
  }
  return new Dialog360Provider(apiKey, env.DHT_DIALOG360_BASE_URL);
}
