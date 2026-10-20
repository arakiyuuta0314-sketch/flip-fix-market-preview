from pathlib import Path
p=Path(__file__).parent/'www'/'index.html'
s=p.read_text(encoding='utf-8')
assert '<script src="admob-test.js"></script>' in s
s=s.replace('<script src="admob-test.js"></script>', '<script src="monetization.js"></script>')
marker='\u0024{settingsResetStage===0?'
assert s.count(marker)==1
purchase='''<div class="settings-info" id="purchase-panel"><strong>広告を削除 / Remove Ads</strong><p>一度購入すると、バナーと全画面広告がなくなります。価格はApp Storeの購入画面で確認できます。</p><button class="btn secondary block" data-action="purchase-remove-ads">広告を永久に削除</button><button class="btn secondary block" data-action="restore-remove-ads">購入を復元</button></div>
   '''
s=s.replace(marker,purchase+marker,1)
needle="if(action==='settings-close'){"
assert s.count(needle)==1
s=s.replace(needle,"if(action==='purchase-remove-ads'){window.flipFixPurchase?.();return;}\n   if(action==='restore-remove-ads'){window.flipFixRestore?.();return;}\n   "+needle,1)
for action in ('sell','collect'):
    start=s.index("if(action==='"+action+"')")
    end=s.index("\n",start)
    line=s[start:end]
    assert 'mutate();notify(' in line,action
    s=s[:start]+line.replace('mutate();notify(', 'mutate();window.flipFixAdBreak?.();notify(')+s[end:]
style='''<style>
@media(max-width:650px){
html.native-ios.native-ad-hidden .mobile-nav{bottom:env(safe-area-inset-bottom)}
html.native-ios.native-ad-hidden .mobile-nav::after{display:none}
html.native-ios.native-ad-hidden .shell{padding-bottom:calc(70px + env(safe-area-inset-bottom))!important}
html.native-ios.native-ad-visible .mobile-nav{bottom:calc(50px + env(safe-area-inset-bottom))}
html.native-ios.native-ad-visible .mobile-nav::after{background:#152235}
}
</style>
'''
s=s.replace('</head>',style+'</head>',1)
p.write_text(s,encoding='utf-8')
print('Updated index.html, length',len(s))
