/**
 * 游戏对象基类 - 所有游戏实体的基础类
 * 采用组件模式，提供基础的位置、速度、碰撞检测等功能
 */
class GameObject {
    constructor(x = 0, y = 0) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.acceleration = new Vector2D(0, 0);
        
        // 基础属性
        this.width = 32;
        this.height = 32;
        this.radius = Math.max(this.width, this.height) / 2;
        this.rotation = 0;
        this.scale = 1;
        
        // 状态标记
        this.active = true;
        this.visible = true;
        this.destroyed = false;
        
        // 物理属性
        this.maxSpeed = 300;
        this.friction = 0.95;
        
        // 渲染属性
        this.color = '#ffffff';
        this.alpha = 1;
        
        // 碰撞检测
        this.collisionEnabled = true;
        this.collisionType = 'rectangle'; // 'rectangle' 或 'circle'
        
        // 生命周期
        this.age = 0;
        this.maxAge = Infinity;
        
        // 事件处理
        this.eventListeners = new Map();
    }

    /**
     * 更新游戏对象
     * @param {number} deltaTime - 时间增量
     */
    update(deltaTime) {
        if (!this.active) return;

        // 更新年龄
        this.age += deltaTime;
        if (this.age >= this.maxAge) {
            this.destroy();
            return;
        }

        // 物理更新
        this.updatePhysics(deltaTime);
        
        // 边界检查
        this.checkBounds();
        
        // 子类可重写的更新逻辑
        this.onUpdate(deltaTime);
    }

    /**
     * 物理系统更新
     * @param {number} deltaTime - 时间增量
     */
    updatePhysics(deltaTime) {
        // 更新速度
        this.velocity.add(this.acceleration.copy().multiply(deltaTime));
        
        // 限制最大速度
        this.velocity.limit(this.maxSpeed);
        
        // 应用摩擦力
        this.velocity.multiply(this.friction);
        
        // 更新位置
        this.position.add(this.velocity.copy().multiply(deltaTime));
        
        // 重置加速度
        this.acceleration.set(0, 0);
    }

    /**
     * 边界检查（子类可重写）
     */
    checkBounds() {
        // 默认实现：什么都不做
        // 子类可以重写此方法来实现特定的边界行为
    }

    /**
     * 渲染游戏对象
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     */
    render(ctx) {
        if (!this.visible || this.destroyed) return;

        ctx.save();
        
        // 设置变换
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.alpha;
        
        // 子类实现具体渲染
        this.onRender(ctx);
        
        ctx.restore();
    }

    /**
     * 应用力
     * @param {Vector2D} force - 力向量
     */
    applyForce(force) {
        this.acceleration.add(force);
    }

    /**
     * 设置位置
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    setPosition(x, y) {
        this.position.set(x, y);
    }

    /**
     * 设置速度
     * @param {number} vx - X方向速度
     * @param {number} vy - Y方向速度
     */
    setVelocity(vx, vy) {
        this.velocity.set(vx, vy);
    }

    /**
     * 设置大小
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.radius = Math.max(width, height) / 2;
    }

    /**
     * 获取边界框
     * @returns {Object} 边界框 {left, right, top, bottom, centerX, centerY}
     */
    getBounds() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
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
     * 碰撞检测
     * @param {GameObject} other - 另一个游戏对象
     * @returns {boolean} 是否发生碰撞
     */
    checkCollision(other) {
        if (!this.collisionEnabled || !other.collisionEnabled) {
            return false;
        }

        if (this.collisionType === 'circle' && other.collisionType === 'circle') {
            return this.checkCircleCollision(other);
        } else if (this.collisionType === 'rectangle' && other.collisionType === 'rectangle') {
            return this.checkRectangleCollision(other);
        } else {
            // 混合碰撞检测（使用边界框）
            return this.checkRectangleCollision(other);
        }
    }

    /**
     * 圆形碰撞检测
     * @param {GameObject} other - 另一个游戏对象
     * @returns {boolean} 是否发生碰撞
     */
    checkCircleCollision(other) {
        const distance = this.position.distance(other.position);
        return distance < (this.radius + other.radius);
    }

    /**
     * 矩形碰撞检测
     * @param {GameObject} other - 另一个游戏对象
     * @returns {boolean} 是否发生碰撞
     */
    checkRectangleCollision(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds();
        
        return !(
            bounds1.right < bounds2.left ||
            bounds1.left > bounds2.right ||
            bounds1.bottom < bounds2.top ||
            bounds1.top > bounds2.bottom
        );
    }

    /**
     * 计算到另一个对象的距离
     * @param {GameObject} other - 另一个游戏对象
     * @returns {number} 距离
     */
    distanceTo(other) {
        return this.position.distance(other.position);
    }

    /**
     * 计算到另一个对象的角度
     * @param {GameObject} other - 另一个游戏对象
     * @returns {number} 角度（弧度）
     */
    angleTo(other) {
        return Math.atan2(
            other.position.y - this.position.y,
            other.position.x - this.position.x
        );
    }

    /**
     * 朝向另一个对象移动
     * @param {GameObject} target - 目标对象
     * @param {number} speed - 移动速度
     */
    moveTowards(target, speed) {
        const direction = Vector2D.subtract(target.position, this.position);
        direction.normalize();
        direction.multiply(speed);
        this.velocity.setFrom(direction);
    }

    /**
     * 重置游戏对象状态
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    reset(x = 0, y = 0) {
        // 重置位置
        this.position.set(x, y);
        this.velocity.set(0, 0);
        this.acceleration.set(0, 0);
        
        // 重置状态
        this.active = true;
        this.visible = true;
        this.destroyed = false;
        
        // 重置渲染属性
        this.rotation = 0;
        this.scale = 1;
        this.alpha = 1;
        
        // 重置生命周期
        this.age = 0;
        
        // 清理事件监听器
        this.eventListeners.clear();
    }

    /**
     * 销毁对象
     */
    destroy() {
        this.destroyed = true;
        this.active = false;
        this.visible = false;
        this.onDestroy();
        this.emit('destroy');
    }

    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {...any} args - 事件参数
     */
    emit(event, ...args) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            for (let callback of listeners) {
                callback.call(this, ...args);
            }
        }
    }

    // 子类可重写的生命周期方法
    onUpdate(deltaTime) {
        // 子类实现具体更新逻辑
    }

    onRender(ctx) {
        // 子类实现具体渲染逻辑
        // 默认渲染一个简单的矩形
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    onDestroy() {
        // 子类实现销毁时的清理逻辑
    }

    onCollision(other) {
        // 子类实现碰撞处理逻辑
    }
}

/**
 * 游戏对象工厂类
 */
class GameObjectFactory {
    static create(type, x = 0, y = 0, options = {}) {
        let obj;
        
        switch (type) {
            case 'player':
                obj = new Player(x, y);
                break;
            case 'enemy':
                obj = new Enemy(x, y);
                break;
            case 'bullet':
                obj = new Bullet(x, y);
                break;
            case 'powerup':
                obj = new PowerUp(x, y);
                break;
            default:
                obj = new GameObject(x, y);
        }
        
        // 应用选项
        Object.assign(obj, options);
        
        return obj;
    }
} 