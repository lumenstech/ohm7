import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ().-]{7,20}$/u, "Enter a valid phone number");

export const emailSchema = z.string().trim().email("Enter a valid email").max(200);

export const protectionTypeSchema = z.enum([
  "standard",
  "afci",
  "gfci",
  "dfci",
  "cafci",
  "dual_function",
]);

export const createGrantSchema = z.object({
  shortCode: z.string().min(4).max(32),
  requesterName: z.string().trim().min(1).max(120),
  requesterCompany: z.string().trim().max(120).optional().or(z.literal("")),
  requesterPhone: phoneSchema.optional().or(z.literal("")),
  requesterEmail: emailSchema.optional().or(z.literal("")),
  requesterLicense: z.string().trim().max(60).optional().or(z.literal("")),
  reason: z.string().trim().max(500),
  scope: z.enum(["property", "panel", "unit"]).default("property"),
});

export const createClaimSchema = z.object({
  shortCode: z.string().min(4).max(32),
  claimantName: z.string().trim().min(1).max(120),
  claimantPhone: phoneSchema,
  claimantEmail: emailSchema.optional().or(z.literal("")),
  submittedAddress: z.string().trim().min(3).max(200),
  submittedCity: z.string().trim().max(80).optional().or(z.literal("")),
  submittedState: z.string().trim().max(20).optional().or(z.literal("")),
  submittedZip: z.string().trim().max(20).optional().or(z.literal("")),
  unitNumber: z.string().trim().max(40).optional().or(z.literal("")),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
});

export const verifyClaimSchema = z.object({
  claimId: z.string().min(1),
  code: z.string().regex(/^[0-9]{6}$/u, "Enter the 6-digit code"),
});

export const createPropertySchema = z.object({
  addressLine1: z.string().trim().min(2).max(160),
  addressLine2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(20).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
  jurisdictionId: z.string().optional().or(z.literal("")),
  propertyType: z.enum(["single_family", "multi_family", "commercial", "mixed_use"]).default("single_family"),
  unitCount: z.coerce.number().int().min(1).max(10000).default(1),
  nickname: z.string().trim().max(80).optional().or(z.literal("")),
});

export const createPanelSchema = z.object({
  propertyId: z.string().min(1),
  nickname: z.string().trim().max(80).optional().or(z.literal("")),
  locationDescription: z.string().trim().max(200).optional().or(z.literal("")),
  manufacturer: z.string().trim().max(80).optional().or(z.literal("")),
  panelLine: z.string().trim().max(80).optional().or(z.literal("")),
  modelNumber: z.string().trim().max(80).optional().or(z.literal("")),
  serialNumber: z.string().trim().max(80).optional().or(z.literal("")),
  busRatingAmps: z.coerce.number().int().min(0).max(10000).optional(),
  mainBreakerAmps: z.coerce.number().int().min(0).max(10000).optional(),
  voltage: z.string().trim().max(20).optional().or(z.literal("")),
  phase: z.enum(["single_phase", "three_phase", "split_phase", "unknown"]).default("single_phase"),
  numSpaces: z.coerce.number().int().min(0).max(200).optional(),
  installationYear: z.coerce.number().int().min(1900).max(2100).optional(),
  conditionNotes: z.string().trim().max(500).optional().or(z.literal("")),
  stickerPlacement: z.enum(["outside_cover", "deadfront", "inside_panel", "unknown"]).default("unknown"),
});

export const createCircuitSchema = z.object({
  panelId: z.string().min(1),
  circuitNumber: z.coerce.number().int().min(1).max(200),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  areaServed: z.string().trim().max(120).optional().or(z.literal("")),
  loadType: z.string().trim().max(120).optional().or(z.literal("")),
  breakerAmperage: z.coerce.number().int().min(0).max(1000).optional(),
  breakerPoleCount: z.coerce.number().int().min(1).max(3).optional(),
  breakerManufacturer: z.string().trim().max(80).optional().or(z.literal("")),
  breakerModel: z.string().trim().max(80).optional().or(z.literal("")),
  protectionType: protectionTypeSchema.default("standard"),
  isTandem: z.coerce.boolean().default(false),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const createServiceEventSchema = z.object({
  propertyId: z.string().min(1),
  panelId: z.string().optional().or(z.literal("")),
  circuitId: z.string().optional().or(z.literal("")),
  unitId: z.string().optional().or(z.literal("")),
  trade: z.enum(["electrical", "plumbing", "hvac", "general", "roofing", "other"]).default("electrical"),
  eventType: z.string().trim().min(1).max(40),
  summary: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  necSectionReferenced: z.string().trim().max(200).optional().or(z.literal("")), // comma-separated → split later
  invoiceReference: z.string().trim().max(120).optional().or(z.literal("")),
});

export const createTenantRequestSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional().or(z.literal("")),
  category: z.enum(["electrical", "plumbing", "hvac", "other"]).default("electrical"),
  summary: z.string().trim().min(1).max(200),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200),
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(["owner", "trade", "tenant"]).default("owner"),
  phone: phoneSchema.optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
