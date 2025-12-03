-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "conversationDuration" INTEGER,
ADD COLUMN "firstMessageAt" TIMESTAMP(3),
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "lastMessageAt" TIMESTAMP(3),
ADD COLUMN "referrer" TEXT,
ADD COLUMN "totalMessages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "metadata";

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "Lead_status_priority_idx" ON "Lead"("status", "priority");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Video_associatedType_associatedId_idx" ON "Video"("associatedType", "associatedId");

-- CreateIndex
CREATE INDEX "Video_isActive_isFeatured_idx" ON "Video"("isActive", "isFeatured");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");

-- CreateIndex
CREATE INDEX "VideoPlaylist_isActive_idx" ON "VideoPlaylist"("isActive");

-- CreateIndex
CREATE INDEX "VideoPlaylist_type_idx" ON "VideoPlaylist"("type");

-- CreateIndex
CREATE INDEX "JobPosting_status_jobType_idx" ON "JobPosting"("status", "jobType");

-- CreateIndex
CREATE INDEX "JobPosting_createdAt_idx" ON "JobPosting"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_isActive_idx" ON "NewsletterSubscription"("isActive");

-- CreateIndex
CREATE INDEX "Launch_status_isActive_idx" ON "Launch"("status", "isActive");

-- CreateIndex
CREATE INDEX "Launch_launchDate_idx" ON "Launch"("launchDate");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_status_isActive_idx" ON "Conversation"("status", "isActive");

-- CreateIndex
CREATE INDEX "Conversation_leadCaptured_idx" ON "Conversation"("leadCaptured");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
