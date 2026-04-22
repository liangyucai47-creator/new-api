import test from 'node:test';
import assert from 'node:assert/strict';

async function loadInternalModeHelpers() {
  try {
    return await import(new URL('./internalMode.js', import.meta.url));
  } catch {
    return {};
  }
}

test('internal mode keeps playground but hides legacy chat submenu', async () => {
  const { filterLegacyChatMenuItems } = await loadInternalModeHelpers();

  assert.equal(typeof filterLegacyChatMenuItems, 'function');

  const items = [
    {
      itemKey: 'playground',
      text: 'Playground',
      to: '/playground',
    },
    {
      itemKey: 'chat',
      text: '聊天',
      items: [{ itemKey: 'chat0', text: 'Cherry Studio', to: '/console/chat/0' }],
    },
  ];

  assert.deepEqual(filterLegacyChatMenuItems(items, true), [items[0]]);
  assert.deepEqual(filterLegacyChatMenuItems(items, false), items);
});

test('internal mode hides legacy chat settings tab', async () => {
  const { shouldShowLegacyChatSettings } = await loadInternalModeHelpers();

  assert.equal(typeof shouldShowLegacyChatSettings, 'function');
  assert.equal(shouldShowLegacyChatSettings(true), false);
  assert.equal(shouldShowLegacyChatSettings(false), true);
});

test('internal mode redirects legacy chat routes back to console', async () => {
  const { shouldRedirectLegacyChatRoute } = await loadInternalModeHelpers();

  assert.equal(typeof shouldRedirectLegacyChatRoute, 'function');
  assert.equal(shouldRedirectLegacyChatRoute(true), true);
  assert.equal(shouldRedirectLegacyChatRoute(false), false);
});
