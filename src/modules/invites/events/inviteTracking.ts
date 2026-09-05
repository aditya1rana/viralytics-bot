import { Events, Collection, Guild } from 'discord.js';
import { BotEvent } from '../../../types/index.js';
import { logger } from '../../../services/logger.js';
import { InviteService } from '../services/inviteService.js';
import { xpService } from '../../xp/services/xpService.js';
import { ensureUser, ensureMember } from '../../../utils/helpers.js';
import prisma from '../../../services/database.js';

interface CachedInvite {
  code: string;
  uses: number;
  inviterId: string;
  maxUses: number;
}

interface CachedVanity {
  code: string | null;
  uses: number;
}

// Module-level map to cache invites: Map<guildId, Collection<code, CachedInvite>>
const inviteCache = new Map<string, Collection<string, CachedInvite>>();
const vanityCache = new Map<string, CachedVanity>();

async function populateGuildInvites(guild: Guild): Promise<Collection<string, CachedInvite>> {
  const codeData = new Collection<string, CachedInvite>();
  try {
    const invites = await guild.invites.fetch();
    invites.forEach((inv: any) => {
      codeData.set(inv.code, {
        code: inv.code,
        uses: inv.uses || 0,
        inviterId: inv.inviter?.id || '',
        maxUses: inv.maxUses || 0,
      });
    });
    inviteCache.set(guild.id, codeData);

    if (guild.vanityURLCode) {
      try {
        const vanity = await guild.fetchVanityData();
        if (vanity) {
          vanityCache.set(guild.id, { code: vanity.code ?? guild.vanityURLCode, uses: vanity.uses || 0 });
        }
      } catch {
        // Guild may not have vanity permissions
      }
    }
    logger.info(`Invite cache built for guild ${guild.name} (${guild.id}): ${codeData.size} invites.`);
  } catch (e) {
    logger.warn(`Could not fetch invites for guild ${guild.name} (${guild.id}). Check 'Manage Server' permission: ${e}`);
  }
  return codeData;
}

const clientReadyEvent: BotEvent<'ready'> = {
  name: Events.ClientReady as any,
  once: true,
  async execute(client: any) {
    try {
      for (const [, guild] of client.guilds.cache) {
        await populateGuildInvites(guild);
      }
      logger.info('✅ Initial invite cache built for all guilds.');
    } catch (error) {
      logger.error('Error during invite cache setup:', error);
    }
  },
};

const guildCreateEvent: BotEvent<'guildCreate'> = {
  name: Events.GuildCreate as any,
  once: false,
  async execute(guild: any) {
    try {
      await populateGuildInvites(guild);
    } catch (error) {
      logger.error(`Error caching invites on guildCreate for ${guild.id}:`, error);
    }
  },
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
        maxUses: invite.maxUses || 0,
      });
      inviteCache.set(invite.guild.id, cached);
      logger.debug(`[Invites] Cached newly created invite ${invite.code} by ${invite.inviter?.id}`);
    } catch (error) {
      logger.error('Error handling InviteCreate:', error);
    }
  },
};

const inviteDeleteEvent: BotEvent<'inviteDelete'> = {
  name: Events.InviteDelete as any,
  once: false,
  async execute(invite: any) {
    try {
      if (!invite.guild) return;
      const cached = inviteCache.get(invite.guild.id);
      if (cached) {
        cached.delete(invite.code);
        logger.debug(`[Invites] Removed deleted invite ${invite.code} from cache.`);
      }
    } catch (error) {
      logger.error('Error handling InviteDelete:', error);
    }
  },
};

const guildMemberAddEvent: BotEvent<'guildMemberAdd'> = {
  name: Events.GuildMemberAdd as any,
  once: false,
  async execute(member: any) {
    if (member.user?.bot) return;

    try {
      const guild = member.guild;

      // Ensure User and Member exist in DB first so no foreign key constraint is violated
      await ensureUser(member);
      await ensureMember(guild.id, member.id, member);
      await prisma.member.updateMany({
        where: { guildId: guild.id, userId: member.id },
        data: { hasLeft: false, leftAt: null },
      });

      let cachedInvites = inviteCache.get(guild.id);
      if (!cachedInvites || cachedInvites.size === 0) {
        cachedInvites = await populateGuildInvites(guild);
      }

      const currentInvites = await guild.invites.fetch().catch((e: any) => {
        logger.warn(`Failed to fetch invites on member join for guild ${guild.name}: ${e}`);
        return new Collection<string, any>();
      });

      let usedInvite: { code: string; inviterId: string } | null = null;
      let isVanityJoin = false;

      // 1. Find which invite in currentInvites had its uses count incremented
      for (const [code, inv] of currentInvites) {
        const cached = cachedInvites.get(code);
        if (cached !== undefined) {
          if ((inv.uses || 0) > cached.uses) {
            usedInvite = {
              code: inv.code,
              inviterId: inv.inviter?.id || cached.inviterId,
            };
            break; // Found the matching invite, break immediately
          }
        }
      }

      // 2. If no existing invite count changed, check for single-use invite that expired and disappeared
      if (!usedInvite && cachedInvites.size > 0) {
        for (const [code, cached] of cachedInvites.entries()) {
          if (!currentInvites.has(code)) {
            // If it reached max uses, this invite was used
            if (cached.maxUses > 0 && cached.uses + 1 >= cached.maxUses) {
              usedInvite = {
                code: code,
                inviterId: cached.inviterId,
              };
              break;
            }
          }
        }
      }

      // 3. Check if join was through a Vanity URL
      if (!usedInvite && guild.vanityURLCode) {
        try {
          const vanity = await guild.fetchVanityData();
          const cachedVanity = vanityCache.get(guild.id);
          if (vanity && cachedVanity && (vanity.uses || 0) > cachedVanity.uses) {
            isVanityJoin = true;
            vanityCache.set(guild.id, { code: vanity.code ?? guild.vanityURLCode, uses: vanity.uses || 0 });
            logger.info(`Member ${member.user?.tag} (${member.id}) joined via server Vanity URL: ${guild.vanityURLCode}`);
          }
        } catch {
          // Ignore vanity fetch errors
        }
      }

      // 4. Update memory cache with latest invite counts
      const updatedCodeData = new Collection<string, CachedInvite>();
      currentInvites.forEach((inv: any) => {
        const cached = cachedInvites?.get(inv.code);
        updatedCodeData.set(inv.code, {
          code: inv.code,
          uses: inv.uses || 0,
          inviterId: inv.inviter?.id || cached?.inviterId || '',
          maxUses: inv.maxUses || 0,
        });
      });
      inviteCache.set(guild.id, updatedCodeData);

      // 5. Record invite in database
      if (usedInvite && usedInvite.inviterId) {
        const inviterId = usedInvite.inviterId;

        // Prevent self-invites
        if (inviterId !== member.id) {
          const isFake = await InviteService.detectFakeInvite(member);
          const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

          await InviteService.trackInvite(guild.id, inviterId, member.id, usedInvite.code, isFake, accountAge);

          if (!isFake) {
            await xpService.addXp(guild.id, inviterId, 50, 'Invite bonus').catch(() => null);
          }
          logger.info(`✅ Tracked invite: ${member.user?.tag} (${member.id}) invited by ${inviterId} using code ${usedInvite.code}`);
        } else {
          logger.info(`Self-invite detected for ${member.user?.tag} (${member.id}) - ignored.`);
        }
      } else if (isVanityJoin) {
        logger.info(`Member ${member.user?.tag} (${member.id}) joined using Vanity URL.`);
      } else {
        logger.info(`Could not match personal invite for member ${member.user?.tag} (${member.id}) - Direct join or bot offline during creation.`);
      }
    } catch (error) {
      logger.error('Error handling GuildMemberAdd for invites:', error);
    }
  },
};

const guildMemberRemoveEvent: BotEvent<'guildMemberRemove'> = {
  name: Events.GuildMemberRemove as any,
  once: false,
  async execute(member: any) {
    if (member.user?.bot) return;

    try {
      await InviteService.handleMemberLeave(member.guild.id, member.id);
    } catch (error) {
      logger.error('Error handling GuildMemberRemove for invites:', error);
    }
  },
};

export default [
  clientReadyEvent,
  guildCreateEvent,
  inviteCreateEvent,
  inviteDeleteEvent,
  guildMemberAddEvent,
  guildMemberRemoveEvent,
];

