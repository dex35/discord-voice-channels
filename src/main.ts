import {
  Client,
  Events,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  VoiceState,
  Guild,
  User,
  Snowflake,
  GuildChannel,
} from 'discord.js';

let cache = new Map<Snowflake, GuildChannel>();

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.login(process.env.TOKEN);

client.once(Events.ClientReady, (c: Client<true>) => {
  console.log(`Соединение с discord установлено, никнейм ${c.user.tag}`);
});

/**
 * Создание канала в guild с указанными правами для user
 * @param guild
 * @param user
 */
function createChannel(guild: Guild, user: User) {
  return guild.channels.create({
    name: user.username,
    parent: process.env.NEW_CHANNEL_CATEGORY_ID,
    type: ChannelType.GuildVoice,
    position: 2,
    permissionOverwrites: [
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });
}

/**
 * Очистка пустых каналов
 */
function destroyEmptyChannels() {
  for (let id of cache.keys()) {
    const channel = cache.get(id);

    if (channel === undefined) {
      continue;
    }

    if (channel.members.size > 0) {
      continue;
    }

    destroyChannel(channel);
  }
}

/**
 * Удаление канала
 * @param channel
 */
async function destroyChannel(channel: GuildChannel) {
  try {
    const result = await channel.delete();
    console.log('Удален голосовой канал', channel.name);
    cache.delete(channel.id);
  } catch (e) {
    console.error('Ошибка удаления голосового канала', channel);
  }
}

/**
 * Обработчик переходов пользователя по голосовым каналам
 * @param oldState
 * @param newState
 */
async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  if (newState.member === null) {
    return;
  }

  if (newState.channelId === null || oldState.channelId !== null) {
    destroyEmptyChannels();
  }

  if (newState.channelId !== process.env.CHANNEL_CREATOR_ID) {
    return;
  }

  try {
    const { user } = newState.member;
    const channel = await createChannel(newState.guild, user);
    console.log('Создан голосовой канал', channel.name);

    cache.set(channel.id, channel);
    await newState.setChannel(channel);
  } catch (e) {
    console.error('Ошибка создания голосового канала', e);
  }
}

client.on(Events.VoiceStateUpdate, onVoiceStateUpdate);
