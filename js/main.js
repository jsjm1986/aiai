class App {
    constructor() {
        this.city = null;
        this.initialized = false;
        this.uiManager = null;
        this.setupInitUI();
        console.log('App实例已创建');
    }

    setupInitUI() {
        const startBtn = document.getElementById('start-btn');
        const apiKeyInput = document.getElementById('api-key');
        const populationInput = document.getElementById('population-size');
        const modelSelect = document.getElementById('model-select');
        const modelVersion = document.getElementById('model-version');
        const currentModelSpan = document.getElementById('current-model');
        const currentVersionSpan = document.getElementById('current-version');
        const statusDiv = document.getElementById('init-status');

        // 初始化默认版本
        this.updateModelVersions('deepseek');

        // 监听模型选择变化
        modelSelect.addEventListener('change', () => {
            const selectedModel = modelSelect.value;
            currentModelSpan.textContent = modelSelect.options[modelSelect.selectedIndex].text;
            
            // 更新模型版本选项
            this.updateModelVersions(selectedModel);
            
            // 更新API Key输入框的提示
            const hints = {
                deepseek: 'DeepSeek API Key',
                openai: 'OpenAI API Key',
                anthropic: 'Anthropic API Key',
                step: '阶跃星辰 API Key'
            };
            apiKeyInput.placeholder = `请输入${hints[selectedModel]}`;
        });

        // 监听版本选择变化
        modelVersion.addEventListener('change', () => {
            currentVersionSpan.textContent = modelVersion.value;
        });

        // 添加输入验证
        populationInput.addEventListener('input', () => {
            const value = parseInt(populationInput.value);
            if (value < 1) populationInput.value = 1;
            if (value > 10000) populationInput.value = 10000;
        });

        startBtn.addEventListener('click', async () => {
            const apiKey = apiKeyInput.value.trim();
            const populationSize = parseInt(populationInput.value);
            const selectedModel = modelSelect.value;

            if (!apiKey) {
                this.showInitStatus('请输入API Key', 'error');
                return;
            }

            if (!populationSize || populationSize < 1 || populationSize > 10000) {
                this.showInitStatus('请输入有效的人口规模（1-10000）', 'error');
                return;
            }

            try {
                startBtn.disabled = true;
                this.showInitStatus(`正在验证${currentModelSpan.textContent} API Key...`, 'loading');
                
                // 设置配置
                CONFIG.API_PROVIDER = selectedModel;
                CONFIG.SELECTED_MODEL = modelVersion.value;
                
                switch (selectedModel) {
                    case 'deepseek':
                        CONFIG.DEEPSEEK_API_KEY = apiKey;
                        break;
                    case 'openai':
                        CONFIG.OPENAI_API_KEY = apiKey;
                        break;
                    case 'anthropic':
                        CONFIG.ANTHROPIC_API_KEY = apiKey;
                        break;
                    case 'step':
                        CONFIG.STEP_API_KEY = apiKey;
                        break;
                }
                CONFIG.CITY_SETTINGS.INITIAL_POPULATION = populationSize;

                // 验证API Key
                const isValid = await this.validateApiKey(apiKey, selectedModel);
                
                if (isValid) {
                    this.showInitStatus('API Key验证成功，正在初始化城市...', 'success');
                    
                    // 隐藏初始化界面
                    document.getElementById('init-container').classList.add('hidden');
                    document.getElementById('city-container').classList.remove('hidden');
                    
                    // 初始化城市
                    await this.initialize();
                } else {
                    this.showInitStatus('API Key无效，请检查后重试', 'error');
                    startBtn.disabled = false;
                }
            } catch (error) {
                console.error('验证失败:', error);
                this.showInitStatus('验证过程出错，请重试', 'error');
                startBtn.disabled = false;
            }
        });
    }

    updateModelVersions(provider) {
        const modelVersion = document.getElementById('model-version');
        const currentVersionSpan = document.getElementById('current-version');
        const versions = CONFIG.MODEL_VERSIONS[provider.toUpperCase()];

        if (!versions) {
            console.warn(`未找到提供商 ${provider} 的模型版本`);
            return;
        }

        // 清空现有选项
        modelVersion.innerHTML = '';

        if (provider === 'step') {
            // Step模型有特殊的数据结构
            versions.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.name} (${model.context}, ${model.type})`;
                modelVersion.appendChild(option);
            });
        } else {
            // 其他提供商使用简单的版本列表
            versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                modelVersion.appendChild(option);
            });
        }

        // 更新当前版本显示
        if (modelVersion.options.length > 0) {
            currentVersionSpan.textContent = modelVersion.options[0].textContent;
        }
    }

    async validateApiKey(apiKey, provider) {
        try {
            const apiUrls = {
                deepseek: CONFIG.API_URLS.DEEPSEEK,
                openai: CONFIG.API_URLS.OPENAI,
                anthropic: CONFIG.API_URLS.ANTHROPIC,
                step: CONFIG.API_URLS.STEP
            };

            const apiUrl = apiUrls[provider];
            if (!apiUrl) {
                throw new Error(`未找到 ${provider} 的API URL配置`);
            }

            const response = await fetch(`${apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: provider === 'openai' ? 'gpt-3.5-turbo' : 
                           provider === 'step' ? 'step-1-8k' : 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello'
                        }
                    ]
                })
            });

            return response.ok;
        } catch (error) {
            console.error('API Key验证失败:', error);
            return false;
        }
    }

    showInitStatus(message, type = '') {
        const statusDiv = document.getElementById('init-status');
        statusDiv.className = 'init-status ' + type;
        
        if (type === 'loading') {
            statusDiv.innerHTML = `${message} <div class="loading"></div>`;
        } else {
            statusDiv.textContent = message;
        }
    }

    async initialize() {
        try {
            console.log('开始初始化应用...');
            
            if (!CONFIG.API_PROVIDER || !CONFIG[`${CONFIG.API_PROVIDER.toUpperCase()}_API_KEY`]) {
                throw new Error('API Key未设置');
            }

            console.log('创建城市实例...');
            this.city = new City();
            
            // 创建 UI 管理器
            this.uiManager = new UIManager(this.city);
            
            console.log('初始化城市...');
            await this.city.initialize();
            
            console.log('设置事件监听器...');
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('应用初始化完成');
            
            // 初始化系统面板
            if (this.uiManager) {
                this.uiManager.initSystemPanel();
                
                // 定期更新系统状态
                setInterval(() => {
                    this.uiManager.updateCityStats();
                }, 5000);
            }
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showErrorMessage(`初始化失败: ${error.message}`);
            throw error;
        }
    }

    setupEventListeners() {
        // 窗口大小改变时调整渲染器大小
        window.addEventListener('resize', () => {
            if (this.city && this.city.renderer) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                
                this.city.renderer.setSize(width, height);
                this.city.camera.aspect = width / height;
                this.city.camera.updateProjectionMatrix();
            }
        });

        // 设置初始渲染器大小
        if (this.city && this.city.renderer) {
            this.city.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // 获取时间控制按钮
        const pauseBtn = document.getElementById('pause-btn');
        const speed1xBtn = document.getElementById('speed-1x');
        const speed2xBtn = document.getElementById('speed-2x');
        const speed5xBtn = document.getElementById('speed-5x');

        // 添加时间控制事件监听器
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.city.paused = !this.city.paused;
                pauseBtn.textContent = this.city.paused ? '继续' : '暂停';
            });
        }

        if (speed1xBtn) {
            speed1xBtn.addEventListener('click', () => {
                this.city.timeScale = 1;
                this.updateSpeedButtons(speed1xBtn);
            });
        }

        if (speed2xBtn) {
            speed2xBtn.addEventListener('click', () => {
                this.city.timeScale = 2;
                this.updateSpeedButtons(speed2xBtn);
            });
        }

        if (speed5xBtn) {
            speed5xBtn.addEventListener('click', () => {
                this.city.timeScale = 5;
                this.updateSpeedButtons(speed5xBtn);
            });
        }
    }

    updateSpeedButtons(activeButton) {
        // 更新速度按钮的视觉状态
        const speedButtons = [
            document.getElementById('speed-1x'),
            document.getElementById('speed-2x'),
            document.getElementById('speed-5x')
        ];

        speedButtons.forEach(button => {
            if (button) {
                button.classList.remove('active');
                if (button === activeButton) {
                    button.classList.add('active');
                }
            }
        });
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 1000;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// 当页面加载完成后启动应用
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
}); 