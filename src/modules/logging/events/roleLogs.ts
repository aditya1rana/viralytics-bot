import { BotEvent } from '../../../types/index.js';
import { Events, EmbedBuilder } from 'discord.js';
import { sendLog } from '../services/logService.js';
import { Colors } from '../../../utils/colors.js';

const roleUpdate: BotEvent<'guildMemberUpdate'> = {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember: any, newMember: any) {
        if (oldMember.user?.bot) return;

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        if (oldRoles.size === newRoles.size) return;

        const addedRoles = newRoles.filter((role: any) => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter((role: any) => !newRoles.has(role.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
            .setTitle('Member Roles Updated')
            .setDescription(`<@${newMember.id}>`)
            .setColor(Colors.Primary)
            .setTimestamp();

        if (addedRoles.size > 0) {
            embed.addFields({ name: 'Roles Added', value: addedRoles.map((r: any) => `<@&${r.id}>`).join(', ') });
        }
        if (removedRoles.size > 0) {
            embed.addFields({ name: 'Roles Removed', value: removedRoles.map((r: any) => `<@&${r.id}>`).join(', ') });
        }

        await sendLog(newMember.guild, 'moderation', embed);
    }
};

export default [roleUpdate];
