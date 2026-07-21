-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'DENIED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('SUPPORT', 'PAYMENT', 'CAMPAIGN_HELP', 'PARTNERSHIP', 'BUG_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'AWAITING_RESPONSE', 'ON_HOLD', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK_REELS', 'X_VIDEOS', 'THREADS');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ModAction" AS ENUM ('WARN', 'MUTE', 'KICK', 'BAN', 'TIMEOUT', 'UNMUTE', 'UNBAN');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('MEMBER_VERIFIED', 'MEMBER_DENIED', 'MEMBER_SUSPENDED', 'MOD_WARN', 'MOD_MUTE', 'MOD_UNMUTE', 'MOD_KICK', 'MOD_BAN', 'MOD_UNBAN', 'MOD_TIMEOUT', 'SUBMISSION_CREATED', 'SUBMISSION_APPROVED', 'SUBMISSION_REJECTED', 'SUBMISSION_DELETED', 'SUBMISSION_FLAGGED', 'CAMPAIGN_CREATED', 'CAMPAIGN_EDITED', 'CAMPAIGN_PAUSED', 'CAMPAIGN_ARCHIVED', 'CAMPAIGN_CLOSED', 'TICKET_OPENED', 'TICKET_CLOSED', 'TICKET_ESCALATED', 'PAYOUT_CREATED', 'PAYOUT_COMPLETED', 'PAYOUT_FAILED', 'CONFIG_UPDATED', 'ROLE_REWARD_GRANTED', 'BADGE_GRANTED', 'LEVEL_UP', 'INVITE_CREDITED', 'INVITE_REVOKED', 'FAKE_INVITE_DETECTED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('VALID', 'LEFT', 'FAKE', 'REVOKED');

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" TEXT NOT NULL DEFAULT '0',
    "globalName" TEXT,
    "avatarUrl" TEXT,
    "accountCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "altOf" TEXT,
    "isAltFlagged" BOOLEAN NOT NULL DEFAULT false,
    "accountAgeDays" INTEGER,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastXpGainAt" TIMESTAMP(3),
    "totalInvites" INTEGER NOT NULL DEFAULT 0,
    "fakeInvites" INTEGER NOT NULL DEFAULT 0,
    "leftInvites" INTEGER NOT NULL DEFAULT 0,
    "bonusInvites" INTEGER NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "approvedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "rejectedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "verificationLogChannelId" TEXT,
    "ticketLogChannelId" TEXT,
    "submissionLogChannelId" TEXT,
    "duplicateLogChannelId" TEXT,
    "moderationLogChannelId" TEXT,
    "campaignLogChannelId" TEXT,
    "errorLogChannelId" TEXT,
    "staffActionLogChannelId" TEXT,
    "welcomeChannelId" TEXT,
    "verificationChannelId" TEXT,
    "submissionChannelId" TEXT,
    "leaderboardChannelId" TEXT,
    "ticketCategoryId" TEXT,
    "verifiedRoleId" TEXT,
    "unverifiedRoleId" TEXT,
    "mutedRoleId" TEXT,
    "modRoleId" TEXT,
    "adminRoleId" TEXT,
    "clipperRoleId" TEXT,
    "minAccountAgeDays" INTEGER NOT NULL DEFAULT 7,
    "altDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "verificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "captchaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "xpPerMessage" INTEGER NOT NULL DEFAULT 15,
    "xpPerSubmission" INTEGER NOT NULL DEFAULT 50,
    "xpPerVerification" INTEGER NOT NULL DEFAULT 25,
    "xpCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "levelUpAnnouncementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxDailySubmissions" INTEGER NOT NULL DEFAULT 50,
    "duplicateCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inviteTrackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fakeInviteThresholdDays" INTEGER NOT NULL DEFAULT 3,
    "xpPerInvite" INTEGER NOT NULL DEFAULT 30,
    "autoModEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxWarnsBeforeMute" INTEGER NOT NULL DEFAULT 3,
    "maxWarnsBeforeBan" INTEGER NOT NULL DEFAULT 5,
    "muteDefaultMinutes" INTEGER NOT NULL DEFAULT 60,
    "timeoutDefaultMinutes" INTEGER NOT NULL DEFAULT 30,
    "antiRaidEnabled" BOOLEAN NOT NULL DEFAULT true,
    "antiSpamEnabled" BOOLEAN NOT NULL DEFAULT true,
    "antiScamEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "allowedPlatforms" "Platform"[] DEFAULT ARRAY['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK_REELS', 'X_VIDEOS', 'THREADS']::"Platform"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "platforms" "Platform"[],
    "hashtags" TEXT[],
    "guidelines" TEXT,
    "payPerApproved" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxSubmissionsPerUser" INTEGER,
    "maxTotalSubmissions" INTEGER,
    "roleId" TEXT,
    "channelId" TEXT,
    "logChannelId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "messageId" TEXT,
    "channelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "claimedById" TEXT,
    "channelId" TEXT,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "transcriptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModCase" (
    "id" TEXT NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" "ModAction" NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'VALID',
    "inviteeAccountAgeDays" INTEGER,
    "isFake" BOOLEAN NOT NULL DEFAULT false,
    "fakeReason" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleReward" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL,
    "roleName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "imageUrl" TEXT,
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "criteriaType" TEXT,
    "criteriaValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberBadge" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "submissionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "note" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "color" TEXT,
    "mentionRoles" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "userId" TEXT,
    "roleId" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "metadata" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Member_guildId_idx" ON "Member"("guildId");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Member_guildId_totalXp_idx" ON "Member"("guildId", "totalXp" DESC);

-- CreateIndex
CREATE INDEX "Member_guildId_totalSubmissions_idx" ON "Member"("guildId", "totalSubmissions" DESC);

-- CreateIndex
CREATE INDEX "Member_guildId_verificationStatus_idx" ON "Member"("guildId", "verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Member_guildId_userId_key" ON "Member"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE INDEX "Campaign_guildId_idx" ON "Campaign"("guildId");

-- CreateIndex
CREATE INDEX "Campaign_guildId_status_idx" ON "Campaign"("guildId", "status");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_guildId_name_key" ON "Campaign"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_shortId_key" ON "Submission"("shortId");

-- CreateIndex
CREATE INDEX "Submission_guildId_idx" ON "Submission"("guildId");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_campaignId_idx" ON "Submission"("campaignId");

-- CreateIndex
CREATE INDEX "Submission_guildId_userId_idx" ON "Submission"("guildId", "userId");

-- CreateIndex
CREATE INDEX "Submission_guildId_campaignId_idx" ON "Submission"("guildId", "campaignId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_guildId_status_idx" ON "Submission"("guildId", "status");

-- CreateIndex
CREATE INDEX "Submission_platform_idx" ON "Submission"("platform");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "Submission_guildId_createdAt_idx" ON "Submission"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_guildId_userId_createdAt_idx" ON "Submission"("guildId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_guildId_campaignId_status_idx" ON "Submission"("guildId", "campaignId", "status");

-- CreateIndex
CREATE INDEX "Submission_userId_campaignId_idx" ON "Submission"("userId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_normalizedUrl_campaignId_key" ON "Submission"("normalizedUrl", "campaignId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_idx" ON "Ticket"("guildId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_status_idx" ON "Ticket"("guildId", "status");

-- CreateIndex
CREATE INDEX "Ticket_openedById_idx" ON "Ticket"("openedById");

-- CreateIndex
CREATE INDEX "Ticket_claimedById_idx" ON "Ticket"("claimedById");

-- CreateIndex
CREATE INDEX "Ticket_guildId_category_idx" ON "Ticket"("guildId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_guildId_number_key" ON "Ticket"("guildId", "number");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ModCase_guildId_idx" ON "ModCase"("guildId");

-- CreateIndex
CREATE INDEX "ModCase_targetId_idx" ON "ModCase"("targetId");

-- CreateIndex
CREATE INDEX "ModCase_guildId_targetId_idx" ON "ModCase"("guildId", "targetId");

-- CreateIndex
CREATE INDEX "ModCase_guildId_action_idx" ON "ModCase"("guildId", "action");

-- CreateIndex
CREATE INDEX "ModCase_guildId_isActive_idx" ON "ModCase"("guildId", "isActive");

-- CreateIndex
CREATE INDEX "ModCase_expiresAt_idx" ON "ModCase"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModCase_guildId_caseNumber_key" ON "ModCase"("guildId", "caseNumber");

-- CreateIndex
CREATE INDEX "Invite_guildId_idx" ON "Invite"("guildId");

-- CreateIndex
CREATE INDEX "Invite_inviterId_idx" ON "Invite"("inviterId");

-- CreateIndex
CREATE INDEX "Invite_guildId_inviterId_idx" ON "Invite"("guildId", "inviterId");

-- CreateIndex
CREATE INDEX "Invite_guildId_status_idx" ON "Invite"("guildId", "status");

-- CreateIndex
CREATE INDEX "Invite_code_idx" ON "Invite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_guildId_inviteeId_key" ON "Invite"("guildId", "inviteeId");

-- CreateIndex
CREATE INDEX "RoleReward_guildId_idx" ON "RoleReward"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleReward_guildId_roleId_key" ON "RoleReward"("guildId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleReward_guildId_requiredLevel_key" ON "RoleReward"("guildId", "requiredLevel");

-- CreateIndex
CREATE INDEX "Badge_guildId_idx" ON "Badge"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_guildId_name_key" ON "Badge"("guildId", "name");

-- CreateIndex
CREATE INDEX "MemberBadge_memberId_idx" ON "MemberBadge"("memberId");

-- CreateIndex
CREATE INDEX "MemberBadge_badgeId_idx" ON "MemberBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberBadge_memberId_badgeId_key" ON "MemberBadge"("memberId", "badgeId");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_guildId_period_periodKey_idx" ON "LeaderboardSnapshot"("guildId", "period", "periodKey");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_userId_idx" ON "LeaderboardSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardSnapshot_guildId_userId_period_periodKey_key" ON "LeaderboardSnapshot"("guildId", "userId", "period", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_submissionId_key" ON "Payout"("submissionId");

-- CreateIndex
CREATE INDEX "Payout_guildId_idx" ON "Payout"("guildId");

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "Payout_guildId_userId_idx" ON "Payout"("guildId", "userId");

-- CreateIndex
CREATE INDEX "Payout_guildId_status_idx" ON "Payout"("guildId", "status");

-- CreateIndex
CREATE INDEX "Payout_campaignId_idx" ON "Payout"("campaignId");

-- CreateIndex
CREATE INDEX "Payout_guildId_campaignId_status_idx" ON "Payout"("guildId", "campaignId", "status");

-- CreateIndex
CREATE INDEX "Announcement_guildId_idx" ON "Announcement"("guildId");

-- CreateIndex
CREATE INDEX "Announcement_scheduledAt_idx" ON "Announcement"("scheduledAt");

-- CreateIndex
CREATE INDEX "Announcement_guildId_isPublished_idx" ON "Announcement"("guildId", "isPublished");

-- CreateIndex
CREATE INDEX "Reminder_guildId_idx" ON "Reminder"("guildId");

-- CreateIndex
CREATE INDEX "Reminder_scheduledAt_idx" ON "Reminder"("scheduledAt");

-- CreateIndex
CREATE INDEX "Reminder_isSent_scheduledAt_idx" ON "Reminder"("isSent", "scheduledAt");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_idx" ON "AuditLog"("guildId");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_action_idx" ON "AuditLog"("guildId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_actorId_idx" ON "AuditLog"("guildId", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_targetId_idx" ON "AuditLog"("guildId", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_createdAt_idx" ON "AuditLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildConfig" ADD CONSTRAINT "GuildConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModCase" ADD CONSTRAINT "ModCase_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModCase" ADD CONSTRAINT "ModCase_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModCase" ADD CONSTRAINT "ModCase_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleReward" ADD CONSTRAINT "RoleReward_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberBadge" ADD CONSTRAINT "MemberBadge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberBadge" ADD CONSTRAINT "MemberBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
