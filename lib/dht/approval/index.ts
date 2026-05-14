import {
  ApprovalOrchestrator,
  OrchestratorMisconfiguredError,
  OrchestratorMode,
} from "./types";
import { buildSequenceNowFromEnv } from "./sequencenow";
import { DisabledOrchestrator } from "./disabled";
import { getProvider, resolveProvider } from "@/lib/dht/provider";

export * from "./types";
export { SequenceNowOrchestrator } from "./sequencenow";
export { DisabledOrchestrator } from "./disabled";

let _instance: ApprovalOrchestrator | null = null;

type OrchestratorEnv = {
  NODE_ENV?: string;
  DHT_APPROVAL_ORCHESTRATOR?: string;
  DHT_SEQUENCENOW_WEBHOOK_SECRET?: string;
};

export function resolveOrchestrator(
  env: OrchestratorEnv & Record<string, string | undefined> = process.env,
): ApprovalOrchestrator {
  const mode = (env.DHT_APPROVAL_ORCHESTRATOR ?? "").trim().toLowerCase() as OrchestratorMode | "";
  const nodeEnv = env.NODE_ENV ?? "development";

  if (!mode) {
    if (nodeEnv === "production") {
      throw new OrchestratorMisconfiguredError(
        "DHT_APPROVAL_ORCHESTRATOR must be set in production",
      );
    }
    return new DisabledOrchestrator();
  }

  if (mode === "disabled") return new DisabledOrchestrator();
  if (mode === "sequencenow") {
    // For test environments where env !== process.env we want the provider
    // resolution to honour the same env object too.
    const provider = env === process.env ? getProvider() : resolveProvider(env);
    return buildSequenceNowFromEnv(provider, env);
  }
  throw new OrchestratorMisconfiguredError(`Unknown DHT_APPROVAL_ORCHESTRATOR: ${mode}`);
}

export function getOrchestrator(): ApprovalOrchestrator {
  if (!_instance) _instance = resolveOrchestrator();
  return _instance;
}

export function _resetOrchestratorForTests() {
  _instance = null;
}
