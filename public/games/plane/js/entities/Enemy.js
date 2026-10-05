/**
 * 敌机基类
 */
class Enemy extends GameObject {
    constructor(x, y) {
        super(x, y);
        
        // 基础属性
        this.hp = 1;
        this.maxHp = 1;
        this.damage = 1;
        this.score = 10;
        this.enemyType = 'basic';
        
        // 移动属性
        this.baseSpeed = 100;
        this.movePattern = 'straight';
        this.patternTime = 0;
        this.amplitude = 50;
        this.frequency = 2;
        
        // AI属性
        this.aggroRange = 150; // 攻击范围
        this.retreatThreshold = 0.3; // 血量低于30%时撤退
        this.lastPlayerPosition = { x: 0, y: 0 };
        this.isAggressive = false; // 是否主动攻击
        this.behaviorState = 'patrol'; // 行为状态：patrol, engage, retreat
        this.decisionTimer = 0; // 决策计时器
        this.formationLeader = null; // 编队领导者
        this.formationOffset = { x: 0, y: 0 }; // 编队偏移
        this.isFormationMember = false;
        
        // 射击属性
        this.canShoot = false;
        this.shootCooldown = 0;
        this.shootInterval = 2;
        this.lastShootTime = 0;
        this.aimAccuracy = 0.5; // 瞄准精度 (0-1)
        this.burstCount = 1; // 连发数量
        this.burstDelay = 0.1; // 连发间隔
        this.currentBurst = 0;
        this.burstTimer = 0;
        
        // 动画属性
        this.animationTime = 0;
        this.scale = 1;
        this.rotation = 0;
        this.flash = 0; // 受击闪烁
        
        // 掉落属性
        this.dropChance = 0.1; // 掉落道具概率
        this.dropTypes = ['health', 'powerup', 'score'];
        
        // 视觉属性
        this.color = '#ff4444';
        this.secondaryColor = '#ff8888';
        
        // 新增属性
        this.isDestroyed = false;
        this.destroyReason = null; // 销毁原因: 'defeated' - 被击败, 'outOfBounds' - 飞出边界
        this.alertLevel = 0;
        
        // 图片渲染设置
        this.useImageRender = true; // 是否使用图片渲染
        this.imageName = 'enemy_basic'; // 默认图片名称 // 警戒等级
        this.evasionCooldown = 0; // 规避冷却
        this.lastEvasionTime = 0;
    }

    /**
     * 重置敌机状态
     */
    reset(x, y, type = 'basic') {
        this.position.set(x, y);
        this.velocity.set(0, this.baseSpeed);
        this.enemyType = type;
        this.active = true;
        this.visible = true;
        this.destroyed = false;
        this.age = 0;
        this.patternTime = 0;
        this.animationTime = 0;
        this.scale = 1;
        this.rotation = 0;
        this.flash = 0;
        this.lastShootTime = 0;
        this.behaviorState = 'patrol';
        this.decisionTimer = 0;
        this.alertLevel = 0;
        this.isAggressive = false;
        this.currentBurst = 0;
        this.burstTimer = 0;
        this.evasionCooldown = 0;
        
        this.setupEnemyType(type);
        this.animationTimer = 0;
        this.animationFrame = 0;
        this.isDestroyed = false; // 重置销毁标志
        this.destroyReason = null; // 重置销毁原因
    }

    /**
     * 根据类型设置敌机属性
     */
    setupEnemyType(type) {
        switch (type) {
            case 'scout':
                this.hp = this.maxHp = 1;
                this.setSize(40, 40); // 原来是20x20，现在是2倍大小
                this.baseSpeed = 150;
                this.score = 10;
                this.damage = 10; // 侦察机伤害10点
                this.movePattern = 'zigzag';
                this.color = '#ff6666';
                this.canShoot = false;
                this.aggroRange = 200;
                this.aimAccuracy = 0.3;
                this.isAggressive = true;
                this.imageName = 'enemy_scout';
                break;
                
            case 'fighter':
                this.hp = this.maxHp = 2;
                this.setSize(50, 60); // 原来是25x30，现在是2倍大小
                this.baseSpeed = 100;
                this.score = 20;
                this.damage = 20; // 战斗机伤害20点
                this.movePattern = 'straight';
                this.color = '#ff4444';
                this.canShoot = true;
                this.shootInterval = 3.0;
                this.aimAccuracy = 0.6;
                this.burstCount = 1;
                this.imageName = 'enemy_fighter';
                break;
                
            case 'heavy':
                this.hp = this.maxHp = 5;
                this.setSize(80, 80); // 原来是40x40，现在是2倍大小
                this.baseSpeed = 60;
                this.score = 50;
                this.damage = 30; // 重型机伤害30点
                this.movePattern = 'sine';
                this.color = '#cc2222';
                this.canShoot = true;
                this.shootInterval = 2.5;
                this.aimAccuracy = 0.4;
                this.burstCount = 3;
                this.burstDelay = 0.15;
                this.imageName = 'enemy_heavy';
                break;
                
            case 'elite':
                this.hp = this.maxHp = 8;
                this.setSize(70, 90); // 原来是35x45，现在是2倍大小
                this.baseSpeed = 80;
                this.score = 100;
                this.damage = 40; // 精英机伤害40点
                this.movePattern = 'spiral';
                this.color = '#8844ff';
                this.canShoot = true;
                this.shootInterval = 2.0;
                this.dropChance = 0.3;
                this.aimAccuracy = 0.8;
                this.burstCount = 5;
                this.burstDelay = 0.1;
                this.isAggressive = true;
                this.imageName = 'enemy_elite';
                break;

            case 'interceptor':
                this.hp = this.maxHp = 3;
                this.setSize(56, 70); // 原来是28x35，现在是2倍大小
                this.baseSpeed = 120;
                this.score = 75;
                this.damage = 25;
                this.movePattern = 'pursuit';
                this.color = '#ff6600';
                this.canShoot = true;
                this.shootInterval = 1.5;
                this.aimAccuracy = 0.7;
                this.burstCount = 2;
                this.burstDelay = 0.2;
                this.isAggressive = true;
                this.aggroRange = 250;
                this.imageName = 'enemy_interceptor';
                break;

            case 'bomber':
                this.hp = this.maxHp = 6;
                this.setSize(100, 70); // 原来是50x35，现在是2倍大小
                this.baseSpeed = 40;
                this.score = 150;
                this.damage = 50;
                this.movePattern = 'formation';
                this.color = '#444444';
                this.canShoot = true;
                this.shootInterval = 4.0;
                this.aimAccuracy = 0.9;
                this.burstCount = 1;
                this.dropChance = 0.4;
                this.imageName = 'enemy_bomber';
                break;
                
            default: // basic
                this.hp = this.maxHp = 1;
                this.setSize(40, 50); // 原来是20x25，现在是2倍大小
                this.baseSpeed = 120;
                this.score = 10;
                this.damage = 10; // 基础敌机伤害10点
                this.movePattern = 'straight';
                this.color = '#ff4444';
                this.canShoot = false;
                this.aimAccuracy = 0.5;
                this.imageName = 'enemy_basic';
                break;
        }
    }

    /**
     * 更新敌机
     */
    onUpdate(deltaTime) {
        this.patternTime += deltaTime;
        this.animationTime += deltaTime;
        this.decisionTimer += deltaTime;
        this.evasionCooldown = Math.max(0, this.evasionCooldown - deltaTime);
        
        // 更新AI决策
        this.updateAI(deltaTime);
        
        // 更新移动模式
        this.updateMovement(deltaTime);
        
        // 更新射击
        this.updateShooting(deltaTime);
        
        // 更新动画效果
        this.updateAnimation(deltaTime);
        
        // 边界检查
        this.checkBounds();
    }

    /**
     * 更新AI决策系统
     */
    updateAI(deltaTime) {
        if (!window.game || !window.game.player) return;

        const player = window.game.player;
        const distanceToPlayer = this.getDistanceTo(player);
        
        // 更新玩家位置记忆
        this.lastPlayerPosition.x = player.position.x;
        this.lastPlayerPosition.y = player.position.y;

        // 根据距离调整警戒等级
        if (distanceToPlayer < this.aggroRange) {
            this.alertLevel = Math.min(1, this.alertLevel + deltaTime * 2);
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - deltaTime);
        }

        // 每秒重新评估行为状态
        if (this.decisionTimer >= 1.0) {
            this.decisionTimer = 0;
            this.evaluateBehavior(player, distanceToPlayer);
        }

        // 根据行为状态执行相应AI
        switch (this.behaviorState) {
            case 'patrol':
                this.executePatrolBehavior(deltaTime);
                break;
            case 'engage':
                this.executeEngageBehavior(deltaTime, player);
                break;
            case 'retreat':
                this.executeRetreatBehavior(deltaTime);
                break;
            case 'formation':
                this.executeFormationBehavior(deltaTime);
                break;
        }
    }

    /**
     * 评估行为状态
     */
    evaluateBehavior(player, distanceToPlayer) {
        const healthRatio = this.hp / this.maxHp;
        
        // 血量过低时撤退
        if (healthRatio < this.retreatThreshold) {
            this.behaviorState = 'retreat';
            return;
        }

        // 编队敌机保持编队行为
        if (this.isFormationMember && this.formationLeader) {
            this.behaviorState = 'formation';
            return;
        }

        // 在攻击范围内且具有攻击性时进入交战状态
        if (distanceToPlayer < this.aggroRange && this.isAggressive) {
            this.behaviorState = 'engage';
        } else {
            this.behaviorState = 'patrol';
        }
    }

    /**
     * 执行巡逻行为
     */
    executePatrolBehavior(deltaTime) {
        // 保持原有的移动模式
        // 此时敌机按照预设模式移动
    }

    /**
     * 执行交战行为
     */
    executeEngageBehavior(deltaTime, player) {
        // 尝试朝玩家方向移动（部分敌机类型）
        if (this.enemyType === 'interceptor' || this.enemyType === 'elite') {
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // 朝玩家方向移动，但保持一定距离
                const moveSpeed = this.baseSpeed * 0.6;
                this.velocity.x = (dx / distance) * moveSpeed * 0.3;
                
                // 如果太接近玩家，向后退
                if (distance < 80) {
                    this.velocity.x *= -1;
                }
            }
        }

        // 提高射击频率
        if (this.canShoot) {
            this.shootInterval = Math.max(1.0, this.shootInterval * 0.7);
        }
    }

    /**
     * 执行撤退行为
     */
    executeRetreatBehavior(deltaTime) {
        // 加速撤退
        this.velocity.y = this.baseSpeed * 1.5;
        
        // 左右摇摆躲避
        this.velocity.x = Math.sin(this.patternTime * 6) * 80;
    }

    /**
     * 执行编队行为
     */
    executeFormationBehavior(deltaTime) {
        if (!this.formationLeader || this.formationLeader.destroyed) {
            this.isFormationMember = false;
            this.formationLeader = null;
            this.behaviorState = 'patrol';
            return;
        }

        // 跟随编队领导者
        const targetX = this.formationLeader.position.x + this.formationOffset.x;
        const targetY = this.formationLeader.position.y + this.formationOffset.y;
        
        const dx = targetX - this.position.x;
        const dy = targetY - this.position.y;
        
        // 保持编队位置
        this.velocity.x = dx * 2;
        this.velocity.y = this.formationLeader.velocity.y + dy * 1.5;
    }

    /**
     * 计算到目标的距离
     */
    getDistanceTo(target) {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 更新移动模式
     */
    updateMovement(deltaTime) {
        const speed = this.baseSpeed + this.alertLevel * 50; // 警戒时加速
        
        switch (this.movePattern) {
            case 'straight':
                this.velocity.y = speed;
                break;
                
            case 'zigzag':
                this.velocity.y = speed;
                this.velocity.x = Math.sin(this.patternTime * this.frequency) * this.amplitude * 2;
                break;
                
            case 'sine':
                this.velocity.y = speed * 0.8;
                this.velocity.x = Math.sin(this.patternTime * this.frequency) * this.amplitude;
                break;
                
            case 'spiral':
                const radius = this.amplitude + Math.sin(this.patternTime * 0.5) * 20;
                this.velocity.x = Math.cos(this.patternTime * this.frequency) * radius;
                this.velocity.y = speed * 0.6 + Math.sin(this.patternTime * this.frequency * 0.5) * 30;
                break;

            case 'pursuit':
                // 追击模式 - 尝试接近玩家
                if (window.game && window.game.player) {
                    const player = window.game.player;
                    const dx = player.position.x - this.position.x;
                    const dy = player.position.y - this.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        this.velocity.x = (dx / distance) * speed * 0.4;
                        this.velocity.y = speed * 0.8 + (dy / distance) * speed * 0.2;
                    }
                }
                break;

            case 'formation':
                // 编队模式由executeFormationBehavior处理
                break;
                
            default:
                this.velocity.y = speed;
                break;
        }

        // 规避机制 - 检测附近的玩家子弹
        if (this.evasionCooldown <= 0 && this.alertLevel > 0.5) {
            this.attemptEvasion();
        }
    }

    /**
     * 尝试规避玩家子弹
     */
    attemptEvasion() {
        if (!window.game || !window.game.bullets) return;

        const evasionDistance = 60;
        let nearestThreat = null;
        let minDistance = evasionDistance;

        // 检查附近的玩家子弹
        for (const bullet of window.game.bullets) {
            if (bullet.type === 'player' && !bullet.destroyed) {
                const distance = this.getDistanceTo(bullet);
                if (distance < minDistance && bullet.velocity.y < 0) { // 子弹朝上飞
                    minDistance = distance;
                    nearestThreat = bullet;
                }
            }
        }

        // 如果发现威胁，进行规避
        if (nearestThreat) {
            const dx = this.position.x - nearestThreat.position.x;
            const evasionForce = dx > 0 ? 150 : -150;
            
            // 添加规避速度
            this.velocity.x += evasionForce;
            this.evasionCooldown = 1.0; // 1秒内不再规避
        }
    }

    /**
     * 更新射击
     */
    updateShooting(deltaTime) {
        if (!this.canShoot) return;
        
        this.shootCooldown -= deltaTime;
        this.burstTimer -= deltaTime;
        
        // 处理连发射击
        if (this.currentBurst > 0 && this.burstTimer <= 0) {
            this.fireBullet();
            this.currentBurst--;
            this.burstTimer = this.burstDelay;
        }
        
        // 开始新的射击周期
        if (this.shootCooldown <= 0 && this.position.y > 0 && this.position.y < 500) {
            this.currentBurst = this.burstCount;
            this.shootCooldown = this.shootInterval + Math.random() * 0.5;
            
            // 立即发射第一发
            if (this.currentBurst > 0) {
                this.fireBullet();
                this.currentBurst--;
                this.burstTimer = this.burstDelay;
            }
        }
    }

    /**
     * 发射子弹（改进的瞄准系统）
     */
    fireBullet() {
        if (!window.game || !window.game.createBullet || !window.game.player) return;
        
        const player = window.game.player;
        let targetX = player.position.x;
        let targetY = player.position.y;
        
        // 预测玩家位置（根据瞄准精度）
        if (this.aimAccuracy > 0.5) {
            const predictionTime = 0.5;
            targetX += player.velocity.x * predictionTime;
            targetY += player.velocity.y * predictionTime;
        }
        
        // 计算瞄准角度
        const dx = targetX - this.position.x;
        const dy = targetY - this.position.y;
        const baseAngle = Math.atan2(dx, dy);
        
        // 添加精度误差
        const accuracyError = (1 - this.aimAccuracy) * (Math.PI / 6); // 最大30度误差
        const finalAngle = baseAngle + (Math.random() - 0.5) * accuracyError;
        
        const bulletSpeed = 180;
        const vx = Math.sin(finalAngle) * bulletSpeed;
        const vy = Math.cos(finalAngle) * bulletSpeed;
        
        // 根据敌机类型发射不同的子弹模式
        this.shootByType(vx, vy);
    }

    /**
     * 根据敌机类型射击
     */
    shootByType(baseVx, baseVy) {
        switch (this.enemyType) {
            case 'heavy':
                // 重型敌机发射3发散射子弹
                for (let i = -1; i <= 1; i++) {
                    window.game.createBullet(
                        this.position.x + i * 15,
                        this.position.y + this.height / 2,
                        baseVx + i * 50,
                        baseVy,
                        'heavy_bullet'
                    );
                }
                break;
                
            case 'elite':
                // 精英敌机发射5发扇形子弹
                for (let i = -2; i <= 2; i++) {
                    const spreadAngle = i * 0.2;
                    const vx = baseVx + Math.sin(spreadAngle) * 60;
                    const vy = baseVy + Math.cos(spreadAngle) * 20;
                    window.game.createBullet(
                        this.position.x,
                        this.position.y + this.height / 2,
                        vx,
                        vy,
                        'elite_bullet'
                    );
                }
                break;

            case 'bomber':
                // 轰炸机发射重型炸弹
                window.game.createBullet(
                    this.position.x,
                    this.position.y + this.height / 2,
                    0,
                    120,
                    'bomb'
                );
                break;

            case 'interceptor':
                // 拦截机发射快速子弹
                for (let i = 0; i < 2; i++) {
                    window.game.createBullet(
                        this.position.x + (i - 0.5) * 20,
                        this.position.y + this.height / 2,
                        baseVx + (i - 0.5) * 30,
                        baseVy * 1.2,
                        'interceptor_bullet'
                    );
                }
                break;
                
            default:
                // 普通敌机发射单发子弹
                window.game.createBullet(
                    this.position.x,
                    this.position.y + this.height / 2,
                    baseVx,
                    baseVy,
                    'enemy'
                );
                break;
        }
    }

    /**
     * 更新动画效果
     */
    updateAnimation(deltaTime) {
        // 脉冲效果
        this.scale = 1 + Math.sin(this.animationTime * 5) * 0.05;
        
        // 旋转效果（仅某些类型）
        if (this.enemyType === 'elite') {
            this.rotation = this.animationTime * 0.5;
        }
        
        // 受击闪烁
        if (this.flash > 0) {
            this.flash -= deltaTime * 3;
            this.flash = Math.max(0, this.flash);
        }
    }

    /**
     * 边界检查
     */
    checkBounds() {
        if (this.position.y > 650) {
            // 敌机飞出边界时标记为出界销毁
            this.destroyReason = 'outOfBounds';
            this.destroyOutOfBounds();
        }
    }

    /**
     * 受到伤害
     */
    takeDamage(damage) {
        this.hp -= damage;
        this.flash = 0.2; // 闪烁效果
        
        // 播放命中音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('enemy_hit', 0.4);
        }
        
        if (this.hp <= 0) {
            this.destroyReason = 'defeated';
            this.onDestroy();
        }
    }

    /**
     * 碰撞处理
     */
    onCollision(other) {
        try {
            console.log(`敌机碰撞: ${this.enemyType} vs ${other?.constructor?.name}`);
            
            // 判断是否为玩家子弹
            const isPlayerBullet = other instanceof Bullet && 
                ['player', 'laser', 'laser_beam', 'missile', 'plasma', 'spread', 'piercing', 'energy_beam', 'bezier_missile'].includes(other.type);
            
            if (isPlayerBullet) {
                console.log(`造成 ${other.getDamage()} 点伤害`);
                this.takeDamage(other.getDamage());
                other.onCollision(this);
            }
            
        } catch (error) {
            console.error('敌机碰撞处理出错:', error);
        }
    }

    /**
     * 飞出边界时的销毁处理（静默销毁，无音效、特效、分数）
     */
    destroyOutOfBounds() {
        // 防止重复调用
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
        
        try {
            console.log(`敌机 ${this.enemyType} 飞出边界，静默移除`);
            
            // 直接标记为销毁，不触发任何效果
            this.destroyed = true;
            this.active = false;
            this.visible = false;
            
        } catch (error) {
            console.error('敌机边界销毁处理出错:', error);
        }
    }

    /**
     * 被击败时的销毁处理（完整效果：音效、特效、分数、道具）
     */
    onDestroy() {
        // 防止重复调用
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
        
        try {
            // 根据销毁原因决定是否执行完整的销毁效果
            if (this.destroyReason === 'defeated') {
                console.log(`敌机被击败: ${this.enemyType}, 分数: ${this.score}`);
                
                // 记录击杀到游戏系统（包含分数、连击、成就）
                if (window.game) {
                    window.game.recordEnemyKill(this.enemyType, this.score, this.position.x, this.position.y);
                }
                
                // 创建爆炸效果
                if (window.game?.particleSystem) {
                    window.game.particleSystem.createExplosion(
                        this.position.x,
                        this.position.y,
                        10,
                        { r: 255, g: 100, b: 0 }
                    );
                }
                
                // 道具掉落
                this.dropPowerUp();
                
                // 播放爆炸音效
                if (window.game?.audioManager) {
                    window.game.audioManager.playSound('enemy_destroyed');
                }
                
                this.destroy();
                
            } else {
                // 其他原因的销毁（比如出界）静默处理
                console.log(`敌机静默销毁: ${this.enemyType}, 原因: ${this.destroyReason}`);
                this.destroy();
            }
            
        } catch (error) {
            console.error('敌机销毁处理出错:', error);
        }
    }

    /**
     * 道具掉落
     */
    dropPowerUp() {
        if (!window.game || !window.game.powerUpManager) return;
        
        // 使用道具管理器来掉落道具
        window.game.powerUpManager.dropFromEnemy(this);
    }

    /**
     * 渲染敌机
     */
    onRender(ctx) {
        ctx.save();
        
        // 受击闪烁效果
        if (this.flash > 0) {
            ctx.globalAlpha = 0.7 + Math.sin(this.flash * 20) * 0.3;
        }
        
        // 缩放和旋转
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        
        // 根据类型渲染
        this.renderByType(ctx);
        
        // 血量条
        this.renderHealthBar(ctx);
        
        ctx.restore();
    }

    /**
     * 根据类型渲染
     */
    renderByType(ctx) {
        // 尝试使用图片渲染
        if (this.useImageRender) {
            const imageManager = window.ImageManager?.getInstance();
            if (imageManager && imageManager.loaded) {
                const success = imageManager.drawImage(
                    ctx, 
                    this.imageName, 
                    0, 0, 
                    this.width, this.height,
                    this.rotation, // 使用敌机的旋转角度
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
        
        switch (this.enemyType) {
            case 'scout':
                this.renderScout(ctx, halfWidth, halfHeight);
                break;
            case 'fighter':
                this.renderFighter(ctx, halfWidth, halfHeight);
                break;
            case 'heavy':
                this.renderHeavy(ctx, halfWidth, halfHeight);
                break;
            case 'elite':
                this.renderElite(ctx, halfWidth, halfHeight);
                break;
            case 'interceptor':
                this.renderInterceptor(ctx, halfWidth, halfHeight);
                break;
            case 'bomber':
                this.renderBomber(ctx, halfWidth, halfHeight);
                break;
            default:
                this.renderBasic(ctx, halfWidth, halfHeight);
                break;
        }
    }

    /**
     * 渲染侦察机
     */
    renderScout(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth * 0.7, halfHeight * 0.3);
        ctx.lineTo(halfWidth, halfHeight);
        ctx.lineTo(-halfWidth, halfHeight);
        ctx.lineTo(-halfWidth * 0.7, halfHeight * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // 驾驶舱
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.ellipse(0, -halfHeight * 0.3, halfWidth * 0.3, halfHeight * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 渲染战斗机
     */
    renderFighter(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth * 0.8, halfHeight * 0.2);
        ctx.lineTo(halfWidth * 0.6, halfHeight);
        ctx.lineTo(-halfWidth * 0.6, halfHeight);
        ctx.lineTo(-halfWidth * 0.8, halfHeight * 0.2);
        ctx.closePath();
        ctx.fill();
        
        // 机翼
        ctx.fillStyle = this.secondaryColor;
        ctx.fillRect(-halfWidth * 0.9, halfHeight * 0.2, halfWidth * 1.8, halfHeight * 0.3);
        
        // 炮管
        ctx.fillStyle = '#666';
        ctx.fillRect(-2, halfHeight * 0.7, 4, halfHeight * 0.3);
    }

    /**
     * 渲染重型机
     */
    renderHeavy(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // 装甲板
        ctx.fillStyle = '#990000';
        ctx.fillRect(-halfWidth * 0.8, -halfHeight * 0.8, this.width * 0.8, this.height * 0.8);
        
        // 炮塔
        for (let i = -1; i <= 1; i++) {
            ctx.fillStyle = '#666';
            ctx.fillRect(i * halfWidth * 0.4 - 2, halfHeight * 0.6, 4, halfHeight * 0.4);
        }
        
        // 装甲纹理
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const y = -halfHeight + (i + 1) * (this.height / 4);
            ctx.beginPath();
            ctx.moveTo(-halfWidth * 0.7, y);
            ctx.lineTo(halfWidth * 0.7, y);
            ctx.stroke();
        }
    }

    /**
     * 渲染精英机
     */
    renderElite(ctx, halfWidth, halfHeight) {
        // 外层光环
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth * 1.2, 0, Math.PI * 2);
        ctx.stroke();
        
        // 主体
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfWidth);
        gradient.addColorStop(0, '#aa66ff');
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.sin(angle) * halfWidth * 0.8;
            const y = Math.cos(angle) * halfHeight * 0.8;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 核心
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 渲染拦截机
     */
    renderInterceptor(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth * 0.9, -halfHeight * 0.2);
        ctx.lineTo(halfWidth, halfHeight * 0.4);
        ctx.lineTo(halfWidth * 0.4, halfHeight);
        ctx.lineTo(-halfWidth * 0.4, halfHeight);
        ctx.lineTo(-halfWidth, halfHeight * 0.4);
        ctx.lineTo(-halfWidth * 0.9, -halfHeight * 0.2);
        ctx.closePath();
        ctx.fill();
        
        // 推进器
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-halfWidth * 0.3, halfHeight * 0.7, halfWidth * 0.6, halfHeight * 0.3);
        
        // 武器舱
        ctx.fillStyle = '#666';
        ctx.fillRect(-halfWidth * 0.2, -halfHeight * 0.8, halfWidth * 0.4, halfHeight * 0.6);
        
        // 驾驶舱
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.ellipse(0, -halfHeight * 0.2, halfWidth * 0.3, halfHeight * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 渲染轰炸机
     */
    renderBomber(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // 机翼
        ctx.fillStyle = '#333';
        ctx.fillRect(-halfWidth * 1.2, -halfHeight * 0.3, this.width * 1.4, halfHeight * 0.8);
        
        // 炸弹舱
        ctx.fillStyle = '#222';
        ctx.fillRect(-halfWidth * 0.8, halfHeight * 0.2, this.width * 0.8, halfHeight * 0.6);
        
        // 炸弹
        ctx.fillStyle = '#ff0000';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.arc(i * halfWidth * 0.3, halfHeight * 0.5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 驾驶舱
        ctx.fillStyle = '#44aaff';
        ctx.fillRect(-halfWidth * 0.4, -halfHeight * 0.9, halfWidth * 0.8, halfHeight * 0.4);
        
        // 防御炮塔
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(-halfWidth * 0.7, -halfHeight * 0.2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(halfWidth * 0.7, -halfHeight * 0.2, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 渲染基础敌机
     */
    renderBasic(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth, halfHeight * 0.5);
        ctx.lineTo(halfWidth * 0.5, halfHeight);
        ctx.lineTo(-halfWidth * 0.5, halfHeight);
        ctx.lineTo(-halfWidth, halfHeight * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // 驾驶舱
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 渲染血量条
     */
    renderHealthBar(ctx) {
        if (this.hp >= this.maxHp || this.maxHp <= 1) return;
        
        const barWidth = this.width;
        const barHeight = 3;
        const barY = -this.height / 2 - 8;
        
        // 背景
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // 血量
        const healthPercent = this.hp / this.maxHp;
        const healthColor = healthPercent > 0.6 ? '#4f4' : 
                           healthPercent > 0.3 ? '#ff4' : '#f44';
        ctx.fillStyle = healthColor;
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
    }
}

/**
 * 敌机生成器
 */
class EnemySpawner {
    constructor() {
        this.spawnTimer = 0;
        this.spawnInterval = 2; // 基础生成间隔
        this.waveTimer = 0;
        this.currentWave = 1;
        this.enemiesInWave = 0;
        this.maxEnemiesInWave = 5;
        
        // 不同类型的生成概率
        this.spawnProbabilities = {
            scout: 0.2,
            basic: 0.2,
            fighter: 0.2,
            interceptor: 0.15,
            heavy: 0.12,
            bomber: 0.1,  // 增加轰炸机出现概率
            elite: 0.03
        };
    }

    /**
     * 更新敌机生成
     */
    update(deltaTime) {
        this.spawnTimer += deltaTime;
        this.waveTimer += deltaTime;
        
        // 限制同时存在的敌机数量，避免性能问题
        const maxEnemies = 10;
        const currentEnemyCount = window.game?.enemies?.length || 0;
        
        // 根据游戏时间调整难度
        const difficultyMultiplier = Math.min(2, 1 + this.waveTimer / 60); // 降低难度增长速度
        const currentSpawnInterval = Math.max(1.0, this.spawnInterval / difficultyMultiplier); // 增加最小间隔
        
        if (this.spawnTimer >= currentSpawnInterval && currentEnemyCount < maxEnemies) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
        
        // 波次系统
        if (this.waveTimer >= 30) { // 每30秒一波，延长时间
            this.currentWave++;
            this.enemiesInWave = 0;
            this.maxEnemiesInWave = Math.min(8, 4 + this.currentWave); // 降低最大敌机数
            this.waveTimer = 0;
            this.adjustDifficulty();
        }
    }

    /**
     * 生成敌机
     */
    spawnEnemy() {
        if (!window.game) return;
        
        // 有概率生成编队
        if (Math.random() < 0.3 && this.currentWave >= 2) {
            this.spawnFormation();
        } else {
            const enemyType = this.selectEnemyType();
            const x = Math.random() * (800 - 40) + 20; // 避免在边界生成
            const y = -30;
            
            window.game.createEnemy(x, y, enemyType);
        }
        
        this.enemiesInWave++;
    }

    /**
     * 生成编队
     */
    spawnFormation() {
        const formationTypes = ['V', 'line', 'triangle'];
        const formationType = formationTypes[Math.floor(Math.random() * formationTypes.length)];
        const enemyType = this.selectEnemyType();
        
        switch (formationType) {
            case 'V':
                this.spawnVFormation(enemyType);
                break;
            case 'line':
                this.spawnLineFormation(enemyType);
                break;
            case 'triangle':
                this.spawnTriangleFormation(enemyType);
                break;
        }
    }

    /**
     * 生成V字编队
     */
    spawnVFormation(enemyType) {
        const centerX = 200 + Math.random() * 400;
        const centerY = -50;
        const spacing = 40;
        
        // 创建编队领导者
        const leader = window.game.createEnemy(centerX, centerY, enemyType);
        
        // 创建编队成员
        for (let i = 1; i <= 3; i++) {
            // 左翼
            const leftEnemy = window.game.createEnemy(
                centerX - i * spacing, 
                centerY + i * 30, 
                enemyType
            );
            leftEnemy.isFormationMember = true;
            leftEnemy.formationLeader = leader;
            leftEnemy.formationOffset = { x: -i * spacing, y: i * 30 };
            
            // 右翼
            const rightEnemy = window.game.createEnemy(
                centerX + i * spacing, 
                centerY + i * 30, 
                enemyType
            );
            rightEnemy.isFormationMember = true;
            rightEnemy.formationLeader = leader;
            rightEnemy.formationOffset = { x: i * spacing, y: i * 30 };
        }
    }

    /**
     * 生成直线编队
     */
    spawnLineFormation(enemyType) {
        const startX = 100 + Math.random() * 200;
        const y = -30;
        const spacing = 60;
        
        let leader = null;
        
        for (let i = 0; i < 5; i++) {
            const enemy = window.game.createEnemy(startX + i * spacing, y, enemyType);
            
            if (i === 0) {
                leader = enemy;
            } else {
                enemy.isFormationMember = true;
                enemy.formationLeader = leader;
                enemy.formationOffset = { x: i * spacing, y: 0 };
            }
        }
    }

    /**
     * 生成三角编队
     */
    spawnTriangleFormation(enemyType) {
        const centerX = 200 + Math.random() * 400;
        const centerY = -50;
        const spacing = 35;
        
        // 创建编队领导者（顶点）
        const leader = window.game.createEnemy(centerX, centerY, enemyType);
        
        // 第二排
        for (let i = -1; i <= 1; i += 2) {
            const enemy = window.game.createEnemy(
                centerX + i * spacing, 
                centerY + spacing, 
                enemyType
            );
            enemy.isFormationMember = true;
            enemy.formationLeader = leader;
            enemy.formationOffset = { x: i * spacing, y: spacing };
        }
        
        // 第三排
        for (let i = -1; i <= 1; i++) {
            const enemy = window.game.createEnemy(
                centerX + i * spacing * 1.5, 
                centerY + spacing * 2, 
                enemyType
            );
            enemy.isFormationMember = true;
            enemy.formationLeader = leader;
            enemy.formationOffset = { x: i * spacing * 1.5, y: spacing * 2 };
        }
    }

    /**
     * 选择敌机类型
     */
    selectEnemyType() {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [type, probability] of Object.entries(this.spawnProbabilities)) {
            cumulative += probability;
            if (random <= cumulative) {
                return type;
            }
        }
        
        return 'basic';
    }

    /**
     * 调整难度
     */
    adjustDifficulty() {
        // 增加精英敌机和重型敌机的生成概率
        this.spawnProbabilities.elite = Math.min(0.1, this.spawnProbabilities.elite * 1.2);
        this.spawnProbabilities.heavy = Math.min(0.15, this.spawnProbabilities.heavy * 1.1);
        this.spawnProbabilities.scout = Math.max(0.2, this.spawnProbabilities.scout * 0.9);
    }

    /**
     * 重置生成器
     */
    reset() {
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.currentWave = 1;
        this.enemiesInWave = 0;
        
        // 重置生成概率
        this.spawnProbabilities = {
            scout: 0.4,
            basic: 0.3,
            fighter: 0.2,
            heavy: 0.08,
            elite: 0.02
        };
    }
} 