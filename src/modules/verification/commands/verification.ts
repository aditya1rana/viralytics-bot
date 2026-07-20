import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextChannel
} from 'discord.js';
import { Command } from '../../../types/index.js';
import prisma from '../../../services/database.js';
import { buildEmbed } from '../../../services/embedBuilder.js';
import COLORS from '../../../utils/colors.js';
import { verificationService } from '../services/verificationService.js';
import { VerificationStatus } from '@prisma/client';
import logger from '../../../services/logger.js';
import { ensureUser, ensureMember } from '../../../utils/helpers.js';

const verificationCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Manage the verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Set up the verification system')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send the verification message').addChannelTypes(ChannelType.GuildText))
      .addRoleOption(opt => opt.setName('verified-role').setDescription('Role given to verified users'))
      .addRoleOption(opt => opt.setName('unverified-role').setDescription('Role given to unverified users'))
      .addIntegerOption(opt => opt.setName('min-account-age').setDescription('Minimum account age in days to bypass alt check'))
      .addBooleanOption(opt => opt.setName('captcha-enabled').setDescription('Enable math captcha for verification'))
    )
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription("Reset a user's verification status")
      .addUserOption(opt => opt.setName('user').setDescription('The user to reset').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('stats')
      .setDescription('Show verification statistics')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // Defer the reply to give the database connection and queries time to complete
    const isEphemeral = subcommand === 'setup' || subcommand === 'reset';
    await interaction.deferReply({ ephemeral: isEphemeral });

    try {
      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel') ?? null;
        const verifiedRole = interaction.options.getRole('verified-role') ?? null;
        const unverifiedRole = interaction.options.getRole('unverified-role') ?? null;
        const minAccountAge = interaction.options.getInteger('min-account-age') ?? 0;
        const captchaEnabled = interaction.options.getBoolean('captcha-enabled') ?? false;

        const updateData: any = {
          minAccountAgeDays: minAccountAge,
          captchaEnabled: captchaEnabled
        };
        if (channel) updateData.verificationChannelId = channel.id;
        if (verifiedRole) updateData.verifiedRoleId = verifiedRole.id;
        if (unverifiedRole) updateData.unverifiedRoleId = unverifiedRole.id;

        await prisma.guildConfig.upsert({
          where: { guildId },
          update: updateData,
          create: { guildId, ...updateData }
        });

        // Send a persistent verification panel message to the designated channel if configured
        if (channel) {
          const verifyBtn = new ButtonBuilder()
            .setCustomId('verify_start')
            .setLabel('Verify Now')
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Success);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyBtn);

          const channelEmbed = buildEmbed({
            title: `🛡️ Verify Your Account`,
            description: `Welcome to **${interaction.guild!.name}**!\n\nTo gain full access to the server, click the **Verify Now** button below to complete verification.`,
            color: COLORS.SUCCESS,
            thumbnail: interaction.guild!.iconURL() ?? undefined
          });

          const targetChannel = channel as TextChannel;
          
          // Clear previous verification messages sent by the bot in that channel if possible to avoid clutter
          try {
            const messages = await targetChannel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(m => m.author.id === interaction.client.user.id && m.embeds.some(e => e.title?.includes('Verify Your Account')));
            if (botMessages.size > 0) {
              await targetChannel.bulkDelete(botMessages).catch(() => null);
            }
          } catch (e) {
            // Ignore if bulk delete or fetching fails due to missing permissions
          }

          await targetChannel.send({
            embeds: [channelEmbed],
            components: [row]
          });
        }

        const embed = buildEmbed({
          title: '✅ Verification Setup Complete',
          description: 'The verification system has been configured.',
          color: COLORS.SUCCESS,
          fields: [
            { name: 'Channel', value: channel ? `<#${channel.id}>` : 'Not Set', inline: true },
            { name: 'Verified Role', value: verifiedRole ? `<@&${verifiedRole.id}>` : 'Not Set', inline: true },
            { name: 'Unverified Role', value: unverifiedRole ? `<@&${unverifiedRole.id}>` : 'Not Set', inline: true },
            { name: 'Min Account Age', value: `${minAccountAge} days`, inline: true },
            { name: 'Captcha Enabled', value: captchaEnabled ? 'Yes' : 'No', inline: true }
          ]
        });

        await interaction.editReply({ embeds: [embed] });
      } 
      else if (subcommand === 'reset') {
        const user = interaction.options.getUser('user', true);
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!member) {
          await interaction.editReply({ content: 'Member not found in this guild.' });
          return;
        }

        await ensureUser(member);
        await ensureMember(guildId, user.id);

        await prisma.member.update({
          where: { guildId_userId: { guildId, userId: user.id } },
          data: { verificationStatus: VerificationStatus.UNVERIFIED }
        });

        const config = await prisma.guildConfig.findUnique({ where: { guildId } });
        if (config) {
          if (config.verifiedRoleId) await member.roles.remove(config.verifiedRoleId).catch(() => null);
          if (config.unverifiedRoleId) await member.roles.add(config.unverifiedRoleId).catch(() => null);
        }

        await interaction.editReply({ content: `✅ Verification reset for <@${user.id}>.` });
      } 
      else if (subcommand === 'stats') {
        const stats = await verificationService.getVerificationStats(guildId);
        const flaggedCount = await prisma.member.count({ where: { guildId, isAltFlagged: true } });
        
        let verified = 0;
        let unverified = 0;

        stats.forEach(stat => {
          if (stat.verificationStatus === VerificationStatus.VERIFIED) verified = stat._count.id;
          if (stat.verificationStatus === VerificationStatus.UNVERIFIED) unverified = stat._count.id;
        });

        const total = verified + unverified + flaggedCount;

        const embed = buildEmbed({
          title: '📊 Verification Statistics',
          color: COLORS.PRIMARY,
          fields: [
            { name: '✅ Verified', value: `${verified}`, inline: true },
            { name: '❌ Unverified', value: `${unverified}`, inline: true },
            { name: '⚠️ Flagged Alts', value: `${flaggedCount}`, inline: true },
            { name: 'Total Tracked', value: `${total}`, inline: false }
          ]
        });

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Error in verification command:', error);
      await interaction.editReply({ content: 'An error occurred while executing the command.' }).catch(() => null);
    }
  }
};

export default verificationCommand;
