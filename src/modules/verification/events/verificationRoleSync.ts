import { BotEvent } from '../../../types/index.js';
import { Events, GuildMember } from 'discord.js';
import { getGuildConfig } from '../../../services/configManager.js';
import prisma from '../../../services/database.js';
import { VerificationStatus } from '@prisma/client';
import { cache } from '../../../services/cache.js';
import logger from '../../../services/logger.js';
import { ensureUser, ensureMember } from '../../../utils/helpers.js';

const verificationRoleSync: BotEvent<'guildMemberUpdate'> = {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember: any, newMember: any) {
    if (newMember.user.bot) return;

    try {
      const config = await getGuildConfig(newMember.guild.id);
      if (!config) return;

      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      // Check if roles have actually changed
      if (oldRoles.size === newRoles.size && oldRoles.every((role: any) => newRoles.has(role.id))) {
        return;
      }

      const verifiedRole = config.verifiedRoleId;
      const clipperRole = config.clipperRoleId;

      const hadVerified = verifiedRole ? oldRoles.has(verifiedRole) : false;
      const hasVerified = verifiedRole ? newRoles.has(verifiedRole) : false;

      const hadClipper = clipperRole ? oldRoles.has(clipperRole) : false;
      const hasClipper = clipperRole ? newRoles.has(clipperRole) : false;

      // A user is considered verified if they have either the verifiedRole or the clipperRole
      const wasVerified = hadVerified || hadClipper;
      const isVerified = hasVerified || hasClipper;

      if (!wasVerified && isVerified) {
        // User gained verification role(s) manually
        await ensureUser(newMember);
        await ensureMember(newMember.guild.id, newMember.id);

        await prisma.member.update({
          where: { guildId_userId: { guildId: newMember.guild.id, userId: newMember.id } },
          data: { verificationStatus: VerificationStatus.VERIFIED }
        });

        await cache.del(`member:${newMember.guild.id}:${newMember.id}:verified`);
        logger.info(`Synced verification status to VERIFIED for member ${newMember.user.tag} (${newMember.id}) due to manual role assignment.`);
      } else if (wasVerified && !isVerified) {
        // User lost verification role(s) manually
        await ensureUser(newMember);
        await ensureMember(newMember.guild.id, newMember.id);

        await prisma.member.update({
          where: { guildId_userId: { guildId: newMember.guild.id, userId: newMember.id } },
          data: { verificationStatus: VerificationStatus.UNVERIFIED }
        });

        await cache.del(`member:${newMember.guild.id}:${newMember.id}:verified`);
        logger.info(`Synced verification status to UNVERIFIED for member ${newMember.user.tag} (${newMember.id}) due to manual role removal.`);
      }
    } catch (err) {
      logger.error(`Error in verification role sync event:`, err);
    }
  }
};

export default [verificationRoleSync];
