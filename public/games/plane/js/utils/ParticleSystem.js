/**
 * 粒子类 - 单个粒子的属性和行为
 */
class Particle {
    constructor() {
        this.position = new Vector2D();
        this.velocity = new Vector2D();
        this.acceleration = new Vector2D();
        this.life = 1.0;
        this.maxLife = 1.0;
        this.size = 1;
        this.color = { r: 255, g: 255, b: 255, a: 1 };
        this.active = false;
    }

    /**
     * 初始化粒子
     */
    init(x, y, vx, vy, life, size, color) {
        this.position.set(x, y);
        this.velocity.set(vx, vy);
        this.acceleration.set(0, 0);
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = { ...color };
        this.active = true;
    }

    /**
     * 更新粒子状态
     */
    update(deltaTime) {
        if (!this.active) return;

        // 更新物理属性
        this.velocity.add(this.acceleration.copy().multiply(deltaTime));
        this.position.add(this.velocity.copy().multiply(deltaTime));

        // 更新生命值
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        // 更新透明度（基于生命值）
        this.color.a = this.life / this.maxLife;
    }

    /**
     * 渲染粒子
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = this.color.a;
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

/**
 * 粒子发射器类 - 管理粒子的生成和属性
 */
class ParticleEmitter {
    constructor(maxParticles = 100) {
        this.particles = [];
        this.maxParticles = maxParticles;
        this.position = new Vector2D();
        
        // 发射器属性
        this.emissionRate = 10; // 每秒发射粒子数
        this.emissionTimer = 0;
        this.isEmitting = false;
        
        // 粒子属性范围
        this.particleLife = { min: 1, max: 3 };
        this.particleSize = { min: 1, max: 5 };
        this.particleSpeed = { min: 10, max: 50 };
        this.particleDirection = { min: 0, max: Math.PI * 2 };
        this.particleColor = { r: 255, g: 255, b: 255, a: 1 };
        this.gravity = new Vector2D(0, 0);

        // 初始化粒子池
        for (let i = 0; i < maxParticles; i++) {
            this.particles.push(new Particle());
        }
    }

    /**
     * 设置发射器位置
     */
    setPosition(x, y) {
        this.position.set(x, y);
    }

    /**
     * 开始发射
     */
    start() {
        this.isEmitting = true;
    }

    /**
     * 停止发射
     */
    stop() {
        this.isEmitting = false;
    }

    /**
     * 设置粒子生命周期范围
     */
    setLifeRange(min, max) {
        this.particleLife.min = min;
        this.particleLife.max = max;
    }

    /**
     * 设置粒子大小范围
     */
    setSizeRange(min, max) {
        this.particleSize.min = min;
        this.particleSize.max = max;
    }

    /**
     * 设置粒子速度范围
     */
    setSpeedRange(min, max) {
        this.particleSpeed.min = min;
        this.particleSpeed.max = max;
    }

    /**
     * 设置粒子发射方向范围（弧度）
     */
    setDirectionRange(min, max) {
        this.particleDirection.min = min;
        this.particleDirection.max = max;
    }

    /**
     * 设置粒子颜色
     */
    setColor(r, g, b, a = 1) {
        this.particleColor = { r, g, b, a };
    }

    /**
     * 设置重力
     */
    setGravity(x, y) {
        this.gravity.set(x, y);
    }

    /**
     * 发射单个粒子
     */
    emitParticle() {
        // 找到一个非活跃的粒子
        for (let particle of this.particles) {
            if (!particle.active) {
                // 随机生成粒子属性
                const life = this.randomBetween(this.particleLife.min, this.particleLife.max);
                const size = this.randomBetween(this.particleSize.min, this.particleSize.max);
                const speed = this.randomBetween(this.particleSpeed.min, this.particleSpeed.max);
                const direction = this.randomBetween(this.particleDirection.min, this.particleDirection.max);
                
                const vx = Math.cos(direction) * speed;
                const vy = Math.sin(direction) * speed;
                
                particle.init(
                    this.position.x,
                    this.position.y,
                    vx, vy,
                    life,
                    size,
                    this.particleColor
                );
                break;
            }
        }
    }

    /**
     * 批量发射粒子
     */
    burst(count) {
        for (let i = 0; i < count; i++) {
            this.emitParticle();
        }
    }

    /**
     * 更新发射器
     */
    update(deltaTime) {
        // 更新发射计时器
        if (this.isEmitting) {
            this.emissionTimer += deltaTime;
            const emissionInterval = 1 / this.emissionRate;
            
            while (this.emissionTimer >= emissionInterval) {
                this.emitParticle();
                this.emissionTimer -= emissionInterval;
            }
        }

        // 更新所有粒子
        for (let particle of this.particles) {
            if (particle.active) {
                // 应用重力
                particle.acceleration.setFrom(this.gravity);
                particle.update(deltaTime);
            }
        }
    }

    /**
     * 渲染所有粒子
     */
    render(ctx) {
        for (let particle of this.particles) {
            if (particle.active) {
                particle.render(ctx);
            }
        }
    }

    /**
     * 获取活跃粒子数量
     */
    getActiveParticleCount() {
        return this.particles.filter(p => p.active).length;
    }

    /**
     * 清除所有粒子
     */
    clear() {
        for (let particle of this.particles) {
            particle.active = false;
        }
    }

    /**
     * 生成指定范围内的随机数
     */
    randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }
}

/**
 * 粒子系统管理器 - 管理多个粒子发射器
 */
class ParticleSystem {
    constructor() {
        this.emitters = [];
    }

    /**
     * 创建粒子发射器
     */
    createEmitter(maxParticles = 100) {
        const emitter = new ParticleEmitter(maxParticles);
        this.emitters.push(emitter);
        return emitter;
    }

    /**
     * 移除粒子发射器
     */
    removeEmitter(emitter) {
        const index = this.emitters.indexOf(emitter);
        if (index > -1) {
            this.emitters.splice(index, 1);
        }
    }

    /**
     * 创建爆炸效果
     */
    createExplosion(x, y, particleCount = 20, color = { r: 255, g: 100, b: 0 }) {
        const emitter = this.createEmitter(particleCount);
        emitter.setPosition(x, y);
        emitter.setLifeRange(0.5, 1.5);
        emitter.setSizeRange(2, 6);
        emitter.setSpeedRange(50, 150);
        emitter.setDirectionRange(0, Math.PI * 2);
        emitter.setColor(color.r, color.g, color.b);
        emitter.setGravity(0, 30);
        emitter.burst(particleCount);
        
        // 标记发射器在2秒后自动清理
        emitter.autoRemoveTime = 2.0;
        
        return emitter;
    }

    /**
     * 创建推进器效果
     */
    createThruster(x, y) {
        const emitter = this.createEmitter(50);
        emitter.setPosition(x, y);
        emitter.setLifeRange(0.2, 0.5);
        emitter.setSizeRange(1, 3);
        emitter.setSpeedRange(20, 60);
        emitter.setDirectionRange(Math.PI * 0.8, Math.PI * 1.2); // 向下
        emitter.setColor(0, 150, 255);
        emitter.emissionRate = 30;
        emitter.start();
        
        return emitter;
    }

    /**
     * 创建星星效果
     */
    createStars(canvasWidth, canvasHeight, count = 50) {
        const emitter = this.createEmitter(count);
        emitter.setLifeRange(5, 10);
        emitter.setSizeRange(1, 2);
        emitter.setSpeedRange(10, 30);
        emitter.setDirectionRange(Math.PI * 0.5, Math.PI * 0.5); // 向下
        emitter.setColor(255, 255, 255);
        
        // 在屏幕顶部随机位置生成星星
        for (let i = 0; i < count; i++) {
            emitter.setPosition(Math.random() * canvasWidth, -10);
            emitter.emitParticle();
        }
        
        return emitter;
    }

    /**
     * 更新所有发射器
     */
    update(deltaTime) {
        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const emitter = this.emitters[i];
            emitter.update(deltaTime);
            
            // 处理自动移除计时器
            if (emitter.autoRemoveTime !== undefined) {
                emitter.autoRemoveTime -= deltaTime;
                if (emitter.autoRemoveTime <= 0) {
                    this.emitters.splice(i, 1);
                    continue;
                }
            }
            
            // 移除没有活跃粒子且不在发射的发射器
            if (!emitter.isEmitting && emitter.getActiveParticleCount() === 0) {
                this.emitters.splice(i, 1);
            }
        }
    }

    /**
     * 渲染所有发射器
     */
    render(ctx) {
        for (let emitter of this.emitters) {
            emitter.render(ctx);
        }
    }

    /**
     * 创建击中特效
     */
    createHitEffect(x, y, color = { r: 255, g: 255, b: 0 }) {
        const emitter = this.createEmitter(10);
        emitter.setPosition(x, y);
        emitter.setLifeRange(0.2, 0.5);
        emitter.setSizeRange(1, 3);
        emitter.setSpeedRange(30, 80);
        emitter.setDirectionRange(0, Math.PI * 2);
        emitter.setColor(color.r, color.g, color.b);
        emitter.burst(10);
        
        emitter.autoRemoveTime = 1.0;
        
        return emitter;
    }

    /**
     * 创建浮动文字
     */
    createFloatingText(x, y, text, color = '#ffffff') {
        // 这里应该创建文字粒子，暂时用普通粒子代替
        this.createHitEffect(x, y, { r: 255, g: 255, b: 255 });
    }

    /**
     * 创建星星爆发效果
     */
    createStarBurst(x, y, particleCount = 8, color = '#ffff00') {
        const emitter = this.createEmitter(particleCount);
        emitter.setPosition(x, y);
        emitter.setLifeRange(0.5, 1.0);
        emitter.setSizeRange(2, 4);
        emitter.setSpeedRange(40, 100);
        emitter.setDirectionRange(0, Math.PI * 2);
        
        // 解析颜色字符串
        let r = 255, g = 255, b = 0;
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        
        emitter.setColor(r, g, b);
        emitter.burst(particleCount);
        
        emitter.autoRemoveTime = 1.5;
        
        return emitter;
    }

    /**
     * 创建光环效果
     */
    createRing(x, y, color = '#ffffff') {
        const emitter = this.createEmitter(16);
        emitter.setPosition(x, y);
        emitter.setLifeRange(0.8, 1.2);
        emitter.setSizeRange(1, 2);
        emitter.setSpeedRange(60, 80);
        
        // 圆形分布
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            emitter.setDirectionRange(angle, angle);
            emitter.emitParticle();
        }
        
        emitter.autoRemoveTime = 1.5;
        
        return emitter;
    }

    /**
     * 创建单个粒子（优化版本）
     */
    createParticle(config) {
        // 直接使用爆炸效果，但减少粒子数量以提高性能
        const emitter = this.createEmitter(1);
        emitter.setPosition(config.x, config.y);
        emitter.setLifeRange(config.life || 1.0, config.life || 1.0);
        emitter.setSizeRange(config.size || 2, config.size || 2);
        emitter.setColor(config.color.r, config.color.g, config.color.b);
        emitter.setSpeedRange(0, 0); // 静止粒子
        
        // 设置自定义速度
        if (config.vx !== undefined && config.vy !== undefined) {
            // 手动创建粒子并设置速度
            for (let particle of emitter.particles) {
                if (!particle.active) {
                    particle.init(
                        config.x, 
                        config.y, 
                        config.vx, 
                        config.vy, 
                        config.life || 1.0, 
                        config.size || 2, 
                        config.color
                    );
                    break;
                }
            }
        } else {
            emitter.emitParticle();
        }
        
        // 设置较短的自动移除时间
        emitter.autoRemoveTime = (config.life || 1.0) + 0.1;
        
        return emitter;
    }

    /**
     * 清除所有粒子效果
     */
    clear() {
        for (let emitter of this.emitters) {
            emitter.clear();
        }
        this.emitters = [];
    }
} 