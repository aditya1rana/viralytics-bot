import { BotEvent } from '../../../types/index.js';
import { Events, EmbedBuilder } from 'discord.js';
import { sendLog } from '../services/logService.js';
import { accountAgeDays, discordTimestamp } from '../../../utils/helpers.js';
import { Colors } from '../../../utils/colors.js';

const memberJoin: BotEvent<'guildMemberAdd'> = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member: any) {
        if (member.user?.bot) return;

        const age = accountAgeDays(member.user?.createdAt || new Date());
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Member Joined', iconURL: member.user?.displayAvatarURL() })
            .setDescription(`<@${member.id}> ${member.user?.username}`)
            .addFields(
                { name: 'Account Created', value: member.user?.createdAt ? `${discordTimestamp(member.user.createdAt, 'R')} (${age} days ago)` : 'Unknown' },
                { name: 'ID', value: member.id }
            )
            .setColor(Colors.Success)
            .setTimestamp();

        await sendLog(member.guild, 'moderation', embed);
    }
};

const memberLeave: BotEvent<'guildMemberRemove'> = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member: any) {
        if (member.user?.bot) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Member Left', iconURL: member.user?.displayAvatarURL() })
            .setDescription(`<@${member.id}> ${member.user?.username || 'Unknown'}`)
            .addFields(
                { name: 'ID', value: member.id }
            )
            .setColor(Colors.Error)
            .setTimestamp();

        await sendLog(member.guild, 'moderation', embed);
    }
};

export default [memberJoin, memberLeave];
