/* 동현크 자료: 변신 모드와 스테이지. 스테이지는 압축 지시문으로 적고 engine이 격자로 편다. */
(function(root){
'use strict';
const T=16, ROWS=12;
/* 변신: 동현 시리즈의 다른 실험실에서 온 능력. 번호는 출전 규약 명령 2의 값 */
const FORMS=[
  {id:0,key:'base',name:'포동이',from:'기본',color:'#f6ecd6',hp:3,speed:1.0,jump:1.0,
   desc:'달리기와 점프, 앞발 치기(Z). 적은 밟아서도 쓰러뜨린다.',atk:'paw'},
  {id:1,key:'tank',name:'전차 포동이',from:'동현전',color:'#e5483a',hp:4,speed:0.75,jump:0.85,
   desc:'느리지만 단단하다. Z로 포탄을 쏜다(사거리 7칸). 체력 4.',atk:'shell'},
  {id:2,key:'knight',name:'기사 포동이',from:'동현워',color:'#3a78e8',hp:3,speed:1.25,jump:1.0,
   desc:'빠르다. Z로 창 돌진(앞으로 3칸 미끄러지며 닿는 적을 모두 친다). 돌진 중에는 다치지 않는다.',atk:'charge'},
  {id:3,key:'copter',name:'헬기 포동이',from:'동현콥',color:'#2bb0c8',hp:3,speed:1.0,jump:1.0,
   desc:'공중에서 X를 누르고 있으면 천천히 내려온다(활공). 공격은 앞발 치기(Z).',atk:'paw',glide:true},
  {id:4,key:'doom',name:'둠 포동이',from:'동현둠',color:'#5a8f3a',hp:3,speed:1.0,jump:1.0,
   desc:'Z로 산탄을 쏜다(사거리 3칸, 위아래로 퍼져 바로 앞 적을 한꺼번에 친다). 재장전이 느리다.',atk:'shotgun'},
  {id:5,key:'fly',name:'초파리 포동이',from:'동현초',color:'#e07be0',hp:2,speed:1.1,jump:0.95,
   desc:'공중에서 X를 한 번 더 누르면 두 번 점프한다. 체력 2.',atk:'paw',doubleJump:true}
];
/* 적: 시리즈 캐릭터. stomp 밟아서 처치 가능 · hits 공격 필요 횟수 */
const ENEMIES={
  lion:{name:'라이언',from:'동현파',w:24,h:8,speed:0.35,stomp:true,hits:1,desc:'분홍 선충. 바닥을 기어 다니고 벼랑에서 돌아선다.'},
  shushu:{name:'슈슈',from:'동현파',w:12,h:24,speed:0.5,stomp:true,hits:1,desc:'복싱 소녀. 가까이 오면 잽을 뻗는다. 글러브에 맞으면 아프다.'},
  inf:{name:'보병',from:'동현전',w:12,h:14,speed:0.8,stomp:true,hits:1,desc:'붉은별 사령부 보병. 빠르게 걷는다.'},
  tank:{name:'전차',from:'동현전',w:16,h:14,speed:0.25,stomp:false,hits:3,desc:'밟을 수 없다. 포탄을 앞으로 쏜다. 공격 세 번에 부서진다.'},
  pike:{name:'창병',from:'동현워',w:12,h:24,speed:0.4,stomp:false,hits:1,desc:'창을 위로 세워 밟을 수 없다. 옆에서 앞발 치기나 포탄으로.'},
  knight:{name:'기사',from:'동현워',w:24,h:16,speed:0.6,stomp:true,hits:2,desc:'포동이를 보면 돌진한다. 두 번 쳐야 쓰러진다.'}
};
/* 스테이지 지시문: g(x0,x1,topRow) 땅 · p(x0,x1,row) 외나무 발판 · s(x0,x1,row) 돌 블록 · k(x0,x1) 가시(땅 위) · e(type,x) 적 · b(x,row) 뼈다귀 · h(x,row) 하트 · F(x) 깃발 · zone(x) 구역 경계 */
const STAGES=[
 {id:1,name:'포동이의 첫 산책',note:'들판에서 동현워 성벽을 지나 동현전 공장지대까지. 세 구역.',W:200,
  zones:[{x:0,name:'들판',sky:['#8fd8ff','#dff4ff'],hill:'#79c26b',ground:'grass'},{x:72,name:'성벽',sky:['#9fb3d9','#e3e8f2'],hill:'#8e95a8',ground:'stone'},{x:136,name:'공장지대',sky:['#d9b08c','#f4e2cf'],hill:'#8a6a52',ground:'brick'}],
  ops:[
   ['g',0,30,10],['b',6,8],['b',7,8],['b',8,8],['e','lion',14],['p',18,21,7],['b',19,5],['e','lion',24],
   ['g',33,52,10],['e','shushu',38],['p',40,43,7],['b',41,5],['b',42,5],['e','lion',46],['s',48,49,9],['s',49,49,8],
   ['g',55,71,10],['s',58,58,9],['s',59,59,8],['s',60,60,7],['e','shushu',66],['h',70,8],
   // 성벽
   ['g',72,96,10],['s',72,73,9],['s',72,73,8],['e','pike',80],['p',84,87,7],['b',85,5],['b',86,5],['e','knight',91],['s',95,96,9],
   ['g',99,118,10],['k',103,104],['p',102,105,7],['e','pike',110],['s',114,118,9],['s',116,118,8],['b',117,6],
   ['g',121,135,10],['e','knight',127],['s',131,135,9],['s',133,135,8],['h',134,6],
   // 공장지대
   ['g',136,158,10],['s',136,137,9],['e','inf',143],['p',146,149,7],['b',147,5],['b',148,5],['e','tank',154],
   ['g',161,178,10],['k',165,166],['p',164,167,7],['e','inf',170],['e','inf',173],['s',176,178,9],
   ['g',181,199,10],['e','tank',187],['s',191,192,9],['s',192,192,8],['b',195,6],['F',197]
  ],
  start:[2,9]}
];
root.DATA={T,ROWS,FORMS,ENEMIES,STAGES};
})(window);
