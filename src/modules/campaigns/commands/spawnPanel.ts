import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { prisma } from '../../../services/database.js';
import { COLORS } from '../../../utils/colors.js';

const spawnPanelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('spawn-panel')
    .setDescription('Spawn the clip submission panel in the current channel')
    .addStringOption(option =>
      option.setName('campaign')
        .setDescription('The campaign to link this panel to')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
      const campaigns = await prisma.campaign.findMany({
        where: {
          guildId: interaction.guildId!,
          status: 'ACTIVE'
        },
        take: 25
      });
      
      const choices = campaigns.map(c => ({ name: c.name, value: c.id }));
      const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
      
      await interaction.respond(filtered);
    } catch (error) {
      logger.error('Error in spawn-panel autocomplete:', error);
    }
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }
      
      if (!interaction.channel || !interaction.channel.isTextBased()) {
        await interaction.reply({ content: 'This command must be used in a text channel.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const campaignId = interaction.options.getString('campaign', true);
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

      if (!campaign) {
        await interaction.editReply({ content: 'Campaign not found.' });
        return;
      }

      const submitEmbed = new EmbedBuilder()
        .setTitle('📥 Submit Your Clips')
        .setDescription(`Click the button below to submit a video for **${campaign.name}**.`)
        .setColor(COLORS.SUCCESS);
        
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`submit_specific_${campaign.id}`).setLabel('Submit Clip').setStyle(ButtonStyle.Success).setEmoji('📲'),
        new ButtonBuilder().setCustomId(`check_submissions_${campaign.id}`).setLabel('Check Submissions').setStyle(ButtonStyle.Primary).setEmoji('🔍')
      );

      await interaction.channel.send({ embeds: [submitEmbed], components: [row] });
      await interaction.editReply({ content: 'Panel spawned successfully!' });

    } catch (error) {
      logger.error('Error in /spawn-panel command:', error);
      await interaction.editReply({ content: 'An error occurred while spawning the panel.' });
    }
  }
};

export default spawnPanelCommand;
