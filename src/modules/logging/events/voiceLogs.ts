import { BotEvent } from '../../../types/index.js';
import { Events, VoiceState, EmbedBuilder } from 'discord.js';
import { sendLog } from '../services/logService.js';
import { Colors } from '../../../utils/colors.js';

const voiceStateUpdate: BotEvent<'voiceStateUpdate'> = {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState: VoiceState, newState: VoiceState) {
        if (oldState.member?.user.bot) return;
        
        const member = newState.member || oldState.member;
        if (!member) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setTimestamp();

        // Joined Voice
        if (!oldState.channelId && newState.channelId) {
            embed.setTitle('Joined Voice Channel')
                .setDescription(`<@${member.id}> joined <#${newState.channelId}>`)
                .setColor(Colors.Success);
            await sendLog(newState.guild, 'moderation', embed);
        }
        // Left Voice
        else if (oldState.channelId && !newState.channelId) {
            embed.setTitle('Left Voice Channel')
                .setDescription(`<@${member.id}> left <#${oldState.channelId}>`)
                .setColor(Colors.Error);
            await sendLog(newState.guild, 'moderation', embed);
        }
        // Moved Voice
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            embed.setTitle('Moved Voice Channel')
                .setDescription(`<@${member.id}> moved from <#${oldState.channelId}> to <#${newState.channelId}>`)
                .setColor(Colors.Warning);
            await sendLog(newState.guild, 'moderation', embed);
        }
    }
};

export default [voiceStateUpdate];
