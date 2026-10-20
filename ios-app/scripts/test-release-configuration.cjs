'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const web = read('www/index.html');
const source = read('monetization-entry.js');
const xcode = read('ios/App/App.xcodeproj/project.pbxproj');
const plist = read('ios/App/App/Info.plist');

assert.match(web, /const DEVELOPMENT_BUILD = false;/, 'Release must disable dev mode');
assert.match(web, /const PRODUCTION_KEY = 'flip-fix-market-playtest-v010';/, 'Do not change user save key');
assert.match(web, /<title>FLIP & FIX Market<\/title>/);
assert(!/Playtest v0\.16\.0/.test(web), 'Playtest metadata remains');
assert(web.includes('<script src="monetization.js"></script>'));
assert(!/src=["']admob-test\.js["']/.test(web), 'Sample ad script must not load');
assert(!fs.existsSync(path.join(root,'www/admob-test.js')), 'Remove sample ad script from release');

const families = xcode.match(/TARGETED_DEVICE_FAMILY = "1";/g) || [];
assert.equal(families.length, 2, 'Both Debug and Release must target iPhone only');
assert(!xcode.includes('TARGETED_DEVICE_FAMILY = "1,2"'));
assert.match(plist, /ca-app-pub-2233916147865641~1831639104/, 'Production AdMob app ID missing');
assert.match(plist, /NSUserTrackingUsageDescription/, 'ATT purpose string required');
assert(source.includes('trackingAuthorizationStatus()'), 'ATT authorization check required');
assert(source.includes('requestTrackingAuthorization()'), 'ATT request on iOS required');
const skids = [...plist.matchAll(/<string>([a-z0-9]{10}\.skadnetwork)<\/string>/g)].map(m=>m[1]);
assert(skids.includes('cstr6suwn9.skadnetwork'));
assert(skids.length>=10,'Third-party SKAdNetwork list incomplete');
assert.equal(skids.length, new Set(skids).size, 'Duplicate SKAdNetwork identifiers');

assert(source.includes("const PURCHASES_ENABLED = true;"));
assert(source.includes("const PRODUCT_ID = 'com.flipfixmarket.game.remove_ads';"));
assert(source.includes("const BANNER_AD_ID = 'ca-app-pub-2233916147865641/3865855634';"));
assert(source.includes("const INTERSTITIAL_AD_ID = 'ca-app-pub-2233916147865641/3103438301';"));
assert(source.includes('initializeForTesting: false'));
assert.equal((source.match(/isTesting: false/g)||[]).length,2);
assert(source.includes('if (unlocked)'));
assert(source.includes('await adMob.hideBanner()'));
assert(source.includes('MIN_COMPLETED_JOBS_PER_INTERSTITIAL = 10'));
assert(source.includes('MIN_INTERSTITIAL_INTERVAL_MS = 10 * 60 * 1000'));
assert(source.includes('showPrivacyOptionsForm'));

const icon = fs.readFileSync(path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
assert.equal(icon.readUInt32BE(16),1024);
assert.equal(icon.readUInt32BE(20),1024);
assert.equal(crypto.createHash('sha256').update(icon).digest('hex'), 'ad28d725efcb4c673f35e4d145b5cd1ae61a9967a9cdf9137c61644ddc49dcd9', 'Approved icon was unexpectedly modified');
console.log('PASS iPhone-only release config, exact approved icon, non-test AdMob, IAP, privacy options, save compatibility, dev disabled, SKAdNetwork IDs:',skids.length);
