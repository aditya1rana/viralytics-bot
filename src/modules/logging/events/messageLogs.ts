import { BotEvent } from '../../../types/index.js';
import { Events, EmbedBuilder } from 'discord.js';
import { sendLog } from '../services/logService.js';
import { Colors } from '../../../utils/colors.js';
import { truncate } from '../../../utils/helpers.js';

const messageDelete: BotEvent<'messageDelete'> = {
    name: Events.MessageDelete,
    once: false,
    async execute(message: any) {
        if (message.author?.bot) return;
        if (!message.content && (!message.attachments || message.attachments.size === 0)) return;
        if (!message.guild) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author?.username || 'Unknown User', iconURL: message.author?.displayAvatarURL() || undefined })
            .setTitle('Message Deleted')
            .setDescription(`Message deleted in <#${message.channelId}>`)
            .addFields(
                { name: 'Content', value: message.content ? truncate(message.content, 1024) : 'No content' }
            )
            .setColor(Colors.Error)
            .setTimestamp();

        await sendLog(message.guild, 'moderation', embed);
    }
};

const messageUpdate: BotEvent<'messageUpdate'> = {
    name: Events.MessageUpdate,
    once: false,
    async execute(oldMessage: any, newMessage: any) {
        if (oldMessage.author?.bot) return;
        if (!oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: newMessage.author?.username || 'Unknown User', iconURL: newMessage.author?.displayAvatarURL() || undefined })
            .setTitle('Message Edited')
            .setDescription(`Message edited in <#${newMessage.channelId}> [Jump to Message](${newMessage.url})`)
            .addFields(
                { name: 'Before', value: oldMessage.content ? truncate(oldMessage.content, 1024) : 'No content' },
                { name: 'After', value: newMessage.content ? truncate(newMessage.content, 1024) : 'No content' }
            )
            .setColor(Colors.Warning)
            .setTimestamp();

        await sendLog(oldMessage.guild, 'moderation', embed);
    }
};

export default [messageDelete, messageUpdate];
