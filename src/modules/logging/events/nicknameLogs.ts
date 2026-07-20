import { BotEvent } from '../../../types/index.js';
import { Events, EmbedBuilder } from 'discord.js';
import { sendLog } from '../services/logService.js';
import { Colors } from '../../../utils/colors.js';

const nicknameUpdate: BotEvent<'guildMemberUpdate'> = {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember: any, newMember: any) {
        if (oldMember.user?.bot) return;

        if (oldMember.nickname === newMember.nickname) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user?.username || 'Unknown User', iconURL: newMember.user?.displayAvatarURL() })
            .setTitle('Nickname Changed')
            .setDescription(`<@${newMember.id}>`)
            .addFields(
                { name: 'Before', value: oldMember.nickname || oldMember.user?.username || 'None' },
                { name: 'After', value: newMember.nickname || newMember.user?.username || 'None' }
            )
            .setColor(Colors.Info)
            .setTimestamp();

        await sendLog(newMember.guild, 'moderation', embed);
    }
};

export default [nicknameUpdate];
