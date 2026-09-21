var x=width/4;
var y=height/4;
var units=[];
k=0;
var circles=[];
var canvas=document.getElementsByTagName('canvas')[0];
var c=canvas.getContext('2d');
var width=canvas.width=window.innerWidth*2;
var height=canvas.height=window.innerHeight*2;
var points=[];
var myPos=[width/4,height/4];
for(let i=0;i<20;i++){
points.push([[Math.random()*width,Math.random()*height],5]);


}
for(let i=0;i<points.length;i++){

c.beginPath();
c.arc(points[i][0][0],points[i][0][1],5,0,Math.PI*2,false);
c.fillStyle="white";
c.fill();


}


canvas.addEventListener('mousemove',aca);
function aca(){
x=event.clientX;
y=event.clientY;
k=1;
}
var me=new Create(20,[width/4,height/4],[Math.random()*100,Math.random()*100,Math.random()*100]);
circles.push(me);

for(let i=0;i<3;i++){
circles.push(new Create(20,[Math.random()*width,Math.random()*height],[Math.random()*100,Math.random()*100,Math.random()*100]));

}

function Create(radius,cordinates,num){

this.radius=radius;
this.cordinates=cordinates;
this.num=num;

}

function aca2(){

var mouseXY=[x-width/4,y-height/4];
var unitV=scale(mag(mouseXY),2);
me.cordinates=add(me.cordinates,unitV);

c.translate(-unitV[0],-unitV[1]);
units.push([unitV[0],unitV[1]]);
}



Create.prototype.draw=function(){

c.beginPath();
c.arc(this.cordinates[0],this.cordinates[1],this.radius,0,Math.PI*2,false);
c.fillStyle="white";
c.fill();

}

Create.prototype.eatPoints=function(){
for(let i=0;i<circles.length;i++){
if(circles[i]==this){var k3=i;}
if(circles[i]==me){var me1=i;}	
}

for(let i=0;i<points.length;i++){

if(length(sub(points[i][0],this.cordinates))<=this.radius+5){

this.radius+=0.5;
points.splice(i,1);
points.push([[Math.random()*width,Math.random()*height],5]);

}


}
for(let i=0;i<circles.length;i++){

if(!(this==circles[i])){

if(length(sub(circles[i].cordinates,this.cordinates))<=this.radius/2 || length(sub(circles[i].cordinates,this.cordinates))<=circles[i].radius){

if(this.radius>circles[i].radius+2){

this.radius=this.radius+circles[i].radius/3;

circles.splice(i,1);
if(circles[i]==circles[me1]){for(let i=0;i<units.length;i++){

c.translate(units[i][0],units[i][1]);

}
units=[];
me=new Create(20,[width/4,height/4],[Math.random()*100,Math.random()*100,Math.random()*100]);
circles.push(me);
}else{
circles.push(new Create(20,[Math.random()*width,Math.random()*height],[Math.random()*100,Math.random()*100,Math.random()*100]));
}




}



}
}}}
//kraj for loop}
//kraj funkcije}

Create.prototype.bot=function(){
var nearestCircle=[];
for(let i=0;i<circles.length;i++){

if(!(this==circles[i])){

var length3=sub(circles[i].cordinates,this.cordinates);
nearestCircle.push({vector:length3,magnitude:length(length3),index:i,cordinates:[circles[i].cordinates[0],circles[i].cordinates[1]],radius:circles[i].radius});

}

}
var k1=0;
for(let i=0;i<nearestCircle.length;i++){

if(nearestCircle[k1].magnitude>nearestCircle[i].magnitude){k1=i;}

}
if(nearestCircle[k1].magnitude<=200){


if(this.radius>nearestCircle[k1].radius+2){

this.cordinates=add(this.cordinates,scale(mag(nearestCircle[k1].vector),2));

}
else{

	this.cordinates=sub(this.cordinates,scale(mag(nearestCircle[k1].vector),2));
}


}


if(nearestCircle[k1].magnitude>200){

var nearestPoint=[];
//svi poeni u blizini
for(let i=0;i<points.length;i++){

var length2=sub(points[i][0],this.cordinates);

nearestPoint.push({vector:length2,magnitude:length(length2),index:i});

}
var k=0;
for(var i=0;i<nearestPoint.length;i++){

if(nearestPoint[k].magnitude>nearestPoint[i].magnitude){k=i;}

}

this.cordinates=add(this.cordinates,scale(mag(nearestPoint[k].vector),2));


} }


function gameLoop(){
c.clearRect(0,0,width,height);
c.fillStyle="black";
c.fillRect(0,0,width,height);
for(let i=0;i<points.length;i++){

c.beginPath();
c.arc(points[i][0][0],points[i][0][1],5,0,Math.PI*2,false);
c.fillStyle="white";
c.fill();


}
if(k==1){
aca2();}

for(let i=0;i<circles.length;i++){circles[i].draw();circles[i].eatPoints();if(circles[i].num[0]!=me.num[0] & circles[i].num[1]!=me.num[1] & circles[i].num[2]!=me.num[2]){
circles[i].bot();

}}
requestAnimationFrame(gameLoop);

}



function length(a){

return Math.sqrt(a[0]*a[0]+a[1]*a[1]);

}
function mag(v){

return scale(v,1/length(v));


}

function sub(a,b){

return [a[0]-b[0],a[1]-b[1]];

}
function add(a,b){

return [a[0]+b[0],a[1]+b[1]];

}
function dot(a,b){
return a[0]*b[0]+a[1]*b[1];


}
function cross(a,b){

return a[0]*b[1]-b[0]*a[1];

}
function scale(a,c){
return [a[0]*c,a[1]*c];


}

gameLoop();