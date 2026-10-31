/* Small fixed-step circle solver. Coordinates are cabinet world pixels. */
(function(root){
  'use strict';
  const R=16, LEFT=192, RIGHT=354;
  function step(balls,dt,claw){
    for(const b of balls){
      b.vx=(b.vx||0)*Math.pow(.42,dt);
      b.vy=(b.vy||0)+760*dt;
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      b.angle=(b.angle||0)+b.vx*dt/35;
    }
    for(let iteration=0;iteration<8;iteration++){
      for(let i=0;i<balls.length;i++){
        const a=balls[i];
        for(let j=i+1;j<balls.length;j++){
          const b=balls[j];if(a.row!==b.row)continue;
          let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=2*R;
          if(d>=min)continue;
          if(d<.001){dx=.1;dy=-.1;d=Math.hypot(dx,dy);}
          const nx=dx/d,ny=dy/d,overlap=(min-d)*.5;
          a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
          const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
          if(relative<0){
            const impulse=-relative*.56;
            a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
          }
        }
        if(claw&&a.row===claw.row){
          const spread=8+claw.open*14;
          for(const sign of [-1,1]){
            const fx=claw.x+sign*spread,fy=claw.y+17;
            let dx=a.x-fx,dy=a.y-fy,d=Math.hypot(dx,dy);
            if(d<20&&d>.001){
              const overlap=20-d;a.x+=dx/d*overlap;a.y+=dy/d*overlap;
              a.vx+=dx/d*overlap*2;a.vy+=Math.max(0,dy/d*overlap*2);
              claw.contacts++;
            }
          }
        }
        const floor=a.row?347:369;
        if(a.x<LEFT){a.x=LEFT;a.vx=Math.abs(a.vx)*.28;}
        if(a.x>RIGHT){a.x=RIGHT;a.vx=-Math.abs(a.vx)*.28;}
        if(a.y>floor-R){a.y=floor-R;a.vy= a.vy>28?-a.vy*.18:0;a.vx*=.92;}
      }
    }
  }
  root.ClawPhysics={step,R,LEFT,RIGHT};
  if(typeof module!=='undefined')module.exports=root.ClawPhysics;
})(typeof window==='undefined'?globalThis:window);