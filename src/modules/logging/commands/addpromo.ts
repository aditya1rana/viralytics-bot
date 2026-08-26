import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../../../services/database.js';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../../services/logger.js';

export const data = new SlashCommandBuilder()
  .setName('addpromo')
  .setDescription('Log a promotional offer from a DM')
  .addStringOption(option => 
    option.setName('message')
      .setDescription('The raw DM message received')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const rawMessage = interaction.options.getString('message', true);
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Extract details using AI
    const systemPrompt = `You are an assistant that parses promotional Discord DM messages. 
Extract the following details from the provided message. 
Return ONLY a valid JSON object with these keys: 
- "contactName": The name or username of the person offering the service (string, or null if not found)
- "services": A brief summary of the services offered (string)
- "pricing": A summary of the pricing or rates (string)

Format exactly like this, no markdown, no other text:
{"contactName": "Name", "services": "Services", "pricing": "Pricing"}`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    
    let parsedData = { contactName: null, services: null, pricing: null };
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: systemPrompt + '\n\nMessage:\n' + rawMessage,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });
      const parsedJsonStr = response.text || '{}';
      const cleanJson = parsedJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (e) {
      logger.error('Failed to parse Gemini response for promo offer:', e);
      // Continue anyway, we have the raw message
    }

    // Ensure user exists in DB
    const submitter = await prisma.user.upsert({
      where: { id: interaction.user.id },
      update: {
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
      },
      create: {
        id: interaction.user.id,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
        accountCreatedAt: interaction.user.createdAt,
      },
    });

    // 2. Save to database
    const promo = await prisma.promoOffer.create({
      data: {
        guildId: interaction.guildId,
        submittedById: submitter.id,
        rawMessage,
        contactName: parsedData.contactName || 'Unknown',
        services: parsedData.services || 'Not specified',
        pricing: parsedData.pricing || 'Not specified',
      }
    });

    // 3. Log to specific channel (1542000548390109315)
    const logChannelId = '1542000548390109315';
    const channel = await interaction.guild?.channels.fetch(logChannelId).catch(() => null);

    if (channel && channel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('New Promotional Offer Logged')
        .setColor('#9b59b6')
        .addFields(
          { name: 'Contact Name', value: String(promo.contactName) || 'Unknown', inline: true },
          { name: 'Pricing', value: String(promo.pricing) || 'Unknown', inline: true },
          { name: 'Services', value: String(promo.services) || 'Unknown' },
          { name: 'Raw Message Snippet', value: promo.rawMessage.substring(0, 1000) + (promo.rawMessage.length > 1000 ? '...' : '') }
        )
        .setFooter({ text: `Logged by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }

    await interaction.editReply({ content: `✅ Promotional offer logged successfully! ID: ${promo.id}` });

  } catch (error) {
    logger.error('Error in /addpromo command:', error);
    await interaction.editReply({ content: '❌ An error occurred while processing the promo offer.' });
  }
}
