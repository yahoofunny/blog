/**
 * 2D向量类 - 用于处理游戏中的位置、速度等向量运算
 */
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // 复制向量
    copy() {
        return new Vector2D(this.x, this.y);
    }

    // 设置向量值
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // 从另一个向量设置值
    setFrom(vector) {
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    // 向量加法
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    // 向量减法
    subtract(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    // 向量乘以标量
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    // 向量除以标量
    divide(scalar) {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
        }
        return this;
    }

    // 计算向量长度
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // 计算向量长度的平方（避免开方运算，性能更好）
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    // 向量归一化（单位化）
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.divide(mag);
        }
        return this;
    }

    // 限制向量的最大长度
    limit(max) {
        const magSq = this.magnitudeSquared();
        if (magSq > max * max) {
            this.normalize();
            this.multiply(max);
        }
        return this;
    }

    // 计算两个向量的距离
    distance(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 计算两个向量距离的平方
    distanceSquared(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return dx * dx + dy * dy;
    }

    // 计算向量的角度（弧度）
    angle() {
        return Math.atan2(this.y, this.x);
    }

    // 向量点积
    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    // 向量叉积（2D中返回标量）
    cross(vector) {
        return this.x * vector.y - this.y * vector.x;
    }

    // 线性插值
    lerp(vector, amount) {
        this.x += (vector.x - this.x) * amount;
        this.y += (vector.y - this.y) * amount;
        return this;
    }

    // 将向量转换为字符串
    toString() {
        return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    // 静态方法：创建随机向量
    static random() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }

    // 静态方法：从角度创建向量
    static fromAngle(angle, magnitude = 1) {
        return new Vector2D(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }

    // 静态方法：计算两点间的向量
    static subtract(v1, v2) {
        return new Vector2D(v1.x - v2.x, v1.y - v2.y);
    }

    // 静态方法：向量加法
    static add(v1, v2) {
        return new Vector2D(v1.x + v2.x, v1.y + v2.y);
    }

    // 静态方法：计算两向量的距离
    static distance(v1, v2) {
        return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
    }
} 