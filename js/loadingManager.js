class LoadingManager {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 6;
        this.startTime = Date.now();
        this.tokenUsage = {
            total: 0,
            byStep: new Map()
        };
        this.initializeSteps();
        this.createLoadingUI();
    }

    initializeSteps() {
        this.steps = [
            {
                id: 1,
                name: '生成人口数据',
                description: '正在生成城市居民基础信息...',
                substeps: [
                    '计算人口统计数据',
                    '生成居民个人信息',
                    '建立家庭关系网络'
                ]
            },
            {
                id: 2,
                name: '分析人口需求',
                description: '正在分析居民生活需求...',
                substeps: [
                    '分析职业分布',
                    '统计住房需求',
                    '评估公共设施需求'
                ]
            },
            {
                id: 3,
                name: '规划城市布局',
                description: '正在设计城市规划方案...',
                substeps: [
                    '规划功能分区',
                    '设计道路网络',
                    '布置建筑设施'
                ]
            },
            {
                id: 4,
                name: '创建建筑设施',
                description: '正在构建城市基础设施...',
                substeps: [
                    '建造住宅区',
                    '设置商业区',
                    '配置公共设施'
                ]
            },
            {
                id: 5,
                name: '初始化AI代理',
                description: '正在创建智能居民...',
                substeps: [
                    '生成个性特征',
                    '分配工作和住所',
                    '建立社交网络'
                ]
            },
            {
                id: 6,
                name: '启动城市模拟',
                description: '正在启动城市系统...',
                substeps: [
                    '初始化模拟环境',
                    '启动代理系统',
                    '开始时间流动'
                ]
            }
        ];
    }

    createLoadingUI() {
        this.loadingContainer = document.createElement('div');
        this.loadingContainer.className = 'loading-container';
        this.loadingContainer.innerHTML = `
            <div class="loading-content">
                <h2>城市初始化中...</h2>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="step-description">准备中...</div>
                <div class="steps-timeline">
                    ${this.createStepsTimeline()}
                </div>
                <div class="loading-details"></div>
            </div>
        `;
        document.body.appendChild(this.loadingContainer);

        this.progressBar = this.loadingContainer.querySelector('.progress-fill');
        this.stepDescription = this.loadingContainer.querySelector('.step-description');
        this.loadingDetails = this.loadingContainer.querySelector('.loading-details');
    }

    createStepsTimeline() {
        return this.steps.map(step => `
            <div class="step-item" id="step-${step.id}">
                <div class="step-number">${step.id}</div>
                <div class="step-content">
                    <div class="step-name">${step.name}</div>
                    <div class="step-substeps">
                        ${step.substeps.map(substep => `
                            <div class="substep">${substep}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateProgress(step, description, details = '', metrics = null) {
        this.currentStep = step;
        const progress = (step / this.totalSteps) * 100;
        
        // 更新进度条
        this.progressBar.style.width = `${progress}%`;
        this.stepDescription.textContent = description;
        
        // 更新步骤状态
        this.steps.forEach((s, index) => {
            const stepElement = document.getElementById(`step-${s.id}`);
            if (index + 1 < step) {
                stepElement.classList.add('completed');
            } else if (index + 1 === step) {
                stepElement.classList.add('active');
            }
        });
        
        // 添加详细信息，包括执行时间和token消耗
        if (details) {
            const detailElement = document.createElement('div');
            detailElement.className = 'detail-item';
            
            // 如果有metrics，添加执行时间和token消耗信息
            if (metrics) {
                detailElement.innerHTML = `
                    <div class="detail-content">${details}</div>
                    <div class="step-completion">
                        <span class="time">耗时: ${metrics.duration}ms</span>
                        <span class="tokens">消耗: ${metrics.tokens} tokens</span>
                    </div>
                `;
            } else {
                detailElement.textContent = details;
            }
            
            this.loadingDetails.appendChild(detailElement);
            
            // 保持最新的5条记录
            while (this.loadingDetails.children.length > 5) {
                this.loadingDetails.removeChild(this.loadingDetails.firstChild);
            }

            // 自动滚动到最新记录
            this.loadingDetails.scrollTop = this.loadingDetails.scrollHeight;
        }
    }

    updateSubstep(stepId, substepIndex) {
        const stepElement = document.getElementById(`step-${stepId}`);
        const substeps = stepElement.querySelectorAll('.substep');
        substeps[substepIndex].classList.add('completed');
    }

    complete() {
        const endTime = Date.now();
        const totalTime = ((endTime - this.startTime) / 1000).toFixed(2);
        
        // 创建完成状态面板
        const completionStats = document.createElement('div');
        completionStats.className = 'completion-stats';
        completionStats.innerHTML = `
            <div class="stats-header">初始化完成</div>
            <div class="stats-content">
                <div class="stat-row">
                    <span class="stat-label">总用时:</span>
                    <span class="stat-value">${totalTime} 秒</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Token 使用量:</span>
                    <span class="stat-value">${this.tokenUsage.total} tokens</span>
                </div>
                <div class="token-usage-details">
                    ${Array.from(this.tokenUsage.byStep.entries()).map(([step, tokens]) => `
                        <div class="token-step">
                            <span class="step-name">步骤 ${step}:</span>
                            <span class="token-count">${tokens} tokens</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.loadingDetails.appendChild(completionStats);

        // 2秒后移除加载界面
        setTimeout(() => {
            this.loadingContainer.remove();
        }, 3000);
    }

    showError(error) {
        this.loadingContainer.classList.add('error');
        this.stepDescription.textContent = '初始化失败';
        this.loadingDetails.innerHTML = `
            <div class="error-message">
                <div class="error-title">错误信息：</div>
                <div class="error-content">${error}</div>
                <button class="retry-button">重试</button>
            </div>
        `;
    }

    showGenerationStatus(status) {
        const statusElement = document.createElement('div');
        statusElement.className = 'generation-status';
        statusElement.innerHTML = `
            <h3>城市生成状态</h3>
            <div class="status-grid">
                <div class="status-item">
                    <div class="status-title">建筑物</div>
                    <div class="status-numbers">
                        <span class="success">成功: ${status.buildings.success}</span>
                        <span class="failed">失败: ${status.buildings.failed}</span>
                        <span class="total">总数: ${status.buildings.total}</span>
                    </div>
                </div>
                <div class="status-item">
                    <div class="status-title">区域</div>
                    <div class="status-numbers">
                        <span class="success">成功: ${status.districts.success}</span>
                        <span class="failed">失败: ${status.districts.failed}</span>
                        <span class="total">总数: ${status.districts.total}</span>
                    </div>
                </div>
                <div class="status-item">
                    <div class="status-title">道路</div>
                    <div class="status-numbers">
                        <span class="success">成功: ${status.roads.success}</span>
                        <span class="failed">失败: ${status.roads.failed}</span>
                        <span class="total">总数: ${status.roads.total}</span>
                    </div>
                </div>
                <div class="status-item">
                    <div class="status-title">公共空间</div>
                    <div class="status-numbers">
                        <span class="success">成功: ${status.publicSpaces.success}</span>
                        <span class="failed">失败: ${status.publicSpaces.failed}</span>
                        <span class="total">总数: ${status.publicSpaces.total}</span>
                    </div>
                </div>
            </div>
        `;
        this.loadingDetails.appendChild(statusElement);
    }

    updateTokenUsage(step, tokens) {
        this.tokenUsage.total += tokens;
        this.tokenUsage.byStep.set(step, (this.tokenUsage.byStep.get(step) || 0) + tokens);
    }
} 