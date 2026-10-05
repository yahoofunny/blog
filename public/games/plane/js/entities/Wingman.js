/**
 * 僚机类 - 玩家的支援战机
 */
class Wingman {
    constructor(player) {
        this.player = player;
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.targetPosition = new Vector2(0, 0);
        
        // 尺寸属性
        this.width = 50; // 原来是25，现在是2倍大小
        this.height = 70; // 原来是35，现在是2倍大小
        
        // 移动属性
        this.followSpeed = 300; // 跟随速度
        this.smoothing = 0.1; // 平滑跟随
        this.formationOffset = { x: 0, y: 0 };
        this.positionIndex = 0;
        
        // 射击属性
        this.canShoot = true;
        this.shootCooldown = 0.4; // 比玩家射击慢一些
        this.shootTimer = 0;
        this.shootDelay = 0.2; // 延迟射击，避免所有僚机同时射击
        
        // 视觉属性
        this.animationTime = 0;
        this.thrusterFlame = 0;
        this.destroyed = false;
        
        // AI属性
        this.target = null; // 当前攻击目标
        this.targetScanRange = 200; // 目标扫描范围
        
        // 图片渲染设置
        this.useImageRender = true;
        this.imageName = 'wingman';
    }

    /**
     * 设置僚机在编队中的位置
     */
    setPosition(index) {
        this.positionIndex = index;
        
        // 根据索引计算编队偏移（因为战机变大，间距也要增加）
        if (index === 0) {
            // 第一架僚机在左后方
            this.formationOffset = { x: -100, y: 80 }; // 原来是-50, 40，现在是2倍距离
        } else if (index === 1) {
            // 第二架僚机在右后方
            this.formationOffset = { x: 100, y: 80 }; // 原来是50, 40，现在是2倍距离
        }
        
        // 设置射击延迟，避免同时射击
        this.shootDelay = index * 0.1;
    }

    /**
     * 更新僚机
     */
    update(deltaTime) {
        if (this.destroyed || !this.player) return;
        
        this.animationTime += deltaTime;
        
        // 更新目标位置
        this.updateTargetPosition();
        
        // 更新移动
        this.updateMovement(deltaTime);
        
        // 更新射击
        this.updateShooting(deltaTime);
        
        // 更新动画
        this.updateAnimation(deltaTime);
    }

    /**
     * 更新目标位置
     */
    updateTargetPosition() {
        this.targetPosition.x = this.player.position.x + this.formationOffset.x;
        this.targetPosition.y = this.player.position.y + this.formationOffset.y;
    }

    /**
     * 更新移动
     */
    updateMovement(deltaTime) {
        // 平滑跟随玩家
        const dx = this.targetPosition.x - this.position.x;
        const dy = this.targetPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            // 使用简单的插值跟随
            this.position.x += dx * this.smoothing;
            this.position.y += dy * this.smoothing;
            
            // 计算速度用于动画
            this.velocity.x = dx * this.smoothing / deltaTime;
            this.velocity.y = dy * this.smoothing / deltaTime;
        } else {
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
    }

    /**
     * 更新射击
     */
    updateShooting(deltaTime) {
        // 更新射击计时器
        if (this.shootTimer > 0) {
            this.shootTimer -= deltaTime;
        }
        
        // 延迟射击计时
        if (this.shootDelay > 0) {
            this.shootDelay -= deltaTime;
            return;
        }
        
        // 寻找目标
        this.findTarget();
        
        // 射击逻辑
        if (this.canShoot && this.shootTimer <= 0 && this.target) {
            this.shoot();
            this.shootTimer = this.shootCooldown;
        }
    }

    /**
     * 寻找攻击目标
     */
    findTarget() {
        if (!window.game || !window.game.enemies) return;
        
        let closestEnemy = null;
        let closestDistance = this.targetScanRange;
        
        // 寻找最近的敌机
        for (const enemy of window.game.enemies) {
            if (enemy.destroyed) continue;
            
            const dx = enemy.position.x - this.position.x;
            const dy = enemy.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }
        
        this.target = closestEnemy;
    }

    /**
     * 射击
     */
    shoot() {
        if (!window.game || !this.target) return;
        
        // 计算射击方向（简单瞄准）
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const bulletSpeed = 450;
            const vx = (dx / distance) * bulletSpeed * 0.3; // 略微瞄准偏移
            const vy = -bulletSpeed + (dy / distance) * bulletSpeed * 0.2;
            
            // 发射子弹
            window.game.createBullet(
                this.position.x,
                this.position.y - this.height / 2,
                vx,
                vy,
                'player'
            );
        }
    }

    /**
     * 更新动画
     */
    updateAnimation(deltaTime) {
        // 推进器火焰动画
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        this.thrusterFlame = Math.min(1, speed / 100);
    }

    /**
     * 渲染僚机
     */
    render(ctx) {
        if (this.destroyed) return;
        
        ctx.save();
        
        // 轻微摆动效果
        const bobOffset = Math.sin(this.animationTime * 6 + this.positionIndex) * 1;
        ctx.translate(0, bobOffset);
        
        // 绘制主体
        this.drawBody(ctx);
        
        // 绘制推进器火焰
        this.drawThruster(ctx);
        
        ctx.restore();
    }

    /**
     * 绘制僚机主体
     */
    drawBody(ctx) {
        // 尝试使用图片渲染
        if (this.useImageRender) {
            const imageManager = window.ImageManager?.getInstance();
            if (imageManager && imageManager.loaded) {
                const success = imageManager.drawImage(
                    ctx, 
                    this.imageName, 
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
        
        // 主体颜色（略暗于玩家）
        const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
        gradient.addColorStop(0, '#00cc33');
        gradient.addColorStop(0.5, '#00aa22');
        gradient.addColorStop(1, '#006611');
        
        ctx.fillStyle = gradient;
        
        // 绘制简化的飞机形状
        ctx.beginPath();
        ctx.moveTo(0, -halfHeight); // 机头
        ctx.lineTo(halfWidth * 0.7, halfHeight * 0.2); // 右翼
        ctx.lineTo(halfWidth * 0.3, halfHeight); // 右后
        ctx.lineTo(-halfWidth * 0.3, halfHeight); // 左后
        ctx.lineTo(-halfWidth * 0.7, halfHeight * 0.2); // 左翼
        ctx.closePath();
        ctx.fill();
        
        // 驾驶舱
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.ellipse(0, -halfHeight * 0.2, halfWidth * 0.25, halfHeight * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 武器
        ctx.fillStyle = '#555555';
        ctx.fillRect(-halfWidth * 0.15, -halfHeight * 0.7, halfWidth * 0.08, halfHeight * 0.2);
        ctx.fillRect(halfWidth * 0.07, -halfHeight * 0.7, halfWidth * 0.08, halfHeight * 0.2);
        
        // 僚机标识
        ctx.fillStyle = '#ffff00';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('W', 0, halfHeight * 0.6);
    }

    /**
     * 绘制推进器火焰
     */
    drawThruster(ctx) {
        if (this.thrusterFlame <= 0) return;
        
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        ctx.save();
        ctx.globalAlpha = this.thrusterFlame;
        
        // 火焰渐变
        const flameGradient = ctx.createLinearGradient(0, halfHeight, 0, halfHeight + 15);
        flameGradient.addColorStop(0, '#00aaff');
        flameGradient.addColorStop(0.5, '#0088cc');
        flameGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = flameGradient;
        
        // 主推进器火焰
        const flameHeight = 10 + this.thrusterFlame * 5;
        ctx.beginPath();
        ctx.moveTo(-halfWidth * 0.2, halfHeight);
        ctx.lineTo(0, halfHeight + flameHeight);
        ctx.lineTo(halfWidth * 0.2, halfHeight);
        ctx.closePath();
        ctx.fill();
        
        // 侧推进器火焰
        ctx.fillStyle = '#0066aa';
        ctx.fillRect(-halfWidth * 0.1, halfHeight, halfWidth * 0.05, flameHeight * 0.6);
        ctx.fillRect(halfWidth * 0.05, halfHeight, halfWidth * 0.05, flameHeight * 0.6);
        
        ctx.restore();
    }

    /**
     * 销毁僚机
     */
    destroy() {
        this.destroyed = true;
    }

    /**
     * 重置僚机
     */
    reset() {
        this.destroyed = false;
        this.target = null;
        this.shootTimer = 0;
        this.animationTime = 0;
    }
}

// 导出到全局作用域
window.Wingman = Wingman; 