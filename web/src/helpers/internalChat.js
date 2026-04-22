export function buildInternalChatNavLinks({
  isInternalMode,
  user,
  baseLinks = [],
}) {
  if (!isInternalMode || !user || Number(user.role) < 10) {
    return baseLinks;
  }

  return [
    ...baseLinks,
    {
      text: '聊天',
      itemKey: 'internal-chat',
      to: '/console/internal-chat',
    },
  ];
}
