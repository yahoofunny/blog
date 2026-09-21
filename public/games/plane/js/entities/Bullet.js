/**
 * 子弹类 - 继承自GameObject
 */
class Bullet extends GameObject {
    constructor(x, y) {
        super(x, y);
        
        // 子弹基础属性
        this.setSize(4, 12);
        this.collisionType = 'rectangle';
        this.maxSpeed = 1000; // 提高最大速度以确保子弹能快速移动
        this.friction = 1.0; // 子弹在真空中飞行，没有摩擦力
        this.damage = 1;
        this.type = 'player'; // 'player' 或 'enemy'
        
        // 视觉属性
        this.color = '#ffff00';
        this.glowColor = '#ffff88';
        this.trailLength = 3;
        this.trail = [];
        
        // 动画属性
        this.animationTime = 0;
        this.pulseSpeed = 10;

        // 特殊效果属性
        this.penetration = 0; // 穿透次数
        this.explosionRadius = 0; // 爆炸半径
        this.homingTarget = null; // 追踪目标
        this.homingStrength = 0; // 追踪强度
        this.rotationSpeed = 0; // 旋转速度
        this.scaleEffect = 1; // 缩放效果
        this.alpha = 1; // 透明度
    }

    /**
     * 初始化/重置子弹
     */
    reset(x, y, vx = 0, vy = -500, type = 'player') {
        this.position.set(x, y);
        this.velocity.set(vx, vy);
        this.type = type;
        this.active = true;
        this.visible = true;
        this.destroyed = false;
        this.age = 0;
        this.animationTime = 0;
        this.trail = [];
        this.penetration = 0;
        this.explosionRadius = 0;
        this.homingTarget = null;
        this.homingStrength = 0;
        this.rotationSpeed = 0;
        this.scaleEffect = 1;
        this.alpha = 1;
        
        // 根据类型设置属性
        this.setupBulletType(type);
        
        // 调试输出
        if (type !== 'player' && type !== 'enemy') {
            console.log(`创建${type}子弹，位置:(${x}, ${y})，速度:(${vx}, ${vy})`);
        }
    }

    /**
     * 根据类型设置子弹属性
     */
    setupBulletType(type) {
        switch (type) {
            case 'player':
                this.color = '#ffff00';
                this.glowColor = '#ffff88';
                this.damage = 1;
                this.setSize(4, 12);
                break;

            case 'laser':
                this.color = '#00ffff';
                this.glowColor = '#88ffff';
                this.damage = 3;
                this.setSize(6, 20);
                this.penetration = 2;
                break;

            case 'laser_beam':
                this.color = '#00ffff'; // 玩家激光使用青色
                this.glowColor = '#88ffff';
                this.damage = 5;
                this.setSize(20, 60); // 粗光束
                this.penetration = 10; // 高穿透
                this.isLaserBeam = true;
                this.beamIntensity = 1;
                this.beamPulse = 0;
                break;

            case 'plasma':
                this.color = '#ff00ff';
                this.glowColor = '#ff88ff';
                this.damage = 4;
                this.setSize(8, 8);
                this.pulseSpeed = 15;
                this.rotationSpeed = 5;
                break;

            case 'missile':
                this.color = '#ff6600';
                this.glowColor = '#ffaa44';
                this.damage = 6;
                this.setSize(6, 16);
                this.homingStrength = 2;
                this.explosionRadius = 40;
                break;

            case 'bezier_missile':
                this.color = '#ff3300';
                this.glowColor = '#ff7744';
                this.damage = 8;
                this.setSize(8, 18);
                this.explosionRadius = 50;
                this.isBezierMissile = true;
                this.bezierProgress = 0;
                this.bezierSpeed = 1.2; // 加快贝塞尔曲线进度速度
                this.target = null;
                this.controlPoint1 = { x: 0, y: 0 };
                this.controlPoint2 = { x: 0, y: 0 };
                this.startPoint = { x: 0, y: 0 };
                this.endPoint = { x: 0, y: 0 };
                this.initialSpeed = 300; // 初始直线速度
                this.hasInitialMovement = true; // 是否有初始直线移动
                this.initialTime = 0.3; // 初始直线移动时间（秒）
                this.currentTime = 0;
                break;

            case 'spread':
                this.color = '#00ff00';
                this.glowColor = '#88ff88';
                this.damage = 2;
                this.setSize(5, 10);
                break;

            case 'piercing':
                this.color = '#ffffff';
                this.glowColor = '#cccccc';
                this.damage = 5;
                this.setSize(3, 18);
                this.penetration = 5;
                break;

            case 'enemy':
                this.color = '#ff4444';
                this.glowColor = '#ff8888';
                this.damage = 10; // 基础敌机伤害10点
                this.setSize(5, 10);
                break;

            case 'heavy_bullet':
                this.color = '#cc2222';
                this.glowColor = '#ff6666';
                this.damage = 15; // 重型机子弹伤害15点
                this.setSize(8, 12);
                break;

            case 'elite_bullet':
                this.color = '#8844ff';
                this.glowColor = '#aa88ff';
                this.damage = 12; // 精英机子弹伤害12点
                this.setSize(6, 14);
                this.rotationSpeed = 3;
                break;

            case 'interceptor_bullet':
                this.color = '#ff6600';
                this.glowColor = '#ffaa44';
                this.damage = 8; // 拦截机子弹伤害8点（速度快但伤害较低）
                this.setSize(4, 16);
                this.homingStrength = 1;
                break;

            case 'bomb':
                this.color = '#444444';
                this.glowColor = '#666666';
                this.damage = 25; // 轰炸机炸弹伤害25点
                this.setSize(12, 12);
                this.explosionRadius = 80;
                this.rotationSpeed = 2;
                break;

            case 'energy_beam':
                this.color = '#00aaff';
                this.glowColor = '#44ccff';
                this.damage = 8;
                this.setSize(10, 30);
                this.penetration = 3;
                this.scaleEffect = 1.5;
                break;

            // Boss子弹类型
            case 'enemyBoss':
                this.color = '#ff0066';
                this.glowColor = '#ff4499';
                this.damage = 25; // Boss基础伤害25点
                this.setSize(8, 16);
                this.rotationSpeed = 3;
                break;
                
            case 'boss_laser':
                this.color = '#ff0000'; // Boss激光使用红色
                this.glowColor = '#ff4444';
                this.damage = 50;
                this.setSize(60, 600); // 更粗的光束
                this.penetration = Infinity; // 无限穿透
                this.isBossLaser = true;
                this.beamIntensity = 1;
                this.beamPulse = 0;
                this.maxAge = 3.0; // Boss激光持续3秒
                break;

            case 'shockwave':
                this.color = '#ffff00'; // 黄色冲击波
                this.glowColor = '#ffff88';
                this.damage = 20; // Boss冲击波伤害20点
                this.setSize(30, 30); // 较大的冲击波
                this.rotationSpeed = 4;
                this.pulseSpeed = 10;
                break;

            default:
                this.setupBulletType('player');
                break;
        }
    }

    /**
     * 初始化贝塞尔曲线轨迹 - 简化版
     */
    initBezierTrajectory() {
        // 现在使用直接追踪，这个方法保留用于兼容性
        this.findBezierTarget();
        if (this.target) {
            this.initDirectTracking();
        }
    }

    /**
     * 寻找贝塞尔导弹目标
     */
    findBezierTarget() {
        if (!window.game || !window.game.enemies) return;
        
        // 首先寻找距离最近的敌机
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        for (const enemy of window.game.enemies) {
            if (!enemy.destroyed && enemy.active) { // 确保敌机是活跃的
                const distance = this.getDistanceTo(enemy);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
        }
        
        this.target = closestEnemy;
    }

    /**
     * 初始化直接追踪
     */
    initDirectTracking() {
        if (!this.target) return;
        
        // 计算到目标的方向
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // 设置朝向目标的速度
            const speed = 500; // 快速追踪
            this.velocity.x = (dx / distance) * speed;
            this.velocity.y = (dy / distance) * speed;
        }
    }

    /**
     * 更新直接追踪
     */
    updateDirectTracking(deltaTime) {
        if (!this.target || this.target.destroyed) return;
        
        // 实时计算到目标的方向
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果非常接近目标，直接命中
        if (distance < 25) {
            this.position.x = this.target.position.x;
            this.position.y = this.target.position.y;
            
            // 触发碰撞
            if (window.game && window.game.checkCollision(this, this.target)) {
                this.onCollision(this.target);
                this.target.onCollision(this);
            }
            
            this.destroy();
            return;
        }
        
        // 更新速度方向，保持追踪
        if (distance > 0) {
            const speed = 500; // 保持高速
            const newVx = (dx / distance) * speed;
            const newVy = (dy / distance) * speed;
            
            // 平滑转向，避免急转弯
            this.velocity.x = this.velocity.x * 0.7 + newVx * 0.3;
            this.velocity.y = this.velocity.y * 0.7 + newVy * 0.3;
        }
        
        // 计算旋转角度
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.rotation = Math.atan2(this.velocity.x, -this.velocity.y);
        }
        
        // 安全检查：如果追踪时间过长，自毁
        if (this.currentTime > 5) { // 缩短到5秒
            this.destroy();
        }
    }

    /**
     * 更新子弹
     */
    onUpdate(deltaTime) {
        this.animationTime += deltaTime;
        
        // Boss激光特效更新
        if (this.isBossLaser) {
            this.beamPulse += deltaTime * 10;
            this.beamIntensity = 0.8 + Math.sin(this.beamPulse) * 0.2;
            
            // 在生命周期的最后0.5秒添加渐隐效果
            if (this.maxAge && this.age > this.maxAge - 0.5) {
                const fadeTime = this.maxAge - this.age; // 剩余时间
                this.alpha = Math.max(0, fadeTime / 0.5); // 0.5秒内从1渐变到0
            }
        }
        
        // 激光光束特效更新
        if (this.isLaserBeam) {
            this.beamPulse += deltaTime * 10;
            this.beamIntensity = 0.8 + Math.sin(this.beamPulse) * 0.2;
        }
        
        // 贝塞尔导弹特殊处理 - 现在使用直接追踪
        if (this.isBezierMissile) {
            this.currentTime += deltaTime;
            
            // 短暂直线飞行后开始追踪
            if (this.hasInitialMovement && this.currentTime < 0.1) {
                this.position.y -= this.initialSpeed * deltaTime;
            } else {
                // 开始追踪
                if (this.hasInitialMovement) {
                    this.hasInitialMovement = false;
                    this.findBezierTarget();
                    
                    if (!this.target) {
                        // 没有目标，直接飞出屏幕
                        this.velocity.x = 0;
                        this.velocity.y = -600;
                        this.isBezierMissile = false;
                    } else {
                        // 有目标，开始直接追踪
                        this.initDirectTracking();
                    }
                }
                
                // 执行追踪更新
                if (this.target && !this.target.destroyed) {
                    this.updateDirectTracking(deltaTime);
                } else {
                    // 目标丢失，直接飞出屏幕
                    this.velocity.x = 0;
                    this.velocity.y = -600;
                    this.isBezierMissile = false;
                }
            }
        } else {
            // 普通追踪逻辑
            this.updateHoming(deltaTime);
        }
        
        // 更新拖尾效果
        this.updateTrail();
        
        // 更新视觉效果
        this.updateVisualEffects(deltaTime);
        
        // 检查激光束生命周期
        if (this.maxAge && this.age >= this.maxAge) {
            console.log('激光束生命周期结束，销毁');
            this.destroy();
            return;
        }
        
        // 边界检查
        this.checkBounds();
    }

    /**
     * 更新追踪逻辑
     */
    updateHoming(deltaTime) {
        if (this.homingStrength <= 0) return;

        // 寻找最近的目标
        this.findHomingTarget();

        if (this.homingTarget) {
            const dx = this.homingTarget.position.x - this.position.x;
            const dy = this.homingTarget.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const homingForce = this.homingStrength * 200 * deltaTime;
                this.velocity.x += (dx / distance) * homingForce;
                this.velocity.y += (dy / distance) * homingForce;
                
                // 限制最大速度
                const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
                const maxSpeed = 400;
                if (speed > maxSpeed) {
                    this.velocity.x = (this.velocity.x / speed) * maxSpeed;
                    this.velocity.y = (this.velocity.y / speed) * maxSpeed;
                }
            }
        }
    }

    /**
     * 寻找追踪目标
     */
    findHomingTarget() {
        if (!window.game) return;

        let targets = [];
        const maxDistance = 200;

        // 判断是否为玩家子弹
        const isPlayerBullet = ['player', 'laser', 'laser_beam', 'missile', 'plasma', 'spread', 'piercing', 'energy_beam', 'bezier_missile'].includes(this.type);

        if (isPlayerBullet) {
            // 玩家子弹追踪敌机
            targets = window.game.enemies.filter(enemy => 
                !enemy.destroyed && 
                this.getDistanceTo(enemy) < maxDistance
            );
        } else {
            // 敌机子弹追踪玩家
            if (window.game.player && !window.game.player.destroyed) {
                const distance = this.getDistanceTo(window.game.player);
                if (distance < maxDistance) {
                    targets = [window.game.player];
                }
            }
        }

        if (targets.length > 0) {
            // 选择最近的目标
            this.homingTarget = targets.reduce((closest, target) => {
                const closestDist = this.getDistanceTo(closest);
                const targetDist = this.getDistanceTo(target);
                return targetDist < closestDist ? target : closest;
            });
        }
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
     * 更新视觉效果
     */
    updateVisualEffects(deltaTime) {
        // 旋转效果
        if (this.rotationSpeed > 0) {
            this.rotation = (this.rotation || 0) + this.rotationSpeed * deltaTime;
        }

        // 缩放效果
        if (this.scaleEffect !== 1) {
            this.scale = 1 + Math.sin(this.animationTime * 8) * (this.scaleEffect - 1) * 0.3;
        }

        // 透明度变化（某些特殊子弹）
        if (this.type === 'energy_beam') {
            this.alpha = 0.8 + Math.sin(this.animationTime * 12) * 0.2;
        }
    }

    /**
     * 更新拖尾
     */
    updateTrail() {
        // 添加当前位置到拖尾
        this.trail.push({
            x: this.position.x,
            y: this.position.y,
            age: 0
        });
        
        // 更新拖尾点的年龄
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].age += 1;
            
            // 移除过老的拖尾点
            if (this.trail[i].age > this.trailLength) {
                this.trail.splice(i, 1);
            }
        }
    }

    /**
     * 边界检查
     */
    checkBounds() {
        // 子弹超出屏幕边界时销毁
        if (this.position.x < -20 || this.position.x > 820 || 
            this.position.y < -20 || this.position.y > 620) {
            this.destroy();
        }
    }

    /**
     * 渲染子弹
     */
    onRender(ctx) {
        // 渲染拖尾
        this.renderTrail(ctx);
        
        // 渲染主体
        this.renderBody(ctx);
        
        // 渲染发光效果
        this.renderGlow(ctx);
    }

    /**
     * 渲染拖尾
     */
    renderTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        for (let i = 0; i < this.trail.length - 1; i++) {
            const point = this.trail[i];
            const alpha = 1 - (point.age / this.trailLength);
            
            if (alpha <= 0) continue;
            
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = (this.width / 2) * alpha;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            const localX = point.x - this.position.x;
            const localY = point.y - this.position.y;
            ctx.moveTo(localX, localY);
            
            if (i < this.trail.length - 1) {
                const nextPoint = this.trail[i + 1];
                const nextLocalX = nextPoint.x - this.position.x;
                const nextLocalY = nextPoint.y - this.position.y;
                ctx.lineTo(nextLocalX, nextLocalY);
            }
            
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * 渲染子弹主体
     */
    renderBody(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Boss激光特殊渲染
        if (this.isBossLaser) {
            this.renderBossLaser(ctx, halfWidth, halfHeight);
            return;
        }
        
        // 玩家激光光束特殊渲染
        if (this.isLaserBeam) {
            this.renderLaserBeam(ctx, halfWidth, halfHeight);
            return;
        }
        
        // 根据子弹类型渲染
        switch (this.type) {
            case 'plasma':
                this.renderPlasma(ctx, halfWidth, halfHeight);
                break;
            case 'missile':
            case 'bezier_missile':
                this.renderMissile(ctx, halfWidth, halfHeight);
                break;
            case 'bomb':
                this.renderBomb(ctx, halfWidth, halfHeight);
                break;
            case 'energy_beam':
                this.renderEnergyBeam(ctx, halfWidth, halfHeight);
                break;
            case 'piercing':
                this.renderPiercing(ctx, halfWidth, halfHeight);
                break;
            default:
                this.renderDefault(ctx, halfWidth, halfHeight);
                break;
        }
    }

    /**
     * 渲染激光光束
     */
    renderLaserBeam(ctx, halfWidth, halfHeight) {
        ctx.save();
        
        // 外发光
        ctx.globalAlpha = 0.3;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        const outerGradient = ctx.createLinearGradient(-halfWidth * 2, -halfHeight, halfWidth * 2, -halfHeight);
        outerGradient.addColorStop(0, 'transparent');
        outerGradient.addColorStop(0.3, this.glowColor);
        outerGradient.addColorStop(0.7, this.glowColor);
        outerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGradient;
        ctx.fillRect(-halfWidth * 2, -halfHeight, halfWidth * 4, this.height);
        
        // 主光束 - 渐变效果
        ctx.globalAlpha = this.beamIntensity * 0.8;
        const gradient = ctx.createLinearGradient(-halfWidth, -halfHeight, halfWidth, -halfHeight);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.2, this.color);
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(0.8, this.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // 核心光束 - 最亮的部分
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfWidth * 0.3, -halfHeight, halfWidth * 0.6, this.height);
        
        // 中层光束
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth * 0.6, -halfHeight, halfWidth * 1.2, this.height);
        
        // 添加闪烁效果
        if (Math.random() < 0.1) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-halfWidth * 0.4, -halfHeight + Math.random() * this.height * 0.8, halfWidth * 0.8, 5);
        }
        
        ctx.restore();
    }

    /**
     * 渲染等离子弹
     */
    renderPlasma(ctx, halfWidth, halfHeight) {
        const pulse = 1 + Math.sin(this.animationTime * this.pulseSpeed) * 0.3;
        
        ctx.save();
        ctx.scale(pulse, pulse);
        
        // 外圈发光
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfWidth * 1.5);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.7, this.glowColor);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 内核
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * 渲染导弹
     */
    renderMissile(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth * 0.6, halfHeight * 0.2);
        ctx.lineTo(halfWidth * 0.3, halfHeight);
        ctx.lineTo(-halfWidth * 0.3, halfHeight);
        ctx.lineTo(-halfWidth * 0.6, halfHeight * 0.2);
        ctx.closePath();
        ctx.fill();
        
        // 尾翼
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.moveTo(-halfWidth, halfHeight * 0.6);
        ctx.lineTo(halfWidth, halfHeight * 0.6);
        ctx.lineTo(halfWidth * 0.5, halfHeight);
        ctx.lineTo(-halfWidth * 0.5, halfHeight);
        ctx.closePath();
        ctx.fill();
        
        // 推进器火焰
        if (this.age > 0.1) {
            ctx.fillStyle = '#ffaa00';
            const flameLength = halfHeight * (0.5 + Math.random() * 0.3);
            ctx.beginPath();
            ctx.moveTo(-halfWidth * 0.3, halfHeight);
            ctx.lineTo(0, halfHeight + flameLength);
            ctx.lineTo(halfWidth * 0.3, halfHeight);
            ctx.closePath();
            ctx.fill();
        }
    }

    /**
     * 渲染炸弹
     */
    renderBomb(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth, 0, Math.PI * 2);
        ctx.fill();
        
        // 警告标志
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight * 0.6);
        ctx.lineTo(halfWidth * 0.4, halfHeight * 0.2);
        ctx.lineTo(-halfWidth * 0.4, halfHeight * 0.2);
        ctx.closePath();
        ctx.fill();
        
        // 闪烁效果
        if (Math.sin(this.animationTime * 8) > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText('!', 0, 0);
        }
    }

    /**
     * 渲染能量束
     */
    renderEnergyBeam(ctx, halfWidth, halfHeight) {
        // 外层光束
        const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, this.glowColor);
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // 内层核心
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfWidth * 0.3, -halfHeight, halfWidth * 0.6, this.height);
        
        // 能量粒子效果
        for (let i = 0; i < 5; i++) {
            const particleY = -halfHeight + (this.height / 5) * i + Math.sin(this.animationTime * 10 + i) * 10;
            ctx.fillStyle = this.glowColor;
            ctx.beginPath();
            ctx.arc(Math.sin(this.animationTime * 8 + i) * halfWidth * 0.5, particleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * 渲染穿甲弹
     */
    renderPiercing(ctx, halfWidth, halfHeight) {
        // 主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth * 0.3, halfHeight * 0.7);
        ctx.lineTo(halfWidth, halfHeight);
        ctx.lineTo(-halfWidth, halfHeight);
        ctx.lineTo(-halfWidth * 0.3, halfHeight * 0.7);
        ctx.closePath();
        ctx.fill();
        
        // 穿甲头
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight);
        ctx.lineTo(halfWidth * 0.2, -halfHeight * 0.3);
        ctx.lineTo(-halfWidth * 0.2, -halfHeight * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // 能量环
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const ringY = -halfHeight * 0.5 + i * (halfHeight * 0.4);
            ctx.beginPath();
            ctx.arc(0, ringY, halfWidth * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * 渲染默认子弹
     */
    renderDefault(ctx, halfWidth, halfHeight) {
        // 脉冲效果
        const pulse = 1 + Math.sin(this.animationTime * this.pulseSpeed) * 0.1;
        
        ctx.save();
        ctx.scale(pulse, 1);
        
        // 渐变填充
        const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, this.color);
        
        ctx.fillStyle = gradient;
        
        if (this.type === 'laser') {
            // 激光形状
            ctx.beginPath();
            ctx.ellipse(0, 0, halfWidth, halfHeight, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 普通子弹形状
            ctx.beginPath();
            ctx.moveTo(0, -halfHeight);
            ctx.lineTo(halfWidth, halfHeight * 0.3);
            ctx.lineTo(halfWidth * 0.3, halfHeight);
            ctx.lineTo(-halfWidth * 0.3, halfHeight);
            ctx.lineTo(-halfWidth, halfHeight * 0.3);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * 渲染发光效果
     */
    renderGlow(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.3;
        
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(this.width, this.height));
        glowGradient.addColorStop(0, this.glowColor);
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(this.width, this.height), 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * 检查是否为玩家子弹
     */
    isPlayerBullet() {
        return ['player', 'laser', 'laser_beam', 'missile', 'plasma', 'spread', 'piercing', 'energy_beam', 'bezier_missile'].includes(this.type);
    }

    /**
     * 碰撞处理
     */
    onCollision(other) {
        if (!this.destroyed) {
            try {
                console.log(`子弹碰撞: ${this.type} vs ${other?.constructor?.name}`);
                
                // 检查isPlayerBullet方法是否存在
                if (typeof this.isPlayerBullet !== 'function') {
                    console.error('isPlayerBullet方法不存在!');
                    return;
                }
                
                const isPlayerBullet = this.isPlayerBullet();
                
                // 如果是玩家子弹击中敌机，记录命中统计
                if (isPlayerBullet && other instanceof Enemy) {
                    console.log('玩家子弹击中敌机，记录统计');
                    
                    if (window.game?.achievementManager) {
                        window.game.achievementManager.recordShotHit();
                    }
                }
                
                this.destroy();
                
            } catch (error) {
                console.error('子弹碰撞处理出错:', error);
            }
        }
    }

    /**
     * 创建爆炸效果
     */
    createExplosion() {
        if (!window.game) return;

        // 对范围内的敌机造成伤害
        const targets = this.type.includes('player') ? window.game.enemies : [window.game.player];
        
        for (const target of targets) {
            if (target && !target.destroyed) {
                const distance = this.getDistanceTo(target);
                if (distance <= this.explosionRadius) {
                    const damageMultiplier = 1 - (distance / this.explosionRadius);
                    const explosionDamage = Math.floor(this.damage * damageMultiplier);
                    
                    if (target.takeDamage) {
                        target.takeDamage(explosionDamage);
                    }
                }
            }
        }

        // 创建爆炸粒子效果
        if (window.game.particleSystem) {
            window.game.particleSystem.createExplosion(
                this.position.x,
                this.position.y,
                this.explosionRadius / 2,
                { r: 255, g: 150, b: 0 }
            );
        }
    }

    /**
     * 获取伤害值
     */
    getDamage() {
        return this.damage;
    }

    /**
     * 渲染Boss激光（极简版本）
     */
    renderBossLaser(ctx, halfWidth, halfHeight) {
        ctx.save();
        
        // 计算激光束的实际高度
        let laserHeight = this.height;
        let laserStartY = -halfHeight;
        
        // 如果有自定义的激光范围，使用它
        if (this.laserStartY !== undefined && this.laserEndY !== undefined) {
            laserHeight = this.laserEndY - this.laserStartY;
            laserStartY = 0; // 从激光子弹位置开始渲染
            if (this.type === 'boss_laser') {
                laserHeight = this.laserEndY - this.position.y; // 从激光位置到屏幕底部
            }
        }
        
        // 极简化效果 - 只保留基本脉冲
        const fadeAlpha = this.alpha || 1;
        const pulseIntensity = 0.8 + Math.sin((this.age || 0) * 6) * 0.2; // 更低频率
        
        // 只渲染2层，最大化性能
        
        // 外层发光
        ctx.globalAlpha = 0.15 * pulseIntensity * fadeAlpha;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-halfWidth * 1.5, laserStartY, halfWidth * 3, laserHeight);
        
        // 核心光束
        ctx.globalAlpha = 1.0 * fadeAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfWidth * 0.25, laserStartY, halfWidth * 0.5, laserHeight);
        
        ctx.restore();
    }
}

/**
 * 玩家激光类
 */
class PlayerLaser extends Bullet {
    constructor(x, y) {
        super(x, y);
        this.type = 'laser';
        this.setSize(8, 30);
        this.damage = 3;
        this.color = '#00ffff';
        this.glowColor = '#88ffff';
        this.maxAge = 0.5; // 激光持续时间
    }

    onUpdate(deltaTime) {
        super.onUpdate(deltaTime);
        
        // 激光会逐渐消失
        this.alpha = Math.max(0, 1 - (this.age / this.maxAge));
        
        if (this.age >= this.maxAge) {
            this.destroy();
        }
    }
}

/**
 * 敌机子弹类
 */
class EnemyBullet extends Bullet {
    constructor(x, y) {
        super(x, y);
        this.type = 'enemy';
        this.color = '#ff4444';
        this.glowColor = '#ff8888';
    }

    onRender(ctx) {
        // 敌机子弹使用简单的圆形
        ctx.save();
        
        // 发光效果
        ctx.globalAlpha = 0.3;
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
        glowGradient.addColorStop(0, this.glowColor);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width, 0, Math.PI * 2);
        ctx.fill();
        
        // 主体
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
} 