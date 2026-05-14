import {
  MessageProvider,
  ProviderMisconfiguredError,
  ProviderMode,
} from "./types";
import { buildDialog360FromEnv } from "./dialog360";
import { buildGupshupFromEnv } from "./gupshup";
import { SimulatedProvider } from "./simulated";
import { DisabledProvider } from "./disabled";

export * from "./types";
export { SimulatedProvider } from "./simulated";
export { DisabledProvider } from "./disabled";
export { Dialog360Provider } from "./dialog360";
export { GupshupProvider } from "./gupshup";

let _instance: MessageProvider | null = null;

type ProviderEnv = {
  NODE_ENV?: string;
  DHT_MESSAGE_PROVIDER?: string;
  DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION?: string;
  DHT_DIALOG360_API_KEY?: string;
  DHT_DIALOG360_BASE_URL?: string;
  DHT_GUPSHUP_API_KEY?: string;
  DHT_GUPSHUP_APP_NAME?: string;
  DHT_GUPSHUP_SOURCE_NUMBER?: string;
};

export function resolveProvider(env: ProviderEnv = process.env): MessageProvider {
  const mode = (env.DHT_MESSAGE_PROVIDER ?? "").trim().toLowerCase() as ProviderMode | "";
  const nodeEnv = env.NODE_ENV ?? "development";

  if (!mode) {
    if (nodeEnv === "production") {
      throw new ProviderMisconfiguredError(
        "DHT_MESSAGE_PROVIDER must be set in production",
      );
    }
    return new SimulatedProvider();
  }

  if (mode === "simulated") {
    if (
      nodeEnv === "production" &&
      env.DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION !== "true"
    ) {
      throw new ProviderMisconfiguredError(
        "simulated provider in production requires DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true",
      );
    }
    return new SimulatedProvider();
  }

  if (mode === "disabled") return new DisabledProvider();
  if (mode === "dialog360") return buildDialog360FromEnv(env);
  if (mode === "gupshup") return buildGupshupFromEnv(env);

  throw new ProviderMisconfiguredError(`Unknown DHT_MESSAGE_PROVIDER: ${mode}`);
}

export function getProvider(): MessageProvider {
  if (!_instance) _instance = resolveProvider();
  return _instance;
}

export function _resetProviderForTests() {
  _instance = null;
}
