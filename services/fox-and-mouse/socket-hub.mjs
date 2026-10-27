/** Engine.IO v4 / Socket.IO v5 JSON transport used by the unchanged game events.
 * Binary events and custom namespaces are deliberately rejected; this game's
 * client sends JSON events in the default namespace over WebSocket only.
 */
export class SocketHub {
 constructor({pingInterval=5000,pingTimeout=8000}={}){
  this.pingInterval=pingInterval;this.pingTimeout=pingTimeout;this.sockets={sockets:new Map()};this.listeners=[];this.timer=null;
 }
 on(event,handler){if(event==='connection')this.listeners.push(handler);return this;}
 open(send,close,id=crypto.randomUUID()){
  const hub=this,peer={id,data:{},rooms:new Set([id]),handlers:new Map(),connected:false,send,close,lastPing:0,deadline:0,
   on(event,handler){this.handlers.set(event,handler);return this;},
   emit(event,payload){if(this.connected){try{this.send('42'+JSON.stringify([event,payload]));}catch{hub.drop(this.id,true);}}return this;},
   join(room){this.rooms.add(room);},leave(room){this.rooms.delete(room);}
  };
  this.sockets.sockets.set(id,peer);send('0'+JSON.stringify({sid:id,upgrades:[],pingInterval:this.pingInterval,pingTimeout:this.pingTimeout,maxPayload:65536}));
  if(!this.timer)this.timer=setInterval(()=>this.heartbeat(),Math.min(1000,this.pingInterval));
  return peer;
 }
 receive(id,data){
  const peer=this.sockets.sockets.get(id);if(!peer)return;
  if(typeof data!=='string'||data.length>65536)return this.drop(id,true);
  if(data==='3'){peer.deadline=0;peer.lastPing=Date.now();return;}
  if(data==='2'){peer.send('3');return;}
  if(data==='1'||data.startsWith('41'))return this.drop(id,true);
  if(data.startsWith('40')){
   if(peer.connected)return;peer.connected=true;peer.lastPing=Date.now();peer.send('40'+JSON.stringify({sid:id}));for(const handler of this.listeners)handler(peer);return;
  }
  if(!peer.connected)return this.drop(id,true);
  const match=/^42(\d{0,12})(\[[\s\S]*\])$/.exec(data);if(!match)return this.drop(id,true);
  let args;try{args=JSON.parse(match[2]);}catch{return this.drop(id,true);}
  if(!Array.isArray(args)||typeof args[0]!=='string'||args.length>3)return this.drop(id,true);
  let replied=false;const reply=value=>{if(replied||!match[1]||!this.sockets.sockets.has(id))return;replied=true;peer.send('43'+match[1]+JSON.stringify([value]));};
  const handler=peer.handlers.get(args[0]);if(!handler){reply({ok:false,error:'지원하지 않는 게임 요청이에요.'});return;}
  try{handler(args[1],reply);}catch(error){console.error(JSON.stringify({event:'game-event-error',name:args[0],message:String(error.message)}));reply({ok:false,error:'요청을 처리하지 못했어요. 다시 시도해 주세요.'});}
 }
 heartbeat(){const now=Date.now();for(const peer of this.sockets.sockets.values()){
  if(peer.deadline){if(now>=peer.deadline)this.drop(peer.id,true);continue;}
  if(now-peer.lastPing>=this.pingInterval){try{peer.send('2');peer.lastPing=now;peer.deadline=now+this.pingTimeout;}catch{this.drop(peer.id,true);}}
 }}
 to(room){return{emit:(event,payload)=>{for(const peer of this.sockets.sockets.values())if(peer.rooms.has(room))peer.emit(event,payload);}};}
 drop(id,close=false){const peer=this.sockets.sockets.get(id);if(!peer)return;this.sockets.sockets.delete(id);if(peer.connected){peer.connected=false;peer.handlers.get('disconnect')?.();}if(close){try{peer.close();}catch{}}if(!this.sockets.sockets.size&&this.timer){clearInterval(this.timer);this.timer=null;}}
 close(callback){for(const id of [...this.sockets.sockets.keys()])this.drop(id,true);callback?.();}
}
