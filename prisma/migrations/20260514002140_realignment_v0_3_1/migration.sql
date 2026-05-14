-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'denied', 'approved_once', 'expired');

-- DropForeignKey
ALTER TABLE "PropertyClaim" DROP CONSTRAINT "PropertyClaim_claimantUserId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyClaim" DROP CONSTRAINT "PropertyClaim_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyClaim" DROP CONSTRAINT "PropertyClaim_shortCodeId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash",
ADD COLUMN     "auth0Sub" TEXT NOT NULL;

-- DropTable
DROP TABLE "PropertyClaim";

-- DropEnum
DROP TYPE "ClaimStatus";

-- DropEnum
DROP TYPE "VerificationChannel";

-- CreateTable
CREATE TABLE "PendingClaim" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "proofData" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PendingClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "approverPhone" TEXT NOT NULL,
    "approverUserId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingClaim_token_key" ON "PendingClaim"("token");

-- CreateIndex
CREATE INDEX "PendingClaim_email_idx" ON "PendingClaim"("email");

-- CreateIndex
CREATE INDEX "PendingClaim_expiresAt_idx" ON "PendingClaim"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_correlationId_key" ON "ApprovalRequest"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_providerMessageId_key" ON "ApprovalRequest"("providerMessageId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_approverPhone_idx" ON "ApprovalRequest"("approverPhone");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- CreateIndex
CREATE INDEX "User_auth0Sub_idx" ON "User"("auth0Sub");

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

