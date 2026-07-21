import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChatInputCommandInteraction,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
import { Command } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { configService } from '../../config/services/configService.js';
import COLORS from '../../../utils/colors.js';

const submitCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Manage the video submission system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Post a submission panel in the current channel')
    )
    .addSubcommand(sub => sub
      .setName('set-log-channel')
      .setDescription('Set the channel where submission logs are sent')
      .addChannelOption(opt => opt
        .setName('channel')
        .setDescription('The channel for link logs')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
      )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    try {
      if (subcommand === 'panel') {
        // Build the submission panel embed
        const panelEmbed = new EmbedBuilder()
          .setTitle('📎 Video Submissions')
          .setDescription('Submit your video links using the button below.\nYou can submit up to **100 links at once** — one per line.')
          .setColor(COLORS.primary)
          .setFooter({ text: 'Paste your links in the popup form' });

        const submitButton = new ButtonBuilder()
          .setCustomId('submit_video_start')
          .setLabel('Submit Video')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📤');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton);

        // Send the panel to the current channel
        await (interaction.channel as TextChannel).send({ embeds: [panelEmbed], components: [row] });
        await interaction.reply({ content: '✅ Submission panel posted!', ephemeral: true });

      } else if (subcommand === 'set-log-channel') {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel', true);
        await configService.setChannel(guildId, 'submissionLogChannelId', channel.id);

        await interaction.editReply({
          content: `✅ Submission logs will now be sent to <#${channel.id}>.`
        });
      }
    } catch (error) {
      logger.error('Error in /submit command:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ An error occurred.' });
      } else {
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
      }
    }
  }
};

export default submitCommand;
