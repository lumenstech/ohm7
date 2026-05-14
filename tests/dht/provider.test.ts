import { describe, expect, it } from "vitest";
import {
  Dialog360Provider,
  DisabledProvider,
  GupshupProvider,
  ProviderMisconfiguredError,
  ProviderUnavailableError,
  resolveProvider,
  SimulatedProvider,
} from "@/lib/dht/provider";

describe("resolveProvider", () => {
  it("falls back to simulated in development when unset", () => {
    const p = resolveProvider({ NODE_ENV: "development" });
    expect(p).toBeInstanceOf(SimulatedProvider);
  });

  it("falls back to simulated in test when unset", () => {
    const p = resolveProvider({ NODE_ENV: "test" });
    expect(p).toBeInstanceOf(SimulatedProvider);
  });

  it("throws in production when DHT_MESSAGE_PROVIDER is not set", () => {
    expect(() => resolveProvider({ NODE_ENV: "production" })).toThrow(ProviderMisconfiguredError);
  });

  it("blocks simulated in production by default", () => {
    expect(() =>
      resolveProvider({ NODE_ENV: "production", DHT_MESSAGE_PROVIDER: "simulated" }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("allows simulated in production only with the explicit escape hatch", () => {
    const p = resolveProvider({
      NODE_ENV: "production",
      DHT_MESSAGE_PROVIDER: "simulated",
      DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION: "true",
    });
    expect(p).toBeInstanceOf(SimulatedProvider);
  });

  it("returns a DisabledProvider when mode=disabled", async () => {
    const p = resolveProvider({ NODE_ENV: "production", DHT_MESSAGE_PROVIDER: "disabled" });
    expect(p).toBeInstanceOf(DisabledProvider);
    expect(p.isLive()).toBe(false);
  });

  it("DisabledProvider refuses to send", async () => {
    const p = new DisabledProvider();
    await expect(
      p.send({ to: "+1", channel: "sms", freeform: { body: "hi" } }),
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("rejects 'twilio' as an unknown mode (Twilio removed in v0.3.1)", () => {
    expect(() =>
      resolveProvider({ NODE_ENV: "production", DHT_MESSAGE_PROVIDER: "twilio" }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("constructs Dialog360Provider when DHT_DIALOG360_API_KEY is set", () => {
    const p = resolveProvider({
      NODE_ENV: "production",
      DHT_MESSAGE_PROVIDER: "dialog360",
      DHT_DIALOG360_API_KEY: "test-key",
    });
    expect(p).toBeInstanceOf(Dialog360Provider);
  });

  it("Dialog360 throws when DHT_DIALOG360_API_KEY is missing", () => {
    expect(() =>
      resolveProvider({ NODE_ENV: "production", DHT_MESSAGE_PROVIDER: "dialog360" }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("Dialog360 still throws on send until REST is wired (no fake success)", async () => {
    const p = new Dialog360Provider("test-key");
    await expect(
      p.send({ to: "+1", channel: "whatsapp", freeform: { body: "hi" } }),
    ).rejects.toBeInstanceOf(ProviderMisconfiguredError);
  });

  it("constructs GupshupProvider when all required env is present", () => {
    const p = resolveProvider({
      NODE_ENV: "production",
      DHT_MESSAGE_PROVIDER: "gupshup",
      DHT_GUPSHUP_API_KEY: "k",
      DHT_GUPSHUP_APP_NAME: "app",
      DHT_GUPSHUP_SOURCE_NUMBER: "+1",
    });
    expect(p).toBeInstanceOf(GupshupProvider);
  });

  it("Gupshup throws when required env is missing", () => {
    expect(() =>
      resolveProvider({
        NODE_ENV: "production",
        DHT_MESSAGE_PROVIDER: "gupshup",
        DHT_GUPSHUP_API_KEY: "k",
      }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("Gupshup still throws on send until REST is wired", async () => {
    const p = new GupshupProvider("k", "app", "+1");
    await expect(
      p.send({ to: "+1", channel: "whatsapp", freeform: { body: "hi" } }),
    ).rejects.toBeInstanceOf(ProviderMisconfiguredError);
  });

  it("SimulatedProvider records sends to the outbox", async () => {
    SimulatedProvider.drainOutbox();
    const p = new SimulatedProvider();
    await p.send({ to: "+1", channel: "whatsapp", freeform: { body: "demo" } });
    const out = SimulatedProvider.drainOutbox();
    expect(out).toHaveLength(1);
    expect(out[0].to).toBe("+1");
  });
});
