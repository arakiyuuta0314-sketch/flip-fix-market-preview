# FLIP & FIX Market — iPhone 1.0 公開準備記録
作業日: 2026-10-20

## 確認済み
- 初回公開は iPhone 専用。Xcode Debug/Release とも TARGETED_DEVICE_FAMILY = "1"。
- アプリのアイコンはユーザー承認済みの「スパナ＋コイン」。AppIcon-512@2x.png 1024 x 1024 に組み込み、SHA256 が原本と一致することを確認。
- DEVELOPMENT_BUILD は false に変更。セーブデータキーは変更しない。
- 実機で Sandbox の非消耗型 com.flipfixmarket.game.remove_ads 購入成功、アプリ再起動後も購入済み状態を維持。
- AdMob のアプリID、バナーID、全画面IDは本番用。SDK初期化・各広告は isTesting=false。
- 広告削除と広告再出現防止、購入復元に関する11のローカルテストが合格。
- Google公式の iOS Privacy Strategies に掲載された SKAdNetwork ID 50 件を Info.plist へ登録（2026-10-20 時点）。
- www/admob-test.js を削除。Capacitor 同期後の iOS public にも含まれないことを確認。
- npx cap sync ios と npm test をローカル PC で実行して成功。Codemagic のビルドは行っていない。

## 公開画像
- 確定済みの販促ポスター5枚とアイコンの元データは、ChatGPT Library「FLIP_FIX_Market/AppStore_確定素材_20261020」に保存済み。
- 別途、iPhone 実画面を描き直さず使う App Store 審査整合版のスクリーンショット5枚 (1320x2868 RGB PNG) を作成。
- Google Drive「マイドライブ/FLIP_FIX_Market_公開準備/iPhone_実画面スクリーンショット_審査整合版」に配置。
- 元の販促ポスターは削除・上書きせず維持。審査へは実画面と一致する版を推奨。

## 2026-10-21 追加確認
- App Store Connect の公開方法は審査承認後の自動リリースに変更し保存済み（ユーザー了承）。
- IAP「広告削除」は「審査準備完了」で初回審査に追加済み。審査用スクリーンショットの登録を商品詳細で確認。
- 年齢区分は日本等で4+、ブラジルでA12と表示（2026-10-21時点）。
- App Store用のスクリーンショット5枚は1206×2622へ調整して画面上で5件のアップロードを確認済み。
- アプリ情報: カテゴリ「ゲーム」、ジャンル「シミュレーション」「パズル」、サブタイトルを画面確認済み。
- プライバシー申告: 6カテゴリのうち「おおよその場所」の利用目的・紐付け・トラッキング申告を保存済み。残り5カテゴリは未完了。
- iOS App Tracking Transparency (ATT) ステータスを確認し未決定時にのみ許可を求める処理を追加。拒否または失敗でもIDFAを必要としない広告が動作可能な形を維持。NSUserTrackingUsageDescription追加。ローカル検証合格、実機未検証。
- Codemagic最終ビルド、正式審査提出は未実行。

## 残る確認 / 未実施
- Codemagic の新規ビルド、TestFlight配信、App Store提出はユーザーが明示的に許可するまで実施しない。
- 新アイコンとiPhone専用設定を含む新しいIPAは未ビルド。現行TestFlight版では未反映。
- App Store Connect の「アプリのプライバシー」申告内容とAdMob/UMPの実際の収集データの照合が必要。
- ストアの年齢区分、カテゴリ、説明、サポートURL、価格・配信地域、スクリーンショットの最終登録確認が必要。
- 初回非消耗型IAP「広告削除」のバージョン1.0への紐付け・審査用スクリーンショットの最終確認が必要。
- AdMob のアプリ審査は、直近ユーザー画面では「要審査」。本番広告の配信は未検証。公開後にAdMobアプリとストア掲載情報をリンクして審査状況・リクエストを確認。
- アプリ内広告の本番配信は未検証のため、IDが本番用であることと実際に収益が出ることを混同しない。

参考:
- Apple screenshot guidance https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots/
- Google SKAdNetwork https://developers.google.com/admob/ios/privacy/strategies
