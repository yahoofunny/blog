/**
 * 玩家战机类 - 继承自GameObject
 */
class Player extends GameObject {
    constructor(x, y) {
        super(x, y);
        
        // 玩家属性
        this.setSize(72, 107); // 缩小为原来的0.8倍面积 (80*0.894≈72, 120*0.894≈107)
        this.collisionType = 'rectangle';
        this.maxSpeed = 250;
        this.color = '#00ff00';
        
        // 血量系统 - 根据配置设置
        this.maxHp = 100; // 每条命100点血量
        this.hp = this.maxHp; // 当前血量
        
        // 生命值系统 - 根据设置配置
        // 优先从game配置中读取，如果没有则从localStorage读取，最后使用默认值
        let playerLives = 1; // 默认值
        
        try {
            if (window.game?.config?.playerLives) {
                playerLives = window.game.config.playerLives;
            } else {
                // 尝试从localStorage读取设置
                const savedSettings = localStorage.getItem('planewar_settings');
                if (savedSettings) {
                    const settings = JSON.parse(savedSettings);
                    if (settings.playerLives) {
                        playerLives = parseInt(settings.playerLives);
                    }
                }
            }
        } catch (error) {
            console.warn('读取生命数量设置失败，使用默认值1条命:', error);
        }
        
        this.maxLives = playerLives;
        this.lives = this.maxLives;
        console.log(`玩家创建: ${this.maxLives}条命，每条命${this.maxHp}血量`);
        
        this.invulnerable = false;
        this.invulnerabilityTime = 2; // 无敌时间（秒）
        this.invulnerabilityTimer = 0;
        
        // 护盾系统
        this.hasShield = false;
        this.shieldTime = 5; // 护盾持续5秒
        this.shieldTimer = 0;
        this.shieldAnimationTime = 0; // 护盾动画时间
        this.isReviving = false; // 是否正在复活
        
        // 武器系统 - 重新设计为主武器+副武器
        this.weaponLevel = 1;
        this.maxWeaponLevel = 8;
        this.primaryWeapon = 'basic'; // 主武器类型
        this.secondaryWeapons = []; // 副武器数组（可以同时拥有多个）
        this.shootCooldown = 0.08; // 减少射击间隔，增加发射速度
        this.shootTimer = 0;
        this.canShoot = true;
        this.secondaryShootTimer = 0; // 副武器射击计时器
        this.secondaryShootCooldown = 1.0; // 副武器射击间隔改为1秒

        // 分数系统
        this.scoreMultiplier = 1; // 分数倍数
        this.scoreMultiplierTime = 0; // 分数倍数持续时间

        // 僚机系统
        this.wingmenCount = 0; // 僚机数量
        this.wingmen = []; // 僚机数组
        this.wingmanOffset = 40; // 僚机偏移距离
        
        // 特殊能力
        this.specialCooldown = 10;
        this.specialTimer = 0;
        
        // 推进器效果
        this.thrusterEmitter = null;
        
        // 分数
        this.score = 0;
        this.killCount = 0;
        
        // 动画
        this.animationTime = 0;
        this.bobAmount = 2; // 飞行时的轻微摆动
        
        // 边界限制
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        
        // 初始化推进器效果
        this.initThruster();
        
        // 初始化僚机
        this.initWingmen();
        
        // 图片渲染设置
        this.useImageRender = true; // 是否使用图片渲染
        this.imageName = 'player'; // 默认图片名称
    }

    /**
     * 初始化推进器效果
     */
    initThruster() {
        if (window.game && window.game.particleSystem) {
            this.thrusterEmitter = window.game.particleSystem.createThruster(
                this.position.x, 
                this.position.y + this.height / 2
            );
        }
    }

    /**
     * 更新玩家状态
     */
    onUpdate(deltaTime) {
        // 更新动画
        this.animationTime += deltaTime;
        
        // 处理输入
        this.handleInput(deltaTime);
        
        // 更新计时器
        this.updateTimers(deltaTime);
        
        // 更新推进器位置
        this.updateThruster();
        
        // 更新UI
        this.updateUI();
    }

    /**
     * 处理用户输入
     */
    handleInput(deltaTime) {
        const inputManager = InputManager.getInstance();
        const movement = inputManager.getMovementVector();
        
        // 移动控制
        if (movement.magnitude() > 0) {
            const moveSpeed = this.maxSpeed;
            this.velocity.setFrom(movement.multiply(moveSpeed));
        } else {
            this.velocity.multiply(0.9); // 添加一点惯性
        }
        
        // 射击控制
        if (inputManager.isActionPressed('shoot') && this.canShoot) {
            this.shoot();
        }
        
        // 特殊能力
        if (inputManager.isActionDown('special') && this.canUseSpecial()) {
            this.useSpecialAbility();
        }
    }

    /**
     * 更新计时器
     */
    updateTimers(deltaTime) {
        // 主武器射击冷却
        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
            if (this.shootTimer <= 0) {
                this.canShoot = true;
            }
        }
        
        // 副武器射击冷却
        if (this.secondaryShootTimer > 0) {
            this.secondaryShootTimer -= deltaTime;
        }
        
        // 无敌时间
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
        
        // 护盾时间和动画
        if (this.hasShield) {
            this.shieldTimer -= deltaTime;
            this.shieldAnimationTime += deltaTime;
            
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
                this.isReviving = false; // 护盾消失，复活状态结束
                console.log('护盾保护结束');
            }
        }
        
        // 特殊能力冷却
        if (this.specialTimer > 0) {
            this.specialTimer -= deltaTime;
        }

        // 更新分数倍数
        this.updateScoreMultiplier(deltaTime);
        
        // 更新僚机
        this.updateWingmen(deltaTime);
    }

    /**
     * 更新推进器效果
     */
    updateThruster() {
        if (this.thrusterEmitter) {
            this.thrusterEmitter.setPosition(
                this.position.x,
                this.position.y + this.height / 2 + 5
            );
        }
    }

    /**
     * 边界检查
     */
    checkBounds() {
        const margin = this.width / 2;
        
        // 水平边界
        if (this.position.x < margin) {
            this.position.x = margin;
            this.velocity.x = 0;
        } else if (this.position.x > this.canvasWidth - margin) {
            this.position.x = this.canvasWidth - margin;
            this.velocity.x = 0;
        }
        
        // 垂直边界 - 基本的屏幕边界
        const topLimit = margin;
        const bottomLimit = this.canvasHeight - margin;
        
        if (this.position.y < topLimit) {
            this.position.y = topLimit;
            this.velocity.y = 0;
        } else if (this.position.y > bottomLimit) {
            this.position.y = bottomLimit;
            this.velocity.y = 0;
        }
        
        // Boss区域碰撞检测 - 边界阻挡模式
        if (window.game?.boss?.active && !window.game.boss.isDead()) {
            const boss = window.game.boss;
            this.handleBossBoundaryCollision(boss);
        }
    }
    
    /**
     * 处理Boss边界碰撞 - 边界阻挡模式
     */
    handleBossBoundaryCollision(boss) {
        const bossBounds = boss.getCollisionBounds();
        const safeDistance = 2; // 安全距离
        
        // 计算Boss边界的扩展区域（加上安全距离）
        const bossLeft = bossBounds.left - safeDistance;
        const bossRight = bossBounds.right + safeDistance;
        const bossTop = bossBounds.top - safeDistance;
        const bossBottom = bossBounds.bottom + safeDistance;
        
        // 计算玩家的边界
        const playerLeft = this.position.x - this.width / 2;
        const playerRight = this.position.x + this.width / 2;
        const playerTop = this.position.y - this.height / 2;
        const playerBottom = this.position.y + this.height / 2;
        
        // 检查各个方向的边界碰撞并阻挡移动
        
        // 左边界阻挡：玩家从左侧向右移动时
        if (this.velocity.x > 0 && playerRight >= bossLeft && playerLeft < bossLeft &&
            playerBottom > bossTop && playerTop < bossBottom) {
            this.position.x = bossLeft - this.width / 2;
            this.velocity.x = 0;
        }
        
        // 右边界阻挡：玩家从右侧向左移动时
        if (this.velocity.x < 0 && playerLeft <= bossRight && playerRight > bossRight &&
            playerBottom > bossTop && playerTop < bossBottom) {
            this.position.x = bossRight + this.width / 2;
            this.velocity.x = 0;
        }
        
        // 上边界阻挡：玩家从上方向下移动时
        if (this.velocity.y > 0 && playerBottom >= bossTop && playerTop < bossTop &&
            playerRight > bossLeft && playerLeft < bossRight) {
            this.position.y = bossTop - this.height / 2;
            this.velocity.y = 0;
        }
        
        // 下边界阻挡：玩家从下方向上移动时
        if (this.velocity.y < 0 && playerTop <= bossBottom && playerBottom > bossBottom &&
            playerRight > bossLeft && playerLeft < bossRight) {
            this.position.y = bossBottom + this.height / 2;
            this.velocity.y = 0;
        }
    }

    /**
     * 检查玩家是否与Boss重叠 - 用于其他系统
     */
    isOverlappingWithBoss(boss) {
        const playerBounds = this.getBounds();
        const bossBounds = boss.getCollisionBounds();
        
        return !(playerBounds.right < bossBounds.left || 
                playerBounds.left > bossBounds.right ||
                playerBounds.bottom < bossBounds.top || 
                playerBounds.top > bossBounds.bottom);
    }

    /**
     * 射击
     */
    shoot() {
        if (!this.canShoot) return;
        
        // 记录射击统计
        if (window.game?.achievementManager) {
            window.game.achievementManager.recordShot();
        }
        
        // 主武器射击
        this.shootPrimary();
        
        // 发射副武器
        this.fireSecondaryWeapons();
        
        // 设置射击冷却
        this.canShoot = false;
        this.shootTimer = this.shootCooldown;
    }

    /**
     * 发射主武器
     */
    shootPrimary() {
        const fireY = this.position.y - this.height / 2;
        
        switch (this.primaryWeapon) {
            case 'basic':
                this.fireBasicWeapon(fireY);
                break;
            case 'spread':
                this.fireSpreadWeapon(fireY);
                break;
            case 'laser':
                this.fireLaserWeapon(fireY);
                break;
            case 'plasma':
                this.firePlasmaWeapon(fireY);
                break;
            case 'piercing':
                this.firePiercingWeapon(fireY);
                break;
            case 'energy_beam':
                this.fireEnergyBeamWeapon(fireY);
                break;
            default:
                this.fireBasicWeapon(fireY);
                break;
        }
    }

    /**
     * 发射副武器
     */
    fireSecondaryWeapons() {
        if (this.secondaryShootTimer > 0) return;
        
        const fireY = this.position.y - this.height / 2;
        
        // 遍历所有副武器
        this.secondaryWeapons.forEach(weaponType => {
            switch (weaponType) {
                case 'missile':
                    this.fireMissileWeapon(fireY);
                    break;
                // 可以在这里添加其他副武器类型
            }
        });
        
        if (this.secondaryWeapons.length > 0) {
            this.secondaryShootTimer = this.secondaryShootCooldown;
        }
    }

    /**
     * 根据武器类型发射子弹 - 保持向后兼容
     */
    fireWeapon() {
        this.shootPrimary();
        this.fireSecondaryWeapons();
    }

    /**
     * 基础武器
     */
    fireBasicWeapon(fireY) {
        const bulletCount = Math.min(this.weaponLevel, 3);
        
        // 播放射击音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('player_shoot', 0.6);
        }
        
        if (bulletCount === 1) {
            window.game.createBullet(this.position.x, fireY, 0, -500, 'player'); // 增加速度
        } else {
            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - (bulletCount - 1) / 2) * 15;
                window.game.createBullet(this.position.x + offset, fireY, 0, -500, 'player'); // 增加速度
            }
        }
    }

    /**
     * 散射武器 - 修改为5发扇形发射
     */
    fireSpreadWeapon(fireY) {
        const bulletCount = 5; // 固定5发
        const spreadAngle = 0.5; // 扇形角度
        
        // 播放散射武器音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('spread_shoot', 0.7);
        }
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i - (bulletCount - 1) / 2) * spreadAngle;
            const vx = Math.sin(angle) * 550; // 增加速度
            const vy = -Math.cos(angle) * 550; // 增加速度
            window.game.createBullet(this.position.x, fireY, vx, vy, 'spread');
        }
    }

    /**
     * 激光武器 - 修改为单条粗红色光束
     */
    fireLaserWeapon(fireY) {
        // 播放激光武器音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('laser_shoot', 0.8);
        }
        
        // 激光武器发射单条粗光束
        window.game.createBullet(this.position.x, fireY, 0, -800, 'laser_beam');
    }

    /**
     * 导弹武器 - 重新设计为贝塞尔曲线跟踪
     */
    fireMissileWeapon(fireY) {
        const missileCount = Math.min(Math.floor(this.weaponLevel / 2) + 1, 2);
        
        // 播放导弹发射音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('missile_shoot', 0.8);
        }
        
        for (let i = 0; i < missileCount; i++) {
            const offset = (i - (missileCount - 1) / 2) * 30;
            // 创建贝塞尔曲线导弹
            const missile = window.game.createBullet(this.position.x + offset, fireY + 5, 0, -200, 'bezier_missile');
            if (missile) {
                missile.initBezierTrajectory();
            }
        }
    }

    /**
     * 等离子武器
     */
    firePlasmaWeapon(fireY) {
        const plasmaCount = this.weaponLevel;
        
        // 播放等离子武器音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('plasma_shoot', 0.7);
        }
        
        for (let i = 0; i < plasmaCount; i++) {
            const angle = (i / plasmaCount) * Math.PI * 2;
            const radius = 30;
            const vx = Math.sin(angle) * 150;
            const vy = -450 + Math.cos(angle) * 100;
            
            window.game.createBullet(
                this.position.x + Math.sin(angle) * radius,
                fireY + Math.cos(angle) * radius,
                vx, vy, 'plasma'
            );
        }
    }

    /**
     * 穿甲武器
     */
    firePiercingWeapon(fireY) {
        const bulletCount = Math.min(Math.floor(this.weaponLevel / 2) + 1, 3);
        
        // 播放穿甲武器音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('piercing_shoot', 0.6);
        }
        
        for (let i = 0; i < bulletCount; i++) {
            const offset = (i - (bulletCount - 1) / 2) * 12;
            window.game.createBullet(this.position.x + offset, fireY, 0, -500, 'piercing');
        }
    }

    /**
     * 能量束武器
     */
    fireEnergyBeamWeapon(fireY) {
        // 播放能量束武器音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('energy_beam_shoot', 0.7);
        }
        
        window.game.createBullet(this.position.x, fireY, 0, -700, 'energy_beam');
        
        // 高等级时发射侧面的能量束
        if (this.weaponLevel >= 4) {
            window.game.createBullet(this.position.x - 25, fireY + 10, 0, -650, 'energy_beam');
            window.game.createBullet(this.position.x + 25, fireY + 10, 0, -650, 'energy_beam');
        }
    }

    /**
     * 检查是否可以使用特殊能力
     */
    canUseSpecial() {
        return this.specialTimer <= 0;
    }

    /**
     * 使用特殊能力
     */
    useSpecialAbility() {
        const audioManager = AudioManager.getInstance();
        audioManager.playSound('special', 0.8);
        
        // 全屏炸弹
        if (window.game?.enemyManager) {
            window.game.enemyManager.destroyAllEnemies();
        }
        
        // 创建爆炸效果
        if (window.game?.particleSystem) {
            for (let i = 0; i < 10; i++) {
                const x = Math.random() * this.canvasWidth;
                const y = Math.random() * this.canvasHeight;
                window.game.particleSystem.createExplosion(x, y, 15, { r: 255, g: 255, b: 0 });
            }
        }
        
        // 设置冷却时间
        this.specialTimer = this.specialCooldown;
    }

    /**
     * 受到伤害
     */
    takeDamage(damage) {
        // 检查无敌状态
        if (this.invulnerable) return false;
        
        // 检查护盾
        if (this.hasShield) {
            // 护盾阻挡伤害，但不移除护盾（护盾有时间限制）
            // 显示护盾阻挡消息
            if (window.game) {
                window.game.showMessage("护盾阻挡！", 1500);
            }
            
            // 显示浮动文字
            if (window.game) {
                window.game.showFloatingText({
                    x: this.position.x,
                    y: this.position.y - 30,
                    text: "护盾阻挡！",
                    color: "#00ffff",
                    life: 1.5,
                    velocity: { x: 0, y: -50 }
                });
            }
            
            console.log(`护盾阻挡了攻击，剩余护盾时间: ${this.shieldTimer.toFixed(1)}秒`);
            return false;
        }
        
        // 重置连击（因为受伤）
        if (window.game) {
            window.game.resetCombo();
        }
        
        // 扣除生命值
        this.hp = Math.max(0, this.hp - damage);
        
        // 触发无敌时间
        this.invulnerable = true;
        this.invulnerabilityTimer = 0.8; // 0.8秒无敌
        this.flash = 15; // 15帧闪烁
        
        // 显示伤害数字
        if (window.game) {
            window.game.showFloatingText({
                x: this.position.x + (Math.random() - 0.5) * 20,
                y: this.position.y - 20,
                text: `-${damage}`,
                color: "#ff4444",
                life: 1.2,
                velocity: { x: (Math.random() - 0.5) * 30, y: -60 }
            });
        }
        
        // 播放受伤音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('player_hit');
        }
        
        console.log(`玩家受到 ${damage} 点伤害，剩余血量: ${this.hp}`);
        
        // 检查是否死亡
        if (this.hp <= 0) {
            this.die();
        }
        
        this.updateUI();
        return true;
    }
    
    /**
     * 死亡处理
     */
    die() {
        this.lives--;
        console.log(`玩家死亡，剩余生命：${this.lives}`);
        
        // 播放死亡音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('player_death');
        }
        
        // 创建死亡爆炸效果
        if (window.game?.particleSystem) {
            window.game.particleSystem.createExplosion(
                this.position.x, 
                this.position.y, 
                25, 
                { r: 255, g: 0, b: 0 }
            );
        }
        
        if (this.lives > 0) {
            // 还有生命，复活
            this.revive();
        } else {
            // 生命耗尽，游戏结束
            this.destroy();
        }
    }
    
    /**
     * 复活处理
     */
    revive() {
        console.log(`玩家复活！获得5秒护盾保护，血量恢复至${this.maxHp}点`);
        
        // 恢复血量
        this.hp = this.maxHp;
        
        // 重置位置到屏幕底部中央
        this.position.set(this.canvasWidth / 2, this.canvasHeight - 100);
        this.velocity.set(0, 0);
        
        // 激活金色护盾保护
        this.hasShield = true;
        this.shieldTimer = this.shieldTime;
        this.shieldAnimationTime = 0;
        this.isReviving = true;
        
        // 无敌时间
        this.invulnerable = true;
        this.invulnerabilityTimer = this.shieldTime; // 护盾期间持续无敌
        
        // 创建复活特效
        if (window.game?.particleSystem) {
            window.game.particleSystem.createExplosion(
                this.position.x, 
                this.position.y, 
                15, 
                { r: 255, g: 215, b: 0 } // 金色
            );
        }
        
        this.updateUI();
    }

    /**
     * 升级武器
     */
    upgradeWeapon() {
        if (this.weaponLevel < this.maxWeaponLevel) {
            this.weaponLevel++;
            
            if (window.game?.audioManager) {
                window.game.audioManager.playSound('weapon_upgrade', 0.6);
            }
            
            // 调整射击冷却时间
            this.shootCooldown = Math.max(0.1, 0.2 - (this.weaponLevel - 1) * 0.02);
        }
    }

    /**
     * 设置武器类型 - 修改为设置主武器
     */
    setWeaponType(weaponType) {
        this.primaryWeapon = weaponType;
        this.weaponLevel = Math.min(this.weaponLevel + 1, this.maxWeaponLevel);
        
        console.log(`主武器设置为: ${weaponType}, 等级: ${this.weaponLevel}`);
        
        // 更新UI显示
        this.updateUI();
    }

    /**
     * 添加副武器
     */
    addSecondaryWeapon(weaponType) {
        if (!this.secondaryWeapons.includes(weaponType)) {
            this.secondaryWeapons.push(weaponType);
            console.log(`添加副武器: ${weaponType}`);
            
            // 显示消息
            if (window.game) {
                window.game.showMessage(`获得副武器: ${this.getWeaponDisplayName(weaponType)}`);
            }
        }
        
        this.updateUI();
    }

    /**
     * 获取武器显示名称
     */
    getWeaponDisplayName(weaponType) {
        const names = {
            'basic': '基础',
            'spread': '散射',
            'laser': '激光',
            'missile': '导弹',
            'plasma': '等离子',
            'piercing': '穿甲',
            'energy_beam': '能量束'
        };
        return names[weaponType] || weaponType;
    }

    /**
     * 初始化僚机
     */
    initWingmen() {
        this.wingmen = [];
        
        for (let i = 0; i < this.wingmenCount; i++) {
            const wingman = new Wingman(this);
            wingman.setPosition(i);
            this.wingmen.push(wingman);
        }
    }

    /**
     * 更新分数倍数
     */
    updateScoreMultiplier(deltaTime) {
        if (this.scoreMultiplierTime > 0) {
            this.scoreMultiplierTime -= deltaTime;
            if (this.scoreMultiplierTime <= 0) {
                this.scoreMultiplier = 1;
            }
        }
    }

    /**
     * 更新僚机
     */
    updateWingmen(deltaTime) {
        this.wingmen.forEach(wingman => {
            wingman.update(deltaTime);
        });
    }

    /**
     * 获得护盾
     */
    activateShield() {
        this.hasShield = true;
        this.shieldTimer = this.shieldTime;
        
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('shield_up', 0.6);
        }
    }

    /**
     * 恢复血量
     */
    heal(amount = 20) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        
        // 创建治疗特效
        if (window.game?.particleSystem) {
            window.game.particleSystem.createExplosion(
                this.position.x, 
                this.position.y, 
                8, 
                { r: 0, g: 255, b: 0 }
            );
        }
        
        this.updateUI();
    }

    /**
     * 激活护盾（带时间参数）
     */
    activateShield(duration = 5) {
        this.hasShield = true;
        this.shieldTimer = duration;
        
        const audioManager = AudioManager.getInstance();
        audioManager.playSound('powerup', 0.6);
    }

    /**
     * 添加炸弹
     */
    addBomb(amount = 1) {
        this.bombs = Math.min(this.maxBombs || 3, (this.bombs || 0) + amount);
    }

    /**
     * 添加速度加成
     */
    addSpeedBoost(duration = 3) {
        this.speedBoostTimer = duration;
        this.speedMultiplier = 1.5;
    }

    /**
     * 添加多重射击
     */
    addMultiShot(duration = 5) {
        this.multiShotTimer = duration;
    }

    /**
     * 添加激光武器
     */
    addLaserWeapon(duration = 3) {
        this.laserTimer = duration;
    }

    /**
     * 增加击杀数
     */
    addKill() {
        this.killCount++;
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        // 更新生命爱心显示
        const livesContainer = document.getElementById('livesContainer');
        if (livesContainer) {
            const hearts = livesContainer.querySelectorAll('.heart');
            hearts.forEach((heart, index) => {
                if (index < this.lives) {
                    heart.classList.remove('lost');
                } else {
                    heart.classList.add('lost');
                }
            });
        }
        
        // 更新血量显示
        const hpElement = document.getElementById('hp');
        if (hpElement) {
            hpElement.textContent = `${this.hp}/${this.maxHp}`;
        }
        
        // 更新血量条
        const hpBarElement = document.getElementById('hpBar');
        if (hpBarElement) {
            const hpPercentage = (this.hp / this.maxHp) * 100;
            hpBarElement.style.width = `${hpPercentage}%`;
            
            // 根据血量改变颜色
            if (hpPercentage > 60) {
                hpBarElement.style.background = 'linear-gradient(90deg, #00ff00, #44ff44)';
                hpBarElement.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.6)';
            } else if (hpPercentage > 30) {
                hpBarElement.style.background = 'linear-gradient(90deg, #ffff00, #ffaa00)';
                hpBarElement.style.boxShadow = '0 0 8px rgba(255, 255, 0, 0.6)';
            } else {
                hpBarElement.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
                hpBarElement.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)';
            }
        }
        
        // 更新分数显示
        const scoreElement = document.getElementById('score');
        if (scoreElement && window.game) {
            scoreElement.textContent = window.game.score.toLocaleString();
        }
        
        // 更新等级显示
        const levelElement = document.getElementById('level');
        if (levelElement && window.game) {
            levelElement.textContent = window.game.config.currentLevel.toString();
        }
        
        // 更新主武器信息
        const primaryWeaponElement = document.getElementById('primaryWeapon');
        const weaponLevelElement = document.getElementById('weaponLevel');
        if (primaryWeaponElement) {
            primaryWeaponElement.textContent = this.getWeaponDisplayName(this.primaryWeapon);
        }
        if (weaponLevelElement) {
            weaponLevelElement.textContent = `Lv.${this.weaponLevel}`;
        }
        
        // 更新副武器信息
        const secondaryWeaponsElement = document.getElementById('secondaryWeapons');
        if (secondaryWeaponsElement) {
            if (this.secondaryWeapons && this.secondaryWeapons.length > 0) {
                const weaponNames = this.secondaryWeapons.map(w => this.getWeaponDisplayName(w)).join(', ');
                secondaryWeaponsElement.textContent = weaponNames;
            } else {
                secondaryWeaponsElement.textContent = '无';
            }
        }
        
        // 更新分数倍数显示
        const scoreMultiplierElement = document.getElementById('scoreMultiplier');
        if (scoreMultiplierElement) {
            if (this.scoreMultiplier > 1) {
                scoreMultiplierElement.classList.remove('hidden');
                const effectText = scoreMultiplierElement.querySelector('.effect-text');
                if (effectText) {
                    effectText.textContent = `x${this.scoreMultiplier}`;
                }
            } else {
                scoreMultiplierElement.classList.add('hidden');
            }
        }
        
        // 更新僚机数量显示
        const wingmenCountElement = document.getElementById('wingmenCount');
        if (wingmenCountElement) {
            if (this.wingmenCount > 0) {
                wingmenCountElement.classList.remove('hidden');
                const effectText = wingmenCountElement.querySelector('.effect-text');
                if (effectText) {
                    effectText.textContent = this.wingmenCount.toString();
                }
            } else {
                wingmenCountElement.classList.add('hidden');
            }
        }
    }

    /**
     * 渲染玩家
     */
    onRender(ctx) {
        // 无敌时闪烁效果
        if (this.invulnerable && Math.floor(this.invulnerabilityTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // 轻微的飞行动画
        const bobOffset = Math.sin(this.animationTime * 8) * this.bobAmount;
        ctx.translate(0, bobOffset);
        
        // 绘制主体
        this.drawPlayerBody(ctx);
        
        // 绘制护盾
        if (this.hasShield) {
            this.drawShield(ctx);
        }
        
        // 绘制武器等级指示器
        this.drawWeaponIndicator(ctx);
        
        // 调试：绘制碰撞边界
        if (window.game?.showCollisionBounds) {
            this.drawCollisionBounds(ctx);
        }
        
        // 调试边界可视化
        if (this.showDebugBounds) {
            this.renderDebugBounds(ctx);
        }

        // 渲染僚机
        this.renderWingmen(ctx);
    }

    /**
     * 渲染僚机
     */
    renderWingmen(ctx) {
        this.wingmen.forEach(wingman => {
            ctx.save();
            ctx.translate(wingman.position.x, wingman.position.y);
            wingman.render(ctx);
            ctx.restore();
        });
    }

    /**
     * 绘制玩家主体
     */
    drawPlayerBody(ctx) {
        // 尝试使用图片渲染
        if (this.useImageRender) {
            const imageManager = window.ImageManager?.getInstance();
            if (imageManager && imageManager.loaded) {
                // 根据血量状态选择不同图片
                let imageName = this.imageName;
                if (this.hp < this.maxHp * 0.3 && imageManager.hasImage('player_damaged')) {
                    imageName = 'player_damaged';
                }
                
                const success = imageManager.drawImage(
                    ctx, 
                    imageName, 
                    0, 0, 
                    this.width, this.height,
                    0, // 旋转角度
                    false, false // 翻转
                );
                
                if (success) {
                    return; // 图片渲染成功，直接返回
                }
            }
        }
        
        // 图片渲染失败或未开启，使用原始几何图形渲染
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // 主体颜色渐变
        const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
        gradient.addColorStop(0, '#00ff44');
        gradient.addColorStop(0.5, '#00cc33');
        gradient.addColorStop(1, '#008822');
        
        ctx.fillStyle = gradient;
        
        // 绘制飞机形状
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight); // 机头
        ctx.lineTo(halfWidth * 0.8, halfHeight * 0.3); // 右翼
        ctx.lineTo(halfWidth * 0.4, halfHeight); // 右后
        ctx.lineTo(0, halfHeight * 0.8); // 中后
        ctx.lineTo(-halfWidth * 0.4, halfHeight); // 左后
        ctx.lineTo(-halfWidth * 0.8, halfHeight * 0.3); // 左翼
        ctx.closePath();
        ctx.fill();
        
        // 绘制驾驶舱
        ctx.fillStyle = '#0088ff';
        ctx.beginPath();
        ctx.ellipse(0, -halfHeight * 0.3, halfWidth * 0.3, halfHeight * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制武器
        ctx.fillStyle = '#666666';
        ctx.fillRect(-halfWidth * 0.2, -halfHeight * 0.8, halfWidth * 0.1, halfHeight * 0.3);
        ctx.fillRect(halfWidth * 0.1, -halfHeight * 0.8, halfWidth * 0.1, halfHeight * 0.3);
    }

    /**
     * 绘制护盾
     */
    drawShield(ctx) {
        const shieldRadius = Math.max(this.width, this.height) * 0.8;
        const alpha = Math.min(1, this.shieldTimer / this.shieldTime);
        
        ctx.save();
        
        // 金色护盾特效
        if (this.isReviving) {
            // 复活护盾 - 金色效果
            const pulseIntensity = 0.3 + Math.sin(this.shieldAnimationTime * 8) * 0.2;
            const rotationAngle = this.shieldAnimationTime * 2;
            
            // 外圈 - 金色光环
            ctx.globalAlpha = alpha * pulseIntensity;
            ctx.strokeStyle = '#FFD700'; // 金色
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // 内圈 - 更亮的金色
            ctx.globalAlpha = alpha * (pulseIntensity + 0.3);
            ctx.strokeStyle = '#FFFF00'; // 亮金色
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius * 0.85, 0, Math.PI * 2);
            ctx.stroke();
            
            // 旋转的能量线
            ctx.globalAlpha = alpha * 0.4;
            ctx.strokeStyle = '#FFA500'; // 橙金色
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI / 3) + rotationAngle;
                const startRadius = shieldRadius * 0.6;
                const endRadius = shieldRadius * 0.9;
                
                ctx.beginPath();
                ctx.moveTo(
                    Math.cos(angle) * startRadius,
                    Math.sin(angle) * startRadius
                );
                ctx.lineTo(
                    Math.cos(angle) * endRadius,
                    Math.sin(angle) * endRadius
                );
                ctx.stroke();
            }
            
            // 闪烁的能量点
            ctx.globalAlpha = alpha * pulseIntensity;
            ctx.fillStyle = '#FFFF00';
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI / 4) + rotationAngle * 0.5;
                const pointRadius = shieldRadius * 0.9;
                const pointSize = 3 + Math.sin(this.shieldAnimationTime * 10 + i) * 2;
                
                ctx.beginPath();
                ctx.arc(
                    Math.cos(angle) * pointRadius,
                    Math.sin(angle) * pointRadius,
                    pointSize,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
            
            // 中心光效
            const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, shieldRadius * 0.3);
            centerGlow.addColorStop(0, 'rgba(255, 215, 0, ' + (alpha * pulseIntensity * 0.3) + ')');
            centerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = centerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
        } else {
            // 普通护盾 - 蓝色效果
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // 闪烁效果
            if (Math.floor(this.shieldTimer * 20) % 2 === 0) {
                ctx.globalAlpha = alpha * 0.1;
                ctx.fillStyle = '#00ffff';
                ctx.fill();
            }
        }
        
        ctx.restore();
    }

    /**
     * 绘制武器等级指示器
     */
    drawWeaponIndicator(ctx) {
        const y = this.height / 2 + 15;
        
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${this.weaponLevel}`, 0, y);
        
        // 绘制武器等级条
        const barWidth = this.width * 0.8;
        const barHeight = 4;
        const barY = y + 5;
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#ffff00';
        const fillWidth = (this.weaponLevel / this.maxWeaponLevel) * barWidth;
        ctx.fillRect(-barWidth / 2, barY, fillWidth, barHeight);
    }

    /**
     * 绘制碰撞边界（调试用）
     */
    drawCollisionBounds(ctx) {
        const bounds = this.getBounds();
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;
        
        ctx.save();
        ctx.strokeStyle = '#ff00ff'; // 粉红色边界
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        
        // 绘制中心点
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * 获取碰撞边界 - 缩小碰撞面积为原来的一半
     * @returns {Object} 边界框 {left, right, top, bottom, centerX, centerY}
     */
    getBounds() {
        // 缩小碰撞面积为原来的一半，以中心为原点
        const halfWidth = (this.width / 2) / 2; // 宽度缩小一半
        const halfHeight = (this.height / 2) / 2; // 高度缩小一半
        
        return {
            left: this.position.x - halfWidth,
            right: this.position.x + halfWidth,
            top: this.position.y - halfHeight,
            bottom: this.position.y + halfHeight,
            centerX: this.position.x,
            centerY: this.position.y
        };
    }

    /**
     * 碰撞处理
     */
    onCollision(other) {
        if (other instanceof Enemy) {
            // 敌机撞击伤害
            this.takeDamage(other.damage || 10);
        } else if (other instanceof Bullet) {
            // 检查是否为敌机子弹
            const enemyBulletTypes = ['enemy', 'heavy_bullet', 'elite_bullet', 'interceptor_bullet', 'bomb', 'enemyBoss', 'boss_laser'];
            if (enemyBulletTypes.includes(other.type)) {
                // 敌机子弹伤害
                this.takeDamage(other.getDamage());
                
                // 销毁子弹（除非是穿透型）
                if (other.penetration <= 0) {
                    other.destroy();
                }
            }
        } else if (other instanceof PowerUp) {
            other.collect();
        }
    }

    /**
     * 设置画布尺寸
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * 获取玩家状态数据
     */
    getGameData() {
        return {
            lives: this.lives,
            score: this.score,
            killCount: this.killCount,
            weaponLevel: this.weaponLevel,
            hasShield: this.hasShield
        };
    }

    /**
     * 重置玩家状态
     */
    reset() {
        // 根据当前游戏配置重新设置生命数量
        let playerLives = 1; // 默认值
        
        try {
            if (window.game?.config?.playerLives) {
                playerLives = window.game.config.playerLives;
            } else {
                // 尝试从localStorage读取设置
                const savedSettings = localStorage.getItem('planewar_settings');
                if (savedSettings) {
                    const settings = JSON.parse(savedSettings);
                    if (settings.playerLives) {
                        playerLives = parseInt(settings.playerLives);
                    }
                }
            }
        } catch (error) {
            console.warn('重置时读取生命数量设置失败，使用默认值1条命:', error);
        }
        
        this.maxLives = playerLives;
        
        this.hp = this.maxHp; // 重置血量
        this.lives = this.maxLives;
        console.log(`玩家重置: ${this.maxLives}条命，每条命${this.maxHp}血量`);
        
        this.score = 0;
        this.killCount = 0;
        this.weaponLevel = 1;
        this.hasShield = false;
        this.isReviving = false;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.shieldTimer = 0;
        this.shieldAnimationTime = 0;
        this.specialTimer = 0;
        this.shootTimer = 0;
        this.canShoot = true;
        
        // 重置位置
        this.position.set(this.canvasWidth / 2, this.canvasHeight * 0.8);
        this.velocity.set(0, 0);
        
        this.updateUI();
    }

    /**
     * 渲染调试边界（特殊标记）
     */
    renderDebugBounds(ctx) {
        const bounds = this.getBounds();
        
        ctx.save();
        ctx.strokeStyle = '#00ff00'; // 绿色表示玩家边界
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;
        
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        
        // 在边界上添加标签
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('玩家碰撞边界', -width / 2, -height / 2 - 5);
        
        ctx.restore();
    }

    /**
     * 销毁时的清理
     */
    onDestroy() {
        if (this.thrusterEmitter && window.game?.particleSystem) {
            window.game.particleSystem.removeEmitter(this.thrusterEmitter);
        }
    }
} 