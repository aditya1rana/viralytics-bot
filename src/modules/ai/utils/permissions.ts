import { GuildMember, Guild } from 'discord.js';
import { prisma } from '../../../services/database.js';

export async function hasStaffPermission(member: GuildMember, guild: Guild) {
  if (member.permissions.has('Administrator')) return true;
  
  const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
  if (!config) return false;

  const staffRoles = [
    config.founderRoleId,
    config.adminRoleId,
    config.modRoleId,
    config.supportRoleId
  ].filter(Boolean) as string[];

  return member.roles.cache.some(role => staffRoles.includes(role.id));
}
