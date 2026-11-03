// 동현크 묶기: src의 HTML·CSS·JS를 한 장의 index.html로 합친다(글꼴·아이콘 내장).
const fs=require('fs'),path=require('path');
const {copyIcons}=require('./icon-files.cjs');
const root=__dirname,out=path.join(root,'dist'),src=n=>fs.readFileSync(path.join(root,'src',n),'utf8');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const js=['donghyun.js','sprites.js','data.js','engine.js','render.js','examples.js','sfx.js','gamepad.js','app.js'].map(src).join('\n;\n');
let css=src('style.css');
for(const name of fs.readdirSync(path.join(root,'fonts')))
  css=css.replaceAll('./fonts/'+name,'data:font/woff2;base64,'+fs.readFileSync(path.join(root,'fonts',name)).toString('base64'));
const html=src('index.html')
  .replace('__BRAND_ICON__',src('brand-icon.txt').trim())
  .replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`)
  .replace('<script src="./game.js"></script>',()=>`<script>${js.replaceAll('</script','<\\/script')}</script>`);
fs.writeFileSync(path.join(out,'index.html'),html);
copyIcons(out);
fs.cpSync(path.join(root,'licenses'),path.join(out,'licenses'),{recursive:true});
// GitHub Pages는 저장소 루트를 그대로 쓴다: 루트 index.html도 같은 단일 파일로 둔다.
fs.writeFileSync(path.join(root,'index.html'),html);
console.log(JSON.stringify({bytes:Buffer.byteLength(html)}));
