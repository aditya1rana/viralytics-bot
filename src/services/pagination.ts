import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  InteractionResponse,
  Message,
} from 'discord.js';

export interface PaginationOptions {
  ephemeral?: boolean;
  timeout?: number; // ms, default 120_000
  showPageNumbers?: boolean;
}

export async function paginate(
  interaction: ChatInputCommandInteraction,
  pages: EmbedBuilder[],
  options: PaginationOptions = {},
): Promise<void> {
  if (pages.length === 0) return;

  const { ephemeral = false, timeout = 120_000, showPageNumbers = true } = options;

  if (pages.length === 1) {
    await interaction.reply({ embeds: [pages[0]], ephemeral });
    return;
  }

  let index = 0;

  const getRow = () =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('page_first')
        .setEmoji('⏮')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId('page_prev')
        .setEmoji('◀')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId('page_indicator')
        .setLabel(`${index + 1} / ${pages.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('page_next')
        .setEmoji('▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === pages.length - 1),
      new ButtonBuilder()
        .setCustomId('page_last')
        .setEmoji('⏭')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === pages.length - 1),
    );

  // Add page numbers to footer
  if (showPageNumbers) {
    pages.forEach((page, i) => {
      const existingFooter = page.data.footer?.text || '';
      page.setFooter({
        text: existingFooter ? `${existingFooter} • Page ${i + 1}/${pages.length}` : `Page ${i + 1}/${pages.length}`,
      });
    });
  }

  let response: InteractionResponse | Message;

  if (interaction.deferred || interaction.replied) {
    response = await interaction.editReply({
      embeds: [pages[0]],
      components: [getRow()],
    });
  } else {
    response = await interaction.reply({
      embeds: [pages[0]],
      components: [getRow()],
      ephemeral,
      fetchReply: true,
    });
  }

  const message = response instanceof Message ? response : await interaction.fetchReply();

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id,
    time: timeout,
  });

  collector.on('collect', async (i) => {
    switch (i.customId) {
      case 'page_first': index = 0; break;
      case 'page_prev': index = Math.max(0, index - 1); break;
      case 'page_next': index = Math.min(pages.length - 1, index + 1); break;
      case 'page_last': index = pages.length - 1; break;
    }
    await i.update({ embeds: [pages[index]], components: [getRow()] });
  });

  collector.on('end', async () => {
    try {
      await message.edit({ components: [] });
    } catch {
      // Message may be deleted
    }
  });
}
