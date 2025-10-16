(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const levelText = document.getElementById("levelText");
  const scoreEl = document.getElementById("score");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const shootBtn = document.getElementById("shootBtn");
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const endScreen = document.getElementById("endScreen");
  const restartBtn = document.getElementById("restartBtn");
  const finalScore = document.getElementById("finalScore");
  const difficultyBtns = document.querySelectorAll(".difficulty-btn");

  const hud = document.getElementById("hud");
  let timerEl = document.getElementById("timer");
  if (!timerEl) {
    timerEl = document.createElement("div");
    timerEl.id = "timer";
    timerEl.className = "hudText";
    hud.appendChild(timerEl);
  }

  let gameStarted = false;
  let gameEnded = false;

  let W = 360, H = 480;
  let confettiParticles = [];
  const confettiColors = ["#f7d51d", "#ff5e57", "#4dd599", "#3b82f6", "#f472b6", "#fff", "#fbbf24"];
  const confettiCanvas = document.getElementById("confettiCanvas");
  let confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

  let player = { x: 0, y: 0, r: 20, vx: 0, speed: 5, jiggle: 0 };
  let pellets = [], molecules = [], connections = [], birds = [];
  let score = 0, level = 1, angle = 0, waveTime = 0;
  let difficulty = "normal";
  let timer = 90; // 1 min 30 sec in seconds

  // Resize functions
  function resizeConfettiCanvas() {
    if (!confettiCanvas || !endScreen) return;
    const rect = endScreen.getBoundingClientRect();
    confettiCanvas.width = rect.width;
    confettiCanvas.height = rect.height;
    confettiCanvas.style.width = rect.width + 'px';
    confettiCanvas.style.height = rect.height + 'px';
  }
  window.addEventListener("resize", resizeConfettiCanvas);

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas);
  setTimeout(resizeCanvas, 20);

  function generateLevel(num) {
    if (num > 5) {
      showEndScreen();
      return;
    }
    resizeCanvas();
    W = canvas.width / (window.devicePixelRatio || 1);
    H = canvas.height / (window.devicePixelRatio || 1);

    const cx = W / 2, cy = H * 0.32, radius = Math.min(W, H) * 0.25;
    molecules = [];
    const count = 5 + num * 2;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const r = radius * (0.5 + 0.3 * Math.random());
      molecules.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, r: Math.min(W,H)*0.05, state: "idle", t: 0 });
    }

    connections = [];
    for (let i = 0; i < molecules.length; i++) {
      for (let j = i + 1; j < molecules.length; j++) {
        if (Math.random() < 0.25) connections.push([i,j]);
      }
    }

    player.x = cx;
    player.y = H - 100;
    player.r = Math.min(W,H)*0.045;
    levelText.textContent = `Level ${level}`;
  }

  // Difficulty button selection
  difficultyBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      difficultyBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      difficulty = btn.dataset.mode;
    });
  });

  // Controls
  leftBtn.onmousedown = () => player.vx = -1;
  rightBtn.onmousedown = () => player.vx = 1;
  leftBtn.onmouseup = rightBtn.onmouseup = () => player.vx = 0;
  leftBtn.ontouchstart = e => { e.preventDefault(); player.vx = -1; };
  rightBtn.ontouchstart = e => { e.preventDefault(); player.vx = 1; };
  leftBtn.ontouchend = rightBtn.ontouchend = () => player.vx = 0;
  shootBtn.onclick = shoot;
  shootBtn.ontouchstart = e => { e.preventDefault(); shoot(); };

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (!gameStarted || gameEnded) return;
    if (e.code === 'ArrowLeft') {
      player.vx = -1;
    } else if (e.code === 'ArrowRight') {
      player.vx = 1;
    } else if (e.code === 'Space') {
      shoot();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (!gameStarted || gameEnded) return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      player.vx = 0;
    }
  });

  function shoot() {
    if (!gameStarted) return;
    pellets.push({ x: player.x, y: player.y - player.r - 6, vx: (Math.random()-0.5)*2, vy:-14, r:6, life:0 });
    player.jiggle = 1;
    splashSound();
  }

  // Splash sound
  let audioCtx;
  function splashSound() {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctxA = audioCtx;
    const o = ctxA.createOscillator();
    const g = ctxA.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(340 + Math.random()*60, ctxA.currentTime);
    o.frequency.linearRampToValueAtTime(180, ctxA.currentTime+0.13);
    g.gain.setValueAtTime(0.13, ctxA.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime+0.14);
    o.connect(g); g.connect(ctxA.destination);
    o.start(); o.stop(ctxA.currentTime+0.15);
  }

  function spawnBird(x, y) {
    birds.push({x,y,t:0});
    crow();
  }

  // Crow sound effect
  function crow() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctxA = audioCtx;
    const o = ctxA.createOscillator();
    const g = ctxA.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(450, ctxA.currentTime);
    o.frequency.linearRampToValueAtTime(260, ctxA.currentTime + 0.2);
    g.gain.setValueAtTime(0.1, ctxA.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + 0.4);
    o.connect(g); g.connect(ctxA.destination);
    o.start(); o.stop(ctxA.currentTime + 0.4);
  }

  function pointSegmentDistance(px,py,x1,y1,x2,y2) {
    const dx=x2-x1, dy=y2-y1, len2=dx*dx+dy*dy;
    if(len2===0) return {dist:Math.hypot(px-x1,py-y1), nearestX:x1, nearestY:y1};
    let t=((px-x1)*dx+(py-y1)*dy)/len2;
    t=Math.max(0, Math.min(1,t));
    const nx=x1+dx*t, ny=y1+dy*t;
    return {dist:Math.hypot(px-nx,py-ny), nearestX:nx, nearestY:ny};
  }

  function reflect(vx,vy,nx,ny) {
    const dot=vx*nx+vy*ny;
    return {vx:vx-2*dot*nx, vy:vy-2*dot*ny};
  }

  function update(dt) {
    if (!gameStarted || gameEnded) return;

    player.x += player.vx * player.speed * dt;
    player.x = Math.max(player.r + 8, Math.min(W - player.r - 8, player.x));
    player.jiggle = Math.max(0, player.jiggle - 0.08 * dt);
    angle += 0.003 * dt;
    waveTime += dt * 0.02;

    // Timer countdown (only one timer)
    if (timer > 0) {
      timer -= dt / 60;
    } else {
      timer = 0;
      showFailScreen();
      return;
    }
    const minutes = Math.floor(timer / 60);
    const seconds = Math.floor(timer % 60).toString().padStart(2, "0");
    timerEl.textContent = `Time: ${minutes}:${seconds}`;

    // ...existing code for pellets, molecules, birds, score...
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      p.life += dt / 60;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.1 * dt;
      if (p.life > 5) { pellets.splice(i, 1); continue; }

      const left = 12, right = W - 12, top = 12, bottom = H - 120;
      if (p.x - p.r < left) { p.x = left + p.r; p.vx *= -1; }
      if (p.x + p.r > right) { p.x = right - p.r; p.vx *= -1; }
      if (p.y - p.r < top) { p.y = top + p.r; p.vy *= -0.9; }
      if (p.y + p.r > bottom) { p.y = bottom - p.r; p.vy *= -0.7; }

      for (const [aI, bI] of connections) {
        const a = rotatedPos(molecules[aI]);
        const b = rotatedPos(molecules[bI]);
        const seg = pointSegmentDistance(p.x, p.y, a.x, a.y, b.x, b.y);
        if (seg.dist < p.r + 1) {
          let nx = p.x - seg.nearestX, ny = p.y - seg.nearestY;
          const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen;
          const newV = reflect(p.vx, p.vy, nx, ny);
          p.vx = newV.vx * 0.95; p.vy = newV.vy * 0.95;
          break;
        }
      }

      let hitBubble = false;
      for (const m of molecules) {
        if (m.state !== "idle") continue;
        const pos = rotatedPos(m);
        if (Math.hypot(p.x - pos.x, p.y - pos.y) < p.r + m.r) {
          m.state = "pop"; spawnBird(pos.x, pos.y - 20);
          score += 10;
          pellets.splice(i, 1);
          hitBubble = true;
          break;
        }
      }
      if (hitBubble) continue;

      // Hit player
      if (p.vy > 0 && Math.hypot(p.x - player.x, p.y - player.y) < player.r * 2.2) {
        player.jiggle = 1.5;
        pellets.splice(i, 1);
        let penalty = difficulty === "easy" ? 3 : difficulty === "normal" ? 5 : 8;
        score = Math.max(0, score - penalty);
        scoreEl.classList.remove("flash-red");
        void scoreEl.offsetWidth;
        scoreEl.classList.add("flash-red");
    playOwSound();
        setTimeout(() => { scoreEl.classList.remove("flash-red"); }, 2000);
        if (score <= 0) {
          showFailScreen();
          return;
        }
    // Play ow sound when taking damage
    function playOwSound() {
      const audio = new Audio('vine-boom-162668.mp3');
      audio.volume = 0.7;
      audio.play();
    }
      }
    }

    // Molecule and bird updates
    for (const m of molecules) if (m.state === "pop") { m.t += dt; if (m.t > 30) m.state = "popped"; }
    for (const b of birds) b.t += dt;
    for (let i = birds.length - 1; i >= 0; i--) if (birds[i].t > 40) birds.splice(i, 1);

    if (molecules.every(m => m.state === "popped")) { level++; generateLevel(level); }
    scoreEl.textContent = `Score: ${score}`;
  }

  function rotatedPos(m){
    const cx=W/2, cy=H*0.32;
    const dx=m.x-cx, dy=m.y-cy;
    const s=Math.sin(angle), c=Math.cos(angle);
    return {x: cx+dx*c-dy*s, y: cy+dx*s+dy*c};
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    drawWaves(); drawConnections(); molecules.forEach(drawMolecule);
    pellets.forEach(p=>{ctx.beginPath(); ctx.fillStyle="rgba(120,200,255,0.9)"; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();});
    drawDroplet(player.x,player.y,player.r,player.jiggle);
    birds.forEach(drawBird);
  }

  function drawConnections(){ctx.save(); ctx.lineWidth=5; ctx.lineCap="round";
    for(const [aI,bI] of connections){const a=rotatedPos(molecules[aI]), b=rotatedPos(molecules[bI]);
      const grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y); grad.addColorStop(0,"rgba(150,210,255,0.35)"); grad.addColorStop(1,"rgba(180,230,255,0.45)");
      ctx.strokeStyle=grad; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    } ctx.restore();
  }

  function drawMolecule(m){if(m.state==="popped") return; const pos=rotatedPos(m); ctx.save(); ctx.translate(pos.x,pos.y);
    const mainGrad=ctx.createRadialGradient(-m.r*0.4,-m.r*0.4,3,0,0,m.r*1.3); mainGrad.addColorStop(0,"rgba(255,255,255,0.9)"); mainGrad.addColorStop(1,"rgba(100,180,255,0.25)"); ctx.fillStyle=mainGrad; ctx.beginPath(); ctx.arc(0,0,m.r,0,Math.PI*2); ctx.fill();
    const wingR=m.r*0.8; ctx.fillStyle="rgba(160,220,255,0.4)"; ctx.beginPath(); ctx.arc(-m.r*1.4,m.r*0.2,wingR,0,Math.PI*2); ctx.arc(m.r*1.4,m.r*0.2,wingR,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  function drawDroplet(x,y,r,j){ctx.save(); ctx.translate(x,y); const sy=1-j*0.25, sx=1+j*0.15; ctx.scale(sx,sy);
    ctx.beginPath(); ctx.moveTo(0,-r*1.3); ctx.bezierCurveTo(r*0.8,-r*0.3,r*0.9,r*1.0,0,r*1.3); ctx.bezierCurveTo(-r*0.9,r*1.0,-r*0.8,-r*0.3,0,-r*1.3);
    const grad=ctx.createLinearGradient(-r,-r*1.4,r,r*1.4); grad.addColorStop(0,"#c4f7ff"); grad.addColorStop(0.4,"#7ad8ff"); grad.addColorStop(1,"#2a9df4"); ctx.fillStyle=grad; ctx.fill(); ctx.restore();
  }

  function drawBird(b){ctx.save(); ctx.translate(b.x,b.y-b.t*0.3); ctx.fillStyle="#333"; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#f3b53f"; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(16,-3); ctx.lineTo(16,3); ctx.closePath(); ctx.fill(); ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(-3,-3,3,0,Math.PI*2); ctx.fill(); ctx.restore(); }

  function drawWaves(){ctx.save(); const t=waveTime; const colors=["#bde3ff","#a8d9ff","#c7e8ff"]; colors.forEach((col,i)=>{ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x++){const y=Math.sin((x/60)+t*(0.3+i*0.1))*10+20*i+60;ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=col;ctx.globalAlpha=0.15;ctx.fill();});ctx.restore();}

  // Main loop
  let last = performance.now();
  function loop(now){
    const dt = Math.min(40, now-last)/16.666;
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Start screen
  startBtn.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    setTimeout(()=>{
      startScreen.style.display="none";
      endScreen.classList.add("hidden");
      endScreen.style.display="none";
      failScreen.classList.add("hidden");
      failScreen.style.display="none";
      gameStarted=true;
      gameEnded=false;
      level=1;
      score=0;
      timer=90;
      generateLevel(level);
      requestAnimationFrame(loop);
    }, 300);
  });

  // Restart button (end screen)
  restartBtn.addEventListener("click", ()=>{
    endScreen.classList.add("hidden");
    setTimeout(()=>{
      endScreen.style.display="none";
      startScreen.classList.remove("hidden");
      startScreen.style.display="flex";
    }, 300);
  });

  // Restart button (fail screen)
  const failScreen = document.getElementById("failScreen");
  const failRestartBtn = document.getElementById("failRestartBtn");
  failRestartBtn.addEventListener("click", ()=>{
    failScreen.classList.add("hidden");
    setTimeout(()=>{
      failScreen.style.display="none";
      startScreen.classList.remove("hidden");
      startScreen.style.display="flex";
    }, 300);
  });

  function showFailScreen() {
    gameStarted = false;
    gameEnded = true;
    failScreen.classList.remove("hidden");
    failScreen.style.display = "flex";
  }

  function showEndScreen(){
    gameStarted=false;
    gameEnded=true;
    finalScore.textContent=`Final Score: ${score}`;
    endScreen.classList.remove("hidden");
    endScreen.style.display="flex";

    // Confetti
    if(confettiCanvas && confettiCtx){
      resizeConfettiCanvas();
      confettiParticles=[];
      for(let i=0;i<120;i++){
        confettiParticles.push({
          x: Math.random()*confettiCanvas.width,
          y: Math.random()*-confettiCanvas.height,
          r: 6+Math.random()*6,
          color: confettiColors[Math.floor(Math.random()*confettiColors.length)],
          vy: 2+Math.random()*3,
          vx: (Math.random()-0.5)*2,
          rot: Math.random()*Math.PI*2,
          vr: (Math.random()-0.5)*0.1
        });
      }
      confettiLoop();
    }
  }

  function confettiLoop(){
    if(!endScreen || endScreen.classList.contains("hidden")) return;
    confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    for(const p of confettiParticles){
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      if(p.y>confettiCanvas.height){p.y=-10; p.x=Math.random()*confettiCanvas.width;}
      confettiCtx.save(); confettiCtx.translate(p.x,p.y); confettiCtx.rotate(p.rot); confettiCtx.fillStyle=p.color; confettiCtx.fillRect(-p.r/2,-p.r/6,p.r,p.r/3); confettiCtx.restore();
    }
    requestAnimationFrame(confettiLoop);
  }

  // HUD floating
  function animateHUD(){const t=performance.now()*0.0015; const offset=Math.sin(t)*5; hud.style.transform=`translateY(${offset}px)`; requestAnimationFrame(animateHUD);}
  animateHUD();
})();
