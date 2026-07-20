import {
  Client,
  Collection,
  Events,
  Interaction,
  GuildMember,
} from 'discord.js';
import { Command, ButtonHandler, SelectMenuHandler, ModalHandler } from '../types/index.js';
import { logger } from '../services/logger.js';
import { checkCooldown } from '../services/cooldown.js';
import { checkPermissions } from '../services/permissions.js';

export function registerInteractionHandler(
  client: Client & { commands: Collection<string, Command> },
  buttons: Collection<string, ButtonHandler>,
  selectMenus: Collection<string, SelectMenuHandler>,
  modals: Collection<string, ModalHandler>,
) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      // Ensure Guild and User/Member exist in the database for guild interactions
      if (interaction.guild) {
        const { ensureGuild, ensureUser, ensureMember } = await import('../utils/helpers.js');
        await ensureGuild(interaction.guild);
        if (interaction.member) {
          await ensureUser(interaction.member as GuildMember);
          await ensureMember(interaction.guild.id, interaction.user.id);
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
