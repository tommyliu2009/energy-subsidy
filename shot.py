import asyncio,sys,time
from playwright.async_api import async_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8737/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--host-resolver-rules=MAP web7.subsidyking.tw 185.199.108.153'])
    pg=await b.new_page(viewport={'width':1366,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(U+'?t='+str(int(time.time())),wait_until='networkidle')
    print('title',await pg.title(),'| head ad visible',await pg.locator('.headad').is_visible(),'| side ad',await pg.locator('.sticky-ad').is_visible())
    for t in ['all','urgent','節能','淨零','環境部','esco']:
      await pg.click(f'#tabs button[data-t="{t}"]');await pg.wait_for_timeout(200);print(t,await pg.inner_text('#count'))
    await pg.click('.card');await pg.wait_for_timeout(200);print('modal',(await pg.inner_text('#mBody'))[:80].replace('\n',' '));await pg.keyboard.press('Escape')
    await pg.fill('#q','空調');await pg.keyboard.press('Enter');await pg.wait_for_timeout(300);print('esco 空調',await pg.inner_text('#count'))
    await pg.fill('#q','');await pg.keyboard.press('Enter');await pg.click('#tabs button[data-t="all"]');await pg.wait_for_timeout(300)
    await pg.screenshot(path='shot.png')
    m=await b.new_page(viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=2);await m.goto(U+'?t='+str(int(time.time())),wait_until='networkidle')
    print('mobile ad',await m.locator('.mad').is_visible(),'head ad',await m.locator('.headad').is_visible());await m.screenshot(path='shot_mobile.png')
    print('訂閱字樣',await pg.locator('text=訂閱').count(),await m.locator('text=訂閱').count());print('errors',errs);await b.close()
asyncio.run(main())
