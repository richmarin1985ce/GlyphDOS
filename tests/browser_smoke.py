from pathlib import Path
from playwright.sync_api import sync_playwright

URL = Path(__file__).resolve().parents[1].joinpath('GlyphDOS-standalone.html').as_uri()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1400, 'height': 1050},accept_downloads=True)
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(Path(__file__).resolve().parents[1].joinpath('GlyphDOS-standalone.html').read_text(),wait_until='load')
    page.wait_for_timeout(350)
    print('Title:',page.title())
    print('Canvas:',page.locator('#screen').count())
    print('Board:',page.locator('#boardTitle').inner_text())
    print('Errors:',errors)
    assert not errors,errors
    assert 'TERMINAL' in page.locator('#boardTitle').inner_text()
    page.screenshot(path='/mnt/data/GlyphDOS-preview.png',full_page=True)
    page.get_by_role('button',name='▦ BOARD EDITOR').click()
    assert page.locator('#pane-edit').is_visible()
    print('Editor visible:',page.locator('#pane-edit').is_visible())
    page.locator('#layerSelect').select_option('entities')
    page.locator('#paintType').select_option('npc')
    screen=page.locator('#screen')
    bounding=screen.bounding_box()
    # place object at visible near x=10,y=10
    page.mouse.click(bounding['x']+10.5*bounding['width']/60,bounding['y']+10.5*bounding['height']/25)
    eng=page.evaluate('''() => window.GlyphDOSApp.getEngine().world.boards[0].entities.length''')
    print('Entities after paint:',eng)
    page.get_by_role('button',name='⌘ OBJECT SCRIPT').click()
    screen=page.locator('#screen');bounding=screen.bounding_box()
    page.mouse.click(bounding['x']+10.5*bounding['width']/60,bounding['y']+10.5*bounding['height']/25)
    print('Selection:',page.locator('#selectionStatus').inner_text())
    assert 'NPC' in page.locator('#selectionStatus').inner_text()
    page.locator('#codeInput').fill(':touch\nsay I am alive!\ngive gems 2\nend')
    page.locator('#saveScriptBtn').click()
    assert page.evaluate('''() => window.GlyphDOSApp.getEngine().world.boards[0].entities.some(o=>o.code.includes('alive!'))''')
    page.get_by_role('button',name='✣ GLYPH STUDIO').click()
    assert page.locator('#cpGrid button').count()==256
    page.locator('#slotInput').fill('20')
    page.locator('#pixelEditor button').first.click()
    page.locator('#saveGlyphBtn').click()
    assert page.locator('#pane-edit').is_visible()
    assert page.evaluate('''() => window.GlyphDOSApp.getEngine().world.glyphBanks.default['20'][0][0]''')=='1'
    with page.expect_download() as info:
        page.locator('#exportBtn').click()
    print('Export filename:',info.value.suggested_filename)
    page.get_by_role('button',name='▶ PLAY').click()
    page.keyboard.press('ArrowRight')
    print('Player x:',page.evaluate('''() => window.GlyphDOSApp.getEngine().player.x'''))
    assert not errors,errors
    browser.close()
    print('BROWSER TESTS: PASS')
