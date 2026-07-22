import { Events, Collection } from 'discord.js';
import { BotEvent } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { InviteService } from '../services/inviteService.js';
import { xpService } from '../../xp/services/xpService.js';

interface CachedInvite {
  code: string;
  uses: number;
  inviterId: string;
  maxUses: number;
}

// Module-level map to cache invites: Map<guildId, Collection<code, CachedInvite>>
const inviteCache = new Map<string, Collection<string, CachedInvite>>();

const clientReadyEvent: BotEvent<'ready'> = {
  name: Events.ClientReady as any,
  once: true,
  async execute(client: any) {
    try {
      // Fetch all invites for all guilds client is in
      for (const [id, guild] of client.guilds.cache) {
        try {
          const invites = await guild.invites.fetch();
          const codeData = new Collection<string, CachedInvite>();
          invites.forEach((inv: any) => {
            codeData.set(inv.code, {
              code: inv.code,
              uses: inv.uses || 0,
              inviterId: inv.inviter?.id || '',
              maxUses: inv.maxUses || 0
            });
          });
          inviteCache.set(id, codeData);
        } catch (e) {
          logger.warn(`Could not fetch invites for guild ${guild.name} (${id}). Make sure the bot has 'Manage Server' (MANAGE_GUILD) permission: ${e}`);
        }
      }
      logger.info('Invite cache built successfully.');
    } catch (error) {
      logger.error('Error during invite cache setup:', error);
    }
  }
};

const inviteCreateEvent: BotEvent<'inviteCreate'> = {
  name: Events.InviteCreate as any,
  once: false,
  async execute(invite: any) {
    try {
      if (!invite.guild) return;
      const cached = inviteCache.get(invite.guild.id) || new Collection<string, CachedInvite>();
      cached.set(invite.code, {
        code: invite.code,
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || '',
        maxUses: invite.maxUses || 0
      });
      inviteCache.set(invite.guild.id, cached);
    } catch (error) {
      logger.error('Error handling InviteCreate:', error);
    }
  }
};

const guildMemberAddEvent: BotEvent<'guildMemberAdd'> = {
  name: Events.GuildMemberAdd as any,
  once: false,
  async execute(member: any) {
    if (member.user.bot) return;

    try {
      const guild = member.guild;
      const cachedInvites = inviteCache.get(guild.id) || new Collection<string, CachedInvite>();
      const currentInvites = await guild.invites.fetch().catch((e: any) => {
        logger.warn(`Failed to fetch invites on member join for guild ${guild.name}: ${e}`);
        return new Collection<string, any>();
      });
      
      let usedInvite: any;
      
      // 1. Find which invite in currentInvites had its uses count increase
      currentInvites.forEach((inv: any) => {
        const cached = cachedInvites.get(inv.code);
        if (cached !== undefined) {
          if ((inv.uses || 0) > cached.uses) {
            usedInvite = {
              code: inv.code,
              inviterId: inv.inviter?.id || cached.inviterId
            };
          }
        } else if ((inv.uses || 0) > 0) {
          // New invite created while bot wasn't looking
          usedInvite = {
            code: inv.code,
            inviterId: inv.inviter?.id || ''
          };
        }
      });

      // 2. If no invite was found in currentInvites, check for single-use / max-uses invites that disappeared
      if (!usedInvite && cachedInvites.size > 0) {
        for (const [code, cached] of cachedInvites.entries()) {
          if (!currentInvites.has(code)) {
            // Invite disappeared from Discord (e.g. 1-use invite reached maxUses)
            usedInvite = {
              code: code,
              inviterId: cached.inviterId
            };
            break;
          }
        }
      }

      // 3. Update cache with new current invites data
      const updatedCodeData = new Collection<string, CachedInvite>();
      currentInvites.forEach((inv: any) => {
        const cached = cachedInvites.get(inv.code);
        updatedCodeData.set(inv.code, {
          code: inv.code,
          uses: inv.uses || 0,
          inviterId: inv.inviter?.id || cached?.inviterId || '',
          maxUses: inv.maxUses || 0
        });
      });
      inviteCache.set(guild.id, updatedCodeData);

      // 4. Record invite if inviter was identified and not self-invite
      if (usedInvite && usedInvite.inviterId) {
        const inviterId = usedInvite.inviterId;

        // Prevent self-invites
        if (inviterId !== member.id) {
          const isFake = await InviteService.detectFakeInvite(member);
          
          await InviteService.trackInvite(guild.id, inviterId, member.id, usedInvite.code, isFake);
          
          if (!isFake) {
            // Award XP to the inviter
            await xpService.addXp(guild.id, inviterId, 50, 'Invite bonus').catch(() => null);
          }
          logger.info(`Tracked invite: ${member.user.tag} (${member.id}) invited by ${inviterId} using code ${usedInvite.code}`);
        }
      } else {
        logger.info(`Could not match inviter for member ${member.user.tag} (${member.id}) - likely joined via Vanity URL or Bot / Direct.`);
      }
    } catch (error) {
      logger.error('Error handling GuildMemberAdd for invites:', error);
    }
  }
};

const guildMemberRemoveEvent: BotEvent<'guildMemberRemove'> = {
  name: Events.GuildMemberRemove as any,
  once: false,
  async execute(member: any) {
    if (member.user.bot) return;

    try {
      await InviteService.handleMemberLeave(member.guild.id, member.id);
    } catch (error) {
      logger.error('Error handling GuildMemberRemove for invites:', error);
    }
  }
};

export default [clientReadyEvent, inviteCreateEvent, guildMemberAddEvent, guildMemberRemoveEvent];

