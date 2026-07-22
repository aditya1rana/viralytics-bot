import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} from 'discord.js';
import { ButtonHandler } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { prisma } from '../../../services/database.js';
import COLORS from '../../../utils/colors.js';

const submitVideoButton: ButtonHandler = {
  customId: 'submit_video_start',
  async execute(interaction) {
    try {
      if (!interaction.guild) return;

      // Query ONLY active campaigns for this server
      const activeCampaigns = await prisma.campaign.findMany({
        where: {
          guildId: interaction.guild.id,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });

      if (!activeCampaigns || activeCampaigns.length === 0) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ No Active Campaigns')
          .setDescription('There are currently no **ACTIVE** campaigns accepting video submissions in this server. Please check back later or contact a staff member.')
          .setColor(COLORS.ERROR);

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      // Build StringSelectMenu for active campaigns
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('submit_active_campaign_select')
        .setPlaceholder('👉 Choose an ACTIVE campaign to submit video(s) for...');

      activeCampaigns.forEach((c) => {
        const brandStr = c.brandName ? `Brand: ${c.brandName} • ` : '';
        const cpmStr = c.cpmRate ? `CPM: $${c.cpmRate}` : 'Active';
        const desc = `${brandStr}${cpmStr}`.slice(0, 100);

        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(c.name.slice(0, 100))
            .setValue(c.id)
            .setDescription(desc || 'Active campaign for clip submissions')
            .setEmoji('🎯')
        );
      });

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('🎥 Select Active Campaign')
        .setDescription('Please select which **ACTIVE** campaign you are submitting video link(s) for from the dropdown menu below:')
        .setColor(COLORS.PRIMARY);

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Error in submitVideoButton handler:', error);
      await interaction.reply({
        content: '❌ An error occurred while fetching active campaigns.',
        ephemeral: true,
      }).catch(() => null);
    }
  }
};

export default submitVideoButton;
