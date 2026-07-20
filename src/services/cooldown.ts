import { Collection, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types/index.js';

const cooldowns = new Collection<string, Collection<string, number>>();

/**
 * Check if a user is on cooldown for a command.
 * Returns true if allowed, false if on cooldown (and sends ephemeral reply).
 */
export function checkCooldown(
  interaction: ChatInputCommandInteraction,
  command: Command,
): boolean {
  const cooldownAmount = (command.cooldown ?? 3) * 1000;
  const commandName = command.data.name;

  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(commandName)!;
  const userId = interaction.user.id;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;
    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1000);
      interaction.reply({
        content: `⏳ Cooldown active. Try again <t:${expiredTimestamp}:R>.`,
        ephemeral: true,
      });
      return false;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  return true;
}
