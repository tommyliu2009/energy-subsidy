#!/usr/bin/env python3
"""節能補助王：從補助資料庫篩出節能／淨零／環境部補助，合併 extra.csv（人工上網補充）與 ESCO 名單，產生 data.js。
用法：python3 build_site.py"""
import csv,json,re,datetime,os
from zoneinfo import ZoneInfo
D=os.path.dirname(os.path.abspath(__file__));TZ=ZoneInfo('Asia/Taipei');today=datetime.datetime.now(TZ).date()
SRC='/workspace/subsidy/補助資料庫_full.csv'
E=re.compile(r'節能|節電|能源效率|能效|汰換.*(設備|空調|冷氣|家電|鍋爐|照明|燈)|空調|冷氣|照明|LED|熱泵|鍋爐|馬達|變頻|ESCO|能源管理|儲能|太陽光電|再生能源|綠能|電動(車|機車|大客車|巴士)|充電|廢熱|冷凍|節水')
N=re.compile(r'淨零|減碳|碳盤查|碳足跡|低碳|零碳|碳中和|溫室氣體|碳費|碳權|綠色轉型|ESG|循環經濟|氣候變遷|冷卻行動')
V=re.compile(r'環境部|環保署|環境保護局|環保局|環境局|氣候變遷署|資源循環署')
PRIV=re.compile(r'使用者|GetGrant|日報|紀錄檔|彙整報告|20260920|user_files|drive\.google|docs\.google|googleusercontent')
def lvl(o):
    if re.search(r'(鄉|鎮|市|區)公所',o):return '鄉鎮市'
    if re.search(r'(縣|市)政府|環境保護局|環保局',o):return '縣市'
    return '中央'
CO=['臺北','新北','桃園','臺中','臺南','高雄','基隆','新竹','嘉義','苗栗','彰化','南投','雲林','屏東','宜蘭','花蓮','臺東','澎湖','金門','連江']
def reg(o):
    o=o.replace('台','臺')
    for c in CO:
        if c in o:return c
    return '全國'
def pd(s):
    try:return datetime.date.fromisoformat(s.strip())
    except:return None
rows=[];seen=set()
def add(r,src):
    name=r['補助名稱'].strip();org=r['主辦單位'].strip();url=(r.get('原始連結') or '').strip()
    if not name or not url.startswith('http') or PRIV.search(url):return
    k=(name,org)
    if k in seen:return
    t=name+' '+(r.get('摘要') or '')+' '+(r.get('所屬計畫') or '')
    cats=[]
    if N.search(t):cats.append('淨零')
    if E.search(t) or re.search('能源署|能源局',org):cats.append('節能')
    if V.search(org):cats.append('環境部')
    if not cats:return
    seen.add(k);dl=pd(r.get('截止日期',''));st=(r.get('狀態') or '').strip()
    if dl and dl<today and st in('開放中','即將開放'):st='已截止'
    summ=r.get('摘要','').strip()
    summ=';'.join(p for p in re.split(r'[；;]',summ) if not PRIV.search(p))
    rows.append(dict(id=len(rows)+1,name=name,org=org,level=(r.get('層級') or '').strip() or lvl(org),region=reg(org),cats=cats,
      deadline=dl.isoformat() if dl else None,deadlineText=(r.get('截止日期') or '').strip() or '依公告',target=(r.get('對象') or '').strip(),
      summary=summ,url=url,status=st or '常態性/依公告',year=(r.get('年度') or '').strip(),parent=(r.get('所屬計畫') or '').strip(),
      kind=(r.get('資料類型') or '現行').strip() or '現行',src=src,updated=(r.get('最後更新日') or '').strip()))
for r in csv.DictReader(open(os.path.join(D,'extra.csv'),encoding='utf-8')):add(r,'網路補充')
for r in csv.DictReader(open(SRC,encoding='utf-8-sig')):add(r,'補助資料庫')
esco=json.load(open('/workspace/esco/esco.json'))
E2=[{k:o[k] for k in ('公司名稱','統一編號','負責人','實收資本額_百萬元','公司地址','縣市','網址','電話','服務範圍','能源系統技術專長','節能服務業務範圍','公協會','改善實績數','改善實績','得標件數_2024起','得標案例','詳情網址')} for o in esco]
gen=datetime.datetime.now(TZ).strftime('%Y-%m-%d %H:%M')
out={'generated':gen,'items':rows,'esco':E2}
open(os.path.join(D,'data.js'),'w',encoding='utf-8').write('window.ESK='+json.dumps(out,ensure_ascii=False)+';')
from collections import Counter
c=Counter(x for r in rows for x in r['cats'])
d14=sum(1 for r in rows if r['deadline'] and 0<=(pd(r['deadline'])-today).days<=14)
op=sum(1 for r in rows if r['status']=='開放中')
print(f'{len(rows)} 筆補助 {dict(c)} 開放中{op} 14天內截止{d14} ESCO{len(E2)} 生成{gen}')
