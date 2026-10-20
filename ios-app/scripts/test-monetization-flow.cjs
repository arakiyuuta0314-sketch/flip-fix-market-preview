'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const entry = fs.readFileSync(path.join(__dirname, '..', 'monetization-entry.js'), 'utf8');
const testSource = entry.replace(
  /^import \{ store, ProductType, Platform \} from 'capacitor-plugin-cdv-purchase';/m,
  'const { store, ProductType, Platform } = __mockPurchases;'
);
assert.notEqual(testSource, entry, 'Expected StoreKit import not found');

async function boot(options = {}) {
  const calls = { order: 0, restore: 0, finish: 0, banners: 0, hide: 0, interstitials: 0, prepare: 0, alerts: [], statuses: [], events: [] };
  let owned = Boolean(options.owned);
  let releaseBanner;
  let callback = {};
  let time = 0;
  const classSet = new Set();
  const classes = {
    add(...names) { for (const name of names) classSet.add(name); },
    toggle(name, force) { if (force) classSet.add(name); else classSet.delete(name); }
  };
  const purchasedTxn = {
    products: [{ id: 'com.flipfixmarket.game.remove_ads' }],
    async finish() { calls.finish++; }
  };
  const store = {
    register(products) { calls.products = products; },
    error(cb) { callback.error = cb; },
    when() {
      return {
        approved(cb) { callback.approved = cb; },
        receiptsReady(cb) { callback.receiptsReady = cb; },
        receiptUpdated(cb) { callback.receiptUpdated = cb; },
        productUpdated(cb) { callback.productUpdated = cb; }
      };
    },
    owned(id) { assert.equal(id, 'com.flipfixmarket.game.remove_ads'); return owned; },
    async initialize(platforms) {
      assert.deepEqual([...platforms], ['apple-appstore']);
      if (options.bootEvent) await callback.approved(purchasedTxn);
      if (options.initializeFailure) return [{ message: 'StoreKit unavailable' }];
      return [];
    },
    get(id, platform) {
      assert.equal(id, 'com.flipfixmarket.game.remove_ads');
      assert.equal(platform, 'apple-appstore');
      return options.noOffer ? undefined : { getOffer: () => ({ id: 'offer' }) };
    },
    async order() {
      calls.order++;
      if (options.purchaseError) return { message: 'cancelled' };
      owned = true;
      await callback.approved(purchasedTxn);
      return undefined;
    },
    async restorePurchases() {
      calls.restore++;
      if (options.restoreError) return { message: 'restore failed' };
      if (options.restoreOwned) {
        owned = true;
        await callback.approved(purchasedTxn);
      }
      return undefined;
    }
  };
  const admob = {
    async requestConsentInfo() { return { canRequestAds: true, status: 'NOT_REQUIRED' }; },
    async showConsentForm() { throw Error('unexpected consent form'); },
    async initialize() {},
    async prepareInterstitial() { calls.prepare++; },
    async showBanner() { calls.banners++; if (options.delayBanner) await new Promise(resolve => { releaseBanner = resolve; }); },
    async hideBanner() { calls.hide++; },
    async showInterstitial() { calls.interstitials++; }
  };
  const window = {
    Capacitor: { getPlatform: () => options.platform || 'ios', Plugins: { AdMob: admob } },
    alert(message) { calls.alerts.push(message); },
    dispatchEvent(event) { calls.events.push(event.type); }
  };
  const context = {
    __mockPurchases: { store, ProductType: { NON_CONSUMABLE: 'non-consumable' }, Platform: { APPLE_APPSTORE: 'apple-appstore' } },
    window,
    document: { documentElement: { classList: classes }, getElementById: () => null },
    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
    Date: class FakeDate extends Date { static now() { return time; } },
    console: { info() {}, warn() {}, error() {} }
  };
  vm.runInNewContext(testSource, context, { filename: 'monetization-entry.js' });
  await new Promise(resolve => setTimeout(resolve, 20));
  return { window, calls, classes: classSet, callback, setTime: value => { time = value; }, releaseBanner: () => { assert.equal(typeof releaseBanner, 'function'); releaseBanner(); } };
}

(async () => {
  const normal = await boot();
  assert.deepEqual(JSON.parse(JSON.stringify(normal.calls.products)),
    [{ id: 'com.flipfixmarket.game.remove_ads', type: 'non-consumable', platform: 'apple-appstore' }]);
  assert.equal(normal.calls.banners, 1, 'Before purchase, banner should display');
  assert.equal(normal.window.flipFixAdsRemoved(), false);
  assert(normal.classes.has('native-ad-visible'));
  await normal.window.flipFixPurchase();
  assert.equal(normal.calls.order, 1);
  assert.equal(normal.calls.finish, 1);
  assert.equal(normal.window.flipFixAdsRemoved(), true);
  assert.equal(normal.calls.hide, 1, 'Purchase should immediately hide banner');
  assert(normal.classes.has('native-ad-hidden'));
  assert(normal.calls.events.includes('flipfix-purchase-updated'));
  normal.setTime(700000);
  for (let i = 0; i < 12; i++) await normal.window.flipFixAdBreak();
  assert.equal(normal.calls.interstitials, 0, 'Paid users must never see interstitials');

  const racing = await boot({ delayBanner: true });
  assert.equal(racing.calls.banners, 1, 'The banner request should be pending');
  await racing.window.flipFixPurchase();
  racing.releaseBanner();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert(racing.calls.hide >= 2, 'An in-flight banner must be hidden again after purchase');

  const existing = await boot({ owned: true, bootEvent: true });
  assert.equal(existing.window.flipFixAdsRemoved(), true);
  assert.equal(existing.calls.banners, 0, 'Existing entitlement must prevent banner');
  assert(existing.classes.has('native-ad-hidden'));

  const restored = await boot({ restoreOwned: true });
  await restored.window.flipFixRestore();
  assert.equal(restored.calls.restore, 1);
  assert.equal(restored.window.flipFixAdsRemoved(), true);
  assert.equal(restored.calls.hide, 1);
  assert.equal(restored.calls.alerts.at(-1), '購入を復元しました。');

  const notOwned = await boot();
  await notOwned.window.flipFixRestore();
  assert.equal(notOwned.window.flipFixAdsRemoved(), false, 'No purchase must not unlock');
  assert.equal(notOwned.calls.banners, 1);

  const noOffer = await boot({ noOffer: true });
  await noOffer.window.flipFixPurchase();
  assert.equal(noOffer.calls.order, 0);
  assert(noOffer.calls.alerts.some(v => v.includes('購入商品を取得できません')));

  const failedPurchase = await boot({ purchaseError: true });
  await failedPurchase.window.flipFixPurchase();
  assert.equal(failedPurchase.window.flipFixAdsRemoved(), false);
  assert(failedPurchase.calls.alerts.some(v => v.includes('購入を完了できません')));

  const failedRestore = await boot({ restoreError: true });
  await failedRestore.window.flipFixRestore();
  assert.equal(failedRestore.window.flipFixAdsRemoved(), false);
  assert(failedRestore.calls.alerts.some(v => v.includes('復元に失敗しました')));

  const web = await boot({ platform: 'web' });
  await web.window.flipFixPurchase();
  assert.equal(web.calls.banners, 0);
  assert(web.calls.alerts.some(v => v.includes('iPhoneアプリ')));

  console.log('PASS 9 monetization scenarios: initial ad + purchase/hide, concurrent banner + purchase, restart entitlement, restore, no-owned restore, missing product, failed purchase, failed restore, web guard.');
})().catch(error => { console.error(error); process.exitCode = 1; });
