'use strict';
const fs=require('node:fs'),path=require('node:path');
const SKIP=new Set(['css','js','assets','node_modules','site','site-repo','templates','kit','publisher','tools','functions','lib']);
function read(file){return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function collect(root){
 const games=[];
 for(const item of fs.readdirSync(root,{withFileTypes:true})){
  if(item.name.startsWith('.')||SKIP.has(item.name.toLowerCase()))continue;
  if(item.isSymbolicLink())throw Error('공개 폴더의 링크는 허용하지 않습니다: '+item.name);
  if(!item.isDirectory())continue;
  const dir=path.join(root,item.name),index=path.join(dir,'index.html'),configPath=path.join(dir,'game.config.json');
  if(!fs.existsSync(index)||!fs.existsSync(configPath))continue;
  const config=read(configPath);
  if(!config||typeof config.title!=='string'||!config.title.trim()||typeof config.creator!=='string'||!config.creator.trim())throw Error('게임 이름·제작자 설정 오류: '+item.name);
  const game={name:config.creator.trim(),title:config.title.trim(),href:'/'+encodeURIComponent(item.name)+'/'};
  const meta=path.join(dir,'game.manifest.json');
  if(fs.existsSync(meta)){const manifest=read(meta);if(!/^[0-9a-f-]{36}$/i.test(manifest.projectId||'')||!/^[0-9a-f]{64}$/.test(manifest.version||''))throw Error('게임 공개 기록 오류: '+item.name);game.projectId=manifest.projectId;game.version=manifest.version;}
  games.push(game);
 }
 games.sort((a,b)=>a.name===b.name?(a.href<b.href?-1:a.href>b.href?1:0):(a.name<b.name?-1:1));
 return{intervalMs:8000,games};
}
function rebuild(root=__dirname,check=false){const text=JSON.stringify(collect(root),null,2)+'\n',target=path.join(root,'games.json');if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)throw Error('games.json이 작품 목록과 다릅니다. 공개 도구 또는 node build-list.js로 생성하세요.');}else{const temp=target+'.tmp';fs.writeFileSync(temp,text);fs.renameSync(temp,target);}return JSON.parse(text);}
if(require.main===module){try{const result=rebuild(__dirname,process.argv.includes('--check'));console.log('games.json '+result.games.length);}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={collect,rebuild};

