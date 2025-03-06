const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 游戏配置
const config = {
    carWidth: 40,
    carHeight: 60,
    bulletRadius: 5,
    obstacleWidth: 100,
    obstacleHeight: 100,
    lanes: [100, 200, 300],  // 三条车道的x坐标
    difficulty: 'normal'     // 默认难度
};

// 游戏状态
const game = {
    isRunning: false,
    isPaused: false,
    startTime: 0,
    currentTime: 0,
    car: {
        x: config.lanes[1],  // 默认在中间车道
        y: 500,
        currentLane: 1,
        selectedImage: null  // 添加选择的车辆图片
    },
    bullets: [],
    obstacles: [],
    score: 0,
    lastObstacleTime: 0,
    lastObstacleLane: -1,  // 添加记录上一个障碍物赛道的属性
    directionIndicator: {
        active: false,
        direction: null,
        startTime: 0
    },
    lastBulletTime: 0,  // 添加子弹发射计时器
    bulletInterval: 500  // 子弹发射间隔(毫秒)
};

// 难度设置
const difficultySettings = {
    easy: 800,     
    normal: 400,   
    hard: 200       
};

// 更新子弹的宽度和高度
const bulletWidth = 5; // 设置子弹宽度
const bulletHeight = 15; // 设置子弹高度

// 添加时间格式化函数
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 添加图片变量
const carImage = new Image();
const car2Image = new Image();
const car3Image = new Image();
carImage.src = 'images/game/car.png';
car2Image.src = 'images/game/car2.png';
car3Image.src = 'images/game/car3.png';

// 根据难度设置使用car2和car3的概率
const car2Probability = {
    easy: 0.15,    // 简单模式15%概率
    normal: 0.25,  // 普通模式25%概率
    hard: 0.45     // 困难模式45%概率
};

const car3Probability = {
    easy: 0.1,     // 所有难度模式10%概率
    normal: 0.2,
    hard: 0.3
};
const obstacleImage = new Image();
obstacleImage.src = 'images/game/obstacle.png';
const jetFlameImage = new Image();
jetFlameImage.src = 'images/game/jetFlame.png';
const backgroundImage = new Image();
backgroundImage.src = 'images/game/background.png';

// 背景滚动相关变量
let backgroundY1 = 0;
let backgroundY2 = -canvas.height;
// 根据难度设置背景滚动速度
let SCROLL_SPEED = 600 / difficultySettings[config.difficulty];

// 难度中文映射
const difficultyLabels = {
    easy: '简单',
    normal: '普通',
    hard: '困难'
};

// 开始游戏
function startGame(difficulty) {
    config.difficulty = difficulty;
    game.isRunning = true;
    game.isPaused = false;
    game.score = 0;
    game.bullets = [];
    game.obstacles = [];
    game.lastObstacleTime = Date.now();
    game.startTime = Date.now();
    game.lastBulletTime = Date.now();  // 重置子弹发射计时器
    
    // 根据难度调整子弹发射间隔
    if (difficulty === 'easy') {
        game.bulletInterval = 500;  // 简单模式发射较慢
    } else if (difficulty === 'normal') {
        game.bulletInterval = 300;  // 普通模式适中
    } else {
        game.bulletInterval = 200;  // 困难模式发射较快
    }
    
    // 在游戏开始时选择车辆图片
    const currentProb2 = car2Probability[difficulty];
    const currentProb3 = car3Probability[difficulty];
    const randomValue = Math.random();
    if (randomValue < currentProb2) {
        game.car.selectedImage = car2Image;
    } else if (randomValue < currentProb3 + currentProb2) {
        game.car.selectedImage = car3Image;
    } else {
        game.car.selectedImage = carImage;
    }
    
    // 隐藏菜单，显示分数、时间和难度
    document.getElementById('gameMenu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    document.querySelector('.score-time-display').style.display = 'flex'; // 显示得分和时间
    document.getElementById('difficulty').textContent = difficultyLabels[config.difficulty];
    // 开始游戏循环
    gameLoop();
}

// 绘制方向指示器
function drawDirectionIndicator() {
    if (!game.directionIndicator.active) return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - game.directionIndicator.startTime;
    
    if (elapsedTime > 2000) {
        game.directionIndicator.active = false;
        return;
    }
    
    const alpha = 1 - (elapsedTime / 2000);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    
    const arrowSize = 30;
    const arrowY = game.car.y - 50;
    const arrowX = game.car.x;
    
    ctx.beginPath();
    if (game.directionIndicator.direction === 'left') {
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize, arrowY);
        ctx.lineTo(arrowX - arrowSize/2, arrowY - arrowSize/2);
        ctx.moveTo(arrowX - arrowSize, arrowY);
        ctx.lineTo(arrowX - arrowSize/2, arrowY + arrowSize/2);
    } else {
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX + arrowSize, arrowY);
        ctx.lineTo(arrowX + arrowSize/2, arrowY - arrowSize/2);
        ctx.moveTo(arrowX + arrowSize, arrowY);
        ctx.lineTo(arrowX + arrowSize/2, arrowY + arrowSize/2);
    }
    ctx.stroke();
    ctx.restore();
}

// 绘制赛车
function drawCar() {
    // 使用游戏开始时选择的车辆图片
    ctx.drawImage(game.car.selectedImage, game.car.x - config.carWidth / 2, game.car.y, config.carWidth, config.carHeight);
}

// 绘制子弹
function drawBullets() {
    game.bullets.forEach(bullet => {
        ctx.drawImage(jetFlameImage, bullet.x - 10, bullet.y - 20, 10, 20); // 调整子弹大小和位置
    });
}

// 绘制障碍物
function drawObstacles() {
    game.obstacles.forEach(obstacle => {
        ctx.globalAlpha = obstacle.isProtected ? 0.5 : 1;
        if (obstacle.isProtected) {
            // 在保护期内绘制小圆形
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(obstacle.x, obstacle.y + config.obstacleHeight/2, 20, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 保护期结束后显示怪物图像，调整渲染位置
            ctx.drawImage(obstacleImage, 
                obstacle.x - config.obstacleWidth/2, 
                obstacle.y, 
                config.obstacleWidth, 
                config.obstacleHeight);
        }
        ctx.globalAlpha = 1; // 重置透明度
    });
}

// 添加爆炸效果
function createExplosion(x, y) {
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

// 更新子弹位置
function updateBullets() {
    game.bullets = game.bullets.filter(bullet => {
        bullet.y -= 5;  // 子弹向上移动
        return bullet.y > 0;  // 移除超出画布的子弹
    });
}

// 更新障碍物位置
function updateObstacles() {
    const currentTime = Date.now();
    const speed = (600 - 0) / difficultySettings[config.difficulty];  // 根据难度计算速度

    // 设置不同难度下的最大怪物数量
    const maxObstacles = {
        easy: 2,
        normal: 4,
        hard: 8
    };

    // 添加新障碍物
    const minSpawnInterval = 1000; // 最短生成间隔为1秒
    const spawnInterval = Math.max(minSpawnInterval, difficultySettings[config.difficulty]);

    if (currentTime - game.lastObstacleTime > spawnInterval && 
        game.obstacles.length < maxObstacles[config.difficulty]) {
        // 生成一个不同于上一个障碍物赛道的随机赛道
        let availableLanes = [0, 1, 2].filter(lane => lane !== game.lastObstacleLane);
        const randomIndex = Math.floor(Math.random() * availableLanes.length);
        const randomLane = availableLanes[randomIndex];
        
        game.obstacles.push({
            x: config.lanes[randomLane],
            y: 0,
            isProtected: true,
            protectionStartTime: Date.now()
        });
        game.lastObstacleTime = currentTime;
        game.lastObstacleLane = randomLane;  // 更新上一个障碍物的赛道记录
    }

    // 更新障碍物位置和保护状态
    game.obstacles = game.obstacles.filter(obstacle => {
        obstacle.y += speed;
        
        // 检查保护期是否结束（0.3秒保护期）
        if (obstacle.isProtected && Date.now() - obstacle.protectionStartTime > 300) {
            obstacle.isProtected = false;
        }
        
        // 检查是否到达底线
        if (obstacle.y >= canvas.height) {
            endGame();
            return false;
        }
        
        return true;
    });
}

// 碰撞检测
function checkCollisions() {
    game.bullets.forEach((bullet, bulletIndex) => {
        game.obstacles.forEach((obstacle, obstacleIndex) => {
            // 只检查非保护期的障碍物
            if (!obstacle.isProtected) {
                const dx = bullet.x - obstacle.x;
                const dy = bullet.y - (obstacle.y + config.obstacleHeight/2);
                const hitboxWidth = config.obstacleWidth * 0.8; // 缩小碰撞箱宽度
                const hitboxHeight = config.obstacleHeight * 0.8; // 缩小碰撞箱高度
                
                if (Math.abs(dx) < hitboxWidth/2 && Math.abs(dy) < hitboxHeight/2) {
                    // 击中障碍物
                    createExplosion(obstacle.x, obstacle.y + config.obstacleHeight/2);
                    game.bullets.splice(bulletIndex, 1);
                    game.obstacles.splice(obstacleIndex, 1);
                    game.score += 10;
                    scoreElement.textContent = game.score;
                }
            }
        });
    });
}

// 添加暂停游戏函数
function pauseGame() {
    game.isPaused = true;
    document.getElementById('pauseMenu').style.display = 'block';
}

// 添加继续游戏函数
function resumeGame() {
    game.isPaused = false;
    document.getElementById('pauseMenu').style.display = 'none';
    gameLoop();
}

// 添加重新开始函数
function restartGame() {
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
    game.score = 0;
    scoreElement.textContent = '0';
    game.isRunning = false;
    game.isPaused = false;
    document.getElementById('gameMenu').style.display = 'block';
    document.querySelector('.score-time-display').style.display = 'none';
}

// 修改游戏循环
// 绘制背景
function drawBackground() {
    // 绘制两张背景图片
    ctx.drawImage(backgroundImage, 0, backgroundY1, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, backgroundY2, canvas.width, canvas.height);
    
    // 更新背景位置
    backgroundY1 += SCROLL_SPEED;
    backgroundY2 += SCROLL_SPEED;
    
    // 当第一张图片完全移出画面时，将其移动到第二张图片上方
    if (backgroundY1 >= canvas.height) {
        backgroundY1 = backgroundY2 - canvas.height;
    }
    // 当第二张图片完全移出画面时，将其移动到第一张图片上方
    if (backgroundY2 >= canvas.height) {
        backgroundY2 = backgroundY1 - canvas.height;
    }
}

function gameLoop() {
    console.log("gameLoop");
    if (!game.isRunning || game.isPaused) return;
    
    // 更新时间显示
    game.currentTime = Date.now() - game.startTime;
    document.getElementById('time').textContent = formatTime(game.currentTime);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制滚动背景
    drawBackground();
    
    updateBullets();
    updateObstacles();
    checkCollisions();
    
    drawCar();
    drawBullets();
    drawObstacles();
    drawDirectionIndicator();
    
    // 均匀发射子弹，基于时间间隔
    const currentTime = Date.now();
    if (currentTime - game.lastBulletTime > game.bulletInterval) {
        game.bullets.push({
            x: game.car.x,
            y: game.car.y
        });
        game.lastBulletTime = currentTime;
    }
    
    requestAnimationFrame(gameLoop);
}

// 创建WebSocket连接
const gameSocket = new WebSocket('ws://127.0.0.1:8766');

// 添加键盘操作检测相关变量
let lastKeyPressTime = Date.now();
let lastClassificationResult = null;

gameSocket.onopen = () => {
    console.log('Connected to game server');
};

gameSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// 添加移动冷却时间变量
let lastMoveTime = Date.now();

gameSocket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'classification' && data.result !== undefined) {
            const currentTime = Date.now();
            // 检查是否满足最小移动间隔
            if (currentTime - lastMoveTime >= 2000) {
                if (data.result === 0) { // 修改为0，对应左移
                    if (game.car.currentLane > 0) {
                        game.car.currentLane--;
                        game.car.x = config.lanes[game.car.currentLane];
                        game.directionIndicator.active = true;
                        game.directionIndicator.direction = 'left';
                        game.directionIndicator.startTime = Date.now();
                        lastMoveTime = currentTime; // 更新最后移动时间
                    }
                } else if (data.result === 1) { // 修改为1，对应右移
                    if (game.car.currentLane < 2) {
                        game.car.currentLane++;
                        game.car.x = config.lanes[game.car.currentLane];
                        game.directionIndicator.active = true;
                        game.directionIndicator.direction = 'right';
                        game.directionIndicator.startTime = Date.now();
                        lastMoveTime = currentTime; // 更新最后移动时间
                    }
                }
                lastClassificationResult = null; // 立即重置分类结果
            }
        }
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
    }
};

// 添加定时器检查键盘操作
setInterval(() => {
    if (!game.isRunning || game.isPaused) return;
    
    const currentTime = Date.now();
    if (currentTime - lastKeyPressTime > 1000 && lastClassificationResult !== null) {
        // 根据分类结果移动小车
        if (lastClassificationResult === 1 && game.car.currentLane > 0) {
            game.car.currentLane--;
            game.car.x = config.lanes[game.car.currentLane];
            game.directionIndicator.active = true;
            game.directionIndicator.direction = 'left';
            game.directionIndicator.startTime = Date.now();
        } else if (lastClassificationResult === 2 && game.car.currentLane < 2) {
            game.car.currentLane++;
            game.car.x = config.lanes[game.car.currentLane];
            game.directionIndicator.active = true;
            game.directionIndicator.direction = 'right';
            game.directionIndicator.startTime = Date.now();
        }
        lastClassificationResult = null; // 重置分类结果
    }
}, 100); // 每100ms检查一次

// 修改键盘控制
document.addEventListener('keydown', (e) => {
    if (!game.isRunning) return;
    
    if (e.code === 'Space') {
        e.preventDefault(); // 防止页面滚动
        if (game.isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
        return;
    }
    
    if (game.isPaused) return;
    
    const currentTime = Date.now();
    // 检查是否满足最小移动间隔
    if (currentTime - lastMoveTime >= 500) {
        if (e.key === 'ArrowLeft' && game.car.currentLane > 0) {
            game.car.currentLane--;
            game.car.x = config.lanes[game.car.currentLane];
            game.directionIndicator.active = true;
            game.directionIndicator.direction = 'left';
            game.directionIndicator.startTime = Date.now();
            lastMoveTime = currentTime; // 更新最后移动时间
            // 发送左移事件到服务器
            gameSocket.send(JSON.stringify({
                type: 'keypress',
                direction: 'left'
            }));
        }
        if (e.key === 'ArrowRight' && game.car.currentLane < 2) {
            game.car.currentLane++;
            game.car.x = config.lanes[game.car.currentLane];
            game.directionIndicator.active = true;
            game.directionIndicator.direction = 'right';
            game.directionIndicator.startTime = Date.now();
            lastMoveTime = currentTime; // 更新最后移动时间
            // 发送右移事件到服务器
            gameSocket.send(JSON.stringify({
                type: 'keypress',
                direction: 'right'
            }));
        }
    }
});
// 添加触摸控制
let touchStartX = 0;
let touchEndX = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchEndX = e.changedTouches[0].clientX;
    
    const swipeDistance = touchEndX - touchStartX;
    const threshold = 30; // 最小滑动距离
    
    if (!game.isRunning || game.isPaused) return;
    
    if (Math.abs(swipeDistance) > threshold) {
        if (swipeDistance > 0 && game.car.currentLane < 2) {
            game.car.currentLane++;
            game.car.x = config.lanes[game.car.currentLane];
            game.directionIndicator.active = true;
            game.directionIndicator.direction = 'right';
            game.directionIndicator.startTime = Date.now();
        } else if (swipeDistance < 0 && game.car.currentLane > 0) {
            game.car.currentLane--;
            game.car.x = config.lanes[game.car.currentLane];
            game.directionIndicator.active = true;
            game.directionIndicator.direction = 'left';
            game.directionIndicator.startTime = Date.now();
        }
    }
});

// 添加触摸暂停功能
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        if (game.isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
});

function endGame() {
    game.isRunning = false;
    document.getElementById('gameOverMenu').style.display = 'block';
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalTime').textContent = formatTime(game.currentTime);
}

function returnToHome() {
    game.isRunning = false;
    game.isPaused = false;
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
    document.getElementById('gameMenu').style.display = 'block';
    document.querySelector('.score-time-display').style.display = 'none';
    window.location.href = 'index.html';
}
