import { GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { BotEvent } from '../../../types/index.js';
import { ensureUser, ensureMember } from '../../../utils/helpers.js';
import prisma from '../../../services/database.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';
import { verificationService } from '../services/verificationService.js';
import logger from '../../../services/logger.js';
import { VerificationStatus } from '@prisma/client';

const guildMemberAddEvent: BotEvent<'guildMemberAdd'> = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member: GuildMember) {
    try {
      const guildId = member.guild.id;
      
      await ensureUser(member);
      await ensureMember(guildId, member.id);

      const config = await prisma.guildConfig.findUnique({ where: { guildId } });
      if (!config) return;

      const minDays = config.minAccountAgeDays || 0;
      const isAlt = verificationService.checkAltAccount(member, minDays);
      let status = VerificationStatus.UNVERIFIED;

      if (isAlt) {
        await prisma.member.update({
          where: { guildId_userId: { guildId, userId: member.id } },
          data: { isAltFlagged: true }
        });
      }

      if (config.unverifiedRoleId) {
        await member.roles.add(config.unverifiedRoleId).catch(e => logger.error('Error adding unverified role', e));
      }

      const verifyBtn = new ButtonBuilder()
        .setCustomId('verify_start')
        .setLabel('Verify Now')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyBtn);

      const embed = buildEmbed({
        title: `Welcome to ${member.guild.name}!`,
        description: 'Please verify yourself to gain access to the rest of the server.',
        color: COLORS.INFO,
        thumbnail: member.guild.iconURL() ?? undefined
      });

      let dmSuccess = false;
      try {
        await member.send({ embeds: [embed], components: [row] });
        dmSuccess = true;
      } catch (err) {
        // DMs are disabled
      }

      if (!dmSuccess && config.verificationChannelId) {
        const vChannel = member.guild.channels.cache.get(config.verificationChannelId) as TextChannel;
        if (vChannel) {
          await vChannel.send({
            content: `<@${member.id}>`,
            embeds: [embed],
            components: [row]
          }).then(msg => setTimeout(() => msg.delete().catch(() => null), 300000)); // Delete after 5 mins
        }
      }

    } catch (error) {
      logger.error('Error in guildMemberAdd (verification module):', error);
    }
  }
};

export default guildMemberAddEvent;
