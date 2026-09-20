const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("scoreText");
const weaponText = document.getElementById("weaponText");
const shieldText = document.getElementById("shieldText");
const hpText = document.getElementById("hpText");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

let score = 0;
let isGameOver = false;
let frameCount = 0;
let bossActive = false;
let nextBossScore = 1500;

const keys = { left: false, right: false, up: false, down: false, shoot: false };

// --- EVENTOS DE TECLADO (PC) ---
window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
  if (e.code === "Space") keys.shoot = true;
});
window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
  if (e.code === "Space") keys.shoot = false;
});

// --- EVENTOS TÁCTILES (MÓVILES) ---
function setupTouchBtn(btnId, keyName) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const press = (e) => { e.preventDefault(); keys[keyName] = true; };
  const release = (e) => { e.preventDefault(); keys[keyName] = false; };
  btn.addEventListener("touchstart", press, {passive: false});
  btn.addEventListener("touchend", release, {passive: false});
  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup", release);
  btn.addEventListener("mouseleave", release);
}

setupTouchBtn("btnUp", "up");
setupTouchBtn("btnDown", "down");
setupTouchBtn("btnLeft", "left");
setupTouchBtn("btnRight", "right");
setupTouchBtn("btnShoot", "shoot");

// --- EVENTO PARA VOLVER A JUGAR (Funciona en PC y Celular) ---
const btnRestart = document.getElementById("btnRestart");
btnRestart.addEventListener("click", resetGame);
btnRestart.addEventListener("touchstart", (e) => {
  e.preventDefault(); // Evita fallos táctiles
  resetGame();
}, {passive: false});

// --- LÓGICA DEL JUGADOR ---
const player = {
  x: canvas.width / 2, y: canvas.height - 70,
  width: 44, height: 52, speed: 6,
  hp: 100, maxHp: 100, shield: 0, maxShield: 150,
  weaponLevel: 1, shootCooldown: 0
};

let bullets = [];
let enemies = [];
let powerups = [];
let stars = Array.from({length: 80}, () => ({
  x: Math.random() * canvas.width, y: Math.random() * canvas.height,
  speed: 1 + Math.random() * 3, size: Math.random() * 2
}));

function updateHUD() {
  scoreText.textContent = score;
  weaponText.textContent = player.weaponLevel;
  shieldText.textContent = player.shield;
  hpText.textContent = player.hp;
}

function resetGame() {
  score = 0; bossActive = false; nextBossScore = 1500;
  player.hp = 100; player.shield = 0; player.weaponLevel = 1;
  player.x = canvas.width / 2; player.y = canvas.height - 70;
  bullets = []; enemies = []; powerups = [];
  isGameOver = false; updateHUD();
  gameOverScreen.classList.add("hidden");
  requestAnimationFrame(gameLoop);
}

function fireWeapon() {
  if (player.shootCooldown > 0) return;
  const pX = player.x, pY = player.y - 20, spd = 12;
  let cd = 12;

  const addBul = (dx, dy, vx, vy) => bullets.push({x: pX+dx, y: pY+dy, vx, vy, isEnemy: false, dmg: 15, radius: 4});

  switch(player.weaponLevel) {
    case 1: addBul(0,0,0,-spd); break;
    case 2: addBul(-10,0,0,-spd); addBul(10,0,0,-spd); break;
    case 3: addBul(0,0,0,-spd); addBul(-15,0,-2,-spd); addBul(15,0,2,-spd); break;
    case 4: cd=10; addBul(-10,0,0,-spd); addBul(10,0,0,-spd); addBul(-20,0,-2.5,-spd); addBul(20,0,2.5,-spd); break;
    case 5: cd=10; addBul(0,0,0,-spd); addBul(-12,0,-1.5,-spd); addBul(12,0,1.5,-spd); addBul(-24,0,-3,-spd); addBul(24,0,3,-spd); break;
    case 6: cd=8; addBul(0,0,0,-spd); addBul(-12,0,-1.5,-spd); addBul(12,0,1.5,-spd); addBul(-24,0,-3,-spd); addBul(24,0,3,-spd); break;
    case 7: cd=8; [-30,-20,-10,0,10,20,30].forEach(dx => addBul(dx,0,dx/8,-spd)); break;
    case 8: cd=6; [-30,-20,-10,0,10,20,30].forEach(dx => addBul(dx,0,dx/8,-spd)); break;
    case 9: cd=8; for(let i=0; i<8; i++) addBul(0,0,Math.cos(Math.PI/4*i)*spd, Math.sin(Math.PI/4*i)*spd); addBul(0,0,0,-spd); addBul(-15,0,0,-spd); addBul(15,0,0,-spd); break;
    case 10: cd=5; for(let i=0; i<16; i++) addBul(0,0,Math.cos(Math.PI/8*i)*spd, Math.sin(Math.PI/8*i)*spd); break;
  }
  player.shootCooldown = cd;
}

function spawnEnemy() {
  let r = Math.random(), x = 40 + Math.random() * (canvas.width - 80);
  if (r < 0.4) enemies.push({x, y: -30, vx: 0, vy: 2.5, hp: 40, maxHp: 40, type: 'basic', size: 15, score: 50, cd: 0});
  else if (r < 0.6) enemies.push({x, y: -30, vx: 0, vy: 1.5, hp: 80, maxHp: 80, type: 'shooter', size: 18, score: 120, cd: 60});
  else if (r < 0.8) enemies.push({x, y: -30, vx: 0, vy: 4, hp: 30, maxHp: 30, type: 'kamikaze', size: 12, score: 80, cd: 0});
  else enemies.push({x, y: -40, vx: 0, vy: 0.8, hp: 200, maxHp: 200, type: 'tank', size: 25, score: 250, cd: 0});
}

function hitPlayer(dmg) {
  if (player.shield > 0) {
    player.shield -= dmg;
    if (player.shield < 0) { player.hp += player.shield; player.shield = 0; }
  } else player.hp -= dmg;
  updateHUD();
  if (player.hp <= 0) endGame();
}

function drawPlayer(x, y) {
  ctx.save(); ctx.translate(x, y);
  if(player.shield > 0) {
    ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI*2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.15)"; ctx.fill();
    ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(1, player.shield/50)})`;
    ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.fillStyle = (frameCount % 4 < 2) ? "#f97316" : "#eab308";
  ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(0, 35); ctx.lineTo(6, 20); ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(25, 15); ctx.lineTo(-25, 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.ellipse(0, -5, 4, 10, 0, 0, Math.PI*2); ctx.fill();
  
  ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; ctx.fillRect(-20, 45, 40, 5);
  ctx.fillStyle = "#4ade80"; ctx.fillRect(-20, 45, 40 * (Math.max(0, player.hp) / player.maxHp), 5);
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save(); ctx.translate(e.x, e.y);
  if(e.type === 'basic') {
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(15, -15); ctx.lineTo(-15, -15); ctx.fill();
  } else if (e.type === 'shooter') {
    ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 0); ctx.lineTo(0, -20); ctx.lineTo(-20, 0); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
  } else if (e.type === 'kamikaze') {
    ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(10, -12); ctx.lineTo(-10, -12); ctx.fill();
  } else if (e.type === 'tank') {
    ctx.fillStyle = "#ea580c"; ctx.fillRect(-20, -20, 40, 40);
    ctx.fillStyle = "#334155"; ctx.fillRect(-12, -5, 24, 10);
  } else if (e.type === 'boss') {
    ctx.fillStyle = "#7f1d1d"; ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(60, 10); ctx.lineTo(60, -40); ctx.lineTo(-60, -40); ctx.lineTo(-60, 10); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(0, 10, 12, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 0, 0, 0.8)"; ctx.fillRect(-15, -e.size - 10, 30, 4);
  ctx.fillStyle = "#4ade80"; ctx.fillRect(-15, -e.size - 10, 30 * (Math.max(0, e.hp) / e.maxHp), 4);
  ctx.restore();
}

function gameLoop() {
  if (isGameOver) return;
  frameCount++;

  ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  stars.forEach(s => {
    s.y += s.speed; if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
  });

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)"; ctx.font = "bold 34px Tahoma";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(-Math.PI / 6);
  ctx.fillText("GRACIAS A TU PAPI ATAUCUSI", 0, 0);
  ctx.restore();

  if (keys.left && player.x > 25) player.x -= player.speed;
  if (keys.right && player.x < canvas.width - 25) player.x += player.speed;
  if (keys.up && player.y > 35) player.y -= player.speed;
  if (keys.down && player.y < canvas.height - 35) player.y += player.speed;
  
  if (keys.shoot) fireWeapon();
  if (player.shootCooldown > 0) player.shootCooldown--;

  drawPlayer(player.x, player.y);

  if (score >= nextBossScore && !bossActive) {
    bossActive = true; nextBossScore += 3000;
    enemies.push({x: canvas.width/2, y: -60, vx: 2, vy: 1.5, hp: 3000, maxHp: 3000, type: 'boss', size: 50, score: 2000, cd: 0});
  }

  if (frameCount % 45 === 0 && !bossActive) spawnEnemy();

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i]; b.x += b.vx; b.y += b.vy;
    ctx.fillStyle = b.isEnemy ? "#ef4444" : "#38bdf8";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();

    if (b.y < -20 || b.y > canvas.height + 20 || b.x < -20 || b.x > canvas.width + 20) { bullets.splice(i, 1); continue; }

    if (b.isEnemy) {
      if (Math.hypot(b.x - player.x, b.y - player.y) < 18 + b.radius) { hitPlayer(b.dmg); bullets.splice(i, 1); }
    } else {
      for (let j = enemies.length - 1; j >= 0; j--) {
        let e = enemies[j];
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.size + b.radius) {
          e.hp -= b.dmg;
          if (e.hp <= 0) {
            score += e.score; updateHUD();
            if (e.type === 'boss') bossActive = false;
            let randDrop = Math.random();
            if(randDrop < 0.2) powerups.push({x: e.x, y: e.y, vy: 1.5, type: 'weapon'});
            else if(randDrop < 0.35) powerups.push({x: e.x, y: e.y, vy: 1.5, type: 'shield'});
            else if(randDrop < 0.45) powerups.push({x: e.x, y: e.y, vy: 1.5, type: 'hp'});
            enemies.splice(j, 1);
          }
          bullets.splice(i, 1); break;
        }
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (e.type === 'boss') {
      if (e.y < 100) e.y += e.vy;
      else {
        e.x += e.vx; if(e.x < 70 || e.x > canvas.width - 70) e.vx *= -1;
        e.cd--;
        if (e.cd <= 0) {
          for(let a=0; a<Math.PI*2; a+=Math.PI/8) bullets.push({x: e.x, y: e.y+20, vx: Math.cos(a)*4, vy: Math.sin(a)*4, isEnemy: true, dmg: 15, radius: 5});
          e.cd = 70;
        }
      }
    } else if (e.type === 'shooter') {
      e.y += e.vy; e.cd--;
      if (e.cd <= 0 && e.y < canvas.height - 150) {
        let angle = Math.atan2(player.y - e.y, player.x - e.x);
        bullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, isEnemy: true, dmg: 10, radius: 4}); e.cd = 80;
      }
    } else if (e.type === 'kamikaze') {
      if (e.x < player.x) e.x += 1.2; else if (e.x > player.x) e.x -= 1.2;
      e.y += e.vy;
    } else e.y += e.vy;
    
    drawEnemy(e);
    if (Math.hypot(player.x - e.x, player.y - e.y) < e.size + 15) { hitPlayer(25); e.hp -= 100; }
    if (e.y > canvas.height + 60) enemies.splice(i, 1);
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i]; p.y += p.vy;
    ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI*2);
    if(p.type === 'weapon') { ctx.fillStyle = '#22c55e'; } else if(p.type === 'shield') { ctx.fillStyle = '#38bdf8'; } else { ctx.fillStyle = '#ef4444'; }
    ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#fff"; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'weapon' ? 'W' : (p.type === 'shield' ? 'S' : '+'), p.x, p.y);
    
    if (Math.hypot(p.x - player.x, p.y - player.y) < 28) {
      if(p.type === 'weapon') { if(player.weaponLevel < 10) player.weaponLevel++; else score+=500; }
      else if(p.type === 'shield') player.shield = Math.min(player.maxShield, player.shield + 50);
      else player.hp = Math.min(player.maxHp, player.hp + 40);
      updateHUD(); powerups.splice(i, 1);
    } else if (p.y > canvas.height + 30) { powerups.splice(i, 1); }
  }

  requestAnimationFrame(gameLoop);
}

function endGame() {
  isGameOver = true;
  finalScore.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

updateHUD();
requestAnimationFrame(gameLoop);
