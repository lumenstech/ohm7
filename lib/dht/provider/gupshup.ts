import {
  MessageProvider,
  ProviderMisconfiguredError,
  SendMessageInput,
  SendMessageResult,
} from "./types";

export class GupshupProvider implements MessageProvider {
  readonly mode = "gupshup" as const;

  constructor(
    private readonly apiKey: string,
    private readonly appName: string,
    private readonly sourceNumber: string,
    private readonly baseUrl: string = "https://api.gupshup.io/wa/api/v1",
  ) {
    void this.apiKey;
    void this.appName;
    void this.sourceNumber;
    void this.baseUrl;
  }

  isLive(): boolean {
    return true;
  }

  async send(_input: SendMessageInput): Promise<SendMessageResult> {
    // TODO(v0.4): wire POST {baseUrl}/template/msg with the `apikey` header.
    // Reference: https://docs.gupshup.io/reference/sendtemplatemessage
    throw new ProviderMisconfiguredError(
      "GupshupProvider.send not implemented. Wire API call before going live.",
    );
  }
}

type GupshupEnv = {
  DHT_GUPSHUP_API_KEY?: string;
  DHT_GUPSHUP_APP_NAME?: string;
  DHT_GUPSHUP_SOURCE_NUMBER?: string;
} & Record<string, string | undefined>;

export function buildGupshupFromEnv(env: GupshupEnv = process.env as unknown as GupshupEnv): GupshupProvider {
  const apiKey = env.DHT_GUPSHUP_API_KEY;
  const appName = env.DHT_GUPSHUP_APP_NAME;
  const source = env.DHT_GUPSHUP_SOURCE_NUMBER;
  if (!apiKey || !appName || !source) {
    throw new ProviderMisconfiguredError(
      "DHT_GUPSHUP_API_KEY + DHT_GUPSHUP_APP_NAME + DHT_GUPSHUP_SOURCE_NUMBER required when DHT_MESSAGE_PROVIDER=gupshup",
    );
  }
  return new GupshupProvider(apiKey, appName, source);
}
