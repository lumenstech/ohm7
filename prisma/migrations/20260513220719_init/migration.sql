-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'trade', 'tenant', 'admin');

-- CreateEnum
CREATE TYPE "JurisdictionLevel" AS ENUM ('state', 'county', 'municipal');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('single_family', 'multi_family', 'commercial', 'mixed_use');

-- CreateEnum
CREATE TYPE "StickerPlacement" AS ENUM ('outside_cover', 'deadfront', 'inside_panel', 'unknown');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('single_phase', 'three_phase', 'split_phase', 'unknown');

-- CreateEnum
CREATE TYPE "ProtectionType" AS ENUM ('standard', 'afci', 'gfci', 'dfci', 'cafci', 'dual_function');

-- CreateEnum
CREATE TYPE "ShortCodeStatus" AS ENUM ('unassigned', 'active', 'replaced', 'retired');

-- CreateEnum
CREATE TYPE "ScanOutcome" AS ENUM ('viewed_public', 'auth_prompted', 'access_requested', 'granted', 'denied', 'timeout');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'sent', 'verified', 'failed', 'stalled', 'manually_verified');

-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('whatsapp', 'sms', 'manual', 'simulated');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('pending', 'approved', 'denied', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "GrantCreatedVia" AS ENUM ('scan', 'portal', 'api');

-- CreateEnum
CREATE TYPE "GrantScope" AS ENUM ('property', 'panel', 'unit');

-- CreateEnum
CREATE TYPE "ServiceEventSource" AS ENUM ('manual', 'scan', 'invoicechats', 'api');

-- CreateEnum
CREATE TYPE "Trade" AS ENUM ('electrical', 'plumbing', 'hvac', 'general', 'roofing', 'other');

-- CreateEnum
CREATE TYPE "TenantRequestStatus" AS ENUM ('open', 'acknowledged', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TenantInviteStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurisdiction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "level" "JurisdictionLevel" NOT NULL,
    "parentId" TEXT,
    "necEdition" TEXT,
    "necEditionYear" INTEGER,
    "necAdoptedDate" TIMESTAMP(3),
    "ahjUrl" TEXT,
    "notes" TEXT,
    "amendments" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "jurisdictionId" TEXT,
    "propertyType" "PropertyType" NOT NULL DEFAULT 'single_family',
    "unitCount" INTEGER NOT NULL DEFAULT 1,
    "yearBuilt" INTEGER,
    "parcelId" TEXT,
    "ownerUserId" TEXT,
    "nickname" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "unitNumber" TEXT,
    "floor" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "nickname" TEXT,
    "locationDescription" TEXT,
    "manufacturer" TEXT,
    "panelLine" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "busRatingAmps" INTEGER,
    "mainBreakerAmps" INTEGER,
    "voltage" TEXT,
    "phase" "Phase" NOT NULL DEFAULT 'single_phase',
    "numSpaces" INTEGER,
    "maxCircuits" INTEGER,
    "serviceEntrance" BOOLEAN NOT NULL DEFAULT false,
    "isMain" BOOLEAN NOT NULL DEFAULT true,
    "fedFromPanelId" TEXT,
    "installationYear" INTEGER,
    "conditionNotes" TEXT,
    "stickerPlacement" "StickerPlacement" NOT NULL DEFAULT 'unknown',
    "recallFlag" BOOLEAN NOT NULL DEFAULT false,
    "recallReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circuit" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "circuitNumber" INTEGER NOT NULL,
    "positionB" INTEGER,
    "label" TEXT,
    "areaServed" TEXT,
    "loadType" TEXT,
    "breakerAmperage" INTEGER,
    "breakerPoleCount" INTEGER,
    "breakerManufacturer" TEXT,
    "breakerModel" TEXT,
    "protectionType" "ProtectionType" NOT NULL DEFAULT 'standard',
    "isTandem" BOOLEAN NOT NULL DEFAULT false,
    "wireSizeAwg" TEXT,
    "wireMethod" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "addedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circuit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanelShortCode" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "propertyId" TEXT,
    "panelId" TEXT,
    "locationLabel" TEXT,
    "stickerBatchId" TEXT,
    "status" "ShortCodeStatus" NOT NULL DEFAULT 'unassigned',
    "activatedAt" TIMESTAMP(3),
    "activatedByUserId" TEXT,
    "lastScannedAt" TIMESTAMP(3),
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelShortCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "shortCodeId" TEXT NOT NULL,
    "scannedByUserId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFp" TEXT,
    "outcome" "ScanOutcome" NOT NULL DEFAULT 'viewed_public',

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyClaim" (
    "id" TEXT NOT NULL,
    "shortCodeId" TEXT,
    "propertyId" TEXT,
    "claimantUserId" TEXT,
    "claimantName" TEXT NOT NULL,
    "claimantPhone" TEXT NOT NULL,
    "claimantEmail" TEXT,
    "submittedAddress" TEXT NOT NULL,
    "submittedCity" TEXT,
    "submittedState" TEXT,
    "submittedZip" TEXT,
    "unitNumber" TEXT,
    "verificationStatus" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "verificationChannel" "VerificationChannel" NOT NULL DEFAULT 'simulated',
    "verificationCode" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "ownerVerifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGrant" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "panelId" TEXT,
    "unitId" TEXT,
    "tradeUserId" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterCompany" TEXT,
    "requesterPhone" TEXT,
    "requesterEmail" TEXT,
    "requesterLicense" TEXT,
    "reason" TEXT,
    "scope" "GrantScope" NOT NULL DEFAULT 'property',
    "status" "GrantStatus" NOT NULL DEFAULT 'pending',
    "createdVia" "GrantCreatedVia" NOT NULL DEFAULT 'scan',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reasonDenied" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "panelId" TEXT,
    "circuitId" TEXT,
    "unitId" TEXT,
    "performedByUserId" TEXT,
    "trade" "Trade" NOT NULL DEFAULT 'electrical',
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "notes" TEXT,
    "necSectionReferenced" JSONB NOT NULL DEFAULT '[]',
    "partsUsed" JSONB NOT NULL DEFAULT '[]',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "permitNumber" TEXT,
    "invoiceReference" TEXT,
    "source" "ServiceEventSource" NOT NULL DEFAULT 'manual',
    "performedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "costCents" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantServiceRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "tenantUserId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "status" "TenantRequestStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInvite" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "inviteEmail" TEXT,
    "inviteName" TEXT,
    "status" "TenantInviteStatus" NOT NULL DEFAULT 'pending',
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitTenantAccess" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "tenantUserId" TEXT NOT NULL,
    "inviteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UnitTenantAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Property_ownerUserId_idx" ON "Property"("ownerUserId");

-- CreateIndex
CREATE INDEX "Property_jurisdictionId_idx" ON "Property"("jurisdictionId");

-- CreateIndex
CREATE INDEX "Unit_propertyId_idx" ON "Unit"("propertyId");

-- CreateIndex
CREATE INDEX "Panel_propertyId_idx" ON "Panel"("propertyId");

-- CreateIndex
CREATE INDEX "Circuit_panelId_idx" ON "Circuit"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX "Circuit_panelId_circuitNumber_key" ON "Circuit"("panelId", "circuitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PanelShortCode_shortCode_key" ON "PanelShortCode"("shortCode");

-- CreateIndex
CREATE INDEX "PanelShortCode_propertyId_idx" ON "PanelShortCode"("propertyId");

-- CreateIndex
CREATE INDEX "PanelShortCode_panelId_idx" ON "PanelShortCode"("panelId");

-- CreateIndex
CREATE INDEX "ScanEvent_shortCodeId_idx" ON "ScanEvent"("shortCodeId");

-- CreateIndex
CREATE INDEX "PropertyClaim_shortCodeId_idx" ON "PropertyClaim"("shortCodeId");

-- CreateIndex
CREATE INDEX "PropertyClaim_propertyId_idx" ON "PropertyClaim"("propertyId");

-- CreateIndex
CREATE INDEX "AccessGrant_propertyId_idx" ON "AccessGrant"("propertyId");

-- CreateIndex
CREATE INDEX "AccessGrant_status_idx" ON "AccessGrant"("status");

-- CreateIndex
CREATE INDEX "ServiceEvent_propertyId_idx" ON "ServiceEvent"("propertyId");

-- CreateIndex
CREATE INDEX "ServiceEvent_panelId_idx" ON "ServiceEvent"("panelId");

-- CreateIndex
CREATE INDEX "ServiceEvent_circuitId_idx" ON "ServiceEvent"("circuitId");

-- CreateIndex
CREATE INDEX "TenantServiceRequest_propertyId_idx" ON "TenantServiceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "TenantServiceRequest_tenantUserId_idx" ON "TenantServiceRequest"("tenantUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE UNIQUE INDEX "TenantInvite_token_key" ON "TenantInvite"("token");

-- CreateIndex
CREATE INDEX "TenantInvite_propertyId_idx" ON "TenantInvite"("propertyId");

-- CreateIndex
CREATE INDEX "TenantInvite_status_idx" ON "TenantInvite"("status");

-- CreateIndex
CREATE INDEX "UnitTenantAccess_propertyId_tenantUserId_idx" ON "UnitTenantAccess"("propertyId", "tenantUserId");

-- CreateIndex
CREATE INDEX "UnitTenantAccess_tenantUserId_idx" ON "UnitTenantAccess"("tenantUserId");

-- AddForeignKey
ALTER TABLE "Jurisdiction" ADD CONSTRAINT "Jurisdiction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_fedFromPanelId_fkey" FOREIGN KEY ("fedFromPanelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circuit" ADD CONSTRAINT "Circuit_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelShortCode" ADD CONSTRAINT "PanelShortCode_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelShortCode" ADD CONSTRAINT "PanelShortCode_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_shortCodeId_fkey" FOREIGN KEY ("shortCodeId") REFERENCES "PanelShortCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyClaim" ADD CONSTRAINT "PropertyClaim_shortCodeId_fkey" FOREIGN KEY ("shortCodeId") REFERENCES "PanelShortCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyClaim" ADD CONSTRAINT "PropertyClaim_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyClaim" ADD CONSTRAINT "PropertyClaim_claimantUserId_fkey" FOREIGN KEY ("claimantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_tradeUserId_fkey" FOREIGN KEY ("tradeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_circuitId_fkey" FOREIGN KEY ("circuitId") REFERENCES "Circuit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantServiceRequest" ADD CONSTRAINT "TenantServiceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantServiceRequest" ADD CONSTRAINT "TenantServiceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantServiceRequest" ADD CONSTRAINT "TenantServiceRequest_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvite" ADD CONSTRAINT "TenantInvite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvite" ADD CONSTRAINT "TenantInvite_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvite" ADD CONSTRAINT "TenantInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvite" ADD CONSTRAINT "TenantInvite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitTenantAccess" ADD CONSTRAINT "UnitTenantAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitTenantAccess" ADD CONSTRAINT "UnitTenantAccess_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitTenantAccess" ADD CONSTRAINT "UnitTenantAccess_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
