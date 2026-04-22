import test from 'node:test';
import assert from 'node:assert/strict';

async function loadInternalChatHelpers() {
  try {
    return await import(new URL('./internalChat.js', import.meta.url));
  } catch {
    return {};
  }
}

test('admin in internal mode gets chat nav link', async () => {
  const { buildInternalChatNavLinks } = await loadInternalChatHelpers();

  assert.equal(typeof buildInternalChatNavLinks, 'function');

  const links = buildInternalChatNavLinks({
    isInternalMode: true,
    user: { role: 10 },
    baseLinks: [{ itemKey: 'console', text: '控制台', to: '/console' }],
  });

  assert.equal(links.some((item) => item.itemKey === 'internal-chat'), true);
});
