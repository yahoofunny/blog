/**
 * 成就管理器
 */
class AchievementManager {
    constructor() {
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.notifications = [];
        
        // 统计数据
        this.stats = {
            totalKills: 0,
            totalScore: 0,
            totalShotsHit: 0,
            totalShots: 0,
            maxCombo: 0,
            currentCombo: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            bossesKilled: 0,
            powerUpsCollected: 0,
            perfectWaves: 0,
            killsByType: {
                basic: 0,
                scout: 0,
                fighter: 0,
                heavy: 0,
                elite: 0,
                interceptor: 0,
                bomber: 0,
                boss: 0
            }
        };
        
        this.initAchievements();
        this.loadProgress();
    }

    /**
     * 初始化成就定义
     */
    initAchievements() {
        // 击杀类成就
        this.addAchievement('first_blood', {
            name: '初次击杀',
            description: '击杀第一个敌机',
            icon: '🎯',
            category: 'combat',
            condition: () => this.stats.totalKills >= 1,
            reward: { score: 100 }
        });

        this.addAchievement('killing_spree', {
            name: '杀戮狂潮',
            description: '击杀50个敌机',
            icon: '💀',
            category: 'combat',
            condition: () => this.stats.totalKills >= 50,
            reward: { score: 1000 }
        });

        this.addAchievement('exterminator', {
            name: '终结者',
            description: '击杀200个敌机',
            icon: '☠️',
            category: 'combat',
            condition: () => this.stats.totalKills >= 200,
            reward: { score: 5000 }
        });

        // 连击类成就
        this.addAchievement('combo_master', {
            name: '连击大师',
            description: '达到25连击',
            icon: '⚡',
            category: 'skill',
            condition: () => this.stats.maxCombo >= 25,
            reward: { score: 2000 }
        });

        this.addAchievement('unstoppable', {
            name: '势不可挡',
            description: '达到50连击',
            icon: '🔥',
            category: 'skill',
            condition: () => this.stats.maxCombo >= 50,
            reward: { score: 5000 }
        });

        // 精度类成就
        this.addAchievement('marksman', {
            name: '神枪手',
            description: '射击精度达到80%（至少50发子弹）',
            icon: '🎯',
            category: 'precision',
            condition: () => this.stats.totalShots >= 50 && (this.stats.totalShotsHit / this.stats.totalShots) >= 0.8,
            reward: { score: 3000 }
        });

        this.addAchievement('sniper', {
            name: '狙击手',
            description: '射击精度达到90%（至少100发子弹）',
            icon: '🏹',
            category: 'precision',
            condition: () => this.stats.totalShots >= 100 && (this.stats.totalShotsHit / this.stats.totalShots) >= 0.9,
            reward: { score: 8000 }
        });

        // 分数类成就
        this.addAchievement('high_scorer', {
            name: '高分选手',
            description: '单局得分达到10000分',
            icon: '🏆',
            category: 'score',
            condition: () => this.stats.totalScore >= 10000,
            reward: { score: 2000 }
        });

        this.addAchievement('score_legend', {
            name: '分数传奇',
            description: '单局得分达到50000分',
            icon: '👑',
            category: 'score',
            condition: () => this.stats.totalScore >= 50000,
            reward: { score: 10000 }
        });

        // 专业击杀成就
        this.addAchievement('heavy_hunter', {
            name: '重装猎手',
            description: '击杀10个重型敌机',
            icon: '🦾',
            category: 'specialist',
            condition: () => this.stats.killsByType.heavy >= 10,
            reward: { score: 1500 }
        });

        this.addAchievement('elite_slayer', {
            name: '精英杀手',
            description: '击杀5个精英敌机',
            icon: '⚔️',
            category: 'specialist',
            condition: () => this.stats.killsByType.elite >= 5,
            reward: { score: 2500 }
        });

        this.addAchievement('bomber_bane', {
            name: '轰炸机克星',
            description: '击杀3个轰炸机',
            icon: '💣',
            category: 'specialist',
            condition: () => this.stats.killsByType.bomber >= 3,
            reward: { score: 3000 }
        });

        // Boss击杀成就
        this.addAchievement('boss_slayer', {
            name: 'Boss杀手',
            description: '击败第一个Boss',
            icon: '👹',
            category: 'boss',
            condition: () => this.stats.killsByType.boss >= 1,
            reward: { score: 5000 }
        });

        this.addAchievement('boss_hunter', {
            name: 'Boss猎人',
            description: '击败5个Boss',
            icon: '🏹',
            category: 'boss',
            condition: () => this.stats.killsByType.boss >= 5,
            reward: { score: 15000 }
        });

        this.addAchievement('boss_destroyer', {
            name: 'Boss毁灭者',
            description: '击败10个Boss',
            icon: '💀',
            category: 'boss',
            condition: () => this.stats.killsByType.boss >= 10,
            reward: { score: 30000 }
        });

        // 收集类成就
        this.addAchievement('collector', {
            name: '收集家',
            description: '收集20个道具',
            icon: '📦',
            category: 'collection',
            condition: () => this.stats.powerUpsCollected >= 20,
            reward: { score: 1000 }
        });

        // 坚持类成就
        this.addAchievement('survivor', {
            name: '幸存者',
            description: '游戏时间达到5分钟',
            icon: '⏰',
            category: 'endurance',
            condition: () => this.stats.totalPlayTime >= 300, // 5分钟
            reward: { score: 2000 }
        });

        this.addAchievement('marathon_player', {
            name: '马拉松玩家',
            description: '游戏时间达到15分钟',
            icon: '🏃',
            category: 'endurance',
            condition: () => this.stats.totalPlayTime >= 900, // 15分钟
            reward: { score: 5000 }
        });
    }

    /**
     * 添加成就
     */
    addAchievement(id, achievement) {
        this.achievements.set(id, {
            id,
            ...achievement,
            unlocked: false,
            unlockedAt: null
        });
    }

    /**
     * 记录击杀
     */
    recordKill(enemyType, score) {
        try {
            this.stats.totalKills++;
            this.stats.totalScore += score;
            this.stats.currentCombo++;
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.currentCombo);
            
            if (this.stats.killsByType[enemyType] !== undefined) {
                this.stats.killsByType[enemyType]++;
            }
            
            this.checkAchievements();
            this.saveProgress();
            
            console.log(`成就统计: 总击杀${this.stats.totalKills}, 连击${this.stats.currentCombo}`);
            
        } catch (error) {
            console.error('AchievementManager.recordKill出错:', error);
        }
    }

    /**
     * 记录射击命中
     */
    recordShotHit() {
        this.stats.totalShotsHit++;
        this.checkAchievements();
    }

    /**
     * 记录射击
     */
    recordShot() {
        this.stats.totalShots++;
    }

    /**
     * 重置连击
     */
    resetCombo() {
        this.stats.currentCombo = 0;
    }

    /**
     * 记录道具收集
     */
    recordPowerUpCollected() {
        this.stats.powerUpsCollected++;
        this.checkAchievements();
        this.saveProgress();
    }

    /**
     * 记录游戏时间
     */
    recordPlayTime(deltaTime) {
        this.stats.totalPlayTime += deltaTime;
        this.checkAchievements();
    }

    /**
     * 开始新游戏
     */
    startNewGame() {
        this.stats.gamesPlayed++;
        this.stats.totalScore = 0; // 重置单局分数
        this.stats.currentCombo = 0;
    }

    /**
     * 检查成就
     */
    checkAchievements() {
        for (const [id, achievement] of this.achievements) {
            if (!achievement.unlocked && achievement.condition()) {
                this.unlockAchievement(id);
            }
        }
    }

    /**
     * 解锁成就
     */
    unlockAchievement(id) {
        const achievement = this.achievements.get(id);
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        this.unlockedAchievements.add(id);

        // 添加通知
        this.notifications.push({
            achievement,
            time: 0,
            duration: 4000,
            alpha: 1
        });

        // 播放成就解锁音效
        if (window.game?.audioManager) {
            window.game.audioManager.playSound('achievement_unlock', 0.8);
        }

        // 显示成就解锁消息，但不添加奖励分数（避免循环调用）
        if (window.game) {
            window.game.showMessage(`🏆 成就解锁: ${achievement.name}!`, 4000);
        }

        console.log(`🏆 成就解锁: ${achievement.name} - ${achievement.description}`);
        this.saveProgress();
    }

    /**
     * 更新通知
     */
    updateNotifications(deltaTime) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            notification.time += deltaTime * 1000;

            // 渐隐效果
            if (notification.time > notification.duration * 0.7) {
                const fadeTime = notification.duration - notification.time;
                notification.alpha = Math.max(0, fadeTime / (notification.duration * 0.3));
            }

            // 移除过期通知
            if (notification.time >= notification.duration) {
                this.notifications.splice(i, 1);
            }
        }
    }

    /**
     * 渲染成就通知
     */
    renderNotifications(ctx) {
        if (this.notifications.length === 0) return;

        ctx.save();
        ctx.textAlign = 'center';

        this.notifications.forEach((notification, index) => {
            const achievement = notification.achievement;
            const y = 150 + index * 80;
            const centerX = ctx.canvas.width / 2;

            ctx.globalAlpha = notification.alpha;

            // 背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(centerX - 200, y - 30, 400, 60);

            // 边框
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 200, y - 30, 400, 60);

            // 图标
            ctx.font = '24px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(achievement.icon, centerX - 150, y);

            // 文字
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('成就解锁!', centerX - 50, y - 8);

            ctx.font = '14px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(achievement.name, centerX - 50, y + 12);
        });

        ctx.restore();
    }

    /**
     * 获取成就列表
     */
    getAllAchievements() {
        return Array.from(this.achievements.values());
    }

    /**
     * 获取已解锁成就数量
     */
    getUnlockedCount() {
        return this.unlockedAchievements.size;
    }

    /**
     * 获取成就完成度
     */
    getCompletionPercentage() {
        return Math.round((this.getUnlockedCount() / this.achievements.size) * 100);
    }

    /**
     * 保存进度
     */
    saveProgress() {
        try {
            const data = {
                stats: this.stats,
                unlockedAchievements: Array.from(this.unlockedAchievements)
            };
            localStorage.setItem('planewar_achievements', JSON.stringify(data));
        } catch (error) {
            console.warn('保存成就进度失败:', error);
        }
    }

    /**
     * 加载进度
     */
    loadProgress() {
        try {
            const data = JSON.parse(localStorage.getItem('planewar_achievements') || '{}');
            
            if (data.stats) {
                Object.assign(this.stats, data.stats);
            }
            
            if (data.unlockedAchievements) {
                this.unlockedAchievements = new Set(data.unlockedAchievements);
                
                // 标记已解锁的成就
                for (const id of this.unlockedAchievements) {
                    const achievement = this.achievements.get(id);
                    if (achievement) {
                        achievement.unlocked = true;
                    }
                }
            }
        } catch (error) {
            console.warn('加载成就进度失败:', error);
        }
    }

    /**
     * 重置所有数据
     */
    reset() {
        this.stats = {
            totalKills: 0,
            totalScore: 0,
            totalShotsHit: 0,
            totalShots: 0,
            maxCombo: 0,
            currentCombo: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            bossesKilled: 0,
            powerUpsCollected: 0,
            perfectWaves: 0,
            killsByType: {
                basic: 0,
                scout: 0,
                fighter: 0,
                heavy: 0,
                elite: 0,
                interceptor: 0,
                bomber: 0,
                boss: 0
            }
        };
        
        this.unlockedAchievements.clear();
        this.notifications = [];
        
        // 重置所有成就状态
        for (const achievement of this.achievements.values()) {
            achievement.unlocked = false;
            achievement.unlockedAt = null;
        }
        
        this.saveProgress();
    }
} 