/** Recognizes real Discord webhook URLs so we can send Discord's native embed format instead of our custom envelope */
const DISCORD_WEBHOOK_URL_RE =
  /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//;

export function isDiscordWebhookUrl(url: string): boolean {
  return DISCORD_WEBHOOK_URL_RE.test(url);
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

const MEMBER_ACTION_PRESET: Record<string, { title: string; color: number }> = {
  created: { title: '👤 Thành viên mới', color: 0x2ecc71 },
  updated: { title: '✏️ Thông tin thành viên được cập nhật', color: 0x3498db },
  deleted: { title: '🗑️ Thành viên đã bị xoá', color: 0xe74c3c },
  'locked-all': {
    title: '🔒 Đã khoá hồ sơ của toàn bộ thành viên',
    color: 0xe67e22,
  },
  'unlocked-all': {
    title: '🔓 Đã mở khoá hồ sơ của toàn bộ thành viên',
    color: 0x2ecc71,
  },
  'role-added': { title: '🎖️ Thêm chức vụ CLB', color: 0x2ecc71 },
  'role-updated': { title: '🎖️ Cập nhật chức vụ CLB', color: 0x3498db },
  'role-removed': { title: '🎖️ Xoá chức vụ CLB', color: 0xe74c3c },
};

const METHOD_LABEL: Record<string, string> = {
  password: 'Mật khẩu',
  google: 'Google',
  admin: 'Trang quản trị',
};

const POSITION_LABEL: Record<string, string> = {
  PRESIDENT: 'Chủ nhiệm',
  VICE_PRESIDENT: 'Phó chủ nhiệm',
  DEPARTMENT_LEADER: 'Trưởng ban',
  DEPARTMENT_VICE_LEADER: 'Phó ban',
  DEPARTMENT_MEMBER: 'Thành viên ban',
  COLLABORATOR: 'Cộng tác viên',
  ADVISOR: 'Cố vấn',
};

export interface DiscordEmbedInput {
  event: string;
  actorLabel?: string;
  actorDiscordId?: string;
  targetLabel?: string;
  targetDiscordId?: string;
  changedFields?: string[];
  extra?: Record<string, unknown>;
  ip?: string;
}

function mention(
  discordId: string | undefined,
  label: string | undefined,
): string {
  if (discordId) return `<@${discordId}>`;
  return label ?? 'Không rõ';
}

/** Builds a Discord webhook execute payload (https://discord.com/developers/docs/resources/webhook#execute-webhook) */
export function buildDiscordEmbed(input: DiscordEmbedInput): string {
  const fields: DiscordEmbedField[] = [];
  let title = input.event;
  let color = 0x95a5a6; // slate, generic fallback

  if (input.event === 'auth.login') {
    title = '🔑 Đăng nhập mới';
    color = 0x2ecc71;
    fields.push({
      name: 'Người dùng',
      value: mention(input.targetDiscordId, input.targetLabel),
      inline: true,
    });
    const method =
      typeof input.extra?.method === 'string' ? input.extra.method : undefined;
    if (method)
      fields.push({
        name: 'Phương thức',
        value: METHOD_LABEL[method] ?? method,
        inline: true,
      });
    if (input.ip) fields.push({ name: 'IP', value: input.ip, inline: true });
  } else if (input.event === 'profile.updated') {
    title = '📝 Hồ sơ được cập nhật';
    color = 0x3498db;
    fields.push({
      name: 'Người dùng',
      value: mention(input.targetDiscordId, input.targetLabel),
      inline: true,
    });
    if (input.changedFields?.length) {
      fields.push({
        name: 'Trường thay đổi',
        value: input.changedFields.join(', '),
      });
    }
  } else if (input.event === 'member.changed') {
    const action =
      typeof input.extra?.action === 'string' ? input.extra.action : undefined;
    const preset = action ? MEMBER_ACTION_PRESET[action] : undefined;
    title = preset?.title ?? '👥 Thành viên thay đổi';
    color = preset?.color ?? color;
    if (input.targetLabel) {
      fields.push({
        name: 'Thành viên',
        value: mention(input.targetDiscordId, input.targetLabel),
        inline: true,
      });
    }
    if (typeof input.extra?.count === 'number') {
      fields.push({
        name: 'Số lượng',
        value: String(input.extra.count),
        inline: true,
      });
    }
    if (typeof input.extra?.position === 'string') {
      fields.push({
        name: 'Chức vụ',
        value: POSITION_LABEL[input.extra.position] ?? input.extra.position,
        inline: true,
      });
    }
    if (typeof input.extra?.department === 'string') {
      fields.push({ name: 'Ban', value: input.extra.department, inline: true });
    }
  }

  // Skip for auth.login — actor and target are always the same person there,
  // so it would just repeat the "Người dùng" field above.
  if (input.event !== 'auth.login') {
    fields.push({
      name: 'Thực hiện bởi',
      value: mention(input.actorDiscordId, input.actorLabel ?? 'Hệ thống'),
      inline: true,
    });
  }

  return JSON.stringify({
    username: 'MPC SSO',
    embeds: [
      {
        title,
        color,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'MPC SSO' },
      },
    ],
  });
}
