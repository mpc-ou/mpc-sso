import { buildDiscordEmbed } from './discord-embed';

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbedPayload {
  username?: string;
  embeds: Array<{
    title: string;
    color: number;
    fields: DiscordEmbedField[];
  }>;
}

describe('buildDiscordEmbed', () => {
  it('should format discord-linked embed with Blurple color and discord info', () => {
    const payloadJson = buildDiscordEmbed({
      event: 'member.changed',
      actorLabel: 'testuser',
      actorDiscordId: '123456789',
      targetLabel: 'testuser',
      targetDiscordId: '123456789',
      changedFields: ['discordId', 'discordUsername'],
      extra: {
        action: 'discord-linked',
        discordId: '123456789',
        discordUsername: 'konnn_04',
      },
    });

    const parsed = JSON.parse(payloadJson) as DiscordEmbedPayload;
    expect(parsed.embeds).toHaveLength(1);
    const embed = parsed.embeds[0];
    expect(embed.title).toBe('🔗 Đã liên kết Discord');
    expect(embed.color).toBe(0x5865f2);

    const discordField = embed.fields.find(
      (f) => f.name === 'Tài khoản Discord',
    );
    expect(discordField).toBeDefined();
    expect(discordField?.value).toBe('<@123456789> (@konnn_04)');
  });

  it('should format discord-unlinked embed with warning color', () => {
    const payloadJson = buildDiscordEmbed({
      event: 'member.changed',
      actorLabel: 'testuser',
      targetLabel: 'testuser',
      extra: {
        action: 'discord-unlinked',
      },
    });

    const parsed = JSON.parse(payloadJson) as DiscordEmbedPayload;
    expect(parsed.embeds).toHaveLength(1);
    const embed = parsed.embeds[0];
    expect(embed.title).toBe('🔓 Đã huỷ liên kết Discord');
    expect(embed.color).toBe(0xe67e22);
  });
});
