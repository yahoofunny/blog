/**
 * 对象池管理类 - 用于优化游戏性能，减少垃圾回收
 * 采用对象池模式，重复利用对象
 */
class ObjectPool {
    constructor(createFunction, resetFunction, initialSize = 10) {
        this.createFunction = createFunction; // 创建对象的函数
        this.resetFunction = resetFunction;   // 重置对象的函数
        this.pool = [];                      // 对象池数组
        this.activeObjects = [];             // 活跃对象数组

        // 预创建初始对象
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFunction());
        }
    }

    /**
     * 从对象池获取一个对象
     * @param {...any} args - 传递给重置函数的参数
     * @returns {Object} 从池中获取的对象
     */
    get(...args) {
        let obj;
        
        if (this.pool.length > 0) {
            // 从池中取出一个对象
            obj = this.pool.pop();
        } else {
            // 池为空时创建新对象
            obj = this.createFunction();
        }

        // 重置对象状态
        if (this.resetFunction) {
            this.resetFunction(obj, ...args);
        }

        // 添加到活跃对象列表
        this.activeObjects.push(obj);
        
        return obj;
    }

    /**
     * 将对象返回到对象池
     * @param {Object} obj - 要回收的对象
     */
    release(obj) {
        const index = this.activeObjects.indexOf(obj);
        if (index > -1) {
            // 从活跃对象列表中移除
            this.activeObjects.splice(index, 1);
            // 放回对象池
            this.pool.push(obj);
        }
    }

    /**
     * 批量回收对象
     * @param {Array} objects - 要回收的对象数组
     */
    releaseAll(objects) {
        for (let obj of objects) {
            this.release(obj);
        }
    }

    /**
     * 清空所有活跃对象（将它们全部回收）
     */
    releaseAllActive() {
        while (this.activeObjects.length > 0) {
            const obj = this.activeObjects.pop();
            this.pool.push(obj);
        }
    }

    /**
     * 获取活跃对象数量
     * @returns {number} 活跃对象数量
     */
    getActiveCount() {
        return this.activeObjects.length;
    }

    /**
     * 获取池中可用对象数量
     * @returns {number} 池中对象数量
     */
    getPoolCount() {
        return this.pool.length;
    }

    /**
     * 获取总对象数量
     * @returns {number} 总对象数量
     */
    getTotalCount() {
        return this.pool.length + this.activeObjects.length;
    }

    /**
     * 清空对象池
     */
    clear() {
        this.pool = [];
        this.activeObjects = [];
    }

    /**
     * 获取所有活跃对象的副本
     * @returns {Array} 活跃对象数组的副本
     */
    getActiveObjects() {
        return [...this.activeObjects];
    }

    /**
     * 预热对象池（预创建指定数量的对象）
     * @param {number} count - 要预创建的对象数量
     */
    warmUp(count) {
        for (let i = 0; i < count; i++) {
            this.pool.push(this.createFunction());
        }
    }

    /**
     * 清理多余的对象（保留指定数量）
     * @param {number} keepCount - 要保留的对象数量
     */
    trim(keepCount) {
        while (this.pool.length > keepCount) {
            this.pool.pop();
        }
    }
}

/**
 * 对象池管理器 - 管理多个对象池
 */
class ObjectPoolManager {
    constructor() {
        this.pools = new Map();
    }

    /**
     * 创建或获取指定类型的对象池
     * @param {string} type - 对象池类型
     * @param {Function} createFunction - 创建对象的函数
     * @param {Function} resetFunction - 重置对象的函数
     * @param {number} initialSize - 初始大小
     * @returns {ObjectPool} 对象池实例
     */
    getPool(type, createFunction, resetFunction, initialSize = 10) {
        if (!this.pools.has(type)) {
            this.pools.set(type, new ObjectPool(createFunction, resetFunction, initialSize));
        }
        return this.pools.get(type);
    }

    /**
     * 获取指定类型的对象
     * @param {string} type - 对象类型
     * @param {...any} args - 传递给重置函数的参数
     * @returns {Object} 对象实例
     */
    get(type, ...args) {
        const pool = this.pools.get(type);
        if (pool) {
            return pool.get(...args);
        }
        throw new Error(`Object pool for type '${type}' not found`);
    }

    /**
     * 释放对象回池
     * @param {string} type - 对象类型
     * @param {Object} obj - 要释放的对象
     */
    release(type, obj) {
        const pool = this.pools.get(type);
        if (pool) {
            pool.release(obj);
        }
    }

    /**
     * 清空所有对象池
     */
    clearAll() {
        for (let pool of this.pools.values()) {
            pool.clear();
        }
        this.pools.clear();
    }

    /**
     * 获取所有对象池的统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {};
        for (let [type, pool] of this.pools) {
            stats[type] = {
                active: pool.getActiveCount(),
                pooled: pool.getPoolCount(),
                total: pool.getTotalCount()
            };
        }
        return stats;
    }
} 