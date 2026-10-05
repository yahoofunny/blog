/**
 * 游戏状态枚举
 */
const GameState = {
    MAIN_MENU: 'mainMenu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    SETTINGS: 'settings',
    LEADERBOARD: 'leaderboard',
    ACHIEVEMENTS: 'achievements',
    LOADING: 'loading'
};

/**
 * 游戏状态管理器 - 管理游戏的不同状态
 * 采用状态模式和单例模式
 */
class GameStateManager {
    constructor() {
        if (GameStateManager.instance) {
            return GameStateManager.instance;
        }
        
        this.currentState = GameState.LOADING;
        this.previousState = null;
        this.stateHistory = [];
        
        // 状态切换监听器
        this.stateListeners = new Map();
        
        // 状态数据
        this.stateData = new Map();
        
        GameStateManager.instance = this;
    }

    /**
     * 获取单例实例
     */
    static getInstance() {
        if (!GameStateManager.instance) {
            new GameStateManager();
        }
        return GameStateManager.instance;
    }

    /**
     * 切换状态
     * @param {string} newState - 新状态
     * @param {Object} data - 状态数据
     */
    changeState(newState, data = {}) {
        if (newState === this.currentState) {
            return; // 状态相同，不需要切换
        }

        const oldState = this.currentState;
        this.previousState = oldState;
        
        // 保存状态历史
        this.stateHistory.push(oldState);
        if (this.stateHistory.length > 10) {
            this.stateHistory.shift(); // 保持历史记录在合理范围内
        }

        // 退出当前状态
        this.exitState(oldState);
        
        // 更新当前状态
        this.currentState = newState;
        
        // 保存状态数据
        this.stateData.set(newState, data);
        
        // 进入新状态
        this.enterState(newState, data);
        
        // 通知监听器
        this.notifyStateChange(oldState, newState, data);
        
        console.log(`State changed: ${oldState} -> ${newState}`);
    }

    /**
     * 返回上一个状态
     */
    goBack() {
        if (this.previousState) {
            this.changeState(this.previousState);
        }
    }

    /**
     * 获取当前状态
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * 获取上一个状态
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * 检查是否为指定状态
     */
    isState(state) {
        return this.currentState === state;
    }

    /**
     * 获取状态数据
     */
    getStateData(state = null) {
        const targetState = state || this.currentState;
        return this.stateData.get(targetState) || {};
    }

    /**
     * 设置状态数据
     */
    setStateData(state, data) {
        const existingData = this.stateData.get(state) || {};
        this.stateData.set(state, { ...existingData, ...data });
    }

    /**
     * 进入状态处理
     */
    enterState(state, data) {
        // 隐藏所有菜单
        this.hideAllMenus();
        
        // 默认移除游戏状态class（除非进入PLAYING状态）
        if (state !== GameState.PLAYING) {
            document.body.classList.remove('game-playing');
        }
        
        switch (state) {
            case GameState.MAIN_MENU:
                console.log('进入主菜单状态');
                this.showMenu('mainMenu');
                this.playMenuMusic();
                break;
                
            case GameState.PLAYING:
                this.hideMenu('mainMenu');
                this.showHUD();
                this.playGameMusic();
                // 添加body class以显示HUD
                document.body.classList.add('game-playing');
                break;
                
            case GameState.PAUSED:
                this.showMenu('pauseMenu');
                this.pauseGameMusic();
                break;
                
            case GameState.GAME_OVER:
                this.showMenu('gameOverMenu');
                this.updateGameOverUI(data);
                this.playGameOverMusic();
                break;
                
            case GameState.SETTINGS:
                this.showMenu('settingsMenu');
                this.updateSettingsUI();
                break;
                
            case GameState.LEADERBOARD:
                this.showMenu('leaderboardMenu');
                this.updateLeaderboardUI();
                break;
                
            case GameState.ACHIEVEMENTS:
                this.showMenu('achievementsMenu');
                this.updateAchievementsUI();
                break;
                
            case GameState.LOADING:
                this.showFullScreenLoadingProgress();
                break;
        }
    }

    /**
     * 退出状态处理
     */
    exitState(state) {
        switch (state) {
            case GameState.MAIN_MENU:
                this.hideMenu('mainMenu');
                break;
                
            case GameState.PLAYING:
                this.hideHUD();
                // 移除body class以隐藏HUD
                document.body.classList.remove('game-playing');
                break;
                
            case GameState.PAUSED:
                this.hideMenu('pauseMenu');
                break;
                
            case GameState.GAME_OVER:
                this.hideMenu('gameOverMenu');
                break;
                
            case GameState.SETTINGS:
                this.hideMenu('settingsMenu');
                break;
                
            case GameState.LEADERBOARD:
                this.hideMenu('leaderboardMenu');
                break;
                
            case GameState.ACHIEVEMENTS:
                this.hideMenu('achievementsMenu');
                break;
                
            case GameState.LOADING:
                this.hideFullScreenLoadingProgress();
                break;
        }
    }

    /**
     * 显示菜单
     */
    showMenu(menuId) {
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.remove('hidden');
        }
    }

    /**
     * 隐藏菜单
     */
    hideMenu(menuId) {
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.add('hidden');
        }
    }

    /**
     * 隐藏所有菜单
     */
    hideAllMenus() {
        const menus = ['mainMenu', 'pauseMenu', 'gameOverMenu', 'settingsMenu', 'leaderboardMenu', 'achievementsMenu'];
        menus.forEach(menuId => this.hideMenu(menuId));
        
        // 确保全屏加载界面不会被隐藏（如果存在的话）
        console.log('隐藏所有菜单，但保留全屏加载界面');
    }

    /**
     * 显示HUD
     */
    showHUD() {
        const hud = document.getElementById('gameHUD');
        if (hud) {
            hud.classList.remove('hidden');
        }
    }

    /**
     * 隐藏HUD
     */
    hideHUD() {
        const hud = document.getElementById('gameHUD');
        if (hud) {
            hud.classList.add('hidden');
        }
    }

    /**
     * 显示加载界面
     */
    showLoadingScreen() {
        // 可以显示加载动画或进度条
        console.log('Loading...');
    }

    /**
     * 隐藏加载界面
     */
    hideLoadingScreen() {
        console.log('Loading complete');
    }

    /**
     * 显示全屏加载进度
     */
    showFullScreenLoadingProgress() {
        console.log('=== 显示全屏加载界面 ===');
        
        // 强制确保所有菜单都隐藏
        this.hideAllMenus();
        
        // 创建全屏遮罩
        let loadingOverlay = document.getElementById('fullScreenLoading');
        if (!loadingOverlay) {
            console.log('创建全屏加载遮罩');
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'fullScreenLoading';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #000814, #001d3d, #003566);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: #00ffff;
                font-family: Arial, sans-serif;
                z-index: 9999;
                overflow: hidden;
            `;
            
            // 立即插入到页面中
            document.body.appendChild(loadingOverlay);
            console.log('全屏加载遮罩已插入DOM');
            
            // 强制重绘
            loadingOverlay.offsetHeight;
            
            loadingOverlay.innerHTML = `
                <!-- 背景动态效果 -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        radial-gradient(2px 2px at 20px 30px, #00ffff, transparent),
                        radial-gradient(2px 2px at 40px 70px, rgba(0, 255, 255, 0.3), transparent),
                        radial-gradient(1px 1px at 90px 40px, #0099cc, transparent),
                        radial-gradient(1px 1px at 130px 80px, rgba(0, 153, 204, 0.3), transparent);
                    background-repeat: repeat;
                    background-size: 150px 150px;
                    animation: starField 20s linear infinite;
                    opacity: 0.6;
                ">
                </div>
                
                <!-- 游戏标题 -->
                <div style="
                    margin-bottom: 60px;
                    text-align: center;
                    position: relative;
                    z-index: 1;
                ">
                    <h1 style="
                        font-size: 48px;
                        font-weight: bold;
                        margin: 0;
                        text-shadow: 0 0 20px #00ffff, 0 0 40px #0099cc;
                        letter-spacing: 2px;
                    ">✈️ 飞机大战</h1>
                    <p style="
                        font-size: 18px;
                        margin: 10px 0 0;
                        opacity: 0.8;
                        letter-spacing: 1px;
                    ">Plane War Game</p>
                </div>
                
                <!-- 加载动画和状态 -->
                <div style="
                    text-align: center;
                    position: relative;
                    z-index: 1;
                ">
                    <!-- 转圈加载器 -->
                    <div style="
                        margin-bottom: 40px;
                        position: relative;
                        display: inline-block;
                    ">
                        <!-- 外圈 -->
                        <div style="
                            width: 120px;
                            height: 120px;
                            border: 4px solid rgba(0, 255, 255, 0.2);
                            border-radius: 50%;
                            position: relative;
                        ">
                            <!-- 旋转的加载圈 -->
                            <div style="
                                position: absolute;
                                top: -4px;
                                left: -4px;
                                width: 120px;
                                height: 120px;
                                border: 4px solid transparent;
                                border-top: 4px solid #00ffff;
                                border-right: 4px solid #00ccff;
                                border-radius: 50%;
                                animation: spin 1.5s linear infinite;
                            "></div>
                            
                            <!-- 内部飞机图标 -->
                            <div style="
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                font-size: 40px;
                                animation: pulse 2s ease-in-out infinite;
                            ">🚀</div>
                        </div>
                        
                        <!-- 加载点动画 -->
                        <div style="
                            margin-top: 20px;
                            display: flex;
                            justify-content: center;
                            gap: 8px;
                        ">
                            <div style="
                                width: 12px;
                                height: 12px;
                                background: #00ffff;
                                border-radius: 50%;
                                animation: dot1 1.4s ease-in-out infinite;
                            "></div>
                            <div style="
                                width: 12px;
                                height: 12px;
                                background: #00ffff;
                                border-radius: 50%;
                                animation: dot2 1.4s ease-in-out infinite;
                            "></div>
                            <div style="
                                width: 12px;
                                height: 12px;
                                background: #00ffff;
                                border-radius: 50%;
                                animation: dot3 1.4s ease-in-out infinite;
                            "></div>
                        </div>
                    </div>
                    
                    <!-- 状态文字 -->
                    <div id="loadingStatus" style="
                        font-size: 22px;
                        margin-bottom: 15px;
                        min-height: 30px;
                        font-weight: 500;
                        color: #00ffff;
                        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                    ">正在启动游戏系统...</div>
                    
                    <!-- 提示文字 -->
                    <div style="
                        font-size: 16px;
                        opacity: 0.7;
                        max-width: 400px;
                        line-height: 1.5;
                        margin: 0 auto;
                    ">正在为您准备最佳的游戏体验，请稍候...</div>
                </div>
            `;
            
                         // 添加CSS动画
             const style = document.createElement('style');
             style.textContent = `
                 @keyframes starField {
                     0% { transform: translateY(0); }
                     100% { transform: translateY(-150px); }
                 }
                 @keyframes spin {
                     0% { transform: rotate(0deg); }
                     100% { transform: rotate(360deg); }
                 }
                 @keyframes pulse {
                     0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                     50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
                 }
                 @keyframes dot1 {
                     0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                     40% { transform: scale(1.2); opacity: 1; }
                 }
                 @keyframes dot2 {
                     0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                     40% { transform: scale(1.2); opacity: 1; }
                     animation-delay: 0.2s;
                 }
                 @keyframes dot3 {
                     0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                     40% { transform: scale(1.2); opacity: 1; }
                     animation-delay: 0.4s;
                 }
             `;
            document.head.appendChild(style);
            
            document.body.appendChild(loadingOverlay);
            console.log('全屏加载界面已添加到页面');
        } else {
            console.log('全屏加载界面已存在，重新显示');
            loadingOverlay.style.display = 'flex';
        }
        
        // 监听音频初始化进度
        const updateProgress = (event) => {
            const { progress, status } = event.detail;
            
            const statusElement = document.getElementById('loadingStatus');
            if (statusElement) {
                statusElement.textContent = status;
            }
        };
        
        // 清理之前的监听器
        window.removeEventListener('audioInitProgress', updateProgress);
        window.addEventListener('audioInitProgress', updateProgress);
        
        // 获取当前进度并更新显示
        const audioManager = AudioManager.getInstance();
        const currentProgress = audioManager.getInitializationProgress();
        updateProgress({ detail: currentProgress });
    }

    /**
     * 隐藏全屏加载进度
     */
    hideFullScreenLoadingProgress() {
        const loadingOverlay = document.getElementById('fullScreenLoading');
        if (loadingOverlay) {
            // 添加淡出动画
            loadingOverlay.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 800);
        }
        

        
        // 清理进度监听器
        window.removeEventListener('audioInitProgress', this.progressUpdateHandler);
    }

    /**
     * 更新游戏结束界面
     */
    updateGameOverUI(data) {
        const finalScoreElement = document.getElementById('finalScore');
        if (finalScoreElement && data.score !== undefined) {
            finalScoreElement.textContent = data.score.toLocaleString();
        }
    }

    /**
     * 更新设置界面
     */
    updateSettingsUI() {
        const audioManager = AudioManager.getInstance();
        
        // 更新音量滑块
        const soundVolumeSlider = document.getElementById('soundVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        
        if (soundVolumeSlider) {
            soundVolumeSlider.value = audioManager.soundVolume * 100;
        }
        
        if (musicVolumeSlider) {
            musicVolumeSlider.value = audioManager.musicVolume * 100;
        }
    }

    /**
     * 更新排行榜界面
     */
    updateLeaderboardUI() {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;

        // 获取排行榜数据
        const scores = this.getLeaderboardData();
        
        leaderboardList.innerHTML = '';
        
        scores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span>#${index + 1}</span>
                <span>${score.name || '匿名玩家'}</span>
                <span>${score.score.toLocaleString()}</span>
            `;
            leaderboardList.appendChild(item);
        });
    }

    /**
     * 更新成就界面
     */
    updateAchievementsUI() {
        const achievementsList = document.getElementById('achievementsList');
        if (!achievementsList) return;

        const achievements = this.getAchievementsData();
        
        achievementsList.innerHTML = '';
        
        achievements.forEach(achievement => {
            const item = document.createElement('div');
            item.className = `achievement-item ${achievement.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            `;
            achievementsList.appendChild(item);
        });
    }

    /**
     * 获取排行榜数据
     */
    getLeaderboardData() {
        const scores = JSON.parse(localStorage.getItem('planewar_leaderboard') || '[]');
        return scores.sort((a, b) => b.score - a.score).slice(0, 10);
    }

    /**
     * 获取成就数据
     */
    getAchievementsData() {
        const defaultAchievements = [
            { id: 'first_kill', title: '首次击杀', description: '击落第一架敌机', icon: '🎯', completed: false },
            { id: 'score_1000', title: '初出茅庐', description: '获得1000分', icon: '⭐', completed: false },
            { id: 'score_10000', title: '小有名气', description: '获得10000分', icon: '🌟', completed: false },
            { id: 'no_damage', title: '完美操作', description: '无伤通过一关', icon: '💎', completed: false },
            { id: 'boss_killer', title: 'BOSS杀手', description: '击败一个BOSS', icon: '👑', completed: false }
        ];
        
        const savedAchievements = JSON.parse(localStorage.getItem('planewar_achievements') || '[]');
        
        // 合并默认成就和已保存的成就
        return defaultAchievements.map(defaultAch => {
            const savedAch = savedAchievements.find(s => s.id === defaultAch.id);
            return savedAch ? { ...defaultAch, ...savedAch } : defaultAch;
        });
    }

    /**
     * 播放菜单音乐
     */
    playMenuMusic() {
        const audioManager = AudioManager.getInstance();
        audioManager.playMusic('main');
    }

    /**
     * 播放游戏音乐
     */
    async playGameMusic() {
        const audioManager = AudioManager.getInstance();
        // 异步播放音乐，避免阻塞UI
        setTimeout(() => {
            audioManager.playMusic('gameplay_theme');
        }, 100); // 延迟100ms播放，让UI先更新
    }

    /**
     * 播放游戏结束音乐
     */
    playGameOverMusic() {
        const audioManager = AudioManager.getInstance();
        audioManager.playMusic('gameOver');
    }

    /**
     * 暂停游戏音乐
     */
    pauseGameMusic() {
        const audioManager = AudioManager.getInstance();
        audioManager.pauseMusic();
    }

    /**
     * 添加状态切换监听器
     */
    onStateChange(callback) {
        if (!this.stateListeners.has('change')) {
            this.stateListeners.set('change', []);
        }
        this.stateListeners.get('change').push(callback);
    }

    /**
     * 移除状态切换监听器
     */
    offStateChange(callback) {
        if (this.stateListeners.has('change')) {
            const listeners = this.stateListeners.get('change');
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 通知状态切换
     */
    notifyStateChange(oldState, newState, data) {
        if (this.stateListeners.has('change')) {
            const listeners = this.stateListeners.get('change');
            for (let callback of listeners) {
                callback(oldState, newState, data);
            }
        }
    }

    /**
     * 保存游戏状态
     */
    saveState() {
        const stateToSave = {
            currentState: this.currentState,
            previousState: this.previousState,
            stateHistory: this.stateHistory,
            stateData: Array.from(this.stateData.entries())
        };
        
        localStorage.setItem('planewar_gamestate', JSON.stringify(stateToSave));
    }

    /**
     * 加载游戏状态
     */
    loadState() {
        const savedState = localStorage.getItem('planewar_gamestate');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.currentState = state.currentState || GameState.MAIN_MENU;
                this.previousState = state.previousState;
                this.stateHistory = state.stateHistory || [];
                this.stateData = new Map(state.stateData || []);
            } catch (e) {
                console.warn('Failed to load game state:', e);
                this.currentState = GameState.MAIN_MENU;
            }
        }
    }

    /**
     * 重置状态管理器
     */
    reset() {
        this.currentState = GameState.MAIN_MENU;
        this.previousState = null;
        this.stateHistory = [];
        this.stateData.clear();
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stateListeners.clear();
        this.stateData.clear();
        GameStateManager.instance = null;
    }
} 