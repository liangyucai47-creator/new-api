export function filterLegacyChatMenuItems(items, internalModeEnabled = false) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (!internalModeEnabled) {
    return items;
  }

  return items.filter((item) => item?.itemKey !== 'chat');
}

export function shouldShowLegacyChatSettings(internalModeEnabled = false) {
  return !internalModeEnabled;
}

export function shouldRedirectLegacyChatRoute(internalModeEnabled = false) {
  return internalModeEnabled;
}
