/**
 * 飞机大战主游戏类
 * 负责协调所有游戏系统和组件
 */
class Game {
    constructor() {
        // 画布和上下文
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏状态
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        
        // 管理器实例
        this.inputManager = InputManager.getInstance();
        this.stateManager = GameStateManager.getInstance();
        // 延迟创建AudioManager，让界面先显示
        
        // 碰撞冷却计时器
        this.lastBossCollision = 0;
        
        // 屏幕震动效果
        this.screenShake = { intensity: 0, duration: 0 };
        this.audioManager = null;
        this.imageManager = ImageManager.getInstance();
        this.particleSystem = new ParticleSystem();
        this.achievementManager = new AchievementManager();
        
        // 对象池管理器
        this.poolManager = new ObjectPoolManager();
        
        // 游戏对象
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.boss = null;
        
        // 游戏系统
        this.enemySpawner = new EnemySpawner();
        this.powerUpManager = new PowerUpManager();
        
        // 游戏状态
        this.score = 0;
        this.combo = 0;
        this.gameTime = 0;
        this.bossSpawnTimer = 0;
        this.bossSpawnInterval = 15000; // 15秒后出现Boss（测试用）
        this.nextBossType = 'standard';
        
        // 游戏配置
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            targetFPS: 60,
            difficulty: 1,
            currentLevel: 1,
            debug: false, // 默认关闭调试模式
            playerLives: 1, // 默认1条命
            controlType: 'keyboard' // 默认控制方式为键盘
        };

        // 消息系统
        this.messages = [];
        this.messageMaxTime = 3000; // 消息显示时间（毫秒）
        
        // 背景
        this.background = {
            stars: [],
            scrollSpeed: 50
        };
        
        // 初始化游戏
        this.init();
    }

    /**
     * 初始化游戏
     */
    init() {
        console.log('初始化飞机大战游戏...');
        
        // 设置画布
        this.setupCanvas();
        
        // 初始化背景
        this.initBackground();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 初始化对象池
        this.initObjectPools();
        
        // 先进入加载状态，等待音频初始化完成
        this.stateManager.changeState(GameState.LOADING);
        
        // 延迟创建音频管理器并加载图片资源，确保加载界面先显示
        setTimeout(() => {
            console.log('开始创建音频管理器和初始化音频系统');
            this.audioManager = AudioManager.getInstance();
            
            // 同时开始加载图片资源
            console.log('开始加载图片资源');
            this.imageManager.loadAllImages().then(() => {
                console.log('图片资源加载完成');
            });
        }, 300); // 300ms后开始音频初始化
        
        // 开始游戏循环
        this.start();
    }

    /**
     * 设置画布
     */
    setupCanvas() {
        this.canvas.width = this.config.canvasWidth;
        this.canvas.height = this.config.canvasHeight;
        
        // 设置画布样式
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }

    /**
     * 初始化背景星空
     */
    initBackground() {
        this.background.stars = [];
        for (let i = 0; i < 100; i++) {
            this.background.stars.push({
                x: Math.random() * this.config.canvasWidth,
                y: Math.random() * this.config.canvasHeight,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 50 + 25,
                brightness: Math.random() * 0.8 + 0.2
            });
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 状态切换监听
        this.stateManager.onStateChange((oldState, newState) => {
            this.onStateChange(oldState, newState);
        });
        
        // 输入事件监听
        this.inputManager.on('keyDown', (key) => {
            this.onKeyDown(key);
        });
        
        // UI按钮事件
        this.setupUIEvents();
        
        // 窗口事件
        window.addEventListener('blur', () => {
            if (this.stateManager.isState(GameState.PLAYING)) {
                this.pause();
            }
        });
        
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // 监听音频初始化完成
        window.addEventListener('audioInitComplete', () => {
            console.log('音频初始化完成，等待外部回调切换到主菜单');
            
            // 音频系统初始化完成后，应用保存的音量设置
            this.applyAudioSettings();
            
            // 不再自动切换，而是发送一个游戏准备完成的事件
            window.dispatchEvent(new CustomEvent('gameReadyComplete', {
                detail: { message: '游戏系统初始化完成' }
            }));
        });
    }

    /**
     * 显示主菜单（供外部调用）
     */
    showMainMenu() {
        console.log('外部调用显示主菜单');
        this.stateManager.changeState(GameState.MAIN_MENU);
    }

    /**
     * 设置UI事件
     */
    setupUIEvents() {
        // 主菜单按钮
        const startGameBtn = document.getElementById('startGame');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                console.log('点击了开始游戏按钮');
                this.startNewGame();
            });
            console.log('开始游戏按钮事件绑定成功');
        } else {
            console.error('找不到开始游戏按钮元素');
        }
        
        document.getElementById('showSettings')?.addEventListener('click', () => {
            this.stateManager.changeState(GameState.SETTINGS);
        });
        
        document.getElementById('showLeaderboard')?.addEventListener('click', () => {
            this.stateManager.changeState(GameState.LEADERBOARD);
        });
        
        document.getElementById('showAchievements')?.addEventListener('click', () => {
            this.stateManager.changeState(GameState.ACHIEVEMENTS);
        });
        
        // 暂停菜单按钮
        document.getElementById('resumeGame')?.addEventListener('click', () => {
            this.resume();
        });
        
        document.getElementById('restartGame')?.addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('backToMain')?.addEventListener('click', () => {
            this.stateManager.changeState(GameState.MAIN_MENU);
        });
        
        // 游戏结束菜单按钮
        document.getElementById('retryGame')?.addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('backToMainFromGameOver')?.addEventListener('click', () => {
            this.stateManager.changeState(GameState.MAIN_MENU);
        });
        
        // 设置菜单按钮和滑块
        this.setupSettingsEvents();
        
        // 返回按钮
        document.getElementById('backToMainFromSettings')?.addEventListener('click', () => {
            this.stateManager.goBack();
        });
        
        document.getElementById('backToMainFromLeaderboard')?.addEventListener('click', () => {
            this.stateManager.goBack();
        });
        
        document.getElementById('backToMainFromAchievements')?.addEventListener('click', () => {
            this.stateManager.goBack();
        });
    }

    /**
     * 设置设置菜单事件
     */
    setupSettingsEvents() {
        console.log('设置设置菜单事件监听器...');
        
        const soundVolumeSlider = document.getElementById('soundVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const debugModeCheckbox = document.getElementById('debugMode');
        const playerLivesSelect = document.getElementById('playerLives');
        const controlTypeSelect = document.getElementById('controlType');
        
        // 验证元素是否存在
        console.log('设置元素检查:');
        console.log('soundVolumeSlider:', !!soundVolumeSlider);
        console.log('musicVolumeSlider:', !!musicVolumeSlider);
        console.log('debugModeCheckbox:', !!debugModeCheckbox);
        console.log('playerLivesSelect:', !!playerLivesSelect);
        console.log('controlTypeSelect:', !!controlTypeSelect);
        
        // 检查并确保playerLives选项完整
        if (playerLivesSelect) {
            console.log('当前生命数量选项数量:', playerLivesSelect.options.length);
            
            // 强制重建选项，确保选项正确
            console.log('强制重建生命数量选项...');
            playerLivesSelect.innerHTML = '';
            
            const options = [
                { value: '1', text: '1条命 (100血)' },
                { value: '2', text: '2条命 (200血)' },
                { value: '3', text: '3条命 (300血)' }
            ];
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                option.style.background = '#003366';
                option.style.color = '#ffffff';
                playerLivesSelect.appendChild(option);
                console.log(`添加选项: ${opt.text}`);
            });
            
            console.log('选项重建完成，新的选项数量:', playerLivesSelect.options.length);
            
            // 验证选项是否正确添加
            for (let i = 0; i < playerLivesSelect.options.length; i++) {
                const option = playerLivesSelect.options[i];
                console.log(`验证选项${i}: value="${option.value}", text="${option.text}"`);
            }
            
            // 延迟一秒后自动创建自定义下拉框（给原生select一个机会工作）
            setTimeout(() => {
                console.log('自动创建自定义下拉框以替代原生select...');
                this.createCustomDropdownForPlayerLives();
            }, 1000);
        }
        
        // 同样处理控制方式选择器
        if (controlTypeSelect) {
            setTimeout(() => {
                console.log('自动创建控制方式自定义下拉框...');
                this.createCustomDropdownForControlType();
            }, 1100);
        }
        
        // 加载保存的设置
        this.loadSettings();
        
        soundVolumeSlider?.addEventListener('input', (e) => {
            if (this.audioManager) {
                this.audioManager.setSfxVolume(e.target.value / 100);
            }
            this.saveSettings();
            console.log('音效音量设置为:', e.target.value);
        });
        
        musicVolumeSlider?.addEventListener('input', (e) => {
            if (this.audioManager) {
                this.audioManager.setMusicVolume(e.target.value / 100);
            }
            this.saveSettings();
            console.log('音乐音量设置为:', e.target.value);
        });
        
        debugModeCheckbox?.addEventListener('change', (e) => {
            this.config.debug = e.target.checked;
            this.saveSettings();
            console.log('调试模式设置为:', e.target.checked);
        });
        
        playerLivesSelect?.addEventListener('change', (e) => {
            console.log('生命数量选择器被点击！事件值:', e.target.value);
            this.config.playerLives = parseInt(e.target.value);
            this.saveSettings();
            console.log(`设置玩家生命数量为: ${this.config.playerLives}条命`);
        });
        
        // 确认生命数量选择器事件监听器已设置
        if (playerLivesSelect) {
            console.log('生命数量选择器事件监听器设置成功');
        } else {
            console.error('生命数量选择器未找到！');
        }
        
        // 添加控制方式事件监听器
        controlTypeSelect?.addEventListener('change', (e) => {
            this.config.controlType = e.target.value;
            this.saveSettings();
            console.log(`设置控制方式为: ${this.config.controlType}`);
        });
        
        console.log('设置菜单事件监听器设置完成');
        
        // 添加全局测试函数，用于在控制台测试
        window.testPlayerLivesSelect = () => {
            const select = document.getElementById('playerLives');
            if (select) {
                console.log('生命数量选择器找到，当前值:', select.value);
                console.log('选择器的选项数量:', select.options.length);
                console.log('所有选项:');
                for (let i = 0; i < select.options.length; i++) {
                    const option = select.options[i];
                    console.log(`  选项${i}: value="${option.value}", text="${option.text}"`);
                }
                
                // 手动触发change事件
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
                console.log('手动触发change事件完成');
            } else {
                console.error('未找到生命数量选择器！');
            }
        };
        
        // 添加选项重建函数
        window.rebuildPlayerLivesOptions = () => {
            const select = document.getElementById('playerLives');
            if (select) {
                console.log('重建生命数量选项...');
                select.innerHTML = '';
                
                const options = [
                    { value: '1', text: '1条命 (100血)' },
                    { value: '2', text: '2条命 (200血)' },
                    { value: '3', text: '3条命 (300血)' }
                ];
                
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    select.appendChild(option);
                });
                
                console.log('选项重建完成，新的选项数量:', select.options.length);
                window.testPlayerLivesSelect();
            }
        };
        
        // 添加备用解决方案：自定义下拉框
        window.createCustomDropdown = () => {
            const select = document.getElementById('playerLives');
            if (!select) return;
            
            console.log('创建自定义下拉框...');
            
            // 隐藏原生select
            select.style.display = 'none';
            
            // 创建自定义下拉框
            const customDropdown = document.createElement('div');
            customDropdown.className = 'custom-dropdown';
            customDropdown.style.cssText = `
                position: relative;
                background: #003366;
                border: 1px solid #00ffff;
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 5px;
                cursor: pointer;
                min-width: 180px;
                font-size: 14px;
                z-index: 99999;
                margin-left: 15px;
            `;
            
            // 当前选择显示
            const currentChoice = document.createElement('div');
            currentChoice.textContent = select.options[select.selectedIndex].text;
            currentChoice.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
            
            // 下拉箭头
            const arrow = document.createElement('span');
            arrow.textContent = '▼';
            arrow.style.cssText = 'margin-left: 10px; transition: transform 0.3s; font-size: 12px;';
            currentChoice.appendChild(arrow);
            
            // 选项列表
            const optionsList = document.createElement('div');
            optionsList.className = 'custom-options';
            optionsList.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #003366;
                border: 1px solid #00ffff;
                border-top: none;
                border-radius: 0 0 5px 5px;
                display: none;
                z-index: 999999;
                max-height: 150px;
                overflow-y: auto;
                box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
            `;
            
            // 添加选项
            for (let i = 0; i < select.options.length; i++) {
                const option = select.options[i];
                const customOption = document.createElement('div');
                customOption.textContent = option.text;
                customOption.dataset.value = option.value;
                customOption.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                    transition: background-color 0.2s;
                    font-size: 14px;
                `;
                
                // 当前选中项高亮
                if (option.selected) {
                    customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                }
                
                // 鼠标悬停效果
                customOption.addEventListener('mouseenter', () => {
                    customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
                });
                customOption.addEventListener('mouseleave', () => {
                    if (!option.selected) {
                        customOption.style.backgroundColor = 'transparent';
                    } else {
                        customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                    }
                });
                
                // 点击选择
                customOption.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // 更新原生select的值
                    select.value = customOption.dataset.value;
                    
                    // 更新显示
                    currentChoice.firstChild.textContent = customOption.textContent;
                    
                    // 关闭下拉框
                    optionsList.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                    
                    // 更新选中状态显示
                    optionsList.querySelectorAll('div').forEach(div => {
                        div.style.backgroundColor = 'transparent';
                    });
                    customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                    
                    // 触发原生change事件
                    const changeEvent = new Event('change', { bubbles: true });
                    select.dispatchEvent(changeEvent);
                    
                    console.log('自定义下拉框选择:', customOption.dataset.value);
                });
                
                optionsList.appendChild(customOption);
            }
            
            // 点击展开/收起
            customDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = optionsList.style.display === 'block';
                
                // 关闭其他可能打开的下拉框
                document.querySelectorAll('.custom-options').forEach(opts => {
                    if (opts !== optionsList) {
                        opts.style.display = 'none';
                        const otherArrow = opts.parentNode.querySelector('span');
                        if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
                    }
                });
                
                optionsList.style.display = isOpen ? 'none' : 'block';
                arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            });
            
            // 点击外部关闭
            document.addEventListener('click', (e) => {
                if (!customDropdown.contains(e.target)) {
                    optionsList.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                }
            });
            
            customDropdown.appendChild(currentChoice);
            customDropdown.appendChild(optionsList);
            
            // 替换原select
            select.parentNode.insertBefore(customDropdown, select.nextSibling);
            
            console.log('自定义下拉框创建完成');
        };
        
        console.log('可以在控制台运行以下命令:');
        console.log('- window.testPlayerLivesSelect() 检查选项');
        console.log('- window.rebuildPlayerLivesOptions() 重建选项');
        console.log('- window.createCustomDropdown() 创建自定义下拉框');
    }

    /**
     * 创建自定义下拉框来替代原生select（Game类方法）
     */
    createCustomDropdownForPlayerLives() {
        const select = document.getElementById('playerLives');
        if (!select) {
            console.log('未找到playerLives选择器');
            return;
        }

        // 检查是否已经创建过自定义下拉框
        const existingCustom = select.parentNode.querySelector('.custom-dropdown');
        if (existingCustom) {
            console.log('自定义下拉框已存在');
            return;
        }
        
        console.log('创建自定义下拉框...');
        
        // 隐藏原生select
        select.style.display = 'none';
        
        // 创建自定义下拉框
        const customDropdown = document.createElement('div');
        customDropdown.className = 'custom-dropdown';
        customDropdown.style.cssText = `
            position: relative;
            background: #003366;
            border: 1px solid #00ffff;
            color: #ffffff;
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
            min-width: 180px;
            font-size: 14px;
            z-index: 99999;
            margin-left: 15px;
        `;
        
        // 当前选择显示
        const currentChoice = document.createElement('div');
        currentChoice.textContent = select.options[select.selectedIndex].text;
        currentChoice.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        
        // 下拉箭头
        const arrow = document.createElement('span');
        arrow.textContent = '▼';
        arrow.style.cssText = 'margin-left: 10px; transition: transform 0.3s; font-size: 12px;';
        currentChoice.appendChild(arrow);
        
        // 选项列表
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-options';
        optionsList.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #003366;
            border: 1px solid #00ffff;
            border-top: none;
            border-radius: 0 0 5px 5px;
            display: none;
            z-index: 999999;
            max-height: 150px;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
        `;
        
        // 添加选项
        for (let i = 0; i < select.options.length; i++) {
            const option = select.options[i];
            const customOption = document.createElement('div');
            customOption.textContent = option.text;
            customOption.dataset.value = option.value;
            customOption.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                transition: background-color 0.2s;
                font-size: 14px;
            `;
            
            // 当前选中项高亮
            if (option.selected) {
                customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
            }
            
            // 鼠标悬停效果
            customOption.addEventListener('mouseenter', () => {
                customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
            });
            customOption.addEventListener('mouseleave', () => {
                if (!option.selected) {
                    customOption.style.backgroundColor = 'transparent';
                } else {
                    customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                }
            });
            
            // 点击选择
            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 更新原生select的值
                select.value = customOption.dataset.value;
                
                // 更新显示
                currentChoice.firstChild.textContent = customOption.textContent;
                
                // 关闭下拉框
                optionsList.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
                
                // 更新选中状态显示
                optionsList.querySelectorAll('div').forEach(div => {
                    div.style.backgroundColor = 'transparent';
                });
                customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                
                // 触发原生change事件
                const changeEvent = new Event('change', { bubbles: true });
                select.dispatchEvent(changeEvent);
                
                console.log('自定义下拉框选择:', customOption.dataset.value);
            });
            
            optionsList.appendChild(customOption);
        }
        
        // 点击展开/收起
        customDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = optionsList.style.display === 'block';
            
            // 关闭其他可能打开的下拉框
            document.querySelectorAll('.custom-options').forEach(opts => {
                if (opts !== optionsList) {
                    opts.style.display = 'none';
                    const otherArrow = opts.parentNode.querySelector('span');
                    if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
                }
            });
            
            optionsList.style.display = isOpen ? 'none' : 'block';
            arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        });
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!customDropdown.contains(e.target)) {
                optionsList.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            }
        });
        
        customDropdown.appendChild(currentChoice);
        customDropdown.appendChild(optionsList);
        
        // 替换原select
        select.parentNode.insertBefore(customDropdown, select.nextSibling);
        
        console.log('自定义下拉框创建完成');
    }

    /**
     * 创建控制方式自定义下拉框
     */
    createCustomDropdownForControlType() {
        const select = document.getElementById('controlType');
        if (!select) {
            console.log('未找到controlType选择器');
            return;
        }

        // 检查是否已经创建过自定义下拉框
        const existingCustom = select.parentNode.querySelector('.custom-dropdown');
        if (existingCustom) {
            console.log('控制方式自定义下拉框已存在');
            return;
        }
        
        console.log('创建控制方式自定义下拉框...');
        
        // 隐藏原生select
        select.style.display = 'none';
        
        // 创建自定义下拉框
        const customDropdown = document.createElement('div');
        customDropdown.className = 'custom-dropdown';
        customDropdown.style.cssText = `
            position: relative;
            background: #003366;
            border: 1px solid #00ffff;
            color: #ffffff;
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
            min-width: 150px;
            font-size: 14px;
            z-index: 99999;
            margin-left: 15px;
        `;
        
        // 当前选择显示
        const currentChoice = document.createElement('div');
        currentChoice.textContent = select.options[select.selectedIndex].text;
        currentChoice.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        
        // 下拉箭头
        const arrow = document.createElement('span');
        arrow.textContent = '▼';
        arrow.style.cssText = 'margin-left: 10px; transition: transform 0.3s; font-size: 12px;';
        currentChoice.appendChild(arrow);
        
        // 选项列表
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-options';
        optionsList.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #003366;
            border: 1px solid #00ffff;
            border-top: none;
            border-radius: 0 0 5px 5px;
            display: none;
            z-index: 999999;
            max-height: 150px;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
        `;
        
        // 添加选项
        for (let i = 0; i < select.options.length; i++) {
            const option = select.options[i];
            const customOption = document.createElement('div');
            customOption.textContent = option.text;
            customOption.dataset.value = option.value;
            customOption.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                transition: background-color 0.2s;
                font-size: 14px;
            `;
            
            // 当前选中项高亮
            if (option.selected) {
                customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
            }
            
            // 鼠标悬停效果
            customOption.addEventListener('mouseenter', () => {
                customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
            });
            customOption.addEventListener('mouseleave', () => {
                if (!option.selected) {
                    customOption.style.backgroundColor = 'transparent';
                } else {
                    customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                }
            });
            
            // 点击选择
            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 更新原生select的值
                select.value = customOption.dataset.value;
                
                // 更新显示
                currentChoice.firstChild.textContent = customOption.textContent;
                
                // 关闭下拉框
                optionsList.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
                
                // 更新选中状态显示
                optionsList.querySelectorAll('div').forEach(div => {
                    div.style.backgroundColor = 'transparent';
                });
                customOption.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                
                // 触发原生change事件
                const changeEvent = new Event('change', { bubbles: true });
                select.dispatchEvent(changeEvent);
                
                console.log('控制方式自定义下拉框选择:', customOption.dataset.value);
            });
            
            optionsList.appendChild(customOption);
        }
        
        // 点击展开/收起
        customDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = optionsList.style.display === 'block';
            
            // 关闭其他可能打开的下拉框
            document.querySelectorAll('.custom-options').forEach(opts => {
                if (opts !== optionsList) {
                    opts.style.display = 'none';
                    const otherArrow = opts.parentNode.querySelector('span');
                    if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
                }
            });
            
            optionsList.style.display = isOpen ? 'none' : 'block';
            arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        });
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!customDropdown.contains(e.target)) {
                optionsList.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            }
        });
        
        customDropdown.appendChild(currentChoice);
        customDropdown.appendChild(optionsList);
        
        // 替换原select
        select.parentNode.insertBefore(customDropdown, select.nextSibling);
        
        console.log('控制方式自定义下拉框创建完成');
    }

    /**
     * 加载设置
     */
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('planewar_settings') || '{}');
            
            // 读取调试模式设置，默认关闭
            const debugModeCheckbox = document.getElementById('debugMode');
            if (settings.debug !== undefined) {
                this.config.debug = settings.debug;
            } else {
                // 如果没有保存的设置，使用默认值（false）
                this.config.debug = false;
            }
            if (debugModeCheckbox) {
                debugModeCheckbox.checked = this.config.debug;
            }
            
            // 读取生命数量设置，默认1条命
            const playerLivesSelect = document.getElementById('playerLives');
            if (settings.playerLives !== undefined) {
                this.config.playerLives = parseInt(settings.playerLives);
            } else {
                // 如果没有保存的设置，使用默认值（1条命）
                this.config.playerLives = 1;
            }
            if (playerLivesSelect) {
                playerLivesSelect.value = this.config.playerLives.toString();
            }
            
            // 应用音量设置（仅在audioManager存在时）
            if (settings.soundVolume !== undefined) {
                const soundVolumeSlider = document.getElementById('soundVolume');
                if (soundVolumeSlider) {
                    soundVolumeSlider.value = settings.soundVolume;
                    if (this.audioManager) {
                        this.audioManager.setSfxVolume(settings.soundVolume / 100);
                    }
                }
            }
            
            if (settings.musicVolume !== undefined) {
                const musicVolumeSlider = document.getElementById('musicVolume');
                if (musicVolumeSlider) {
                    musicVolumeSlider.value = settings.musicVolume;
                    if (this.audioManager) {
                        this.audioManager.setMusicVolume(settings.musicVolume / 100);
                    }
                }
            }
            
            // 应用控制方式设置
            if (settings.controlType !== undefined) {
                const controlTypeSelect = document.getElementById('controlType');
                if (controlTypeSelect) {
                    controlTypeSelect.value = settings.controlType;
                }
                this.config.controlType = settings.controlType;
            } else {
                // 如果没有保存的设置，使用默认值
                this.config.controlType = 'keyboard';
            }
        } catch (error) {
            console.warn('加载设置失败:', error);
        }
    }
    
    /**
     * 保存设置
     */
    saveSettings() {
        try {
            const settings = {
                debug: this.config.debug,
                playerLives: this.config.playerLives || 1,
                controlType: this.config.controlType || 'keyboard',
                soundVolume: document.getElementById('soundVolume')?.value || 50,
                musicVolume: document.getElementById('musicVolume')?.value || 30
            };
            
            localStorage.setItem('planewar_settings', JSON.stringify(settings));
        } catch (error) {
            console.warn('保存设置失败:', error);
        }
    }

    /**
     * 应用音频设置（在音频系统初始化完成后调用）
     */
    applyAudioSettings() {
        if (!this.audioManager) return;
        
        try {
            const savedSettings = localStorage.getItem('planewar_settings');
            const settings = savedSettings ? JSON.parse(savedSettings) : {};
            
            // 应用音量设置
            if (settings.soundVolume !== undefined) {
                this.audioManager.setSfxVolume(settings.soundVolume / 100);
                console.log('应用音效音量设置:', settings.soundVolume);
            }
            
            if (settings.musicVolume !== undefined) {
                this.audioManager.setMusicVolume(settings.musicVolume / 100);
                console.log('应用音乐音量设置:', settings.musicVolume);
            }
        } catch (error) {
            console.warn('应用音频设置失败:', error);
        }
    }

    /**
     * 初始化对象池
     */
    initObjectPools() {
        // 子弹对象池
        this.poolManager.getPool('bullet', 
            () => new Bullet(0, 0),
            (bullet, x, y, vx, vy, type) => {
                bullet.reset(x, y, vx, vy, type);
            },
            50
        );
        
        // 敌机对象池
        this.poolManager.getPool('enemy',
            () => new Enemy(0, 0),
            (enemy, x, y, type) => {
                enemy.reset(x, y, type);
            },
            20
        );
        
        // 道具对象池
        this.poolManager.getPool('powerup',
            () => new PowerUp(0, 0),
            (powerup, x, y, type) => {
                powerup.reset(x, y, type);
            },
            10
        );
        
        // Boss对象池 - 延迟创建，避免初始化时阻塞
        this.poolManager.getPool('boss',
            () => {
                // 只有在实际需要时才创建Boss实例
                console.log('按需创建Boss实例');
                return new Boss(0, 0);
            },
            (boss, x, y, type) => {
                boss.reset(x, y, type);
            },
            0  // 初始时不预创建Boss实例
        );
    }

    /**
     * 开始新游戏
     */
    startNewGame() {
        console.log('开始新游戏');
        
        try {
            // 先停止当前背景音乐，避免重复播放
            if (this.audioManager) {
                this.audioManager.stopMusic(false);
            }
            
            // 重置游戏状态
            this.reset();
            
            // 初始化成就系统
            this.achievementManager.startNewGame();
            
            // 立即创建玩家，确保游戏状态正确
            this.createPlayer();
            
            // 切换到游戏状态
            this.stateManager.changeState(GameState.PLAYING);
            
            // 播放游戏开始音效
            if (this.audioManager) {
                this.audioManager.playSound('game_start', 0.8);
            }
            
            console.log('新游戏启动成功，玩家已创建');
            
        } catch (error) {
            console.error('启动新游戏失败:', error);
        }
    }

    /**
     * 重置游戏
     */
    reset() {
        // 清空所有游戏对象
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.boss = null;
        
        // 重置游戏系统
        this.enemySpawner.reset();
        this.powerUpManager.reset();
        
        // 重置游戏状态
        this.score = 0;
        this.combo = 0;
        this.gameTime = 0;
        this.bossSpawnTimer = 0;
        this.nextBossType = 'standard';
        
        // 重置对象池
        this.poolManager.clearAll();
        this.initObjectPools();
        
        // 重置粒子系统
        this.particleSystem.clear();
        
        // 重置游戏配置
        this.config.difficulty = 1;
        this.config.currentLevel = 1;
        
        // 更新UI显示
        this.updateUI();
    }

    /**
     * 创建玩家
     */
    createPlayer() {
        this.player = new Player(
            this.config.canvasWidth / 2,
            this.config.canvasHeight * 0.8
        );
        this.player.setCanvasSize(this.config.canvasWidth, this.config.canvasHeight);
    }

    /**
     * 创建子弹
     */
    createBullet(x, y, vx = 0, vy = -500, type = 'player') {
        // 限制子弹数量，避免性能问题
        const maxBullets = 200; // 提高子弹数量限制
        if (this.bullets.length >= maxBullets) {
            // 清理已销毁的子弹，为新子弹腾出空间
            this.bullets = this.bullets.filter(bullet => !bullet.destroyed);
            // 如果清理后仍然太多，就不创建新子弹
            if (this.bullets.length >= maxBullets) {
                return null;
            }
        }
        
        // 直接创建子弹，暂时不使用对象池以避免复杂性
        const bullet = new Bullet(x, y);
        bullet.reset(x, y, vx, vy, type);
        this.bullets.push(bullet);
        return bullet;
    }

    /**
     * 创建敌机
     */
    createEnemy(x, y, type = 'basic') {
        // 直接创建敌机，暂时不使用对象池以避免复杂性
        const enemy = new Enemy(x, y);
        enemy.reset(x, y, type);
        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * 创建道具
     */
    createPowerUp(x, y, type = null) {
        return this.powerUpManager.createPowerUp(x, y, type);
    }
    
    /**
     * 创建Boss
     */
    createBoss(x, y, type = 'standard') {
        console.log('=== 开始创建Boss ===');
        console.log(`参数: x=${x}, y=${y}, type=${type}`);
        
        if (this.boss && this.boss.active) {
            console.log('已有活跃Boss，取消创建');
            return null; // 已有活跃Boss，不创建新的
        }
        
        try {
            console.log('检查Boss类是否存在:', typeof Boss);
            if (typeof Boss === 'undefined') {
                console.error('Boss类未定义！请检查Boss.js是否正确加载');
                this.showMessage('Boss类加载失败！', 2000);
                return null;
            }
            
            // 直接创建Boss
            console.log('正在实例化Boss...');
            this.boss = new Boss(x, y);
            console.log('Boss实例创建成功:', this.boss);
            
            console.log('正在重置Boss状态...');
            this.boss.reset(x, y, type);
            console.log('Boss重置完成, active:', this.boss.active);
            
            // 播放Boss警告音效
            if (this.audioManager) {
                console.log('播放Boss警告音效');
                this.audioManager.playSound('boss_warning', 1.0);
            }
            
            console.log(`=== Boss创建成功: ${type} at (${x}, ${y}) ===`);
            return this.boss;
            
        } catch (error) {
            console.error('创建Boss时发生错误:', error);
            this.showMessage('Boss创建失败: ' + error.message, 3000);
            return null;
        }
    }

    /**
     * 添加分数
     */
    addScore(points, x = null, y = null) {
        // 基础分数
        let finalScore = points;
        
        // 连击倍数
        if (this.achievementManager.stats.currentCombo > 1) {
            const comboMultiplier = Math.min(1 + (this.achievementManager.stats.currentCombo - 1) * 0.1, 3.0); // 最大3倍
            finalScore = Math.floor(points * comboMultiplier);
        }
        
        // 玩家分数倍数
        if (this.player && this.player.scoreMultiplier > 1) {
            finalScore = Math.floor(finalScore * this.player.scoreMultiplier);
        }
        
        this.score += finalScore;
        this.achievementManager.stats.totalScore = this.score; // 更新成就系统的分数
        
        // 显示浮动分数
        if (x !== null && y !== null) {
            this.showFloatingScore(finalScore, x, y, this.achievementManager.stats.currentCombo);
        }
        
        // 更新UI
        this.updateUI();
        
        console.log(`获得 ${finalScore} 分 (基础: ${points}, 连击: ${this.achievementManager.stats.currentCombo})`);
    }
    
    /**
     * 记录敌机击杀
     */
    recordEnemyKill(enemyType, score, x, y) {
        try {
            console.log(`击杀记录: ${enemyType}, +${score}分`);
            
            // 记录到成就系统
            this.achievementManager.recordKill(enemyType, score);
            
            // 播放连击音效
            const combo = this.achievementManager.stats.currentCombo;
            if (combo >= 10) {
                this.audioManager.playSound('combo_increase', 1.0, 1.5); // 高音调
            } else if (combo >= 5) {
                this.audioManager.playSound('combo_increase', 0.8, 1.2);
            } else if (combo >= 3) {
                this.audioManager.playSound('combo_increase', 0.6, 1.0);
            }
            
            // 添加分数（带位置信息）
            this.addScore(score, x, y);
            
            // 记录玩家击杀数
            if (this.player) {
                this.player.addKill();
            }
            
            console.log(`当前连击: ${this.achievementManager.stats.currentCombo}`);
            
        } catch (error) {
            console.error('recordEnemyKill出错:', error);
        }
    }
    
    /**
     * 重置连击
     */
    resetCombo() {
        if (this.achievementManager.stats.currentCombo > 0) {
            console.log(`连击中断，最大连击: ${this.achievementManager.stats.currentCombo}`);
            
            // 播放连击中断音效
            this.audioManager.playSound('combo_break', 0.7);
            
            this.achievementManager.resetCombo();
        }
    }
    
    /**
     * 显示浮动文字
     */
    showFloatingText(options) {
        if (!this.floatingTexts) {
            this.floatingTexts = [];
        }
        
        const floatingText = {
            x: options.x || 0,
            y: options.y || 0,
            text: options.text || '',
            color: options.color || '#ffffff',
            size: options.size || 14,
            life: options.life || 1.0,
            maxLife: options.life || 1.0,
            velocity: options.velocity || { x: 0, y: -60 }
        };
        
        this.floatingTexts.push(floatingText);
    }

    /**
     * 显示浮动分数
     */
    showFloatingScore(score, x, y, combo = 0) {
        if (!this.floatingTexts) {
            this.floatingTexts = [];
        }
        
        // 根据连击数确定颜色和大小
        let color = '#ffff00';
        let size = 16;
        let text = `+${score}`;
        
        if (combo > 1) {
            text = `+${score} x${combo}`;
            if (combo >= 10) {
                color = '#ff0066'; // 高连击紫红色
                size = 20;
            } else if (combo >= 5) {
                color = '#ff6600'; // 中连击橙色
                size = 18;
            } else {
                color = '#00ff00'; // 低连击绿色
                size = 17;
            }
        }
        
        const floatingScore = {
            x: x + (Math.random() - 0.5) * 30,
            y: y - 10,
            text: text,
            color: color,
            size: size,
            life: 1.5,
            maxLife: 1.5,
            velocity: {
                x: (Math.random() - 0.5) * 40,
                y: -120
            }
        };
        
        this.floatingTexts.push(floatingScore);
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        if (!this.player) return;
        
        // 更新生命爱心
        this.updateLivesDisplay();
        
        // 更新血量条
        this.updateHealthDisplay();
        
        // 更新分数
        this.updateScoreDisplay();
        
        // 更新等级
        this.updateLevelDisplay();
        
        // 更新武器信息
        this.updateWeaponDisplay();
        
        // 更新连击显示
        this.updateComboDisplay();
        
        // 更新分数倍数显示
        this.updateScoreMultiplierDisplay();
        
        // 更新僚机数量显示
        this.updateWingmanDisplay();
    }
    
    /**
     * 更新生命爱心显示
     */
    updateLivesDisplay() {
        if (!this.player) return;
        
        const livesContainer = document.getElementById('livesContainer');
        if (livesContainer) {
            const hearts = livesContainer.querySelectorAll('.heart');
            hearts.forEach((heart, index) => {
                if (index < this.player.lives) {
                    heart.classList.remove('lost');
                } else {
                    heart.classList.add('lost');
                }
            });
        }
    }
    
    /**
     * 更新血量显示
     */
    updateHealthDisplay() {
        if (!this.player) return;
        
        // 更新血量数字
        const hpElement = document.getElementById('hp');
        if (hpElement) {
            hpElement.textContent = `${this.player.hp}/${this.player.maxHp}`;
        }
        
        // 更新血量条
        const hpBarElement = document.getElementById('hpBar');
        if (hpBarElement) {
            const hpPercentage = (this.player.hp / this.player.maxHp) * 100;
            hpBarElement.style.width = `${hpPercentage}%`;
            
            // 根据血量改变颜色
            if (hpPercentage > 60) {
                hpBarElement.style.background = 'linear-gradient(90deg, #00ff00, #44ff44)';
                hpBarElement.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.6)';
            } else if (hpPercentage > 30) {
                hpBarElement.style.background = 'linear-gradient(90deg, #ffff00, #ffaa00)';
                hpBarElement.style.boxShadow = '0 0 8px rgba(255, 255, 0, 0.6)';
            } else {
                hpBarElement.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
                hpBarElement.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.6)';
            }
        }
    }
    
    /**
     * 更新等级显示
     */
    updateLevelDisplay() {
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.config.currentLevel.toString();
        }
    }
    
    /**
     * 更新武器信息显示
     */
    updateWeaponDisplay() {
        if (!this.player) return;
        
        // 更新主武器信息
        const primaryWeaponElement = document.getElementById('primaryWeapon');
        const weaponLevelElement = document.getElementById('weaponLevel');
        if (primaryWeaponElement) {
            primaryWeaponElement.textContent = this.player.getWeaponDisplayName(this.player.primaryWeapon);
        }
        if (weaponLevelElement) {
            weaponLevelElement.textContent = `Lv.${this.player.weaponLevel}`;
        }
        
        // 更新副武器信息
        const secondaryWeaponsElement = document.getElementById('secondaryWeapons');
        if (secondaryWeaponsElement) {
            if (this.player.secondaryWeapons && this.player.secondaryWeapons.length > 0) {
                const weaponNames = this.player.secondaryWeapons.map(w => this.player.getWeaponDisplayName(w)).join(', ');
                secondaryWeaponsElement.textContent = weaponNames;
            } else {
                secondaryWeaponsElement.textContent = '无';
            }
        }
    }

    /**
     * 更新连击显示
     */
    updateComboDisplay() {
        const comboDisplay = document.getElementById('comboDisplay');
        const comboValue = document.getElementById('comboValue');
        
        if (comboDisplay && comboValue) {
            const combo = this.achievementManager.stats.currentCombo;
            
            if (combo >= 2) {
                comboDisplay.style.display = 'flex';
                comboValue.textContent = combo;
                
                // 根据连击数调整颜色
                if (combo >= 20) {
                    comboDisplay.style.borderColor = '#ff00ff';
                    comboDisplay.style.background = 'rgba(255, 0, 255, 0.2)';
                } else if (combo >= 10) {
                    comboDisplay.style.borderColor = '#ff0066';
                    comboDisplay.style.background = 'rgba(255, 0, 100, 0.2)';
                } else if (combo >= 5) {
                    comboDisplay.style.borderColor = '#ff6600';
                    comboDisplay.style.background = 'rgba(255, 100, 0, 0.2)';
                } else {
                    comboDisplay.style.borderColor = '#00ff00';
                    comboDisplay.style.background = 'rgba(0, 255, 0, 0.2)';
                }
            } else {
                comboDisplay.style.display = 'none';
            }
        }
    }
    
    /**
     * 更新分数倍数显示
     */
    updateScoreMultiplierDisplay() {
        const multiplierDisplay = document.getElementById('scoreMultiplier');
        const multiplierValue = document.getElementById('scoreMultiplierValue');
        
        if (multiplierDisplay && multiplierValue && this.player) {
            if (this.player.scoreMultiplier > 1) {
                multiplierDisplay.style.display = 'flex';
                multiplierValue.textContent = `x${this.player.scoreMultiplier.toFixed(1)}`;
            } else {
                multiplierDisplay.style.display = 'none';
            }
        }
    }
    
    /**
     * 更新僚机数量显示
     */
    updateWingmanDisplay() {
        const wingmanDisplay = document.getElementById('wingmanCount');
        const wingmanValue = document.getElementById('wingmanValue');
        
        if (wingmanDisplay && wingmanValue && this.player) {
            const wingmanCount = this.player.wingmen ? this.player.wingmen.length : 0;
            
            if (wingmanCount > 0) {
                wingmanDisplay.style.display = 'flex';
                wingmanValue.textContent = wingmanCount;
            } else {
                wingmanDisplay.style.display = 'none';
            }
        }
    }

    /**
     * 更新分数显示
     */
    updateScoreDisplay() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score.toString();
        }
    }

    /**
     * 开始游戏循环
     */
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    /**
     * 停止游戏循环
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * 暂停游戏
     */
    pause() {
        if (this.stateManager.isState(GameState.PLAYING)) {
            this.stateManager.changeState(GameState.PAUSED);
        }
    }

    /**
     * 恢复游戏
     */
    resume() {
        if (this.stateManager.isState(GameState.PAUSED)) {
            this.stateManager.changeState(GameState.PLAYING);
        }
    }

    /**
     * 主游戏循环
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        try {
            const currentTime = performance.now();
            this.deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // 限制deltaTime以避免大的跳跃
            this.deltaTime = Math.min(this.deltaTime, 1/30);
            
            // 更新FPS计数
            this.updateFPS();
            
            // 更新游戏
            this.update(this.deltaTime);
            
            // 渲染游戏
            this.render();
            
            // 更新输入管理器（清除当前帧状态）
            this.inputManager.update();
            
            // 继续循环
            requestAnimationFrame(() => this.gameLoop());
        } catch (error) {
            console.error('游戏循环中发生错误:', error);
            console.error('错误堆栈:', error.stack);
            this.stop();
        }
    }

    /**
     * 更新FPS
     */
    updateFPS() {
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1 / this.deltaTime);
        }
    }

    /**
     * 更新游戏逻辑
     */
    update(deltaTime) {
        // 根据游戏状态更新
        switch (this.stateManager.getCurrentState()) {
            case GameState.PLAYING:
                this.updateGameplay(deltaTime);
                break;
            case GameState.MAIN_MENU:
            case GameState.PAUSED:
            case GameState.GAME_OVER:
                // 这些状态下只更新背景和粒子效果
                this.updateBackground(deltaTime);
                this.particleSystem.update(deltaTime);
                break;
        }
    }

    /**
     * 更新游戏玩法
     */
    updateGameplay(deltaTime) {
        // 更新游戏时间
        this.gameTime += deltaTime;
        
        // 更新背景
        this.updateBackground(deltaTime);
        
        // 更新玩家
        if (this.player && this.player.active) {
            this.player.update(deltaTime);
        }
        
        // 更新敌机
        this.updateEnemies(deltaTime);
        
        // 更新Boss
        this.updateBoss(deltaTime);
        
        // 更新子弹
        this.updateBullets(deltaTime);
        
        // 更新道具管理器
        this.powerUpManager.update(deltaTime);
        
        // 更新粒子系统
        this.particleSystem.update(deltaTime);

        // 更新成就系统
        this.achievementManager.updateNotifications(deltaTime);
        this.achievementManager.recordPlayTime(deltaTime);

        // 更新消息
        this.updateMessages(deltaTime);
        
        // 更新浮动文字
        this.updateFloatingTexts(deltaTime);
        
        // 生成敌机
        this.spawnEnemies(deltaTime);
        
        // 生成Boss
        this.spawnBoss(deltaTime);
        
        // 检测碰撞
        this.checkCollisions();
        
        // 清理销毁的对象
        this.cleanup();
        
        // 检查游戏结束条件
        this.checkGameOver();
        
        // 更新屏幕震动
        this.updateScreenShake(deltaTime);
    }

    /**
     * 更新背景
     */
    updateBackground(deltaTime) {
        this.background.stars.forEach(star => {
            star.y += star.speed * deltaTime;
            if (star.y > this.config.canvasHeight) {
                star.y = -5;
                star.x = Math.random() * this.config.canvasWidth;
            }
        });
    }

    /**
     * 更新敌机
     */
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.destroyed) {
                this.enemies.splice(i, 1);
                continue;
            }
            
            enemy.update(deltaTime);
        }
    }

    /**
     * 更新子弹
     */
    updateBullets(deltaTime) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (bullet.destroyed) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            bullet.update(deltaTime);
        }
    }

    /**
     * 更新Boss
     */
    updateBoss(deltaTime) {
        if (this.boss && this.boss.active) {
            this.boss.onUpdate(deltaTime);
            
            // 检查Boss是否死亡
            if (this.boss.isDead() && !this.boss.deathAnimation.active) {
                this.onBossDefeated();
            }
        }
    }

    /**
     * 更新道具
     */
    updatePowerUps(deltaTime) {
        this.powerUpManager.update(deltaTime);
    }

    /**
     * 生成敌机
     */
    spawnEnemies(deltaTime) {
        // 如果有活跃的Boss，停止生成其他敌机
        if (this.boss && this.boss.active && !this.boss.isDead()) {
            console.log('Boss存在，停止生成敌机');
            return;
        }
        
        this.enemySpawner.update(deltaTime);
    }

    /**
     * 生成Boss
     */
    spawnBoss(deltaTime) {
        // 如果已经有活跃的Boss，不生成新的
        if (this.boss && this.boss.active) {
            return;
        }
        
        // 更新Boss生成计时器
        this.bossSpawnTimer += deltaTime;
        
        // 检查是否应该生成Boss
        if (this.bossSpawnTimer >= this.bossSpawnInterval) {
            const x = this.config.canvasWidth / 2;
            const y = -100; // 从屏幕上方出现
            
            this.createBoss(x, y, this.nextBossType);
            
            // 重置计时器和设置下一个Boss类型
            this.bossSpawnTimer = 0;
            this.bossSpawnInterval = Math.max(60000, this.bossSpawnInterval - 10000); // 逐渐缩短间隔
            
            // 循环选择Boss类型
            const bossTypes = ['standard', 'fast', 'heavy', 'ultimate'];
            const currentIndex = bossTypes.indexOf(this.nextBossType);
            this.nextBossType = bossTypes[(currentIndex + 1) % bossTypes.length];
            
            // 显示Boss出现提示
            this.showMessage('强敌出现！', 3000);
        }
    }

    /**
     * 生成道具
     */
    spawnPowerUps(deltaTime) {
        // 道具生成由敌机销毁时自动触发
        // 这里可以添加额外的道具生成逻辑
    }
    
    /**
     * Boss被击败时的处理
     */
    onBossDefeated() {
        if (!this.boss) return;
        
        const bossScore = this.boss.getScoreValue();
        
        // 记录Boss击杀到成就系统
        this.achievementManager.recordKill('boss', bossScore);
        
        // 添加分数
        this.addScore(bossScore, this.boss.x, this.boss.y);
        
        // 显示Boss击败消息
        this.showMessage(`Boss已击败！获得 ${bossScore} 分！`, 4000);
        
        // 生成奖励道具
        this.createPowerUp(this.boss.x, this.boss.y, 'weapon');
        this.createPowerUp(this.boss.x - 30, this.boss.y + 30, 'health');
        this.createPowerUp(this.boss.x + 30, this.boss.y + 30, 'score');
        
        // 播放胜利音效
        this.audioManager.playSound('victory', 1.0);
        
        // 清空Boss
        this.boss = null;
        
        console.log('Boss已被击败');
    }

    /**
     * 检测碰撞
     */
    checkCollisions() {
        if (!this.player || !this.player.active) return;
        
        // 玩家子弹 vs 敌机
        this.bullets.forEach(bullet => {
            // 判断是否为玩家子弹
            const isPlayerBullet = ['player', 'laser', 'laser_beam', 'missile', 'plasma', 'spread', 'piercing', 'energy_beam', 'bezier_missile'].includes(bullet.type);
            
            if (isPlayerBullet && !bullet.destroyed) {
                this.enemies.forEach(enemy => {
                    if (!enemy.destroyed && this.checkCollision(bullet, enemy)) {
                        bullet.onCollision(enemy);
                        enemy.onCollision(bullet);
                    }
                });
                
                // 玩家子弹 vs Boss
                if (this.boss && this.boss.active && !this.boss.isDead()) {
                    if (this.checkCollision(bullet, this.boss)) {
                        const damage = bullet.damage || 100;
                        const actualDamage = this.boss.takeDamage(damage);
                        bullet.destroy();
                        
                        // 显示伤害数字
                        this.showFloatingText({
                            text: `-${actualDamage}`,
                            x: this.boss.x,
                            y: this.boss.y - 20,
                            color: '#ff6666',
                            size: 16,
                            velocity: { x: 0, y: -50 }
                        });
                    }
                }
            }
        });
        
        // 敌机子弹 vs 玩家 (包括Boss子弹)
        this.bullets.forEach(bullet => {
            // 判断是否为敌机子弹 - 扩展支持所有敌机武器类型
            const isEnemyBullet = ['enemy', 'heavy_bullet', 'elite_bullet', 'interceptor_bullet', 'bomb', 'enemyBoss', 'boss_laser', 'missile', 'shockwave'].includes(bullet.type);
            
            if (isEnemyBullet && !bullet.destroyed) {
                if (this.checkCollision(bullet, this.player)) {
                    bullet.onCollision(this.player);
                    this.player.onCollision(bullet);
                }
            }
        });
        
        // 敌机 vs 玩家
        this.enemies.forEach(enemy => {
            if (!enemy.destroyed && this.checkCollision(enemy, this.player)) {
                enemy.onCollision(this.player);
                this.player.onCollision(enemy);
            }
        });
        
        // Boss vs 玩家 - 移除伤害，只显示视觉效果
        if (this.boss && this.boss.active && !this.boss.isDead()) {
            if (this.checkCollision(this.boss, this.player)) {
                // 防止连续碰撞音效
                const now = Date.now();
                if (!this.lastBossCollision || now - this.lastBossCollision > 1000) { // 1秒冷却
                    
                    // 只显示碰撞效果，不造成伤害
                    this.showFloatingText({
                        text: '碰撞！',
                        x: this.player.x,
                        y: this.player.y - 30,
                        color: '#ffff00',
                        size: 18,
                        velocity: { x: 0, y: -60 }
                    });
                    
                    // 播放碰撞音效
                    if (this.audioManager) {
                        this.audioManager.playSound('player_hit', 0.5);
                    }
                    
                    this.lastBossCollision = now;
                    console.log('Boss碰撞玩家，无伤害');
                }
            }
        }
        
        // 玩家 vs 道具
        this.powerUpManager.powerUps.forEach(powerup => {
            if (!powerup.destroyed && this.checkCollision(powerup, this.player)) {
                powerup.onCollision(this.player);
            }
        });
    }

    /**
     * 检查两个对象是否碰撞
     */
    checkCollision(obj1, obj2) {
        if (!obj1 || !obj2 || obj1.destroyed || obj2.destroyed) {
            return false;
        }
        
        // 使用AABB(轴对齐边界框)碰撞检测，更适合矩形对象
        const obj1Left = obj1.position.x - obj1.width / 2;
        const obj1Right = obj1.position.x + obj1.width / 2;
        const obj1Top = obj1.position.y - obj1.height / 2;
        const obj1Bottom = obj1.position.y + obj1.height / 2;
        
        const obj2Left = obj2.position.x - obj2.width / 2;
        const obj2Right = obj2.position.x + obj2.width / 2;
        const obj2Top = obj2.position.y - obj2.height / 2;
        const obj2Bottom = obj2.position.y + obj2.height / 2;
        
        // 检查是否有重叠
        return !(obj1Right < obj2Left || 
                obj1Left > obj2Right || 
                obj1Bottom < obj2Top || 
                obj1Top > obj2Bottom);
    }

    /**
     * 清理销毁的对象
     */
    cleanup() {
        // 清理敌机
        this.enemies = this.enemies.filter(enemy => !enemy.destroyed);
        
        // 清理子弹
        this.bullets = this.bullets.filter(bullet => !bullet.destroyed);
        
        // 清理道具
        this.powerUps = this.powerUps.filter(powerup => powerup.active);
    }

    /**
     * 检查游戏结束条件
     */
    checkGameOver() {
        if (this.player && !this.player.active) {
            // 玩家死亡，游戏结束
            const gameData = this.player.getGameData();
            this.stateManager.changeState(GameState.GAME_OVER, {
                score: gameData.score,
                level: this.config.currentLevel
            });
        }
    }
    
    /**
     * 更新屏幕震动效果
     */
    updateScreenShake(deltaTime) {
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime * 1000; // deltaTime转毫秒
            if (this.screenShake.duration <= 0) {
                this.screenShake.intensity = 0;
                this.screenShake.duration = 0;
            }
        }
    }

    /**
     * 渲染游戏
     */
    render() {
        this.ctx.save();
        
        // 应用屏幕震动效果
        if (this.screenShake.duration > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
            const shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
            this.ctx.translate(shakeX, shakeY);
        }
        
        // 清空画布
        this.clearCanvas();
        
        // 渲染背景
        this.renderBackground();
        
        // 根据游戏状态渲染
        if (this.stateManager.isState(GameState.PLAYING) || this.stateManager.isState(GameState.PAUSED)) {
            this.renderGameplay();
        }
        
        // 渲染粒子效果
        this.particleSystem.render(this.ctx);
        
        // 渲染调试信息
        if (this.config.debug) {
            this.renderDebugInfo();
        }
        
        this.ctx.restore();
    }

    /**
     * 清空画布
     */
    clearCanvas() {
        this.ctx.fillStyle = '#000814';
        this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
    }

    /**
     * 渲染背景
     */
    renderBackground() {
        this.ctx.fillStyle = '#ffffff';
        this.background.stars.forEach(star => {
            this.ctx.globalAlpha = star.brightness;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    /**
     * 渲染游戏玩法
     */
    renderGameplay() {
        // 渲染玩家
        if (this.player && this.player.visible) {
            this.player.render(this.ctx);
        }
        
        // 渲染敌机
        this.enemies.forEach(enemy => {
            if (enemy.visible) {
                enemy.render(this.ctx);
            }
        });
        
        // 渲染Boss
        if (this.boss && this.boss.active) {
            this.boss.onRender(this.ctx);
        }
        
        // 渲染子弹
        this.bullets.forEach(bullet => {
            if (bullet.visible) {
                bullet.render(this.ctx);
            }
        });
        
        // 渲染道具
        this.powerUpManager.render(this.ctx);

        // 渲染消息
        this.renderMessages();

        // 渲染浮动文字
        this.renderFloatingTexts();

        // 渲染成就通知
        this.achievementManager.renderNotifications(this.ctx);
    }

    /**
     * 渲染调试信息
     */
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left'; // 改回左对齐
        
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Delta: ${(this.deltaTime * 1000).toFixed(2)}ms`,
            `State: ${this.stateManager.getCurrentState()}`,
            `Objects: ${this.getObjectCount()}`,
            `Bullets: ${this.bullets.length}`,
            `Enemies: ${this.enemies.length}`
        ];
        
        // 调试信息位置：左侧血条下方
        const debugX = 10;
        const debugY = 100; // 血条大约在80px高度，放在100px开始
        const lineHeight = 16;
        const backgroundWidth = 180;
        const backgroundHeight = debugInfo.length * lineHeight + 10;
        
        // 添加半透明背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(debugX - 5, debugY - 5, backgroundWidth, backgroundHeight);
        
        // 添加边框
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(debugX - 5, debugY - 5, backgroundWidth, backgroundHeight);
        
        // 渲染调试信息文字
        this.ctx.fillStyle = '#00ff00';
        debugInfo.forEach((info, index) => {
            // 放在左侧血条下方，避免与UI元素遮挡
            this.ctx.fillText(info, debugX, debugY + 15 + index * lineHeight);
        });
        
        // 绘制碰撞边界框（调试用）
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1;
        
        // 玩家碰撞框
        if (this.player) {
            this.drawCollisionBox(this.player);
        }
        
        // 子弹碰撞框
        this.bullets.forEach(bullet => {
            if (!bullet.destroyed) {
                this.ctx.strokeStyle = bullet.type === 'player' ? '#ffff00' : '#ff4444';
                this.drawCollisionBox(bullet);
            }
        });
        
        // 敌机碰撞框
        this.enemies.forEach(enemy => {
            if (!enemy.destroyed) {
                this.ctx.strokeStyle = '#ff6666';
                this.drawCollisionBox(enemy);
            }
        });
        
        this.ctx.restore();
    }
    
    /**
     * 绘制对象的碰撞边界框
     */
    drawCollisionBox(obj) {
        if (!obj || obj.destroyed) return;
        
        const left = obj.position.x - obj.width / 2;
        const top = obj.position.y - obj.height / 2;
        
        this.ctx.strokeRect(left, top, obj.width, obj.height);
    }

    /**
     * 获取游戏对象总数
     */
    getObjectCount() {
        return this.enemies.length + this.bullets.length + this.powerUpManager.getCount() + (this.player ? 1 : 0);
    }

    /**
     * 显示消息
     */
    showMessage(text, duration = 2000) {
        this.messages.push({
            text: text,
            time: 0,
            duration: duration,
            alpha: 1
        });
    }

    /**
     * 更新消息
     */
    updateMessages(deltaTime) {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i];
            message.time += deltaTime * 1000; // 转换为毫秒
            
            // 渐隐效果
            if (message.time > message.duration * 0.7) {
                const fadeTime = message.duration - message.time;
                message.alpha = Math.max(0, fadeTime / (message.duration * 0.3));
            }
            
            // 移除过期消息
            if (message.time >= message.duration) {
                this.messages.splice(i, 1);
            }
        }
    }

    /**
     * 渲染消息
     */
    renderMessages() {
        if (this.messages.length === 0) return;
        
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        // 预计算闪烁强度，避免在循环中重复计算
        const gameTime = this.gameTime || 0;
        const blinkIntensity = Math.sin(gameTime * 0.01) * 0.3 + 0.7;
        
        this.messages.forEach((message, index) => {
            // 检查是否为Boss激光警告消息，给予特殊处理
            const isLaserWarning = message.text.includes('激光') || message.text.includes('⚡') || message.text.includes('💥') || message.text.includes('🔥');
            
            if (isLaserWarning) {
                // Boss激光警告 - 更大更醒目
                this.ctx.font = 'bold 24px Arial';
                this.ctx.globalAlpha = message.alpha * blinkIntensity;
                
                // 红色警告文字
                this.ctx.fillStyle = '#ff3300';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 3;
                
                // 简化发光效果，减少性能消耗
                this.ctx.shadowColor = '#ff3300';
                this.ctx.shadowBlur = 5;
            } else {
                // 普通消息
                this.ctx.font = 'bold 18px Arial';
                this.ctx.globalAlpha = message.alpha;
                this.ctx.fillStyle = '#ffff00';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                this.ctx.shadowBlur = 0;
            }
            
            const y = this.config.canvasHeight / 2 + 50 + index * 35;
            this.ctx.strokeText(message.text, this.config.canvasWidth / 2, y);
            this.ctx.fillText(message.text, this.config.canvasWidth / 2, y);
        });
        
        this.ctx.restore();
    }

    /**
     * 更新浮动文字
     */
    updateFloatingTexts(deltaTime) {
        if (!this.floatingTexts) {
            this.floatingTexts = [];
            return;
        }
        
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            
            // 更新位置
            text.x += text.velocity.x * deltaTime;
            text.y += text.velocity.y * deltaTime;
            
            // 更新生命周期
            text.life -= deltaTime;
            
            // 添加重力效果
            text.velocity.y += 30 * deltaTime;
            
            // 渐隐效果
            const alpha = Math.max(0, text.life / text.maxLife);
            
            // 移除过期的文字
            if (text.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }
    
    /**
     * 渲染浮动文字
     */
    renderFloatingTexts() {
        if (!this.floatingTexts) return;
        
        this.ctx.save();
        this.ctx.textAlign = 'center';
        
        this.floatingTexts.forEach(text => {
            const alpha = Math.max(0, text.life / text.maxLife);
            this.ctx.globalAlpha = alpha;
            
            // 设置字体大小
            const fontSize = text.size || 14;
            this.ctx.font = `bold ${fontSize}px Arial`;
            
            // 描边效果
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text.text, text.x, text.y);
            
            // 填充颜色
            this.ctx.fillStyle = text.color;
            this.ctx.fillText(text.text, text.x, text.y);
        });
        
        this.ctx.restore();
    }

    /**
     * 状态切换处理
     */
    onStateChange(oldState, newState) {
        console.log(`游戏状态切换: ${oldState} -> ${newState}`);
        
        switch (newState) {
            case GameState.PLAYING:
                this.isPaused = false;
                break;
            case GameState.PAUSED:
                this.isPaused = true;
                break;
            case GameState.GAME_OVER:
                this.onGameOver();
                break;
        }
    }

    /**
     * 游戏结束处理
     */
    onGameOver() {
        console.log('游戏结束');
        
        // 播放游戏结束音效
        this.audioManager.playSound('game_over', 1.0);
        
        // 保存分数到排行榜
        if (this.player) {
            this.saveScore(this.player.score);
        }
        
        // 停止游戏音乐
        this.audioManager.stopMusic();
    }

    /**
     * 保存分数
     */
    saveScore(score) {
        const scores = JSON.parse(localStorage.getItem('planewar_leaderboard') || '[]');
        scores.push({
            score: score,
            date: new Date().toISOString(),
            name: '玩家'
        });
        
        // 保留前10名
        scores.sort((a, b) => b.score - a.score);
        scores.splice(10);
        
        localStorage.setItem('planewar_leaderboard', JSON.stringify(scores));
    }

    /**
     * 按键处理
     */
    onKeyDown(key) {
        console.log(`按键事件: ${key}, 游戏状态: ${this.stateManager.currentState}, 调试模式: ${this.config.debug}`);
        
        switch (key) {
            case 'Escape':
                if (this.stateManager.isState(GameState.PLAYING)) {
                    this.pause();
                } else if (this.stateManager.isState(GameState.PAUSED)) {
                    this.resume();
                }
                break;
            case 'KeyB':
                console.log('B键被按下');
                // B键召唤Boss（任何模式下都可以使用）
                if (this.stateManager.isState(GameState.PLAYING)) {
                    console.log('尝试召唤Boss...');
                    if (!this.boss || !this.boss.active) {
                        console.log('正在创建Boss');
                        const boss = this.createBoss(this.config.canvasWidth / 2, -100, 'standard');
                        if (boss) {
                            // 跳过警告时间，让Boss立即出现
                            boss.warningTimer = 0;
                            boss.y = -boss.height * 0.5; // 设置优化后的起始位置
                        }
                        this.showMessage('Boss已召唤！按V查看状态', 2500);
                    } else {
                        console.log('Boss已存在，无法召唤新的');
                        this.showMessage('Boss已存在！', 1500);
                    }
                } else {
                    console.log('只能在游戏进行中召唤Boss');
                    this.showMessage('只能在游戏中使用', 1500);
                }
                break;
            case 'KeyV':
                // V键查看Boss状态
                if (this.stateManager.isState(GameState.PLAYING)) {
                    if (this.boss) {
                        console.log('Boss状态:', {
                            active: this.boss.active,
                            health: this.boss.health,
                            x: this.boss.x,
                            y: this.boss.y,
                            phase: this.boss.phase
                        });
                        this.showMessage(`Boss: ${this.boss.active ? '活跃' : '非活跃'} 血量:${this.boss.health}`, 2000);
                    } else {
                        console.log('没有Boss实例');
                        this.showMessage('没有Boss', 1000);
                    }
                }
                break;
            // 移除Q键武器切换功能
        }
    }

    /**
     * 窗口大小改变处理
     */
    handleResize() {
        // 可以在这里实现响应式设计
        console.log('窗口大小改变');
    }

    /**
     * 销毁游戏
     */
    destroy() {
        this.stop();
        this.inputManager.destroy();
        this.audioManager.destroy();
        this.stateManager.destroy();
        this.particleSystem.clear();
        console.log('游戏已销毁');
    }
}

// 导出到全局作用域
window.Game = Game;