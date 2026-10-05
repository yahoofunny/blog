/**
 * Boss 类 - 游戏中的强力敌人
 * 具有多阶段战斗、特殊攻击模式和复杂AI
 */
class Boss extends GameObject {
    constructor(x, y) {
        console.log('Boss构造函数被调用, x:', x, 'y:', y);
        console.log('GameObject类型:', typeof GameObject);
        
        try {
            super(x, y);
            console.log('super()调用成功');
        } catch (error) {
            console.error('super()调用失败:', error);
            throw error;
        }
        this.type = 'boss';
        this.width = 360; // 原来是120，现在是3倍大小
        this.height = 240; // 原来是80，现在是3倍大小
        this.maxHealth = 5000;
        this.health = this.maxHealth;
        this.speed = 30;
        this.attackPower = 25; // 默认攻击力，会在setBossType中调整
        this.scoreValue = 10000;
        
        // Boss专属属性
        this.phase = 1; // 当前阶段 (1-3)
        this.maxPhases = 3;
        this.attackTimer = 0;
        this.attackCooldown = 2.0; // 2秒攻击间隔
        
        // 图片渲染设置
        this.useImageRender = true;
        this.imageName = 'boss_standard'; // 默认Boss图片
        this.specialAttackTimer = 0;
        this.specialAttackCooldown = 8.0; // 8秒特殊攻击间隔
        this.invulnerableTimer = 0; // 无敌时间
        this.warningTimer = 0; // 警告显示时间
        
        // 移动模式
        this.movementPattern = 'entrance'; // entrance, patrol, charge, retreat
        this.movementTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.originalX = x;
        this.originalY = 100;
        
        // 攻击模式
        this.attackModes = [
            'straightShot',    // 直线射击
            'spreadShot',      // 散射
            'circularShot',    // 环形射击
            'laserBeam',       // 激光束
            'missileBarrage',  // 导弹齐射
            'shockwave',       // 冲击波
            'teleport'         // 瞬移攻击
        ];
        this.currentAttackMode = 0;
        
        // 视觉效果
        this.glowIntensity = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.warningFlash = false;
        this.deathAnimation = {
            active: false,
            timer: 0,
            explosions: []
        };
        
        // 音效控制
        this.lastAttackSound = Date.now();
        this.appearancePlayed = false;
        
        this.active = false;
        this.inGameArea = false;
    }
    
    /**
     * X坐标的getter和setter
     */
    get x() {
        return this.position.x;
    }
    
    set x(value) {
        this.position.x = value;
    }
    
    /**
     * Y坐标的getter和setter
     */
    get y() {
        return this.position.y;
    }
    
    set y(value) {
        this.position.y = value;
    }
    
    /**
     * 重置Boss状态
     */
    reset(x, y, bossType = 'standard') {
        super.reset(x, y);
        this.type = 'boss';
        this.phase = 1;
        this.health = this.maxHealth;
        this.attackTimer = 0;
        this.specialAttackTimer = 0;
        this.invulnerableTimer = 0;
        this.warningTimer = 5.0; // 5秒警告时间
        this.movementPattern = 'entrance';
        this.movementTimer = 0;
        this.targetX = x;
        this.targetY = 100;
        this.originalX = x;
        this.originalY = 100;
        this.currentAttackMode = 0;
        this.glowIntensity = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.warningFlash = false;
        this.deathAnimation.active = false;
        this.deathAnimation.timer = 0;
        this.deathAnimation.explosions = [];
        this.appearancePlayed = false;
        this.active = true;
        this.inGameArea = false;
        
        // 激光攻击相关属性
        this.laserCharging = false;
        this.laserChargeTimer = 0;
        this.laserChargeDuration = 1.0;
        this.laserWarningShown = false;
        this.laserFinalWarningShown = false;
        
        // 入场攻击相关属性
        this.entranceAttackTimer = 0;
        this.entranceAttackTriggered = false;
        
        // 导弹齐射相关属性
        this.missileBarrageActive = false;
        this.missileBarrageTimer = 0;
        this.missileBarrageInterval = 0.2;
        this.missileBarrageCount = 0;
        this.missileBarrageMaxCount = 8;
        
        // 根据Boss类型调整属性
        this.setBossType(bossType);
        
        // 设置Boss图片
        this.imageName = `boss_${bossType}`;
    }
    
    /**
     * 设置Boss类型
     */
    setBossType(bossType) {
        switch (bossType) {
            case 'heavy':
                this.maxHealth = 8000;
                this.health = this.maxHealth;
                this.width = 450; // 原来是150，现在是3倍大小
                this.height = 300; // 原来是100，现在是3倍大小
                this.speed = 20;
                this.attackCooldown = 1.5;
                this.attackPower = 35; // 重型Boss - 高伤害但攻击慢
                this.scoreValue = 15000;
                break;
            case 'fast':
                this.maxHealth = 3000;
                this.health = this.maxHealth;
                this.width = 300; // 原来是100，现在是3倍大小
                this.height = 180; // 原来是60，现在是3倍大小
                this.speed = 50;
                this.attackCooldown = 1.0;
                this.attackPower = 20; // 快速Boss - 低伤害但攻击频繁
                this.scoreValue = 8000;
                break;
            case 'ultimate':
                this.maxHealth = 12000;
                this.health = this.maxHealth;
                this.width = 600; // 原来是200，现在是3倍大小
                this.height = 360; // 原来是120，现在是3倍大小
                this.speed = 25;
                this.attackCooldown = 0.8;
                this.attackPower = 45; // 终极Boss - 极高伤害
                this.specialAttackCooldown = 5.0;
                this.scoreValue = 25000;
                this.maxPhases = 4;
                break;
            default: // standard
                this.attackPower = 25; // 标准Boss - 中等伤害
                break;
        }
    }
    
    /**
     * 更新Boss状态
     */
    onUpdate(deltaTime) {
        if (!this.active) return;
        
        // 更新计时器
        this.updateTimers(deltaTime);
        
        // 如果Boss正在死亡动画中，只更新视觉效果和计时器
        if (this.deathAnimation.active) {
            // 死亡动画期间只更新视觉效果，不进行移动和攻击
            this.updateVisualEffects(deltaTime);
            return;
        }
        
        // 检查阶段转换
        this.checkPhaseTransition();
        
        // 更新移动模式
        this.updateMovement(deltaTime);
        
        // 更新攻击
        this.updateAttacks(deltaTime);
        
        // 更新激光充能状态
        this.updateLaserCharging(deltaTime);
        
        // 更新导弹齐射状态
        this.updateMissileBarrage(deltaTime);
        
        // 更新视觉效果
        this.updateVisualEffects(deltaTime);
        
        // 播放出现音效
        if (!this.appearancePlayed && this.warningTimer <= 0) {
            if (window.game && window.game.audioManager) {
                window.game.audioManager.playSound('boss_appear');
            }
            this.appearancePlayed = true;
        }
    }
    
    /**
     * 更新计时器
     */
    updateTimers(deltaTime) {
        if (this.warningTimer > 0) {
            this.warningTimer -= deltaTime;
            this.warningFlash = Math.floor(this.warningTimer / 0.2) % 2 === 0;
            return; // 警告期间不进行其他更新
        }
        
        this.attackTimer -= deltaTime;
        this.specialAttackTimer -= deltaTime;
        this.movementTimer += deltaTime;
        
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= deltaTime;
        }
        
        if (this.deathAnimation.active) {
            this.deathAnimation.timer += deltaTime;
        }
        
        // 更新入场攻击计时器
        if (this.entranceAttackTimer > 0) {
            this.entranceAttackTimer -= deltaTime;
            if (this.entranceAttackTimer <= 0 && !this.entranceAttackTriggered && this.inGameArea) {
                this.entranceAttackTriggered = true;
                console.log('Boss进入游戏区域，立即发射激光攻击！');
                this.fireLaserBeam();
            }
        }
    }
    
    /**
     * 检查阶段转换
     */
    checkPhaseTransition() {
        const healthPercentage = this.health / this.maxHealth;
        const newPhase = Math.ceil(healthPercentage * this.maxPhases);
        
        if (newPhase < this.phase && newPhase >= 1) {
            this.enterNewPhase(newPhase);
        }
    }
    
    /**
     * 进入新阶段
     */
    enterNewPhase(phase) {
        this.phase = phase;
        this.invulnerableTimer = 2.0; // 2秒无敌时间
        this.glowIntensity = 1;
        
        // 每个阶段提升攻击频率
        this.attackCooldown = Math.max(0.5, this.attackCooldown - 0.3);
        this.specialAttackCooldown = Math.max(3.0, this.specialAttackCooldown - 1.0);
        
        // 增加攻击力（每阶段+15%）
        this.attackPower = Math.round(this.attackPower * 1.15);
        
        // 播放阶段转换音效
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('boss_phase_change');
        }
        
        // 显示阶段提示
        if (window.game) {
            window.game.showMessage(`Boss进入第${phase}阶段！攻击力增强！`, 2500);
        }
        
        console.log(`Boss攻击力增加到: ${this.attackPower}`);
    }
    
    /**
     * 更新移动模式
     */
    updateMovement(deltaTime) {
        // 警告期间Boss在屏幕上方等待
        if (this.warningTimer > 0) {
            this.y = -this.height - 50; // 确保Boss在警告期间完全不可见
            return; 
        }
        
        // 警告结束，Boss立即出现在更接近的位置
        if (this.warningTimer <= 0 && this.movementPattern === 'entrance' && this.y < -this.height) {
            console.log('Boss倒计时结束，立即出现！');
            // 设置Boss在更接近屏幕顶部的位置，减少入场距离
            this.y = -this.height * 0.5; // 只是半个身体在屏幕外，大大减少入场距离
            this.inGameArea = false; // 还未进入游戏区域
            console.log(`Boss初始位置设置为: y=${this.y}, 目标位置: y=${this.originalY}`);
        }
        
        switch (this.movementPattern) {
            case 'entrance':
                this.handleEntranceMovement(deltaTime);
                break;
            case 'patrol':
                this.handlePatrolMovement(deltaTime);
                break;
            case 'charge':
                this.handleChargeMovement(deltaTime);
                break;
            case 'retreat':
                this.handleRetreatMovement(deltaTime);
                break;
        }
    }
    
    /**
     * 处理入场移动
     */
    handleEntranceMovement(deltaTime) {
        const targetY = this.originalY;
        // 入场时使用更快的速度，确保3秒内到达
        const entranceSpeed = 150; // 固定入场速度，比普通速度快很多
        const moveSpeed = entranceSpeed * deltaTime;
        
        if (this.y < targetY) {
            this.y = Math.min(targetY, this.y + moveSpeed);
            console.log(`Boss入场中: y=${this.y.toFixed(1)}, 目标=${targetY}, 距离=${(targetY - this.y).toFixed(1)}`);
        } else {
            this.movementPattern = 'patrol';
            this.movementTimer = 0;
            this.inGameArea = true;
            this.entranceAttackTimer = 0.5; // 0.5秒后发射激光
            this.entranceAttackTriggered = false;
            console.log('Boss已进入游戏区域，开始巡逻模式');
        }
    }
    
    /**
     * 处理巡逻移动
     */
    handlePatrolMovement(deltaTime) {
        const amplitude = 200;
        const frequency = 0.001;
        const centerX = this.originalX;
        
        this.x = centerX + Math.sin(this.movementTimer * frequency) * amplitude;
        
        // 偶尔切换到冲锋模式
        if (this.movementTimer > 10.0 && Math.random() < 0.3) {
            this.movementPattern = 'charge';
            this.movementTimer = 0;
            this.targetY = Math.min(300, this.y + 150);
        }
    }
    
    /**
     * 处理冲锋移动
     */
    handleChargeMovement(deltaTime) {
        const moveSpeed = this.speed * 2 * deltaTime;
        
        if (this.y < this.targetY) {
            this.y = Math.min(this.targetY, this.y + moveSpeed);
        } else {
            this.movementPattern = 'retreat';
            this.movementTimer = 0;
        }
    }
    
    /**
     * 处理撤退移动
     */
    handleRetreatMovement(deltaTime) {
        const moveSpeed = this.speed * deltaTime;
        
        if (this.y > this.originalY) {
            this.y = Math.max(this.originalY, this.y - moveSpeed);
        } else {
            this.movementPattern = 'patrol';
            this.movementTimer = 0;
        }
    }
    
    /**
     * 更新攻击
     */
    updateAttacks(deltaTime) {
        if (this.warningTimer > 0 || !this.inGameArea) return;
        
        // 普通攻击
        if (this.attackTimer <= 0) {
            this.performNormalAttack();
            this.attackTimer = this.attackCooldown;
        }
        
        // 特殊攻击
        if (this.specialAttackTimer <= 0) {
            this.performSpecialAttack();
            this.specialAttackTimer = this.specialAttackCooldown;
        }
    }
    
    /**
     * 执行普通攻击
     */
    performNormalAttack() {
        const attackMode = this.attackModes[this.currentAttackMode];
        
        switch (attackMode) {
            case 'straightShot':
                this.fireStraightShot();
                break;
            case 'spreadShot':
                this.fireSpreadShot();
                break;
            case 'circularShot':
                this.fireCircularShot();
                break;
        }
        
        // 循环攻击模式
        this.currentAttackMode = (this.currentAttackMode + 1) % Math.min(3, this.attackModes.length);
        
        // 播放攻击音效
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('boss_attack');
        }
    }
    
    /**
     * 执行特殊攻击
     */
    performSpecialAttack() {
        const specialAttacks = ['laserBeam', 'missileBarrage', 'shockwave'];
        const attackType = specialAttacks[Math.floor(Math.random() * specialAttacks.length)];
        
        switch (attackType) {
            case 'laserBeam':
                this.fireLaserBeam();
                break;
            case 'missileBarrage':
                this.fireMissileBarrage();
                break;
            case 'shockwave':
                this.fireShockwave();
                break;
        }
        
        // 播放特殊攻击音效
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('boss_special_attack');
        }
    }
    
    /**
     * 直线射击
     */
    fireStraightShot() {
        if (!window.game) return;
        
        const bulletCount = 3;
        const spacing = 60; // 增大间距，因为Boss变大了
        const startX = this.x - (bulletCount - 1) * spacing / 2;
        
        for (let i = 0; i < bulletCount; i++) {
            const bullet = window.game.createBullet(
                startX + i * spacing,
                this.y + this.height * 0.3, // 从Boss前部发射，而不是中心
                0, 300, 'enemyBoss'
            );
            if (bullet) {
                bullet.damage = this.attackPower; // 标准伤害: 20-45
            }
        }
    }
    
    /**
     * 散射
     */
    fireSpreadShot() {
        if (!window.game) return;
        
        const bulletCount = 5;
        const angleSpread = Math.PI / 3; // 60度散射
        const speed = 250;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = -angleSpread / 2 + (angleSpread / (bulletCount - 1)) * i;
            const vx = Math.sin(angle) * speed;
            const vy = Math.cos(angle) * speed;
            
            const bullet = window.game.createBullet(
                this.x,
                this.y + this.height * 0.3, // 从Boss前部发射
                vx, vy, 'enemyBoss'
            );
            if (bullet) {
                bullet.damage = Math.round(this.attackPower * 0.7); // 散射伤害稍低: 14-32
            }
        }
    }
    
    /**
     * 环形射击
     */
    fireCircularShot() {
        if (!window.game) return;
        
        const bulletCount = 12;
        const speed = 200;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            const bullet = window.game.createBullet(
                this.x,
                this.y + this.height * 0.3, // 从Boss前部发射
                vx, vy, 'enemyBoss'
            );
            if (bullet) {
                bullet.damage = Math.round(this.attackPower * 0.5); // 环形弹幕伤害较低: 10-23
            }
        }
    }
    
    /**
     * 激光束攻击
     */
    fireLaserBeam() {
        if (!window.game) return;
        
        // 初始化激光充能状态
        this.laserCharging = true;
        this.laserChargeTimer = 0;
        this.laserChargeDuration = 2.0; // 延长充能时间到2秒，让特效更明显
        this.laserWarningShown = false;
        this.laserFinalWarningShown = false;
        
        // 添加充能视觉效果
        this.laserChargeIntensity = 0;
        this.laserChargeParticles = [];
        
        // 创建激光预警 - 更威胁性的提示
        window.game.showMessage('⚡⚡⚡ 警告！Boss正在聚集毁灭性能量！ ⚡⚡⚡', 3000);
        
        // 播放充能音效序列
        if (window.game.audioManager) {
            window.game.audioManager.playSound('boss_charge', 0.9);
            
            // 1秒后播放增强音效
            setTimeout(() => {
                if (this.laserCharging && window.game.audioManager) {
                    window.game.audioManager.playSound('boss_charge', 1.0);
                }
            }, 1000);
        }
        
        // 创建充能粒子效果（性能优化版）
        if (window.game.particleSystem) {
            this.createChargeParticles();
        }
        
        console.log('Boss开始激光充能（增强版）');
    }
    
    /**
     * 创建充能粒子效果（性能优化版）
     */
    createChargeParticles() {
        if (!window.game?.particleSystem) return;
        
        // 减少粒子数量从20个到8个，减少性能负担
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const radius = 80 + Math.random() * 30; // 减少随机范围
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            window.game.particleSystem.createParticle({
                x: x,
                y: y,
                vx: -Math.cos(angle) * 40, // 降低移动速度
                vy: -Math.sin(angle) * 40,
                life: 1.5, // 减少生命周期
                color: { r: 255, g: 0, b: 0 },
                size: 2 + Math.random() * 1 // 减少大小变化
            });
        }
    }
    
    /**
     * 更新激光充能状态
     */
    updateLaserCharging(deltaTime) {
        if (!this.laserCharging) return;
        
        this.laserChargeTimer += deltaTime;
        
        // 更新充能强度
        this.laserChargeIntensity = Math.min(1, this.laserChargeTimer / this.laserChargeDuration);
        
        // 充能期间的屏幕震动
        if (window.game) {
            const shakeIntensity = this.laserChargeIntensity * 3;
            window.game.screenShake = {
                intensity: shakeIntensity,
                duration: 100
            };
        }
        
        // 1秒后显示倒计时警告
        if (this.laserChargeTimer >= 1.0 && !this.laserWarningShown) {
            this.laserWarningShown = true;
            if (window.game) {
                window.game.showMessage('💥💥 激光蓄能即将完成！立即躲避！ 💥💥', 2000);
            }
            
            // 播放警告音效
            if (window.game.audioManager) {
                window.game.audioManager.playSound('warning', 0.8);
            }
        }
        
        // 1.8秒后最终警告
        if (this.laserChargeTimer >= 1.8 && !this.laserFinalWarningShown) {
            this.laserFinalWarningShown = true;
            if (window.game) {
                window.game.showMessage('🔥🔥🔥 激光发射！！！ 🔥🔥🔥', 2500);
            }
        }
        
        // 2秒后发射激光
        if (this.laserChargeTimer >= this.laserChargeDuration) {
            this.executeLaserAttack();
            this.laserCharging = false; // 结束充能状态
            this.laserChargeIntensity = 0;
        }
    }
    
    /**
     * 执行激光攻击
     */
    executeLaserAttack() {
        if (!this.active || !window.game) return;
        
        // 强烈的屏幕震动
        if (window.game) {
            window.game.screenShake = {
                intensity: 15,
                duration: 500
            };
        }
        
        const laserCount = 3;
        const spacing = 100;
        const startX = this.x - spacing;
        
        for (let i = 0; i < laserCount; i++) {
            // 创建激光柱 - 激光束应该是静止的
            const laser = window.game.createBullet(
                startX + i * spacing,
                this.y + this.height * 0.3, // 从Boss前部发射
                0, 0, 'boss_laser' // Boss专用激光类型
            );
            if (laser) {
                laser.damage = Math.round(this.attackPower * 1.8); // 激光束高伤害: 36-81
                
                // 设置激光束的实际渲染范围 - 从Boss位置向下延伸到屏幕底部
                laser.laserStartY = this.y + this.height * 0.3;
                laser.laserEndY = 600; // 延伸到屏幕底部
                laser.renderHeight = laser.laserEndY - laser.laserStartY; // 实际渲染高度
                
                console.log(`Boss发射激光: x=${laser.x}, y=${laser.y}, 起点=${laser.laserStartY}, 终点=${laser.laserEndY}, 伤害=${laser.damage}`);
            }
        }
        
        // 播放强烈的激光发射音效
        if (window.game.audioManager) {
            window.game.audioManager.playSound('boss_laser', 1.0);
            window.game.audioManager.playSound('explosion', 0.7); // 额外的爆炸音效
        }
        
        // 创建激光发射的粒子爆发效果（性能优化版）
        if (window.game.particleSystem) {
            // 减少粒子数量从50个到15个
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 80; // 减少速度变化范围
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                
                window.game.particleSystem.createParticle({
                    x: this.x,
                    y: this.y + this.height * 0.3,
                    vx: vx,
                    vy: vy,
                    life: 0.8, // 减少生命周期
                    color: { r: 255, g: 50, b: 0 },
                    size: 2 + Math.random() * 2 // 减少大小变化
                });
            }
        }
        
        console.log('Boss激光发射完成（增强版）');
    }
    
    /**
     * 导弹齐射
     */
    fireMissileBarrage() {
        if (!window.game) return;
        
        // 初始化导弹齐射状态
        this.missileBarrageActive = true;
        this.missileBarrageTimer = 0;
        this.missileBarrageInterval = 0.2; // 0.2秒间隔
        this.missileBarrageCount = 0;
        this.missileBarrageMaxCount = 8;
        
        console.log('Boss开始导弹齐射');
    }
    
    /**
     * 更新导弹齐射
     */
    updateMissileBarrage(deltaTime) {
        if (!this.missileBarrageActive) return;
        
        this.missileBarrageTimer += deltaTime;
        
        if (this.missileBarrageTimer >= this.missileBarrageInterval) {
            this.missileBarrageTimer = 0;
            this.fireSingleMissile();
            this.missileBarrageCount++;
            
            if (this.missileBarrageCount >= this.missileBarrageMaxCount) {
                this.missileBarrageActive = false;
                console.log('Boss导弹齐射完成');
            }
        }
    }
    
    /**
     * 发射单个导弹
     */
    fireSingleMissile() {
        if (!this.active || !window.game) return;
        
        const angle = Math.random() * Math.PI / 3 - Math.PI / 6; // ±30度
        const speed = 300;
        const vx = Math.sin(angle) * speed;
        const vy = Math.cos(angle) * speed;
        
        const missile = window.game.createBullet(
            this.x + (Math.random() - 0.5) * this.width * 0.6, // 减少横向散布
            this.y + this.height * 0.4, // 从Boss前部发射，不是底部
            vx, vy, 'missile'
        );
        if (missile) {
            missile.damage = Math.round(this.attackPower * 1.4); // 导弹高伤害: 28-63
        }
    }
    
    /**
     * 冲击波攻击
     */
    fireShockwave() {
        if (!window.game) return;
        
        // 创建环形冲击波
        const waveCount = 20;
        const speed = 150;
        
        for (let i = 0; i < waveCount; i++) {
            const angle = (Math.PI * 2 / waveCount) * i;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            const wave = window.game.createBullet(
                this.x,
                this.y + this.height * 0.3, // 从Boss前部发射
                vx, vy, 'shockwave'
            );
            if (wave) {
                wave.damage = Math.round(this.attackPower * 0.6); // 冲击波中等伤害: 12-27
                wave.width = 30; // 因为Boss变大，冲击波也变大
                wave.height = 30;
            }
        }
    }
    
    /**
     * 更新视觉效果
     */
    updateVisualEffects(deltaTime) {
        // 发光效果
        if (this.glowIntensity > 0) {
            this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime);
        }
        
        // 受伤震动
        if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
            this.shakeOffset.x *= 0.9;
            this.shakeOffset.y *= 0.9;
            
            if (Math.abs(this.shakeOffset.x) < 0.1) this.shakeOffset.x = 0;
            if (Math.abs(this.shakeOffset.y) < 0.1) this.shakeOffset.y = 0;
        }
        
        // 死亡动画期间的视觉效果
        if (this.deathAnimation.active) {
            // 注意：计时器在updateTimers方法中更新，这里不重复更新
            this.glowIntensity = 1.0;
            this.shakeOffset.x = (Math.random() - 0.5) * 20;
            this.shakeOffset.y = (Math.random() - 0.5) * 20;
            
            // 死亡动画完成后真正死亡
            if (this.deathAnimation.timer >= this.deathAnimation.duration) {
                console.log('Boss死亡动画完成，Boss真正死亡');
                this.active = false; // Boss完全消失
            }
        }
    }
    
    /**
     * 受到伤害
     */
    takeDamage(damage = 100) {
        if (this.invulnerableTimer > 0 || !this.active) return 0;
        
        const actualDamage = Math.min(damage, this.health);
        this.health -= actualDamage;
        
        // 视觉反馈
        this.glowIntensity = 0.8;
        this.shakeOffset.x = (Math.random() - 0.5) * 10;
        this.shakeOffset.y = (Math.random() - 0.5) * 10;
        
        // 播放受伤音效
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('boss_hit');
        }
        
        // 检查死亡
        if (this.health <= 0) {
            this.startDeathAnimation();
        }
        
        return actualDamage;
    }
    
    /**
     * 开始死亡动画
     */
    startDeathAnimation() {
        this.deathAnimation.active = true;
        this.deathAnimation.timer = 0;
        this.deathAnimation.duration = 3.0; // 3秒死亡动画
        
        console.log('Boss开始死亡动画，持续3秒');
        
        // 创建更多爆炸效果，持续3秒
        for (let i = 0; i < 60; i++) { // 增加到60个爆炸
            setTimeout(() => {
                if (this.deathAnimation.active && window.game && window.game.particleSystem) {
                    const colors = ['#ff6b35', '#ff3300', '#ffaa00', '#ffffff', '#ffff00'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    
                    window.game.particleSystem.createExplosion(
                        this.x + (Math.random() - 0.5) * this.width,
                        this.y + (Math.random() - 0.5) * this.height,
                        {
                            color: randomColor,
                            count: Math.random() * 10 + 10,
                            speed: Math.random() * 100 + 150,
                            life: Math.random() * 500 + 800
                        }
                    );
                }
            }, i * 50); // 每50ms一个爆炸
        }
        
        // 播放死亡音效
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('boss_death');
            
            // 额外的爆炸音效
            setTimeout(() => {
                if (this.deathAnimation.active) {
                    window.game.audioManager.playSound('explosion', 0.8);
                }
            }, 1000);
            
            setTimeout(() => {
                if (this.deathAnimation.active) {
                    window.game.audioManager.playSound('explosion', 0.6);
                }
            }, 2000);
        }
        
        // 创建屏幕震动效果
        if (window.game) {
            window.game.screenShake = { intensity: 10, duration: 3000 };
        }
    }
    
    /**
     * 渲染Boss
     */
    onRender(ctx) {
        if (!this.active) return;
        
        // 警告阶段渲染
        if (this.warningTimer > 0) {
            this.renderWarning(ctx);
            return;
        }
        
        ctx.save();
        
        // 应用震动偏移
        ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
        
        // 发光效果
        if (this.glowIntensity > 0) {
            ctx.shadowBlur = 20 * this.glowIntensity;
            ctx.shadowColor = '#ff0000';
        }
        
        // 无敌状态闪烁
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 0.1) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // 死亡动画淡出效果
        if (this.deathAnimation.active && this.deathAnimation.duration) {
            const fadeProgress = this.deathAnimation.timer / this.deathAnimation.duration;
            ctx.globalAlpha = Math.max(0.3, 1 - fadeProgress * 0.7); // 保留30%不透明度
        }
        
        // 渲染Boss主体
        this.renderBossBody(ctx);
        
        // 渲染血条
        this.renderHealthBar(ctx);
        
        // 渲染阶段指示器
        this.renderPhaseIndicator(ctx);
        
        // 调试边界可视化
        if (this.showDebugBounds) {
            this.renderDebugBounds(ctx);
        }
        
        ctx.restore();
    }
    
    /**
     * 渲染警告
     */
    renderWarning(ctx) {
        if (!this.warningFlash) return;
        
        ctx.save();
        
        // 背景警告
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // 警告文字
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('危险！Boss即将出现！', ctx.canvas.width / 2, ctx.canvas.height / 2);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`${this.warningTimer.toFixed(1)}秒`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 60);
        
        ctx.restore();
    }
    
    /**
     * 渲染Boss主体
     */
    renderBossBody(ctx) {
        // 尝试使用图片渲染
        if (this.useImageRender) {
            const imageManager = window.ImageManager?.getInstance();
            if (imageManager && imageManager.loaded) {
                const success = imageManager.drawImage(
                    ctx, 
                    this.imageName, 
                    this.x, this.y, 
                    this.width, this.height,
                    0, // 旋转角度
                    false, false // 翻转
                );
                
                if (success) {
                    // 即使使用图片渲染，也要渲染充能特效
                    this.renderChargeEffects(ctx);
                    return; // 图片渲染成功，直接返回
                }
            }
        }
        
        // 图片渲染失败或未开启，使用原始几何图形渲染
        // Boss轮廓（简化版）
        const gradient = ctx.createLinearGradient(
            this.x - this.width / 2, this.y - this.height / 2,
            this.x + this.width / 2, this.y + this.height / 2
        );
        gradient.addColorStop(0, '#660000');
        gradient.addColorStop(0.5, '#cc0000');
        gradient.addColorStop(1, '#990000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Boss装甲细节
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // 武器系统
        ctx.fillStyle = '#333333';
        for (let i = 0; i < 5; i++) {
            const gunX = this.x - this.width / 2 + (i + 1) * (this.width / 6);
            ctx.fillRect(gunX - 3, this.y + this.height / 2 - 5, 6, 15);
        }
        
        // 渲染充能特效
        this.renderChargeEffects(ctx);
    }
    
    /**
     * 渲染激光充能特效（极简版）
     */
    renderChargeEffects(ctx) {
        if (!this.laserCharging || this.laserChargeIntensity <= 0) return;
        
        ctx.save();
        
        // 只保留最基本的效果
        
        // 简单的红色光圈
        const radius = 30 + this.laserChargeIntensity * 20;
        const alpha = this.laserChargeIntensity * 0.4;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 白色核心
        ctx.globalAlpha = this.laserChargeIntensity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 简单的进度环
        const progressAngle = Math.PI * 2 * this.laserChargeIntensity;
        ctx.globalAlpha = this.laserChargeIntensity;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 35, -Math.PI / 2, -Math.PI / 2 + progressAngle);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * 渲染血条
     */
    renderHealthBar(ctx) {
        const barWidth = this.width + 40;
        const barHeight = 8;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.height / 2 - 20;
        
        // 血条背景
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 血条前景
        const healthPercentage = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercentage;
        
        let healthColor = '#00ff00';
        if (healthPercentage < 0.3) healthColor = '#ff0000';
        else if (healthPercentage < 0.6) healthColor = '#ffff00';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, healthWidth, barHeight);
        
        // 血条边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // 血量数字
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.health}/${this.maxHealth}`,
            this.x,
            barY - 5
        );
    }
    
    /**
     * 渲染阶段指示器
     */
    renderPhaseIndicator(ctx) {
        const indicatorY = this.y - this.height / 2 - 35;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`阶段 ${this.phase}/${this.maxPhases}`, this.x, indicatorY);
        
        // 阶段进度条
        const progressWidth = 60;
        const progressHeight = 4;
        const progressX = this.x - progressWidth / 2;
        const progressY = indicatorY + 8;
        
        const phaseProgress = 1 - (this.health / this.maxHealth - (this.phase - 1) / this.maxPhases) * this.maxPhases;
        const progressFill = progressWidth * Math.max(0, Math.min(1, phaseProgress));
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
        
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(progressX, progressY, progressFill, progressHeight);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(progressX, progressY, progressWidth, progressHeight);
    }
    
    /**
     * 渲染调试边界
     */
    renderDebugBounds(ctx) {
        const bounds = this.getCollisionBounds();
        
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.strokeRect(
            bounds.left,
            bounds.top,
            bounds.right - bounds.left,
            bounds.bottom - bounds.top
        );
        
        // 在边界上添加标签
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.fillText('Boss碰撞边界', bounds.left, bounds.top - 5);
        
        ctx.restore();
    }
    
    /**
     * 检查是否死亡
     */
    isDead() {
        // Boss血量为0但死亡动画未完成时，仍然不算真正死亡
        if (this.health <= 0 && this.deathAnimation.active) {
            return this.deathAnimation.timer >= this.deathAnimation.duration;
        }
        return this.health <= 0;
    }
    
    /**
     * 获取分数值
     */
    getScoreValue() {
        return this.scoreValue + (this.maxPhases - this.phase) * 2000; // 阶段奖励
    }
    
    /**
     * 获取碰撞边界
     */
    getCollisionBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }
}

// 导出Boss类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Boss;
} else {
    window.Boss = Boss;
}