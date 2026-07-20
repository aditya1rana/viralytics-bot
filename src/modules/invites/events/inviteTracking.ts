import { Events, Collection } from 'discord.js';
import { BotEvent } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { InviteService } from '../services/inviteService.js';
import { xpService } from '../../xp/services/xpService.js';

// Module-level map to cache invites: Map<guildId, Collection<code, uses>>
const inviteCache = new Map<string, Collection<string, number>>();

const clientReadyEvent: BotEvent<'ready'> = {
  name: Events.ClientReady as any,
  once: true,
  async execute(client: any) {
    try {
      // Fetch all invites for all guilds client is in
      for (const [id, guild] of client.guilds.cache) {
        try {
          const invites = await guild.invites.fetch();
          const codeUses = new Collection<string, number>();
          invites.forEach((inv: any) => {
            codeUses.set(inv.code, inv.uses || 0);
          });
          inviteCache.set(id, codeUses);
        } catch (e) {
          logger.warn(`Could not fetch invites for guild ${guild.name}: ${e}`);
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
      const guildInvites = inviteCache.get(invite.guild.id);
      if (guildInvites) {
        guildInvites.set(invite.code, invite.uses || 0);
      } else {
        const codeUses = new Collection<string, number>();
        codeUses.set(invite.code, invite.uses || 0);
        inviteCache.set(invite.guild.id, codeUses);
      }
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
      const cachedInvites = inviteCache.get(guild.id) || new Collection<string, number>();
      const currentInvites = await guild.invites.fetch().catch(() => new Collection<string, any>());
      
      let usedInvite: any;
      
      // Find which invite's uses increased
      currentInvites.forEach((inv: any) => {
        const cachedUses = cachedInvites.get(inv.code);
        if (cachedUses !== undefined && (inv.uses || 0) > cachedUses) {
          usedInvite = inv;
        }
      });

      // Update cache with new current invites
      const codeUses = new Collection<string, number>();
      currentInvites.forEach((inv: any) => {
        codeUses.set(inv.code, inv.uses || 0);
      });
      inviteCache.set(guild.id, codeUses);

      if (usedInvite && usedInvite.inviter) {
        const inviterId = usedInvite.inviter.id;
        const isFake = await InviteService.detectFakeInvite(member);
        
        await InviteService.trackInvite(guild.id, inviterId, member.id, usedInvite.code, isFake);
        
        if (!isFake) {
          // Award XP to the inviter
          await xpService.addXp(guild.id, inviterId, 50, 'Invite bonus'); // Custom XP amount for invites
        }
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
