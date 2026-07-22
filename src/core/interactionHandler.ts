import {
  Client,
  Collection,
  Events,
  Interaction,
  EmbedBuilder
} from 'discord.js';
import { Command, ButtonHandler, SelectMenuHandler, ModalHandler } from '../types/index.js';
import { logger } from '../services/logger.js';
import { checkCooldown } from '../services/cooldown.js';
import { checkPermissions } from '../services/permissions.js';
import { isGuildSubscribed } from '../services/subscriptionGuard.js';
import COLORS from '../utils/colors.js';

export function registerInteractionHandler(
  client: Client & { commands: Collection<string, Command> },
  buttons: Collection<string, ButtonHandler>,
  selectMenus: Collection<string, SelectMenuHandler>,
  modals: Collection<string, ModalHandler>,
) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      // ── Subscription Gatekeeper ──
      if (interaction.guildId) {
        const isSubscribed = await isGuildSubscribed(interaction.guildId);
        if (!isSubscribed) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('🛑 Viralytics Subscription Required')
            .setDescription('This server does not have an active **Viralytics** subscription.\n\nPlease contact the bot owner to approve and activate your server on the **Viralytics SaaS Dashboard**.')
            .setColor(COLORS.ERROR);

          if (interaction.isRepliable()) {
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
            } else {
              await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
            }
          }
          return;
        }
      }

      // ── Slash Commands ──
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // Permission check
        if (!await checkPermissions(interaction, command)) return;

        // Cooldown check
        if (!checkCooldown(interaction, command)) return;

        await command.execute(interaction);
        return;
      }

      // ── Autocomplete ──
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction);
        }
        return;
      }

      // ── Buttons ──
      if (interaction.isButton()) {
        const handler = findHandler(buttons, interaction.customId);
        if (handler) {
          await handler.execute(interaction);
        }
        return;
      }

      // ── Select Menus ──
      if (interaction.isStringSelectMenu()) {
        const handler = findHandler(selectMenus, interaction.customId);
        if (handler) {
          await handler.execute(interaction);
        }
        return;
      }

      // ── Modals ──
      if (interaction.isModalSubmit()) {
        const handler = findHandler(modals, interaction.customId);
        if (handler) {
          await handler.execute(interaction);
        }
        return;
      }
    } catch (err) {
      logger.error('Interaction error:', err);

      const reply = {
        content: '❌ An error occurred while processing your request.',
        ephemeral: true,
      };

      try {
        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      } catch {
        // Interaction may have expired
      }
    }
  });
}

function findHandler<T extends { customId: string | RegExp }>(
  collection: Collection<string, T>,
  customId: string,
): T | undefined {
  // Try exact match first
  const exact = collection.get(customId);
  if (exact) return exact;

  // Try regex match
  for (const [, handler] of collection) {
    if (handler.customId instanceof RegExp && handler.customId.test(customId)) {
      return handler;
    }
  }

  return undefined;
}
