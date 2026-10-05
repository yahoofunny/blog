/**
 * 图片资源管理器 - 管理游戏中的图片资源
 * 采用单例模式，提供图片加载、缓存等功能
 */
class ImageManager {
    constructor() {
        if (ImageManager.instance) {
            return ImageManager.instance;
        }
        
        // 图片缓存
        this.images = new Map();
        this.loadingPromises = new Map();
        this.loaded = false;
        
        // 图片路径配置
        this.imagePaths = {
            // 玩家战机
            'player': 'images/player.png',
            'player_damaged': 'images/player_damaged.png', // 可选：受伤状态
            
            // 敌机类型
            'enemy_basic': 'images/enemy_basic.png',
            'enemy_scout': 'images/enemy_scout.png',
            'enemy_fighter': 'images/enemy_fighter.png',
            'enemy_heavy': 'images/enemy_heavy.png',
            'enemy_elite': 'images/enemy_elite.png',
            'enemy_interceptor': 'images/enemy_interceptor.png',
            'enemy_bomber': 'images/enemy_bomber.png',
            
            // 僚机
            'wingman': 'images/wingman.png',
            
            // Boss
            'boss_standard': 'images/boss_standard.png',
            'boss_fast': 'images/boss_fast.png',
            'boss_heavy': 'images/boss_heavy.png',
            'boss_ultimate': 'images/boss_ultimate.png',
            
            // 道具（可选）
            'powerup_weapon': 'images/powerup_weapon.png',
            'powerup_shield': 'images/powerup_shield.png',
            'powerup_health': 'images/powerup_health.png',
            
            // 特效（可选）
            'explosion': 'images/explosion.png',
            'shield_effect': 'images/shield_effect.png'
        };
        
        ImageManager.instance = this;
    }
    
    /**
     * 获取单例实例
     */
    static getInstance() {
        if (!ImageManager.instance) {
            ImageManager.instance = new ImageManager();
        }
        return ImageManager.instance;
    }
    
    /**
     * 加载单个图片
     */
    async loadImage(name, path) {
        // 如果已经在加载中，返回现有的Promise
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        // 如果已经加载完成，直接返回
        if (this.images.has(name)) {
            return this.images.get(name);
        }
        
        console.log(`开始加载图片: ${name} from ${path}`);
        
        const loadPromise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                console.log(`图片加载成功: ${name}`);
                this.images.set(name, img);
                this.loadingPromises.delete(name);
                resolve(img);
            };
            
            img.onerror = (error) => {
                console.warn(`图片加载失败: ${name} from ${path}`, error);
                this.loadingPromises.delete(name);
                
                // 创建一个默认的彩色矩形作为后备方案
                const canvas = document.createElement('canvas');
                canvas.width = 40;
                canvas.height = 60;
                const ctx = canvas.getContext('2d');
                
                // 根据图片类型绘制不同颜色的后备图案
                if (name.includes('player')) {
                    ctx.fillStyle = '#00ff00';
                } else if (name.includes('enemy')) {
                    ctx.fillStyle = '#ff4444';
                } else if (name.includes('wingman')) {
                    ctx.fillStyle = '#00cc33';
                } else {
                    ctx.fillStyle = '#888888';
                }
                
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // 添加简单的形状标识
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(canvas.width/4, canvas.height/4, canvas.width/2, canvas.height/2);
                
                this.images.set(name, canvas);
                resolve(canvas);
            };
            
            img.src = path;
        });
        
        this.loadingPromises.set(name, loadPromise);
        return loadPromise;
    }
    
    /**
     * 加载所有图片资源
     */
    async loadAllImages() {
        console.log('开始加载所有图片资源...');
        
        const loadPromises = [];
        
        for (const [name, path] of Object.entries(this.imagePaths)) {
            loadPromises.push(this.loadImage(name, path));
        }
        
        try {
            await Promise.all(loadPromises);
            this.loaded = true;
            console.log('所有图片资源加载完成');
        } catch (error) {
            console.warn('部分图片加载失败，使用后备方案', error);
            this.loaded = true; // 即使有失败也标记为已加载
        }
    }
    
    /**
     * 获取图片
     */
    getImage(name) {
        return this.images.get(name);
    }
    
    /**
     * 检查图片是否存在
     */
    hasImage(name) {
        return this.images.has(name);
    }
    
    /**
     * 设置图片路径
     */
    setImagePath(name, path) {
        this.imagePaths[name] = path;
    }
    
    /**
     * 批量设置图片路径
     */
    setImagePaths(paths) {
        Object.assign(this.imagePaths, paths);
    }
    
    /**
     * 渲染图片到画布
     */
    drawImage(ctx, imageName, x, y, width, height, angle = 0, flipX = false, flipY = false) {
        const image = this.getImage(imageName);
        if (!image) {
            console.warn(`图片不存在: ${imageName}`);
            return false;
        }
        
        ctx.save();
        
        // 移动到绘制位置
        ctx.translate(x, y);
        
        // 旋转
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        // 翻转
        if (flipX || flipY) {
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        }
        
        // 绘制图片（以中心点为基准）
        ctx.drawImage(
            image,
            -width / 2,
            -height / 2,
            width,
            height
        );
        
        ctx.restore();
        return true;
    }
    
    /**
     * 获取图片实际尺寸
     */
    getImageSize(imageName) {
        const image = this.getImage(imageName);
        if (!image) {
            return { width: 0, height: 0 };
        }
        
        return {
            width: image.width || image.canvas?.width || 0,
            height: image.height || image.canvas?.height || 0
        };
    }
    
    /**
     * 清除所有图片缓存
     */
    clear() {
        this.images.clear();
        this.loadingPromises.clear();
        this.loaded = false;
    }
    
    /**
     * 销毁图片管理器
     */
    destroy() {
        this.clear();
        ImageManager.instance = null;
    }
}

// 导出到全局作用域
window.ImageManager = ImageManager; 