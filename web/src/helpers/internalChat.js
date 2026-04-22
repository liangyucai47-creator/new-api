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

function normalizeModelList(models = []) {
  return [...new Set((models || []).map((item) => String(item).trim()).filter(Boolean))];
}

function parseTokenModelLimits(modelLimits) {
  return normalizeModelList(String(modelLimits || '').split(','));
}

export function resolveDefaultChatContext({ tokens = [], userModels = [] }) {
  const normalizedModels = normalizeModelList(userModels);
  const firstToken = tokens[0] || null;

  if (!firstToken) {
    return {
      tokenId: null,
      models: normalizedModels,
      defaultModel: normalizedModels[0] || '',
    };
  }

  const visibleModels = firstToken.model_limits_enabled
    ? normalizedModels.filter((model) =>
        parseTokenModelLimits(firstToken.model_limits).includes(model),
      )
    : normalizedModels;

  return {
    tokenId: firstToken.id ?? null,
    models: visibleModels,
    defaultModel: visibleModels[0] || '',
  };
}
