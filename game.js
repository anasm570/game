// استيراد الإعدادات من config.json (سيتم تحميله لاحقًا)
let CONFIG = {};

// عناصر اللعبة
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width = 800, height = 600;
canvas.width = width;
canvas.height = height;

// متغيرات اللعبة
let player = { x: width/2, y: height - 70, radius: 20 };
let fuel = 100;
let health = 3;
let score = 0;
let highScore = localStorage.getItem('spaceHigh') ? parseInt(localStorage.getItem('spaceHigh')) : 0;
let gameActive = true;
let particles = [];
let stars = [];
let asteroids = [];
let fuelCells = [];

// تحكم
let leftPressed = false, rightPressed = false, boostPressed = false;
let boostCooldown = 0;
let frame = 0;
let animationId = null;

// تحديث واجهة المستخدم
function updateUI() {
    document.getElementById('scoreValue').innerText = score;
    document.getElementById('fuelValue').innerText = Math.floor(fuel);
    document.getElementById('healthValue').innerText = health;
    document.getElementById('highscoreValue').innerText = highScore;
}

// جلب التكوين من JSON
async function loadConfig() {
    try {
        const res = await fetch('config.json');
        CONFIG = await res.json();
        initGame();
    } catch(e) {
        console.warn("استخدام الإعدادات الافتراضية");
        CONFIG = {
            starSpeed: 2,
            asteroidSpeed: 3,
            fuelCellSpeed: 2,
            asteroidSpawnRate: 60,
            fuelSpawnRate: 120,
            boostPower: 8
        };
        initGame();
    }
}

// إنشاء نجم الخلفية
function initStars() {
    for(let i=0; i<150; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 1,
            alpha: Math.random() * 0.7 + 0.3,
            speed: Math.random() * 2 + 1
        });
    }
}

// إضافة جسيمات تأثير
function addParticles(x, y, color) {
    for(let i=0; i<8; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            life: 20,
            size: Math.random() * 4 + 2,
            color: color
        });
    }
}

// إنشاء نيزك
function spawnAsteroid() {
    asteroids.push({
        x: Math.random() * (width - 40) + 20,
        y: -30,
        radius: Math.random() * 15 + 12,
        speedY: CONFIG.asteroidSpeed + Math.random() * 1.5,
        color: `hsl(${Math.random() * 30 + 20}, 70%, 50%)`
    });
}

// إنشاء خلية وقود
function spawnFuelCell() {
    fuelCells.push({
        x: Math.random() * (width - 30) + 15,
        y: -20,
        radius: 12,
        speedY: CONFIG.fuelCellSpeed
    });
}

// تحديث النجوم
function updateStars() {
    for(let s of stars) {
        s.y += s.speed;
        if(s.y > height) {
            s.y = 0;
            s.x = Math.random() * width;
        }
    }
}

// تحديث الجسيمات
function updateParticles() {
    for(let i=0; i<particles.length; i++) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;
        if(particles[i].life <= 0) {
            particles.splice(i,1);
            i--;
        }
    }
}

// تحديث اللاعب
function updatePlayer() {
    if(boostPressed && boostCooldown === 0 && fuel > 5) {
        fuel -= 5;
        player.y -= CONFIG.boostPower;
        boostCooldown = 20;
        addParticles(player.x, player.y+15, '#ffaa44');
        if(player.y < 30) player.y = 30;
        updateUI();
    }
    if(boostCooldown > 0) boostCooldown--;
    
    let move = 0;
    if(leftPressed) move = -6;
    if(rightPressed) move = 6;
    player.x += move;
    player.x = Math.min(Math.max(player.x, 25), width - 25);
    
    // استهلاك الوقود تدريجياً
    if(frame % 30 === 0 && gameActive) {
        fuel -= 1;
        if(fuel <= 0) {
            fuel = 0;
            gameActive = false;
            alert(`💀 نفد الوقود! نتيجتك: ${score}`);
            cancelAnimationFrame(animationId);
        }
        updateUI();
    }
}

// تحديث الكويكبات والوقود والتصادمات
function updateObjects() {
    // الكويكبات
    for(let i=0; i<asteroids.length; i++) {
        let a = asteroids[i];
        a.y += a.speedY;
        if(a.y + a.radius > height + 100) {
            asteroids.splice(i,1);
            i--;
            continue;
        }
        // تصادم مع السفينة
        const dx = player.x - a.x;
        const dy = player.y - a.y;
        const dist = Math.hypot(dx, dy);
        if(dist < player.radius + a.radius) {
            health--;
            updateUI();
            addParticles(player.x, player.y, '#ff6666');
            asteroids.splice(i,1);
            i--;
            if(health <= 0) {
                gameActive = false;
                alert(`💥 تحطمت السفينة! نتيجتك: ${score}`);
                cancelAnimationFrame(animationId);
                return;
            }
        }
    }
    
    // خلايا الوقود
    for(let i=0; i<fuelCells.length; i++) {
        let f = fuelCells[i];
        f.y += f.speedY;
        if(f.y + f.radius > height + 50) {
            fuelCells.splice(i,1);
            i--;
            continue;
        }
        const dx = player.x - f.x;
        const dy = player.y - f.y;
        if(Math.hypot(dx, dy) < player.radius + f.radius) {
            fuel = Math.min(100, fuel + 15);
            updateUI();
            addParticles(f.x, f.y, '#00ffaa');
            fuelCells.splice(i,1);
            i--;
            score += 5;
            updateUI();
            if(score > highScore) {
                highScore = score;
                localStorage.setItem('spaceHigh', highScore);
                updateUI();
            }
        }
    }
}

// توليد الأشياء
function spawnObjects() {
    if(!gameActive) return;
    if(frame % CONFIG.asteroidSpawnRate === 0 && asteroids.length < 10) {
        spawnAsteroid();
    }
    if(frame % CONFIG.fuelSpawnRate === 0 && fuelCells.length < 5) {
        spawnFuelCell();
    }
}

// رسم العناصر
function drawStars() {
    for(let s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.fill();
    }
}

function drawAsteroids() {
    for(let a of asteroids) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff8844';
        ctx.beginPath();
        ctx.ellipse(a.x, a.y, a.radius, a.radius*0.8, 0, 0, Math.PI*2);
        ctx.fillStyle = a.color;
        ctx.fill();
        ctx.fillStyle = '#5a3a1a';
        ctx.beginPath();
        ctx.ellipse(a.x-3, a.y-2, 3, 4, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawFuelCells() {
    for(let f of fuelCells) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#0f0';
        ctx.fillStyle = '#88ff88';
        ctx.beginPath();
        ctx.rect(f.x-8, f.y-8, 16, 16);
        ctx.fill();
        ctx.fillStyle = '#00aa44';
        ctx.font = "bold 14px monospace";
        ctx.fillText("⛽", f.x-6, f.y+5);
        ctx.shadowBlur = 0;
    }
}

function drawPlayer() {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0cf';
    ctx.fillStyle = '#3cc7ff';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y-18);
    ctx.lineTo(player.x-15, player.y+8);
    ctx.lineTo(player.x-6, player.y+4);
    ctx.lineTo(player.x-6, player.y+12);
    ctx.lineTo(player.x, player.y+18);
    ctx.lineTo(player.x+6, player.y+12);
    ctx.lineTo(player.x+6, player.y+4);
    ctx.lineTo(player.x+15, player.y+8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x-5, player.y-4, 3, 0, Math.PI*2);
    ctx.arc(player.x+5, player.y-4, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawParticles() {
    for(let p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size*0.6, 0, Math.PI*2);
        ctx.fillStyle = p.color || `rgba(255,100,0,${p.life/20})`;
        ctx.fill();
    }
}

function drawExhaust() {
    if(boostPressed && boostCooldown > 0) {
        ctx.fillStyle = '#ffaa33';
        ctx.beginPath();
        ctx.moveTo(player.x-6, player.y+15);
        ctx.lineTo(player.x, player.y+30);
        ctx.lineTo(player.x+6, player.y+15);
        ctx.fill();
    }
}

// حلقة اللعبة
function gameLoop() {
    if(gameActive) {
        updateStars();
        updateParticles();
        updatePlayer();
        updateObjects();
        spawnObjects();
    }
    // رسم كل العناصر
    ctx.clearRect(0, 0, width, height);
    drawStars();
    drawAsteroids();
    drawFuelCells();
    drawPlayer();
    drawExhaust();
    drawParticles();
    // مؤشرات
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#0ff";
    ctx.fillText("🚀", player.x-10, player.y-20);
    
    frame++;
    animationId = requestAnimationFrame(gameLoop);
}

// إعادة التشغيل
function resetGame() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    // إعادة ضبط المتغيرات
    player.x = width/2;
    player.y = height - 70;
    fuel = 100;
    health = 3;
    score = 0;
    asteroids = [];
    fuelCells = [];
    particles = [];
    frame = 0;
    boostCooldown = 0;
    gameActive = true;
    updateUI();
    // بدء اللعبة من جديد
    animationId = requestAnimationFrame(gameLoop);
}

// أحداث التحكم
function initControls() {
    window.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowLeft') leftPressed = true;
        if(e.key === 'ArrowRight') rightPressed = true;
        if(e.key === 'ArrowUp') boostPressed = true;
        e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
        if(e.key === 'ArrowLeft') leftPressed = false;
        if(e.key === 'ArrowRight') rightPressed = false;
        if(e.key === 'ArrowUp') boostPressed = false;
    });
    document.getElementById('leftBtn').addEventListener('mousedown', () => leftPressed = true);
    document.getElementById('leftBtn').addEventListener('mouseup', () => leftPressed = false);
    document.getElementById('rightBtn').addEventListener('mousedown', () => rightPressed = true);
    document.getElementById('rightBtn').addEventListener('mouseup', () => rightPressed = false);
    document.getElementById('boostBtn').addEventListener('mousedown', () => boostPressed = true);
    document.getElementById('boostBtn').addEventListener('mouseup', () => boostPressed = false);
    // للمس
    document.getElementById('leftBtn').addEventListener('touchstart', (e) => { e.preventDefault(); leftPressed = true; });
    document.getElementById('leftBtn').addEventListener('touchend', () => leftPressed = false);
    document.getElementById('rightBtn').addEventListener('touchstart', (e) => { e.preventDefault(); rightPressed = true; });
    document.getElementById('rightBtn').addEventListener('touchend', () => rightPressed = false);
    document.getElementById('boostBtn').addEventListener('touchstart', (e) => { e.preventDefault(); boostPressed = true; });
    document.getElementById('boostBtn').addEventListener('touchend', () => boostPressed = false);
    document.getElementById('resetBtn').addEventListener('click', () => resetGame());
}

// بدء اللعبة
function initGame() {
    initStars();
    initControls();
    updateUI();
    resetGame(); // تبدأ اللعبة
}

loadConfig();