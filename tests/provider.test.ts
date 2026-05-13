import { describe, expect, it } from "vitest";
import {
  DisabledProvider,
  ProviderMisconfiguredError,
  ProviderUnavailableError,
  resolveProvider,
  SimulatedProvider,
  TwilioProvider,
} from "@/lib/ohm7/provider";

describe("resolveProvider", () => {
  it("falls back to simulated in development when unset", () => {
    const p = resolveProvider({ NODE_ENV: "development" });
    expect(p).toBeInstanceOf(SimulatedProvider);
  });

  it("falls back to simulated in test when unset", () => {
    const p = resolveProvider({ NODE_ENV: "test" });
    expect(p).toBeInstanceOf(SimulatedProvider);
  });

  it("throws in production when OHM7_MESSAGE_PROVIDER is not set", () => {
    expect(() => resolveProvider({ NODE_ENV: "production" })).toThrow(ProviderMisconfiguredError);
  });

  it("blocks simulated in production by default", () => {
    expect(() =>
      resolveProvider({ NODE_ENV: "production", OHM7_MESSAGE_PROVIDER: "simulated" }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("allows simulated in production only when explicit escape hatch is set", () => {
    const p = resolveProvider({
      NODE_ENV: "production",
      OHM7_MESSAGE_PROVIDER: "simulated",
      OHM7_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION: "true",
    });
    expect(p).toBeInstanceOf(SimulatedProvider);
  });

  it("returns a DisabledProvider when mode=disabled", () => {
    const p = resolveProvider({ NODE_ENV: "production", OHM7_MESSAGE_PROVIDER: "disabled" });
    expect(p).toBeInstanceOf(DisabledProvider);
    expect(p.isLive()).toBe(false);
  });

  it("DisabledProvider refuses to send", async () => {
    const p = new DisabledProvider();
    await expect(
      p.sendVerification({ channel: "sms", toPhone: "+1", code: "000000", context: "x" }),
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("throws when Twilio credentials are missing", () => {
    expect(() =>
      resolveProvider({ NODE_ENV: "production", OHM7_MESSAGE_PROVIDER: "twilio" }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("throws when only Twilio sid is set", () => {
    expect(() =>
      resolveProvider({
        NODE_ENV: "production",
        OHM7_MESSAGE_PROVIDER: "twilio",
        TWILIO_ACCOUNT_SID: "AC1",
      }),
    ).toThrow(ProviderMisconfiguredError);
  });

  it("constructs TwilioProvider when all required env is present", () => {
    const p = resolveProvider({
      NODE_ENV: "production",
      OHM7_MESSAGE_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "AC1",
      TWILIO_AUTH_TOKEN: "tok",
      TWILIO_WHATSAPP_FROM: "whatsapp:+1",
    });
    expect(p).toBeInstanceOf(TwilioProvider);
  });

  it("Twilio still throws on send until REST is wired (no fake success)", async () => {
    const p = new TwilioProvider({
      TWILIO_ACCOUNT_SID: "AC1",
      TWILIO_AUTH_TOKEN: "tok",
      TWILIO_SMS_FROM: "+1",
    });
    await expect(
      p.sendVerification({ channel: "sms", toPhone: "+1", code: "000000", context: "x" }),
    ).rejects.toBeInstanceOf(ProviderMisconfiguredError);
  });

  it("throws when SequenceNow env vars are missing", () => {
    expect(() =>
      resolveProvider({ NODE_ENV: "production", OHM7_MESSAGE_PROVIDER: "sequencenow" }),
    ).toThrow(ProviderMisconfiguredError);
  });
});
