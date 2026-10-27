import {DurableObject} from 'cloudflare:workers';
import {SocketHub} from './socket-hub.mjs';
import {createGameServer} from './server/src/app.ts';

const CODE=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;
const ORIGINS=new Set(['https://play.wae.kr','https://cursor-infofestival.pages.dev']);
export default{
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/health')return Response.json({ok:true,game:'여우와 쥐',revision:'2026-10-28.1'});
  if(url.pathname!=='/socket.io/'||url.searchParams.get('EIO')!=='4'||url.searchParams.get('transport')!=='websocket')return new Response('Not found',{status:404});
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
  const origin=request.headers.get('Origin');if(origin&&!ORIGINS.has(origin)&&!/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin))return new Response('Origin not allowed',{status:403});
  const room=url.searchParams.get('room')||'welcome';if(room!=='welcome'&&!CODE.test(room))return new Response('Invalid room',{status:400});
  return env.GAME_ROOMS.getByName(room==='welcome'?'welcome':'room:'+room,{locationHint:'apac'}).fetch(request);
 }
};

/** A game room is the coordination boundary. Active 20 Hz game simulation and
 * Engine.IO heartbeat timers intentionally retain live room state in memory,
 * as in the supplied Node server. Idle empty instances may hibernate. */
export class FoxGameRoom extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.hub=new SocketHub();this.game=null;}
 async fetch(request){
  const room=new URL(request.url).searchParams.get('room')||'welcome';
  if(!this.game){
   if(CODE.test(room))this.game=createGameServer({transport:this.hub,roomCode:room});
   else{this.hub.on('connection',peer=>peer.on('time:sync',(_payload,reply)=>reply({ok:true,serverTime:Date.now()})));this.game={welcome:true};}
  }
  const pair=new WebSocketPair(),[client,server]=Object.values(pair),id=crypto.randomUUID();
  this.ctx.acceptWebSocket(server);server.serializeAttachment({id});
  this.hub.open(data=>server.send(data),()=>server.close(1001,'Disconnected'),id);
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws,data){const id=ws.deserializeAttachment()?.id;if(id)this.hub.receive(id,data);}
 webSocketClose(ws){const id=ws.deserializeAttachment()?.id;if(id)this.hub.drop(id);}
 webSocketError(ws){const id=ws.deserializeAttachment()?.id;if(id)this.hub.drop(id,true);}
}
