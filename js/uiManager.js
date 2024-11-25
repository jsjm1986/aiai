class UIManager {
    constructor(city) {
        this.city = city;
        this.lastUpdate = Date.now();
        this.updateInterval = 5000; // 改为5秒
        
        // 初始化系统面板
        this.initSystemPanel();
        
        // 创建控制面板
        this.createControlPanel();
        
        // 初始化统计数据存储
        this.stats = {
            population: 0,
            activeAgents: 0,
            time: this.city.gameTime, // 使用游戏时间
            systemStatus: '系统运行正常'
        };

        // 初始化控制按钮
        this.initControlButtons();
    }

    createControlPanel() {
        const panel = document.createElement('div');
        panel.className = 'control-panel';
        panel.innerHTML = `
            <div class="control-buttons">
                <button id="pause-btn">暂停</button>
                <button id="speed-1x" class="active">1x</button>
                <button id="speed-2x">2x</button>
                <button id="speed-5x">5x</button>
            </div>
        `;
        document.body.appendChild(panel);
    }

    updateAgentList() {
        const agentList = document.getElementById('agent-list');
        if (!agentList) return;

        agentList.innerHTML = '';
        
        this.city.agents.forEach(agent => {
            const agentElement = document.createElement('div');
            agentElement.className = 'agent-list-item';
            agentElement.onclick = () => this.showAgentDetail(agent);
            
            agentElement.innerHTML = `
                <div class="agent-basic">
                    <span class="agent-name">${agent.id}</span>
                    <span class="agent-status">${agent.behaviorControl.currentAction || '空闲'}</span>
                </div>
                <div class="agent-occupation">${agent.occupation}</div>
            `;
            
            agentList.appendChild(agentElement);
        });
    }

    showAgentDetail(agent) {
        const modal = document.getElementById('agent-modal');
        const detailContent = document.getElementById('agent-detail');
        
        detailContent.innerHTML = `
            <div class="agent-detail-section">
                <div class="agent-detail-title">基本信息</div>
                <div>ID: ${agent.id}</div>
                <div>职业: ${agent.occupation}</div>
                <div>位置: ${this.formatPosition(agent.position)}</div>
                <div>性格特征: ${agent.personality?.traits?.join(', ') || '无'}</div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">当前状态</div>
                <div class="agent-status-bars">
                    <div class="status-bar">
                        <span class="status-bar-label">体力</span>
                        <div class="status-bar-track">
                            <div class="status-bar-fill" style="width: ${agent.state.physical.energy}%; background: #4CAF50;"></div>
                        </div>
                        <span>${Math.round(agent.state.physical.energy)}%</span>
                    </div>
                    <div class="status-bar">
                        <span class="status-bar-label">心情</span>
                        <div class="status-bar-track">
                            <div class="status-bar-fill" style="width: ${agent.state.emotional.happiness}%; background: #FFC107;"></div>
                        </div>
                        <span>${Math.round(agent.state.emotional.happiness)}%</span>
                    </div>
                    <div class="status-bar">
                        <span class="status-bar-label">压力</span>
                        <div class="status-bar-track">
                            <div class="status-bar-fill" style="width: ${agent.state.emotional.stress}%; background: #F44336;"></div>
                        </div>
                        <span>${Math.round(agent.state.emotional.stress)}%</span>
                    </div>
                    <div class="status-bar">
                        <span class="status-bar-label">社交需求</span>
                        <div class="status-bar-track">
                            <div class="status-bar-fill" style="width: ${agent.state.social.socialNeeds}%; background: #2196F3;"></div>
                        </div>
                        <span>${Math.round(agent.state.social.socialNeeds)}%</span>
                    </div>
                </div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">当前行为</div>
                ${this.formatCurrentAction(agent.behaviorControl)}
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">行为历史</div>
                <div class="action-history">
                    <div class="completed-actions">
                        <h4>已完成行为</h4>
                        ${this.formatActionHistory(agent.actionHistory.completed)}
                    </div>
                    <div class="failed-actions">
                        <h4>失败行为</h4>
                        ${this.formatActionHistory(agent.actionHistory.failed)}
                    </div>
                </div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">思考过程</div>
                <div class="thought-list">
                    ${this.formatThoughts(agent.memory.shortTerm)}
                </div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">决策记录</div>
                <div class="decision-list">
                    ${this.formatDecisions(agent.memory.shortTerm)}
                </div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">社交互动</div>
                <div class="interaction-list">
                    ${this.formatInteractions(agent.memory.shortTerm)}
                </div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">日程安排</div>
                <div class="schedule-list">
                    ${this.formatSchedule(agent.behavior?.dailySchedule)}
                </div>
            </div>

            <div class="agent-detail-section">
                <div class="agent-detail-title">对话记录</div>
                <div class="conversation-list">
                    ${this.formatConversations(agent.memory.shortTerm)}
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    formatPosition(position) {
        return position ? `(${Math.round(position.x)}, ${Math.round(position.z)})` : '未知';
    }

    formatMemories(memories) {
        if (!memories || memories.length === 0) return '无记忆';
        return memories.slice(-3).map(m => 
            `<div class="memory-item">${m.content || m.type} - ${new Date(m.time).toLocaleTimeString()}</div>`
        ).join('');
    }

    formatRelationships(relationships) {
        if (!relationships || relationships.size === 0) return '无社交关系';
        return Array.from(relationships.entries()).slice(0, 3).map(([id, rel]) =>
            `<div class="relationship-item">与${id}的关系: ${Math.round(rel.level * 100)}%</div>`
        ).join('');
    }

    updateSystemStats(stats) {
        document.getElementById('cpu-usage').textContent = `${stats.cpu}%`;
        document.getElementById('memory-usage').textContent = `${stats.memory}MB`;
        document.getElementById('fps-counter').textContent = stats.fps;
    }

    updateGameTime(gameTime) {
        document.getElementById('game-time').textContent = gameTime;
    }

    updatePopulation(count) {
        document.getElementById('population-count').textContent = count;
    }

    updateTokenUsage(usage) {
        document.getElementById('token-usage').textContent = usage;
    }

    updateModelInfo(provider, version) {
        document.getElementById('api-provider').textContent = provider;
        document.getElementById('model-version').textContent = version;
    }

    updateDemographics(populationData) {
        if (!populationData || !populationData.people) {
            console.warn('无效的人口数据');
            return;
        }

        try {
            // 更新系统面板中的人口数据
            const totalPopulation = document.getElementById('total-population');
            if (totalPopulation) {
                totalPopulation.textContent = populationData.people.length;
            }

            // 更新活跃人数
            const activeAgents = document.getElementById('active-agents');
            if (activeAgents) {
                activeAgents.textContent = this.city.agents.size;
            }

            // 添加一个系统事件
            this.addSystemEvent(`人口统计已更新: 总人口 ${populationData.people.length}`);

        } catch (error) {
            console.error('更新人口统计数据失败:', error);
        }
    }

    updateBuildingInfo(cityPlanData) {
        if (!cityPlanData) {
            console.warn('无效的城市规划数据');
            return;
        }

        try {
            // 添加个系统事件
            this.addSystemEvent(`城市规划数据已更新: ${Object.keys(cityPlanData.buildings || {}).length} 个建筑`);
            
            // 更新系统状态
            const systemStatus = document.getElementById('system-status');
            if (systemStatus) {
                systemStatus.textContent = '城市建筑初始化完成';
            }
        } catch (error) {
            console.error('更新城市规划数据失败:', error);
        }
    }

    updateCityStats() {
        try {
            // 检查是否需要更新
            const now = Date.now();
            if (now - this.lastUpdate < this.updateInterval) {
                return;
            }

            if (!this.city) {
                console.warn('未找到有效的城市实例');
                return;
            }

            // 获取城市统计数据
            const stats = this.city.getStats();
            
            // 更新基础信息
            this.updateBasicStats(stats);
            
            // 更新城市统计
            this.updateCityMetrics(stats);
            
            // 更新AI系统信息
            this.updateAIMetrics();
            
            // 更新居民活动统计
            this.updateAgentActivities();
            
            // 更新最后更新时间
            this.lastUpdate = now;
            
            // 添加对代理列表的更新
            this.updateAgentList();
            
            // 添加建筑服务状态更新
            this.updateBuildingServices();
            
        } catch (error) {
            console.error('更新城市统计失败:', error);
        }
    }

    updateBasicStats(stats) {
        document.getElementById('total-population').textContent = stats.population;
        document.getElementById('active-agents').textContent = this.city.agents.size;
        
        // 使用游戏时间而不是系统时间
        const gameTime = this.city.gameTime;
        const timeString = gameTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        document.getElementById('game-time').textContent = timeString;
        
        document.getElementById('system-status').textContent = 
            this.city.paused ? '系统已暂停' : '系统运行正常';
    }

    updateCityMetrics(stats) {
        document.getElementById('building-count').textContent = this.city.buildings.size;
        document.getElementById('road-length').textContent = this.calculateRoadLength() + 'm';
        document.getElementById('district-count').textContent = stats.districts;
        document.getElementById('building-usage').textContent = this.calculateBuildingUsage() + '%';
    }

    updateAIMetrics() {
        // 更新当前模型信息
        document.getElementById('current-model-info').textContent = CONFIG.API_PROVIDER;
        document.getElementById('current-version-info').textContent = this.getCurrentModelVersion();
        
        // 更新API调用次数
        const provider = CONFIG.API_PROVIDER.toUpperCase();
        const apiCalls = AIService.requestTimestamps[provider]?.length || 0;
        document.getElementById('api-calls').textContent = apiCalls;
        
        // 计算并更新Token用量
        const tokenUsage = this.calculateTokenUsage();
        document.getElementById('token-usage').textContent = `${tokenUsage.toLocaleString()} tokens`;
    }

    calculateTokenUsage() {
        // 从localStorage获取token使用记录
        const tokenKey = `${CONFIG.API_PROVIDER.toLowerCase()}_token_usage`;
        const storedUsage = localStorage.getItem(tokenKey);
        let totalTokens = 0;

        if (storedUsage) {
            try {
                const usageData = JSON.parse(storedUsage);
                // 只统计最近24小时的使用量
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                totalTokens = usageData
                    .filter(record => record.timestamp > oneDayAgo)
                    .reduce((sum, record) => sum + record.tokens, 0);
            } catch (error) {
                console.error('解析Token使用记录失败:', error);
            }
        }

        return totalTokens;
    }

    updateAgentActivities() {
        let activities = {
            working: 0,
            resting: 0,
            socializing: 0,
            moving: 0
        };

        this.city.agents.forEach(agent => {
            if (agent.behaviorControl.isMoving) {
                activities.moving++;
            } else if (agent.behaviorControl.currentAction) {
                switch (agent.behaviorControl.currentAction) {
                    case 'work': activities.working++; break;
                    case 'rest': activities.resting++; break;
                    case 'socialize': activities.socializing++; break;
                }
            }
        });

        document.getElementById('working-agents').textContent = activities.working;
        document.getElementById('resting-agents').textContent = activities.resting;
        document.getElementById('socializing-agents').textContent = activities.socializing;
        document.getElementById('moving-agents').textContent = activities.moving;
    }

    calculateRoadLength() {
        let totalLength = 0;
        this.city.roads.forEach(road => {
            if (road.points && road.points.length > 1) {
                for (let i = 0; i < road.points.length - 1; i++) {
                    const dx = road.points[i+1].x - road.points[i].x;
                    const dz = road.points[i+1].z - road.points[i].z;
                    totalLength += Math.sqrt(dx * dx + dz * dz);
                }
            }
        });
        return Math.round(totalLength);
    }

    calculateBuildingUsage() {
        let totalCapacity = 0;
        let totalOccupancy = 0;
        
        this.city.buildings.forEach(building => {
            if (building.capacity) {
                totalCapacity += building.capacity;
                totalOccupancy += building.currentOccupancy || 0;
            }
        });
        
        return totalCapacity ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
    }

    initSystemPanel() {
        // 确保系统面板存在
        this.systemPanel = document.getElementById('system-panel');
        if (!this.systemPanel) {
            console.error('未找到系统面板元素');
            return;
        }

        // 显示系统面板
        this.systemPanel.style.display = 'block';
        
        // 初始化所有必要的DOM元素
        const elements = [
            'total-population',
            'active-agents',
            'system-status',
            'game-time',
            'current-model-info',
            'current-version-info',
            'recent-events'
        ];

        // 检查并创建缺失的元素
        elements.forEach(id => {
            if (!document.getElementById(id)) {
                console.warn(`缺少必要的UI元素: ${id}`);
                const element = document.createElement('div');
                element.id = id;
                this.systemPanel.appendChild(element);
            }
        });

        // 更新初始模型信息
        this.updateModelInfo();
    }

    updateModelInfo() {
        const currentModelInfo = document.getElementById('current-model-info');
        const currentVersionInfo = document.getElementById('current-version-info');
        
        if (currentModelInfo) {
            currentModelInfo.textContent = CONFIG.API_PROVIDER || '未知';
        }
        
        if (currentVersionInfo) {
            currentVersionInfo.textContent = this.getCurrentModelVersion();
        }
    }

    addSystemEvent(event) {
        const eventsContainer = document.getElementById('recent-events');
        if (!eventsContainer) {
            console.warn('未找到事件容器');
            return;
        }

        // 使用游戏时间
        const gameTime = this.city.gameTime;
        const timeString = gameTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const eventElement = document.createElement('div');
        eventElement.className = 'system-event';
        eventElement.innerHTML = `
            <div class="event-time">${timeString}</div>
            <div class="event-content">${event}</div>
        `;
        eventsContainer.insertBefore(eventElement, eventsContainer.firstChild);
        
        // 保持最近的10个事件
        while (eventsContainer.children.length > 10) {
            eventsContainer.removeChild(eventsContainer.lastChild);
        }
    }

    getCurrentModelVersion() {
        const modelVersions = CONFIG.MODEL_VERSIONS[CONFIG.API_PROVIDER.toUpperCase()];
        return modelVersions ? modelVersions[0] : '未知';
    }

    updateBuildingServices() {
        if (!this.city || !this.city.buildings) return;

        const services = {
            rest: { available: 0, total: 0 },      // 休息设施
            food: { available: 0, total: 0 },      // 餐饮设施
            social: { available: 0, total: 0 },    // 社交场所
            entertainment: { available: 0, total: 0 }, // 娱乐设施
            work: { available: 0, total: 0 },      // 工作场所
            education: { available: 0, total: 0 }   // 教育设施
        };

        // 统计各类服务设施
        this.city.buildings.forEach(building => {
            if (!building.status) return;

            // 根据建筑类型和功能统计
            switch (building.type) {
                case 'residential':
                    services.rest.total++;
                    if (building.status.isOpen) services.rest.available++;
                    break;
                case 'commercial':
                    if (building.subType === 'restaurant' || building.subType === 'cafe') {
                        services.food.total++;
                        if (building.status.isOpen) services.food.available++;
                    } else {
                        services.work.total++;
                        if (building.status.isOpen) services.work.available++;
                    }
                    break;
                case 'recreation':
                    services.entertainment.total++;
                    if (building.status.isOpen) services.entertainment.available++;
                    services.social.total++;
                    if (building.status.isOpen) services.social.available++;
                    break;
                case 'education':
                    services.education.total++;
                    if (building.status.isOpen) services.education.available++;
                    break;
            }
        });

        // 更新UI示
        document.getElementById('rest-facilities').textContent = 
            `${services.rest.available}/${services.rest.total}`;
        document.getElementById('food-facilities').textContent = 
            `${services.food.available}/${services.food.total}`;
        document.getElementById('social-facilities').textContent = 
            `${services.social.available}/${services.social.total}`;
        document.getElementById('entertainment-facilities').textContent = 
            `${services.entertainment.available}/${services.entertainment.total}`;
        document.getElementById('work-facilities').textContent = 
            `${services.work.available}/${services.work.total}`;
        document.getElementById('education-facilities').textContent = 
            `${services.education.available}/${services.education.total}`;
    }

    formatThoughts(memories) {
        if (!memories || memories.length === 0) return '<div class="no-data">暂无思考记录</div>';

        return memories
            .filter(m => m.type === 'thought')
            .slice(-5)
            .map(thought => {
                // 使用游戏时间格式化时间戳
                const gameTime = new Date(this.city.gameTime.getTime() + 
                    (thought.time - Date.now()));
                const timeString = gameTime.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return `
                    <div class="thought-item">
                        <div class="thought-time">${timeString}</div>
                        <div class="thought-content">${thought.content}</div>
                        ${thought.reason ? `<div class="thought-reason">原因: ${thought.reason}</div>` : ''}
                    </div>
                `;
            }).join('');
    }

    formatDecisions(memories) {
        if (!memories || memories.length === 0) return '<div class="no-data">暂无决策记录</div>';

        return memories
            .filter(m => m.type === 'decision')
            .slice(-5)
            .map(decision => {
                const gameTime = new Date(this.city.gameTime.getTime() + 
                    (decision.time - Date.now()));
                const timeString = gameTime.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return `
                    <div class="decision-item">
                        <div class="decision-time">${timeString}</div>
                        <div class="decision-action">行动: ${decision.action}</div>
                        <div class="decision-target">目标: ${decision.target || '无'}</div>
                        <div class="decision-reason">原因: ${decision.reason}</div>
                    </div>
                `;
            }).join('');
    }

    formatInteractions(memories) {
        if (!memories || memories.length === 0) return '<div class="no-data">暂无互动记录</div>';

        return memories
            .filter(m => m.type === 'interaction' || m.type === 'conversation')
            .slice(-5)
            .map(interaction => {
                const gameTime = new Date(this.city.gameTime.getTime() + 
                    (interaction.time - Date.now()));
                const timeString = gameTime.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return `
                    <div class="interaction-item">
                        <div class="interaction-time">${timeString}</div>
                        <div class="interaction-partner">互动对象: ${interaction.partnerId || '无'}</div>
                        <div class="interaction-content">${interaction.content || '无内容'}</div>
                        <div class="interaction-impact">影响: ${this.formatImpact(interaction.impact)}</div>
                    </div>
                `;
            }).join('');
    }

    formatSchedule(schedule) {
        if (!schedule || Object.keys(schedule).length === 0) {
            return '<div class="no-data">暂无日程安排</div>';
        }

        return Object.entries(schedule).map(([timeSlot, activities]) => {
            // 确保activities是数组且不为空
            if (!Array.isArray(activities) || activities.length === 0) {
                return `
                    <div class="schedule-slot">
                        <div class="schedule-time">${timeSlot}</div>
                        <div class="no-data">无安排</div>
                    </div>
                `;
            }

            return `
                <div class="schedule-slot">
                    <div class="schedule-time">${this.formatTimeSlot(timeSlot)}</div>
                    <div class="schedule-activities">
                        ${activities.map(activity => `
                            <div class="schedule-activity">
                                <span class="activity-time">${activity.time || ''}</span>
                                <span class="activity-name">${activity.action || ''}</span>
                                <span class="activity-location">${activity.location || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTimeSlot(timeSlot) {
        const timeSlots = {
            morning: '早晨 (6:00-12:00)',
            afternoon: '下午 (12:00-18:00)',
            evening: '晚上 (18:00-22:00)',
            night: '深夜 (22:00-6:00)'
        };
        return timeSlots[timeSlot] || timeSlot;
    }

    formatImpact(impact) {
        if (typeof impact !== 'number') return '无';
        if (impact > 0) return `积极 (+${impact.toFixed(2)})`;
        if (impact < 0) return `消极 (${impact.toFixed(2)})`;
        return '中性';
    }

    formatConversations(memories) {
        if (!memories) return '<div class="no-data">暂无对话记录</div>';

        const conversations = memories.filter(m => m.type === 'conversation');
        if (conversations.length === 0) return '<div class="no-data">暂无对话记录</div>';

        return conversations.slice(-5).map(conv => `
            <div class="conversation-item">
                <div class="conversation-time">${new Date(conv.time).toLocaleTimeString()}</div>
                <div class="conversation-partner">对话对象: ${conv.partnerId}</div>
                <div class="conversation-content">
                    <div class="dialog-exchange">
                        ${this.formatDialogExchange(conv.content)}
                    </div>
                </div>
                <div class="conversation-info">
                    <span class="conversation-topic">话题: ${conv.topic}</span>
                    <span class="conversation-mood">氛围: ${conv.mood}</span>
                    <span class="conversation-impact" data-impact="${conv.impact}">
                        影响: ${this.formatImpact(conv.impact)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    formatDialogExchange(content) {
        if (!content || !content.speaker || !content.listener) return '';

        let dialog = '';
        const maxExchanges = Math.min(
            content.speaker.length,
            content.listener.length
        );

        for (let i = 0; i < maxExchanges; i++) {
            dialog += `
                <div class="dialog-line speaker">
                    <span class="dialog-role">说:</span>
                    <span class="dialog-text">${content.speaker[i]}</span>
                </div>
                <div class="dialog-line listener">
                    <span class="dialog-role">答:</span>
                    <span class="dialog-text">${content.listener[i]}</span>
                </div>
            `;
        }

        return dialog;
    }

    initControlButtons() {
        const pauseBtn = document.getElementById('pause-btn');
        const speed1x = document.getElementById('speed-1x');
        const speed2x = document.getElementById('speed-2x');
        const speed5x = document.getElementById('speed-5x');

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.city.togglePause();
                pauseBtn.textContent = this.city.paused ? '继续' : '暂停';
                this.updateSpeedButtons();
            });
        }

        // 时间流速控制
        const speedButtons = [speed1x, speed2x, speed5x];
        const speeds = [1, 2, 5];

        speedButtons.forEach((btn, index) => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (!this.city.paused) {
                        this.city.setTimeScale(speeds[index]);
                        this.updateSpeedButtons(btn);
                    }
                });
            }
        });
    }

    updateSpeedButtons(activeButton = null) {
        const buttons = [
            document.getElementById('speed-1x'),
            document.getElementById('speed-2x'),
            document.getElementById('speed-5x')
        ];

        buttons.forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
                btn.disabled = this.city.paused;
            }
        });

        if (activeButton && !this.city.paused) {
            activeButton.classList.add('active');
        }
    }

    updateSystemStatus(status) {
        const statusElement = document.getElementById('system-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = this.city.paused ? 'status-paused' : 'status-running';
        }
    }

    formatCurrentAction(currentAction) {
        if (!currentAction) {
            return '<div class="no-data">当前无行为</div>';
        }

        // 计算行为持续时间
        const duration = currentAction.startTime ? 
            Math.round((Date.now() - currentAction.startTime) / 1000) : 0;

        // 获取行为进度
        const progress = duration && currentAction.duration ? 
            Math.min(100, (duration / (currentAction.duration / 1000)) * 100) : 0;

        return `
            <div class="current-action">
                <div class="action-row">
                    <span class="label">行为类型:</span> 
                    <span class="value">${currentAction.type || '未知'}</span>
                </div>
                <div class="action-row">
                    <span class="label">目标:</span> 
                    <span class="value">${currentAction.target || '无'}</span>
                </div>
                <div class="action-row">
                    <span class="label">地点:</span> 
                    <span class="value">${currentAction.location || '未知'}</span>
                </div>
                <div class="action-row">
                    <span class="label">原因:</span> 
                    <span class="value">${currentAction.reason || '无'}</span>
                </div>
                <div class="action-row">
                    <span class="label">持续时间:</span> 
                    <span class="value">${duration}秒</span>
                </div>
                <div class="action-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(progress)}%</span>
                </div>
            </div>
        `;
    }

    formatActionHistory(actions) {
        if (!actions || actions.length === 0) {
            return '<div class="no-data">暂无记录</div>';
        }

        return actions.slice(-5).reverse().map(action => `
            <div class="action-record">
                <div class="action-time">
                    ${new Date(action.gameTime).toLocaleTimeString()}
                </div>
                <div class="action-content">
                    <div class="action-type">
                        ${action.type} → ${action.target || '无目标'}
                    </div>
                    <div class="action-location">
                        地点: ${action.location}
                    </div>
                    <div class="action-impact">
                        影响: 
                        ${action.impact.energy ? `体力${action.impact.energy > 0 ? '+' : ''}${action.impact.energy}` : ''}
                        ${action.impact.stress ? `压力${action.impact.stress > 0 ? '+' : ''}${action.impact.stress}` : ''}
                        ${action.impact.happiness ? `心情${action.impact.happiness > 0 ? '+' : ''}${action.impact.happiness}` : ''}
                        ${action.impact.social ? `社交${action.impact.social > 0 ? '+' : ''}${action.impact.social}` : ''}
                    </div>
                    <div class="action-reason">
                        原因: ${action.reason || '无'}
                    </div>
                </div>
            </div>
        `).join('');
    }
} 