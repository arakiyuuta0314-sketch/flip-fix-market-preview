import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';
const PRODUCT_ID = 'com.flipfixmarket.game.remove_ads';
const SAMPLE_BANNER = 'ca-app-pub-3940256099942544/2934735716';
const SAMPLE_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910';
const native = window.Capacitor?.getPlatform?.() === 'ios';
const adMob = window.Capacitor?.Plugins?.AdMob;
let unlocked = false, initialized = false, adReady = false, lastInterstitial = 0, eligibleEvents = 0;
const $html = document.documentElement;
const log = (message, detail) => console.info('[Monetization]', message, detail ?? '');
const status = (message) => { window.flipFixMonetizationStatus = message; window.dispatchEvent(new CustomEvent('flipfix-monetization-status')); };
const notify = (message) => window.alert(message);
function bannerLayout(show) {
  $html.classList.toggle('native-ad-visible', Boolean(show) && !unlocked);
  $html.classList.toggle('native-ad-hidden', !show || unlocked);
}
async function hideAds() {
  bannerLayout(false);
  try { if (adMob) await adMob.hideBanner(); } catch (error) { log('hideBanner failed', error); }
}
function unlockAds() {
  unlocked = true;
  status('purchased');
  hideAds();
  window.dispatchEvent(new CustomEvent('flipfix-purchase-updated'));
}
async function initializePurchases() {
  store.register([{ id: PRODUCT_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE }]);
  store.when().approved(async transaction => {
    if (!transaction.products?.some(p => p.id === PRODUCT_ID)) return;
    unlockAds();
    try { await transaction.finish(); } catch (error) { log('finish transaction failed', error); }
  });
  store.when().receiptsReady(() => {
    if (store.owned(PRODUCT_ID)) unlockAds();
    log('StoreKit receipts ready', { owned: store.owned(PRODUCT_ID) });
  });
  store.when().productUpdated(product => {
    if (product.id === PRODUCT_ID) {
      status(unlocked ? 'purchased' : 'available');
      log('product updated', { id: product.id, price: product.getOffer?.()?.pricing?.price });
    }
  });
  store.error(error => { log('StoreKit error', error); status('error'); });
  try {
    const errors = await store.initialize([Platform.APPLE_APPSTORE]);
    if (errors?.length) throw new Error(errors.map(e => e.message).join('; '));
    if (store.owned(PRODUCT_ID)) unlockAds();
    initialized = true;
    status(unlocked ? 'purchased' : 'ready');
    log('StoreKit initialized');
  } catch (error) {
    status('error');
    log('StoreKit initialization failed', error);
  }
}
window.flipFixPurchase = async () => {
  if (!native) return notify('購入はiPhoneアプリから利用できます。');
  if (unlocked) return notify('広告削除は購入済みです。');
  if (!initialized) return notify('App Storeへの接続を確認してください。');
  const product = store.get(PRODUCT_ID, Platform.APPLE_APPSTORE);
  const offer = product?.getOffer?.();
  if (!offer) return notify('購入商品を取得できません。App Store Connectの商品設定を確認してください。');
  const error = await store.order(offer);
  if (error) { log('purchase failed', error); notify('購入を完了できませんでした。'); }
};
window.flipFixRestore = async () => {
  if (!native || !initialized) return notify('App Storeへの接続を確認してください。');
  try {
    const error = await store.restorePurchases();
    if (error) throw new Error(error.message);
    if (store.owned(PRODUCT_ID)) unlockAds();
    notify(unlocked ? '購入を復元しました。' : '復元処理を受け付けました。購入履歴を確認しています。');
  } catch (error) { log('restore failed', error); notify('復元に失敗しました。時間をおいて再試行してください。'); }
};
window.flipFixAdsRemoved = () => unlocked;
async function prepareInterstitial() {
  if (!adReady || unlocked) return;
  try { await adMob.prepareInterstitial({ adId: SAMPLE_INTERSTITIAL, isTesting: true }); }
  catch (error) { log('interstitial preload failed', error); }
}
window.flipFixAdBreak = async () => {
  if (!adReady || unlocked) return;
  eligibleEvents++;
  if (eligibleEvents < 4 || Date.now() - lastInterstitial < 180000) return;
  eligibleEvents = 0;
  try {
    await adMob.showInterstitial();
    lastInterstitial = Date.now();
  } catch (error) { log('interstitial show failed', error); }
  await prepareInterstitial();
};
async function initializeAds() {
  if (!adMob) { status('admob-unavailable'); bannerLayout(false); return; }
  try {
    await adMob.initialize({ initializeForTesting: true });
    let consent = await adMob.requestConsentInfo();
    if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await adMob.showConsentForm();
    if (!consent.canRequestAds) { log('consent does not allow ads', consent); bannerLayout(false); return; }
    if (unlocked) return;
    await adMob.showBanner({ adId: SAMPLE_BANNER, adSize: 'BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: true });
    adReady = true;
    bannerLayout(true);
    log('test banner displayed');
    await prepareInterstitial();
  } catch (error) {
    bannerLayout(false);
    log('banner initialization failed', error);
  }
}
if (native) {
  $html.classList.add('native-ios', 'native-ad-hidden');
  status('loading');
  initializePurchases().then(initializeAds);
}
