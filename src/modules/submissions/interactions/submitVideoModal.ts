import { EmbedBuilder, TextChannel } from 'discord.js';
import { ModalHandler } from '../../../types/index.js';
import { prisma } from '../../../services/database.js';
import { submissionService } from '../services/submissionService.js';
import { logger } from '../../../services/logger.js';
import { validateAndNormalizeUrl, getPlatformName } from '../../../services/urlValidator.js';
import { ensureUser, ensureMember } from '../../../utils/helpers.js';
import COLORS from '../../../utils/colors.js';

const submitVideoModalHandler: ModalHandler = {
  customId: 'submit_video_modal',

  async execute(interaction) {
    try {
      if (!interaction.guild) return;

      await interaction.deferReply({ ephemeral: true });

      const rawInput = interaction.fields.getTextInputValue('video_links');
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      // Ensure user and member exist in DB
      await ensureUser(interaction.member as any);
      await ensureMember(guildId, userId);

      // Parse links — one per line, filter empty lines
      const allLinks = rawInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (allLinks.length === 0) {
        await interaction.editReply({ content: '❌ No links found. Please paste at least one link.' });
        return;
      }

      if (allLinks.length > 100) {
        await interaction.editReply({ content: '❌ You can submit up to 100 links at once. Please reduce and try again.' });
        return;
      }

      // Find any active campaign for this guild (use the first active one)
      const campaign = await prisma.campaign.findFirst({
        where: {
          guildId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!campaign) {
        await interaction.editReply({ content: '❌ No active campaign found. Please contact an admin.' });
        return;
      }

      // Process each link
      const results: { url: string; status: 'success' | 'invalid' | 'duplicate' | 'error'; detail: string }[] = [];

      for (const link of allLinks) {
        try {
          // Validate the URL
          const validation = validateAndNormalizeUrl(link);
          if (!validation.valid || !validation.normalizedUrl || !validation.platform) {
            results.push({ url: link, status: 'invalid', detail: validation.error || 'Invalid URL' });
            continue;
          }

          // Create the submission
          const submission = await submissionService.createSubmission({
            guildId,
            userId,
            campaignId: campaign.id,
            originalUrl: link,
          });

          results.push({
            url: link,
            status: 'success',
            detail: `${getPlatformName(submission.platform)} — ID: ${submission.shortId}`,
          });
        } catch (err: any) {
          if (err.message?.includes('Duplicate')) {
            results.push({ url: link, status: 'duplicate', detail: 'Already submitted' });
          } else {
            results.push({ url: link, status: 'error', detail: err.message || 'Unknown error' });
          }
        }
      }

      // Count results
      const successCount = results.filter(r => r.status === 'success').length;
      const invalidCount = results.filter(r => r.status === 'invalid').length;
      const dupeCount = results.filter(r => r.status === 'duplicate').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      // Build user-facing response
      let replyDesc = `**Campaign:** ${campaign.name}\n\n`;
      replyDesc += `✅ **${successCount}** submitted successfully\n`;
      if (dupeCount > 0) replyDesc += `⚠️ **${dupeCount}** duplicate(s) skipped\n`;
      if (invalidCount > 0) replyDesc += `❌ **${invalidCount}** invalid link(s)\n`;
      if (errorCount > 0) replyDesc += `🔴 **${errorCount}** error(s)\n`;

      // Show failed links if any
      const failedLinks = results.filter(r => r.status !== 'success');
      if (failedLinks.length > 0 && failedLinks.length <= 20) {
        replyDesc += `\n**Issues:**\n`;
        for (const f of failedLinks) {
          const shortUrl = f.url.length > 60 ? f.url.substring(0, 60) + '...' : f.url;
          replyDesc += `• \`${shortUrl}\` — ${f.detail}\n`;
        }
      }

      const replyEmbed = new EmbedBuilder()
        .setTitle('📎 Submission Results')
        .setDescription(replyDesc)
        .setColor(successCount > 0 ? COLORS.success : COLORS.error)
        .setTimestamp();

      await interaction.editReply({ embeds: [replyEmbed] });

      // ── Send log to configured submission log channel ──
      if (successCount > 0) {
        const config = await prisma.guildConfig.findUnique({
          where: { guildId },
        });

        const logChannelId = config?.submissionLogChannelId;
        if (logChannelId) {
          const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
          if (logChannel) {
            const successfulLinks = results
              .filter(r => r.status === 'success')
              .map(r => r.url);

            // Split into chunks if too many links (Discord embed limit)
            const chunkSize = 30;
            for (let i = 0; i < successfulLinks.length; i += chunkSize) {
              const chunk = successfulLinks.slice(i, i + chunkSize);
              const linkList = chunk.map((url, idx) => `${i + idx + 1}. ${url}`).join('\n');

              const logEmbed = new EmbedBuilder()
                .setTitle('📥 New Link Submission')
                .setColor(COLORS.primary)
                .addFields(
                  { name: '👤 User', value: `<@${userId}> (\`${interaction.user.username}\`)`, inline: true },
                  { name: '🎬 Campaign', value: campaign.name, inline: true },
                  { name: '🔢 Count', value: `${chunk.length} link(s)`, inline: true },
                  { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                  { name: '🔗 Links', value: linkList.substring(0, 1024) },
                )
                .setTimestamp();

              // If links overflow the first field, add continuation
              if (linkList.length > 1024) {
                logEmbed.addFields({
                  name: '🔗 Links (continued)',
                  value: linkList.substring(1024, 2048),
                });
              }

              await logChannel.send({ embeds: [logEmbed] });
            }
          }
        }
      }

    } catch (error) {
      logger.error('Error in submit video modal:', error);
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ An error occurred while processing your submissions.' });
      } else if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
      }
    }
  }
};

export default submitVideoModalHandler;
