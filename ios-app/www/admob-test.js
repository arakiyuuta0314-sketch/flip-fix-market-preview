// TestFlight only: official Google sample banner. No production ads are requested.
(async () => {
  if (window.Capacitor?.getPlatform?.() !== 'ios') return;
  const adMob = window.Capacitor?.Plugins?.AdMob;
  if (!adMob) { console.error('[AdMob] Native plugin unavailable'); return; }
  try {
    await adMob.initialize({ initializeForTesting: true });
    await adMob.showBanner({
      adId: 'ca-app-pub-3940256099942544/2934735716',
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: true
    });
    console.info('[AdMob] iOS test banner requested');
  } catch (error) {
    console.error('[AdMob] Test banner failed:', error);
  }
})();