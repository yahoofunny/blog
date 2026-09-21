/**
 * 道具包类 - 继承自GameObject
 */
class PowerUp extends GameObject {
    constructor(x, y) {
        super(x, y);
        
        // 道具属性
        this.setSize(25, 25);
        this.collisionType = 'rectangle';
        this.maxSpeed = 80;
        this.type = 'weapon'; // 道具类型
        
        // 移动属性
        this.movePattern = 'curve'; // 曲线移动
        this.patternTime = 0;
        this.amplitude = 30; // 摆动幅度
        this.frequency = 2; // 摆动频率
        this.originalX = x; // 原始X位置
        
        // 视觉属性
        this.color = '#00ff00';
        this.glowColor = '#88ff88';
        this.animationTime = 0;
        this.pulseSpeed = 3;
        this.rotation = 0;
        this.scale = 1;
        
        // 效果属性
        this.collected = false;
        this.magnetRange = 80; // 磁吸范围
        this.magnetStrength = 200; // 磁吸强度
    }

    /**
     * 重置道具
     */
    reset(x, y, type = 'weapon') {
        this.position.set(x, y);
        this.velocity.set(0, this.maxSpeed);
        this.type = type;
        this.active = true;
        this.visible = true;
        this.destroyed = false;
        this.collected = false;
        this.age = 0;
        this.animationTime = 0;
        this.patternTime = 0;
        this.rotation = 0;
        this.scale = 1;
        this.originalX = x;
        
        // 根据类型设置属性
        this.setupPowerUpType(type);
    }

    /**
     * 根据类型设置道具属性
     */
    setupPowerUpType(type) {
        switch (type) {
            case 'weapon_spread':
                this.color = '#00ff00';
                this.glowColor = '#88ff88';
                this.setSize(25, 25);
                break;
                
            case 'weapon_laser':
                this.color = '#00ffff';
                this.glowColor = '#88ffff';
                this.setSize(25, 25);
                break;
                
            case 'weapon_missile':
                this.color = '#ff6600';
                this.glowColor = '#ffaa44';
                this.setSize(25, 25);
                break;
                
            case 'weapon_plasma':
                this.color = '#ff00ff';
                this.glowColor = '#ff88ff';
                this.setSize(25, 25);
                break;
                
            case 'weapon_piercing':
                this.color = '#ffffff';
                this.glowColor = '#cccccc';
                this.setSize(25, 25);
                break;
                
            case 'weapon_energy':
                this.color = '#0088ff';
                this.glowColor = '#44aaff';
                this.setSize(25, 25);
                break;
                
            case 'shield':
                this.color = '#0088ff';
                this.glowColor = '#44aaff';
                this.setSize(30, 30);
                this.pulseSpeed = 4;
                break;
                
            case 'health':
                this.color = '#ff0000';
                this.glowColor = '#ff8888';
                this.setSize(25, 25);
                this.pulseSpeed = 5;
                break;
                
            case 'bomb':
                this.color = '#ffff00';
                this.glowColor = '#ffff88';
                this.setSize(30, 30);
                this.pulseSpeed = 6;
                break;
                
            case 'score':
                this.color = '#ffd700';
                this.glowColor = '#ffff88';
                this.setSize(25, 25);
                this.pulseSpeed = 4;
                break;
                
            case 'wingman':
                this.color = '#ff8800';
                this.glowColor = '#ffaa44';
                this.setSize(35, 35);
                this.pulseSpeed = 3;
                break;
                
            default:
                this.color = '#00ff00';
                this.glowColor = '#88ff88';
                this.setSize(25, 25);
                break;
        }
    }

    /**
     * 更新道具
     */
    onUpdate(deltaTime) {
        this.patternTime += deltaTime;
        this.animationTime += deltaTime;
        
        // 更新移动模式
        this.updateMovement(deltaTime);
        
        // 更新视觉效果
        this.updateVisualEffects(deltaTime);
        
        // 磁吸效果
        this.updateMagnetism(deltaTime);
        
        // 边界检查
        this.checkBounds();
    }

    /**
     * 更新移动模式
     */
    updateMovement(deltaTime) {
        // 缓慢的曲线移动
        const sineOffset = Math.sin(this.patternTime * this.frequency) * this.amplitude;
        this.velocity.x = sineOffset * 0.5; // 较慢的水平移动
        this.velocity.y = this.maxSpeed * 0.6; // 较慢的垂直移动
        
        // 稍微的左右摆动
        this.position.x = this.originalX + sineOffset;
    }

    /**
     * 更新视觉效果
     */
    updateVisualEffects(deltaTime) {
        // 脉冲效果
        this.scale = 1 + Math.sin(this.animationTime * this.pulseSpeed) * 0.2;
        
        // 旋转效果
        this.rotation += deltaTime * 2;
        
        // 特殊视觉效果
        if (this.type === 'bomb') {
            // 炸弹包闪烁
            this.alpha = 0.8 + Math.sin(this.animationTime * 8) * 0.2;
        } else if (this.type === 'shield') {
            // 护盾包环形效果
            this.rotation += deltaTime * 3;
        }
    }

    /**
     * 磁吸效果
     */
    updateMagnetism(deltaTime) {
        if (!window.game || !window.game.player) return;
        
        const player = window.game.player;
        const dx = player.position.x - this.position.x;
        const dy = player.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 在磁吸范围内时被吸引
        if (distance < this.magnetRange && distance > 0) {
            const magnetForce = this.magnetStrength * deltaTime * (1 - distance / this.magnetRange);
            this.velocity.x += (dx / distance) * magnetForce;
            this.velocity.y += (dy / distance) * magnetForce;
        }
    }

    /**
     * 边界检查
     */
    checkBounds() {
        if (this.position.y > 650 || this.position.x < -50 || this.position.x > 850) {
            this.destroy();
        }
    }

    /**
     * 渲染道具
     */
    onRender(ctx) {
        ctx.save();
        
        // 应用变换
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha || 1;
        
        // 渲染发光效果
        this.renderGlow(ctx);
        
        // 渲染主体
        this.renderBody(ctx);
        
        // 渲染图标
        this.renderIcon(ctx);
        
        ctx.restore();
    }

    /**
     * 渲染发光效果
     */
    renderGlow(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.4;
        
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
        glowGradient.addColorStop(0, this.glowColor);
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * 渲染主体
     */
    renderBody(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // 主体渐变
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfWidth);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, this.glowColor);
        
        ctx.fillStyle = gradient;
        
        if (this.type === 'shield') {
            // 护盾包 - 八边形
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.cos(angle) * halfWidth;
                const y = Math.sin(angle) * halfHeight;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'wingman') {
            // 僚机包 - 星形
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const radius = (i % 2 === 0) ? halfWidth : halfWidth * 0.5;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
        } else {
            // 其他道具 - 圆形
            ctx.beginPath();
            ctx.arc(0, 0, halfWidth, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * 渲染图标
     */
    renderIcon(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '';
        switch (this.type) {
            case 'weapon_spread':
                icon = 'S';
                break;
            case 'weapon_laser':
                icon = 'L';
                break;
            case 'weapon_missile':
                icon = 'M';
                break;
            case 'weapon_plasma':
                icon = 'P';
                break;
            case 'weapon_piercing':
                icon = 'T';
                break;
            case 'weapon_energy':
                icon = 'E';
                break;
            case 'shield':
                icon = '⚡';
                break;
            case 'health':
                icon = '+';
                break;
            case 'bomb':
                icon = '💣';
                break;
            case 'score':
                icon = '★';
                break;
            case 'wingman':
                icon = '✈';
                break;
            default:
                icon = '?';
                break;
        }
        
        ctx.fillText(icon, 0, 0);
    }

    /**
     * 收集道具
     */
    collect() {
        if (this.collected) return;
        
        this.collected = true;
        this.applyEffect();
        this.destroy();
    }

    /**
     * 应用道具效果
     */
    applyEffect() {
        if (!window.game || !window.game.player) return;
        
        const player = window.game.player;
        
        // 记录道具收集统计
        if (window.game?.achievementManager) {
            window.game.achievementManager.recordPowerUpCollected();
        }
        
        switch (this.type) {
            case 'weapon_spread':
                player.setWeaponType('spread');
                this.showPickupMessage('获得散射武器！');
                break;
                
            case 'weapon_laser':
                player.setWeaponType('laser');
                this.showPickupMessage('获得激光武器！');
                break;
                
            case 'weapon_missile':
                // 导弹变成副武器
                player.addSecondaryWeapon('missile');
                this.showPickupMessage('获得导弹副武器！');
                break;
                
            case 'weapon_plasma':
                player.setWeaponType('plasma');
                this.showPickupMessage('获得等离子武器！');
                break;
                
            case 'weapon_piercing':
                player.setWeaponType('piercing');
                this.showPickupMessage('获得穿甲武器！');
                break;
                
            case 'weapon_energy':
                player.setWeaponType('energy_beam');
                this.showPickupMessage('获得能量束武器！');
                break;
                
            case 'shield':
                player.activateShield(10); // 10秒护盾
                this.showPickupMessage('护盾激活！');
                break;
                
            case 'health':
                player.heal(20);
                this.showPickupMessage('+20 血量');
                break;
                
            case 'bomb':
                this.activateBomb();
                this.showPickupMessage('清屏炸弹！');
                break;
                
            case 'score':
                this.activateScoreBonus();
                this.showPickupMessage('分数加成！');
                break;
                
            case 'wingman':
                this.spawnWingman();
                this.showPickupMessage('僚机支援！');
                break;
        }
        
        // 播放对应类型的音效
        if (window.game.audioManager) {
            this.playCollectSound();
        }
    }

    /**
     * 激活炸弹效果
     */
    activateBomb() {
        if (!window.game) return;
        
        // 摧毁所有敌机
        window.game.enemies.forEach(enemy => {
            if (!enemy.destroyed) {
                enemy.takeDamage(999); // takeDamage会自动调用onDestroy给分数
                // 移除直接给分数的代码，让敌机通过正常流程给分数
            }
        });
        
        // 摧毁所有敌机子弹
        window.game.bullets.forEach(bullet => {
            if (bullet.type === 'enemy' || bullet.type.includes('enemy')) {
                bullet.destroy();
            }
        });
        
        // 创建爆炸效果
        if (window.game.particleSystem) {
            for (let i = 0; i < 10; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 600;
                window.game.particleSystem.createExplosion(x, y, 20, { r: 255, g: 255, b: 0 });
            }
        }
    }

    /**
     * 激活分数加成
     */
    activateScoreBonus() {
        if (!window.game || !window.game.player) return;
        
        // 设置分数倍数和持续时间
        window.game.player.scoreMultiplier = 2;
        window.game.player.scoreMultiplierTime = 15; // 15秒
    }

    /**
     * 生成僚机
     */
    spawnWingman() {
        if (!window.game || !window.game.player) return;
        
        // 增加僚机数量
        window.game.player.wingmenCount = Math.min(window.game.player.wingmenCount + 1, 2);
        
        // 重新初始化僚机
        window.game.player.initWingmen();
    }

    /**
     * 播放收集音效
     */
    playCollectSound() {
        if (!window.game || !window.game.audioManager) return;
        
        let soundName = 'powerup'; // 默认音效
        
        // 根据道具类型选择不同音效
        switch (this.type) {
            case 'health':
                soundName = 'health_restore';
                break;
            case 'shield':
                soundName = 'shield_boost';
                break;
            case 'bomb':
                soundName = 'bomb_pickup';
                break;
            case 'score':
                soundName = 'score_bonus';
                break;
            case 'wingman':
                soundName = 'wingman_spawn';
                break;
            default:
                // 武器道具使用武器升级音效
                if (this.type && this.type.startsWith('weapon_')) {
                    soundName = 'weapon_upgrade';
                } else {
                    soundName = 'powerup';
                }
                break;
        }
        
        window.game.audioManager.playSound(soundName, 0.6);
    }

    /**
     * 显示拾取消息
     */
    showPickupMessage(message) {
        if (window.game && window.game.showMessage) {
            window.game.showMessage(message, 2000);
        }
    }

    /**
     * 碰撞处理
     */
    onCollision(other) {
        if (other === window.game?.player && !this.collected) {
            this.collect();
        }
    }
}

/**
 * 道具管理器
 */
class PowerUpManager {
    constructor() {
        this.powerUps = [];
        this.spawnTimer = 0;
        this.spawnInterval = 15; // 15秒生成一个道具
        
        // 道具类型权重
        this.powerUpWeights = {
            'weapon_spread': 0.15,
            'weapon_laser': 0.15,
            'weapon_missile': 0.1,
            'weapon_plasma': 0.1,
            'weapon_piercing': 0.1,
            'weapon_energy': 0.1,
            'shield': 0.1,
            'health': 0.15,
            'bomb': 0.05,
            'score': 0.08,
            'wingman': 0.02
        };
    }

    /**
     * 更新道具管理器
     */
    update(deltaTime) {
        // 更新现有道具
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);
            
            if (powerUp.destroyed) {
                this.powerUps.splice(i, 1);
            }
        }
        
        // 定时生成道具
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnRandomPowerUp();
            this.spawnTimer = 0;
        }
    }

    /**
     * 生成随机道具
     */
    spawnRandomPowerUp() {
        const x = 100 + Math.random() * 600; // 在屏幕中间区域生成
        const y = -30;
        const type = this.selectRandomType();
        
        this.spawnPowerUp(x, y, type);
    }

    /**
     * 生成指定道具
     */
    spawnPowerUp(x, y, type) {
        const powerUp = new PowerUp(x, y);
        powerUp.reset(x, y, type);
        this.powerUps.push(powerUp);
        return powerUp;
    }

    /**
     * 敌机掉落道具
     */
    dropFromEnemy(enemy) {
        // 根据敌机类型调整掉落概率
        let dropChance = enemy.dropChance || 0.1;
        
        if (Math.random() < dropChance) {
            const type = this.selectRandomType();
            this.spawnPowerUp(enemy.position.x, enemy.position.y, type);
        }
    }

    /**
     * 选择随机道具类型
     */
    selectRandomType() {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [type, weight] of Object.entries(this.powerUpWeights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return type;
            }
        }
        
        return 'health'; // 默认返回加血包
    }

    /**
     * 渲染所有道具
     */
    render(ctx) {
        this.powerUps.forEach(powerUp => {
            if (powerUp.visible) {
                powerUp.render(ctx);
            }
        });
    }

    /**
     * 清理所有道具
     */
    clear() {
        this.powerUps.forEach(powerUp => powerUp.destroy());
        this.powerUps.length = 0;
    }

    /**
     * 获取道具数量
     */
    getCount() {
        return this.powerUps.length;
    }

    /**
     * 重置道具管理器
     */
    reset() {
        this.clear();
        this.spawnTimer = 0;
    }
}

// 导出到全局作用域
window.PowerUp = PowerUp;
window.PowerUpManager = PowerUpManager; 