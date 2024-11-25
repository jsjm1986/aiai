class AIAgent {
    constructor(id, position, occupation, needs, traits) {
        this.id = id;
        this.position = position;
        this.occupation = occupation;
        this.needs = needs;
        this.traits = traits;
        
        // 扩展个性化属性
        this.personality = {
            traits: traits,
            values: [],      // 价值观
            interests: [],   // 兴趣爱好
            beliefs: [],     // 信念系统
            goals: []        // 个人目标
        };
        
        // 状态系统
        this.state = {
            physical: {
                energy: 100,
                health: 100,
                hunger: 0,
                fatigue: 0
            },
            emotional: {
                happiness: 100,
                stress: 0,
                satisfaction: 100
            },
            social: {
                relationships: new Map(),
                socialNeeds: 100
            }
        };

        // 保存前一个状态
        this.previousState = {
            physical: { ...this.state.physical },
            emotional: { ...this.state.emotional },
            social: { ...this.state.social }
        };

        // 记忆系统
        this.memory = {
            shortTerm: [],     // 短期记忆
            longTerm: [],      // 长期记忆
            experiences: [],   // 重要经历
            relationships: new Map() // 关系记忆
        };

        // 决策系统
        this.decisionMaking = {
            currentTask: null,
            schedule: [],
            priorities: [],
            pendingDecisions: []
        };

        // 添加行为缓存系统
        this.behaviorCache = {
            lastThinkTime: 0,
            thinkInterval: 5000,  // 思考间隔5秒
            defaultBehaviors: [], // 默认行为模式
            cachedDecisions: new Map(), // 缓存的决策
            routines: {           // 日常行为模式
                morning: [],
                afternoon: [],
                evening: [],
                night: []
            }
        };

        // 添加状态更新计时器
        this.lastStateUpdate = Date.now();
        this.stateUpdateInterval = 2000; // 状态更新间隔2秒

        // 添加行为系统
        this.behavior = new BehaviorSystem(this);

        // 添加位置信息
        this.locations = {
            home: null,      // 住所位置
            workplace: null, // 工作地点
            current: position // 当前位置
        };

        // 修改行为控制系统
        this.behaviorControl = {
            isActing: false,
            isMoving: false,
            currentAction: null,
            actionStartTime: null,
            actionDuration: null,
            lastActionTime: Date.now(),
            actionCooldown: 5000,  // 5秒冷却时间
            movementTimeout: 10000, // 10秒移动超时
            actionTimeout: 30000,   // 30秒行动超时
            stateCheckInterval: 2000 // 2秒状态检查间隔
        };

        // 添加行为锁定机制
        this.actionLock = {
            isLocked: false,
            lockReason: null,
            lockTime: null,
            lockDuration: null
        };

        // 初始化时间跟踪为早上8:00
        const initialGameTime = new Date();
        initialGameTime.setHours(8, 0, 0, 0);
        
        this.timeTracking = {
            lastUpdateTime: Date.now(),
            gameTime: initialGameTime
        };

        // 添加状态变化速率配置
        this.stateChangeRates = {
            physical: {
                energy: -0.2,      // 每分钟降低0.2%的体力
                hunger: 0.3,       // 每分钟增加0.3%的饥饿度
                fatigue: 0.2       // 每分钟增加0.2%的疲劳度
            },
            emotional: {
                happiness: -0.1,   // 每分钟降低0.1%的心情
                stress: 0.15,      // 每分钟增加0.15%的压力
                satisfaction: -0.1  // 每分钟降低0.1%的满意度
            },
            social: {
                socialNeeds: 0.25  // 每分钟增加0.25%的社交需求
            }
        };

        // 添加上次状态更新时间
        this.lastStateUpdate = Date.now();

        // 添加行为历史记录
        this.actionHistory = {
            completed: [],  // 已完成的行为
            failed: [],    // 失败的行为
            current: null, // 当前行为
            lastUpdate: Date.now()
        };
    }

    getCurrentState() {
        return {
            position: this.position,
            physical: this.state.physical,
            emotional: this.state.emotional,
            social: this.state.social,
            currentTask: this.decisionMaking.currentTask,
            schedule: this.decisionMaking.schedule
        };
    }

    getNearbyAgents() {
        // 这个方法应该由城市系统调用来获取附近的其他代理
        return [];
    }

    getNearbyBuildings() {
        // 这个方法应该由城市系统调用来获取附近的建
        return [];
    }

    getCurrentWeather() {
        // 这个方法应该由城市系统调用来获取当前天气
        return 'sunny';
    }

    async initializePersonality() {
        this.personality = {
            traits: this.traits,
            interests: this.interests || [],
            values: [],
            beliefs: [],
            goals: []
        };

        const personalityPrompt = {
            occupation: this.occupation,
            traits: this.traits,
            interests: this.interests,
            needs: this.needs
        };

        const systemPrompt = `作为一个性格塑造专家，请基于以下信息生成一个独特且连贯的人物性格：
        职业背景：${this.occupation}
        性格特征：${this.traits.join(', ')}
        基本需求：${this.needs.join(', ')}
        
        请生成：
        1. 核心价值观（3-5个）
        2. 主要兴趣爱好（2-4个）
        3. 个人信念系统
        4. 长期和短期目标
        5. 行为决策倾向
        
        确保这些特征之间相互关联且符合逻辑。`;

        const personality = await AIService.getDecision({
            type: 'personality-generation',
            context: personalityPrompt,
            systemPrompt
        });

        // 更新个化属性
        Object.assign(this.personality, personality);

        // 生成日常作息安排
        const schedule = await AIService.generateDailySchedule({
            id: this.id,
            occupation: this.occupation,
            personality: this.personality,
            workplace: this.workplace,
            residence: this.residence
        });

        // 保存日程安排
        this.behavior.dailySchedule = schedule;

        console.log(`代理 ${this.id} 的日程安排已生成:`, schedule);
    }

    async think() {
        const now = Date.now();
        
        // 检查思考冷却时间
        if (now - this.behaviorControl.lastThinkTime < this.behaviorControl.thinkInterval) {
            return null;
        }

        // 如果正在执行行动或移动，不进行思考
        if (this.behaviorControl.isActing || this.behaviorControl.isMoving) {
            return null;
        }

        // 如果在行动冷却中，不进行思考
        if (now - this.behaviorControl.lastActionTime < this.behaviorControl.actionCooldown) {
            return null;
        }

        try {
            // 检查紧急需求
            const urgentNeed = this.checkUrgentNeeds();
            if (urgentNeed) {
                // 记录思考过程
                this.addToMemory({
                    type: 'thought',
                    content: `发现紧急需求: ${urgentNeed.type}`,
                    reason: `${urgentNeed.reason}, 优先级: ${urgentNeed.priority}`,
                    time: now,
                    location: this.getCurrentLocationName()
                });

                // 更新最后思考时间
                this.behaviorControl.lastThinkTime = now;

                return this.handleUrgentNeed(urgentNeed);
            }

            // 获取
            const context = {
                agent: {
                    id: this.id,
                    occupation: this.occupation,
                    personality: this.personality,
                    currentState: this.state,
                    currentLocation: this.getCurrentLocationName(),
                    history: {
                        recentActions: this.memory.shortTerm
                            .filter(m => m.type === 'action')
                            .slice(-5)
                    }
                },
                environment: {
                    nearbyBuildings: this.getNearbyBuildings(),
                    nearbyAgents: this.getNearbyAgents(),
                    timeOfDay: this.timeTracking.gameTime.getHours(),
                    weather: this.getCurrentWeather()
                }
            };
            
            const decision = await AIService.getDecision(context);
            
            if (decision) {
                // 记录决策过程
                this.addToMemory({
                    type: 'decision',
                    action: decision.action,
                    target: decision.target,
                    reason: decision.reason,
                    time: now,
                    location: this.getCurrentLocationName()
                });

                // 更新最后思考时间
                this.behaviorControl.lastThinkTime = now;
            }

            return decision;

        } catch (error) {
            console.error(`代理 ${this.id} 思考失败:`, error);
            return null;
        }
    }

    getCurrentLocationType() {
        // 获取当前位置类型，添加错误处理
        const nearestBuilding = this.getNearestBuilding();
        return nearestBuilding ? nearestBuilding.type : 'outdoor';
    }

    getCurrentLocationName() {
        // 获取当前位置名称，添加错误处理
        const nearestBuilding = this.getNearestBuilding();
        return nearestBuilding ? nearestBuilding.name : '户外';
    }

    getNearestBuilding() {
        // 添加城市和建筑物集合的验证
        if (!this.city || !this.city.buildings || this.city.buildings.size === 0) {
            console.warn('无法获取最近建筑物：城市或建筑物数据不完整');
            return null;
        }

        let nearest = null;
        let minDistance = Infinity;

        for (const building of this.city.buildings.values()) {
            // 验证建筑物数据
            if (!building || !building.position) {
                console.warn('发现无效的筑物数:', building);
                continue;
            }

            const distance = this.calculateDistance(this.position, building.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = building;
            }
        }

        return nearest;
    }

    async executeAction(action) {
        const now = Date.now();

        // 检查行动冷却时间
        if (now - this.behaviorControl.lastActionTime < this.behaviorControl.actionCooldown) {
            const remainingTime = (this.behaviorControl.actionCooldown - 
                (now - this.behaviorControl.lastActionTime)) / 1000;
            console.log(`代理 ${this.id} 行动冷却中，剩余时间: ${remainingTime.toFixed(3)}秒`);
            return false;
        }

        // 如果正在执行行动或移动，不执行新行动
        if (this.behaviorControl.isActing || this.behaviorControl.isMoving) {
            // 记录失败的行为，包含完整信息
            this.recordAction({
                action: action.action || 'unknown',
                target: action.target,
                reason: `无法执行行动: 正在${this.behaviorControl.isMoving ? '移动' : 
                    (this.behaviorControl.currentAction ? `执行${this.behaviorControl.currentAction}` : '其他行动')}`
            }, 'failed', {
                error: '代理正忙',
                currentState: {
                    isMoving: this.behaviorControl.isMoving,
                    currentAction: this.behaviorControl.currentAction
                }
            });

            console.log(`代理 ${this.id} 无法执行行动: 正在执行其他行动`);
            return false;
        }

        try {
            // 确保action对象包含所有必要的字段
            const safeAction = {
                action: action.action || 'unknown',
                target: action.target || null,
                reason: action.reason || '无原因',
                location: action.location || this.getCurrentLocationName()
            };

            // 设置行动状态
            this.behaviorControl.isActing = true;
            this.behaviorControl.currentAction = safeAction.action;
            this.behaviorControl.actionStartTime = now;

            // 设置当前行为
            this.actionHistory.current = {
                type: safeAction.action,
                target: safeAction.target,
                reason: safeAction.reason,
                startTime: now,
                location: safeAction.location
            };

            // 执行行动
            const result = await this.performAction(safeAction);

            // 记录成功的行为
            if (result) {
                this.recordAction(safeAction, 'completed', {
                    energyChange: -10,
                    stressChange: -5,
                    happinessChange: 10,
                    socialChange: safeAction.action === 'socialize' ? -30 : 5
                });
            }

            return result;

        } catch (error) {
            // 记录失败的行为
            this.recordAction(action, 'failed', {
                error: error.message,
                errorType: error.name,
                errorStack: error.stack
            });

            console.error(`代理 ${this.id} 执行行动失败:`, error);
            return false;

        } finally {
            // 清理行动状态
            this.resetBehaviorState();
            // 更新最后行动时间
            this.behaviorControl.lastActionTime = now;
        }
    }

    resetBehaviorState() {
        const previousState = {
            isActing: this.behaviorControl.isActing,
            isMoving: this.behaviorControl.isMoving,
            currentAction: this.behaviorControl.currentAction
        };

        // 重置所有行为状态
        this.behaviorControl.isActing = false;
        this.behaviorControl.isMoving = false;
        this.behaviorControl.currentAction = null;
        this.behaviorControl.actionStartTime = null;
        this.behaviorControl.actionDuration = null;

        // 清除当前行为记录
        this.actionHistory.current = null;

        // 记录状态变化
        console.log(`代理 ${this.id} 状态重置:`, {
            之前状态: previousState,
            当前状态: {
                isActing: false,
                isMoving: false,
                currentAction: null
            }
        });
    }

    completeAction(action) {
        try {
            // 更新代理状态
            this.updateState(action);
            
            // 清除行动状态
            this.resetBehaviorState();
            
            // 记录行动完成
            this.addToMemory({
                type: 'action_complete',
                action: action.action,
                location: this.getCurrentLocationName(),
                time: Date.now(),
                result: 'success'
            });
        } catch (error) {
            console.error(`代理 ${this.id} 完成行动时出错:`, error);
            this.resetBehaviorState();
        }
    }

    getActionDuration(actionType) {
        // 基础持续时间（以毫秒为单位）
        const baseDurations = {
            work: 120000,      // 2分钟 - 代表一个工作周期
            rest: 90000,       // 1.5分钟 - 代表一次休息时间
            eat: 60000,        // 1分钟 - 代表一顿饭的时间
            socialize: 180000, // 3分钟 - 代表一次社交活动
            entertainment: 150000  // 2.5分钟 - 代表一次娱乐活动
        };

        // 获取基础持续时间
        const baseDuration = baseDurations[actionType] || 60000;

        // 考虑游戏时间流速的影响
        const timeScale = this.city ? this.city.timeScale : 1;
        
        // 添加随机波动（±20%）
        const randomFactor = 0.8 + Math.random() * 0.4;

        // 根据代理状态调整持续时间
        const stateAdjustment = this.getStateAdjustment();

        // 计算最终持续时间
        const finalDuration = Math.round(
            (baseDuration * randomFactor * stateAdjustment) / timeScale
        );

        console.log(`行为持续时间计算:`, {
            行为类型: actionType,
            基础时长: baseDuration / 1000 + '秒',
            时间流速: timeScale,
            随机因子: randomFactor.toFixed(2),
            状态调整: stateAdjustment.toFixed(2),
            最终时长: finalDuration / 1000 + '秒'
        });

        return finalDuration;
    }

    getStateAdjustment() {
        // 根据代理当前状态调整行为持续时间
        const energyFactor = this.state.physical.energy / 100;  // 体力越低，行动越慢
        const stressFactor = 1 - (this.state.emotional.stress / 200); // 压力越大，行动越慢
        
        // 综合考虑各种因素
        return (energyFactor + stressFactor) / 2;
    }

    async performAction(action) {
        try {
            // 检查是否已经在执行行动
            if (this.behaviorControl.isActing) {
                throw new Error(`正在执行${this.behaviorControl.currentAction}`);
            }

            // 设置行动状态
            this.behaviorControl.isActing = true;
            this.behaviorControl.currentAction = action.action;
            this.behaviorControl.actionStartTime = Date.now();

            // 获取行动持续时间
            const duration = action.duration || this.getActionDuration(action.action);
            
            // 创建行动执行Promise
            const actionPromise = new Promise(async (resolve) => {
                // 记录开始行动
                console.log(`代理 ${this.id} 开始执行行动:`, {
                    类型: action.action,
                    目标: action.target,
                    持续时间: duration,
                    原因: action.reason
                });

                // 执行具体行动
                switch (action.action) {
                    case 'work':
                        await this.performWork(action);
                        break;
                    case 'rest':
                        await this.performRest(action);
                        break;
                    case 'socialize':
                        await this.performSocialize(action);
                        break;
                    case 'entertainment':
                        await this.performEntertainment(action);
                        break;
                    default:
                        // 默认行为等待指定时间
                        await new Promise(r => setTimeout(r, Math.min(duration, 30000)));
                }

                resolve(true);
            });

            // 创建超时Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`行动执行超时: ${action.action}`));
                }, Math.min(duration * 1.5, this.behaviorControl.actionTimeout)); // 使用1.5倍行动时间或最大超时时间
            });

            // 等待行动完成或超时
            const result = await Promise.race([actionPromise, timeoutPromise]);

            // 如果行动成功完成，更新状态
            if (result) {
                this.updateStateAfterAction(action.action);
                
                // 记录成功的行为
                this.recordAction(action, 'completed', {
                    energyChange: -10,
                    stressChange: -5,
                    happinessChange: 10,
                    socialChange: action.action === 'socialize' ? -30 : 5
                });
            }

            return result;

        } catch (error) {
            console.error(`代理 ${this.id} 执行行动失败:`, error);
            
            // 记录失败的行为
            this.recordAction(action, 'failed', {
                error: error.message,
                errorType: error.name,
                errorStack: error.stack
            });
            
            return false;
        } finally {
            // 清理行动状态
            this.behaviorControl.isActing = false;
            this.behaviorControl.currentAction = null;
            this.behaviorControl.actionStartTime = null;
        }
    }

    async performWork(decision) {
        const duration = decision.duration || 30000; // 默认工作30秒
        console.log(`代理 ${this.id} 开始工作，预计持续 ${duration/1000} 秒`);
        await new Promise(resolve => setTimeout(resolve, duration));
        this.state.physical.energy -= 20;
        this.state.emotional.stress += 10;
    }

    async performRest(decision) {
        const duration = decision.duration || 15000; // 默认休息15秒
        console.log(`代 ${this.id} 开始休息，预计持续 ${duration/1000} 秒`);
        await new Promise(resolve => setTimeout(resolve, duration));
        this.state.physical.energy += 30;
        this.state.emotional.stress -= 15;
    }

    async performSocialize(decision) {
        try {
            // 寻找附近的代理
            const nearbyAgents = this.getNearbyAgents();
            if (nearbyAgents.length === 0) {
                this.addToMemory({
                    type: 'interaction',
                    content: '未找到可交互的代理',
                    time: Date.now(),
                    location: this.getCurrentLocationName()
                });
                return;
            }

            // 选择一个代理进行互动
            const targetAgent = nearbyAgents[0];
            
            // 生成对话内容
            const conversation = await AIService.generateConversation({
                agent1: this,
                agent2: targetAgent,
                environment: {
                    location: this.getCurrentLocationName(),
                    time: new Date(),
                    nearbyAgents: nearbyAgents.length
                }
            });

            // 记录社交互动
            this.addToMemory({
                type: 'conversation',
                partnerId: targetAgent.id,
                content: conversation.content,
                topic: conversation.topic,
                mood: conversation.mood,
                impact: conversation.impact,
                time: Date.now(),
                location: this.getCurrentLocationName()
            });

            // 新社交关系
            this.updateRelationship(targetAgent.id, conversation.impact);

        } catch (error) {
            console.error(`代理 ${this.id} 社交互动失败:`, error);
            this.addToMemory({
                type: 'error',
                content: '社交互动失败',
                error: error.message,
                time: Date.now(),
                location: this.getCurrentLocationName()
            });
        }
    }

    async performEntertainment(decision) {
        const duration = decision.duration || 20000; // 默认娱乐20秒
        console.log(`代理 ${this.id} 开始娱乐活动，预计持续 ${duration/1000} 秒`);
        await new Promise(resolve => setTimeout(resolve, duration));
        this.state.emotional.happiness += 20;
        this.state.emotional.stress -= 20;
    }

    async moveTo(targetPosition) {
        if (!targetPosition) {
            console.warn(`代理 ${this.id} 移动目标位置无效`);
            return false;
        }

        try {
            // 设置当前行为为移动
            this.actionHistory.current = {
                type: 'move',
                target: `(${Math.round(targetPosition.x)}, ${Math.round(targetPosition.z)})`,
                reason: '前往目标位置',
                startTime: Date.now(),
                location: this.getCurrentLocationName()
            };

            // 执行移动
            const moveResult = await this.behavior.moveToPosition(targetPosition);

            if (moveResult) {
                console.log(`代理 ${this.id} 移动成功:`, targetPosition);
                // 更新位置
                this.position = {...targetPosition};
                return true;
            } else {
                console.log(`代理 ${this.id} 移动失败`);
                return false;
            }

        } catch (error) {
            console.error(`代理 ${this.id} 移动失败:`, error);
            return false;
        } finally {
            // 移动完成后清除当前行为
            this.actionHistory.current = null;
            this.behaviorControl.isMoving = false;
            this.behaviorControl.actionStartTime = null;
        }
    }

    isAtPosition(targetPosition, tolerance = 1) {
        if (!targetPosition) return false;
        const distance = this.calculateDistance(this.position, targetPosition);
        return distance <= tolerance;
    }

    calculatePath(start, end) {
        console.log('计算路径:', {start, end});
        
        // 使用城市的pathFinder来计算路径
        if (this.city && this.city.pathFinder) {
            return this.city.pathFinder.findPath(start, end);
        }
        
        // 如果没有pathFinder，创建一个直线路径
        return [{
            x: end.x,
            z: end.z
        }];
    }

    evaluateActionImpact(action) {
        // 确保 previousState 存在
        if (!this.previousState) {
            return {
                physical: 0,
                emotional: 0,
                social: 0
            };
        }

        // 评估行为的影响
        return {
            physical: this.state.physical.energy - this.previousState.physical.energy,
            emotional: this.state.emotional.happiness - this.previousState.emotional.happiness,
            social: this.state.social.socialNeeds - this.previousState.social.socialNeeds
        };
    }

    getNearbyAgents() {
        // 这个方法应该由��市系统调用来获取附近的其他代理
        return [];
    }

    getNearbyBuildings() {
        // 这个方法应该由城市系统调用来获取附近的建筑
        return [];
    }

    getCurrentWeather() {
        // 这个方法应该由城市系统调用来获取当前天气
        return 'sunny';
    }

    async interact(otherAgent) {
        console.log(`代理 ${this.id} 开始与代理 ${otherAgent.id} 互动`);

        const interactionContext = {
            agent1: {
                id: this.id,
                occupation: this.occupation,
                personality: this.personality,
                currentState: this.state,
                relationshipHistory: this.memory.relationships.get(otherAgent.id)
            },
            agent2: {
                id: otherAgent.id,
                occupation: otherAgent.occupation,
                personality: otherAgent.personality,
                currentState: otherAgent.state,
                relationshipHistory: otherAgent.memory.relationships.get(this.id)
            },
            environment: {
                location: this.getCurrentLocationName(),
                time: new Date(),
                nearbyAgents: this.getNearbyAgents().length
            }
        };

        try {
            // 成对话内容
            const conversation = await AIService.generateConversation(interactionContext);
            console.log('生成的对话内容:', conversation);

            // 更新双方状态
            this.updateStateAfterInteraction(conversation);
            otherAgent.updateStateAfterInteraction(conversation);

            // 记录互动到双方记忆
            this.recordInteraction(otherAgent.id, conversation);
            otherAgent.recordInteraction(this.id, conversation);

            // 更新社交关系
            this.updateRelationship(otherAgent.id, conversation.impact);
            otherAgent.updateRelationship(this.id, conversation.impact);

            return conversation;
        } catch (error) {
            console.error('社交互动失败:', error);
            return null;
        }
    }

    updateStateAfterInteraction(conversation) {
        // 据对话内容和氛围更新状态
        const impact = conversation.impact || 0;
        
        // 更新社交需求
        this.state.social.socialNeeds = Math.max(0, 
            this.state.social.socialNeeds - 30);

        // 更新绪状态
        this.state.emotional.happiness += impact * 10;
        this.state.emotional.stress -= Math.abs(impact) * 5;

        // 确保状态值在合理范围内
        this.state.emotional.happiness = Math.max(0, Math.min(100, this.state.emotional.happiness));
        this.state.emotional.stress = Math.max(0, Math.min(100, this.state.emotional.stress));
    }

    recordInteraction(partnerId, conversation) {
        const interactionMemory = {
            type: 'conversation',
            partnerId: partnerId,
            content: conversation.content,
            topic: conversation.topic,
            mood: conversation.mood,
            impact: conversation.impact,
            time: new Date(),
            location: this.getCurrentLocationName()
        };

        // 添加到短期记忆
        this.memory.shortTerm.push(interactionMemory);

        // 如果是重要的对话（impact > 0.5），也添加到重要经历
        if (Math.abs(conversation.impact) > 0.5) {
            this.memory.experiences.push(interactionMemory);
        }
    }

    updateRelationship(partnerId, impact) {
        if (!this.memory.relationships.has(partnerId)) {
            this.memory.relationships.set(partnerId, {
                level: 0,
                interactions: 0,
                lastInteraction: null
            });
        }

        const relationship = this.memory.relationships.get(partnerId);
        relationship.level = Math.max(-1, Math.min(1, relationship.level + impact));
        relationship.interactions++;
        relationship.lastInteraction = Date.now();

        // 记录关系变化
        this.addToMemory({
            type: 'relationship_update',
            partnerId: partnerId,
            impact: impact,
            newLevel: relationship.level,
            time: Date.now()
        });
    }

    getRelevantMemories() {
        // 获取与当前情境相关的记忆
        return [...this.memory.shortTerm, ...this.memory.experiences.slice(-5)];
    }

    updateState(action) {
        const now = Date.now();
        const timePassed = (now - this.lastStateUpdate) / 1000; // 转换为秒
        
        // 基础状态随时间自然变化
        this.applyNaturalStateChanges(timePassed);

        // 如果有行动，应用行动带来的状态变化
        if (action) {
            this.applyActionStateChanges(action);
        }

        // 更新最后更新时间
        this.lastStateUpdate = now;

        // 记录状态变化
        this.addToMemory({
            type: 'state_change',
            time: now,
            changes: {
                physical: { ...this.state.physical },
                emotional: { ...this.state.emotional },
                social: { ...this.state.social }
            }
        });
    }

    applyNaturalStateChanges(seconds) {
        const minutes = seconds / 60; // 转换为分钟

        // 物理状态变化
        this.state.physical.energy = Math.max(0, Math.min(100,
            this.state.physical.energy + this.stateChangeRates.physical.energy * minutes));
        
        // 情绪态变化
        this.state.emotional.stress = Math.max(0, Math.min(100,
            this.state.emotional.stress + this.stateChangeRates.emotional.stress * minutes));
        this.state.emotional.happiness = Math.max(0, Math.min(100,
            this.state.emotional.happiness + this.stateChangeRates.emotional.happiness * minutes));
        
        // 社交需求变化
        this.state.social.socialNeeds = Math.max(0, Math.min(100,
            this.state.social.socialNeeds + this.stateChangeRates.social.socialNeeds * minutes));

        // 记录显著状态变化
        if (this.hasSignificantStateChange()) {
            this.addThought('状态发生显著变化', 
                `体力: ${Math.round(this.state.physical.energy)}%, ` +
                `压: ${Math.round(this.state.emotional.stress)}%, ` +
                `社交需求: ${Math.round(this.state.social.socialNeeds)}%`);
        }
    }

    hasSignificantStateChange() {
        const threshold = 20; // 状态变化超过20%认为是显著变化
        return (
            this.state.physical.energy <= threshold ||
            this.state.emotional.stress >= (100 - threshold) ||
            this.state.social.socialNeeds >= (100 - threshold)
        );
    }

    applyActionStateChanges(action) {
        const changes = {
            work: {
                physical: { energy: -10 },
                emotional: { stress: +15, satisfaction: +5 },
                social: { socialNeeds: +5 }
            },
            rest: {
                physical: { energy: +30, fatigue: -20 },
                emotional: { stress: -15 },
                social: { socialNeeds: +2 }
            },
            eat: {
                physical: { energy: +10, hunger: -40 },
                emotional: { satisfaction: +10 },
                social: { socialNeeds: +5 }
            },
            socialize: {
                physical: { energy: -5 },
                emotional: { happiness: +15, stress: -10 },
                social: { socialNeeds: -30 }
            },
            entertainment: {
                physical: { energy: -5 },
                emotional: { happiness: +20, stress: -20 },
                social: { socialNeeds: +5 }
            }
        }[action.action] || {};

        // 应用状态变化
        Object.entries(changes).forEach(([category, categoryChanges]) => {
            Object.entries(categoryChanges).forEach(([stat, change]) => {
                if (this.state[category] && typeof this.state[category][stat] === 'number') {
                    this.state[category][stat] = Math.max(0, Math.min(100, 
                        this.state[category][stat] + change));
                }
            });
        });
    }

    addToMemory(experience) {
        // 确保记忆系统已初始化
        if (!this.memory.shortTerm) this.memory.shortTerm = [];
        if (!this.memory.experiences) this.memory.experiences = [];

        // 添加时间戳如果没有
        if (!experience.time) {
            experience.time = Date.now();
        }

        // 添加到短期记忆
        this.memory.shortTerm.push(experience);

        // 限制短期记忆大小
        while (this.memory.shortTerm.length > 20) {
            const oldMemory = this.memory.shortTerm.shift();
            // 如果是重要经历，保存到长期记忆
            if (this.isSignificantExperience(oldMemory)) {
                this.memory.experiences.push(oldMemory);
            }
        }

        // 如果是重要经历，直接添加到experiences
        if (this.isSignificantExperience(experience)) {
            this.memory.experiences.push(experience);
        }

        // 限制长期记忆大小
        while (this.memory.experiences.length > 100) {
            this.memory.experiences.shift();
        }
    }

    isSignificantExperience(experience) {
        if (!experience) return false;

        // 定重要经历的条件
        const significantTypes = [
            'conversation',
            'decision',
            'relationship_update',
            'achievement'
        ];

        const significantActions = [
            'work',
            'socialize',
            'rest',
            'achievement'
        ];

        return (
            significantTypes.includes(experience.type) ||
            (experience.action && significantActions.includes(experience.action)) ||
            (experience.impact && Math.abs(experience.impact) > 0.3) ||
            (experience.type === 'thought' && experience.reason?.includes('紧急'))
        );
    }

    getEnvironmentInfo() {
        // 获取周围环境信息
        return {
            nearbyAgents: this.getNearbyAgents(),
            nearbyBuildings: this.getNearbyBuildings(),
            timeOfDay: new Date().getHours(),
            weather: this.getCurrentWeather()
        };
    }

    async startConversation(otherAgent) {
        // 查是否可以开始对话
        if (!this.canStartConversation(otherAgent)) {
            return null;
        }

        // 设置对话状态
        this.state.currentActivity = 'conversing';
        this.interactingWith = otherAgent.id;
        otherAgent.state.currentActivity = 'conversing';
        otherAgent.interactingWith = this.id;

        // 生成对话内容
        const conversation = await this.generateConversation(otherAgent);
        
        // 记录对话到双方记忆
        this.recordConversation(conversation, otherAgent);
        otherAgent.recordConversation(conversation, this);

        return conversation;
    }

    canStartConversation(otherAgent) {
        // 检查是否可以开始对话
        return (
            !this.state.currentActivity || this.state.currentActivity === 'idle' &&
            !otherAgent.state.currentActivity || otherAgent.state.currentActivity === 'idle' &&
            this.calculateDistance(otherAgent) < 50 // 检查距离
        );
    }

    async generateConversation(otherAgent) {
        const context = {
            speaker: {
                id: this.id,
                occupation: this.occupation,
                personality: this.personality,
                currentState: this.getCurrentState(),
                relationship: this.memory.relationships.get(otherAgent.id)
            },
            listener: {
                id: otherAgent.id,
                occupation: otherAgent.occupation,
                personality: otherAgent.personality,
                currentState: otherAgent.getCurrentState(),
                relationship: otherAgent.memory.relationships.get(this.id)
            },
            environment: this.getEnvironmentInfo(),
            previousInteractions: this.getPreviousInteractions(otherAgent)
        };

        const systemPrompt = `你是一个对话生成专家。基于以下两个AI代理的信息生成自然对话内容：
        说话者：${JSON.stringify(context.speaker)}
        听众：${JSON.stringify(context.listener)}
        环境${JSON.stringify(context.environment)}
        
        要求：
        1. 对话要符合双方的性格特征
        2. 考虑当前的环境和状态
        3. 参考之前的互动历史
        4. 生成有意义的对话内容`;

        const conversation = await AIService.generateConversation(context, systemPrompt);
        return conversation;
    }

    recordConversation(conversation, otherAgent) {
        // 记录对话到短期记忆
        const memoryEntry = {
            type: 'conversation',
            time: new Date(),
            partner: otherAgent.id,
            content: conversation.content,
            impact: conversation.impact,
            location: this.position
        };

        this.addToMemory(memoryEntry);

        // 更新社交关系
        this.updateRelationship(otherAgent.id, {
            type: 'conversation',
            impact: conversation.impact,
            time: new Date()
        });

        // 更新状态
        this.state.social.socialNeeds -= 10;
        this.state.emotional.happiness += conversation.impact;
    }

    getPreviousInteractions(otherAgent) {
        // 获取与特定代理的历史互动记录
        return this.memory.shortTerm
            .filter(memory => memory.type === 'conversation' && memory.partner === otherAgent.id)
            .slice(-5); // 只获取最近5次对话
    }

    calculateDistance(pos1, pos2) {
        // 添加参数验证
        if (!pos1 || !pos2 || 
            typeof pos1.x === 'undefined' || typeof pos1.z === 'undefined' ||
            typeof pos2.x === 'undefined' || typeof pos2.z === 'undefined') {
            console.warn('计算距离时收到无效的位置数据:', { pos1, pos2 });
            return Infinity; // 返回无限大示无效距离
        }

        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    checkUrgentNeeds() {
        // 检查是否有紧需求
        const urgentThreshold = {
            energy: 20,    // 能量低于20%需要休息
            hunger: 80,    // 饥饿度高于80%需要进食
            stress: 80,    // 压力高于80%需要放松
            socialNeeds: 80 // 社交需求高于80%需要社交
        };

        // 按优先级检查各种需求
        if (this.state.physical.energy < urgentThreshold.energy) {
            return {
                type: 'rest',
                priority: 1,
                location: 'home',
                reason: '能量不足，需要休息'
            };
        }

        if (this.state.physical.hunger > urgentThreshold.hunger) {
            return {
                type: 'eat',
                priority: 2,
                location: 'restaurant',
                reason: '饥饿，需要进食'
            };
        }

        if (this.state.emotional.stress > urgentThreshold.stress) {
            return {
                type: 'relax',
                priority: 3,
                location: 'park',
                reason: '压力过大，需要放松'
            };
        }

        if (this.state.social.socialNeeds > urgentThreshold.socialNeeds) {
            return {
                type: 'socialize',
                priority: 4,
                location: 'public_space',
                reason: '社交需求强烈，需要互动'
            };
        }

        return null; // 没有紧急需求
    }

    async handleUrgentNeed(need) {
        console.log(`代理 ${this.id} 正在处理紧急需求:`, need);

        try {
            // 检查是否已经在处理同样的需求
            if (this.actionHistory.current && 
                this.actionHistory.current.type === need.type) {
                console.log(`代理 ${this.id} 已经在处理 ${need.type} 需求`);
                return null;
            }

            // 检查行为冷却时间
            const now = Date.now();
            if (now - this.behaviorControl.lastActionTime < this.behaviorControl.actionCooldown) {
                console.log(`代理 ${this.id} 行为冷却中，跳过需求处理`);
                return null;
            }

            // 寻找合适的建筑物
            const targetBuilding = this.findBuildingForNeed(need);
            if (!targetBuilding) {
                // 记录失败原因
                this.recordAction({
                    action: need.type,
                    target: null,
                    reason: need.reason
                }, 'failed', {
                    error: '未到合适的建筑物',
                    errorType: 'NoSuitableBuilding'
                });
                
                // 设置较长的冷却时间，避免立即重试
                this.behaviorControl.lastActionTime = now;
                this.behaviorControl.actionCooldown = 10000; // 10秒
                
                return null;
            }

            // 如果不在目标建筑物位置，先移动过去
            if (!this.isAtPosition(targetBuilding.position)) {
                console.log(`代理 ${this.id} 开始移动到 ${targetBuilding.name}`);
                const moveResult = await this.moveTo(targetBuilding.position);
                if (!moveResult) {
                    // 记录移动失败
                    this.recordAction({
                        action: 'move',
                        target: targetBuilding.id,
                        reason: '前往目标建筑物'
                    }, 'failed', {
                        error: '移动失败',
                        errorType: 'MovementFailed'
                    });
                    return null;
                }
            }

            // 执行需求行动
            console.log(`代理 ${this.id} 准备在 ${targetBuilding.name} 执行 ${need.type} 行动`);
            const actionResult = await this.executeNeedAction(need, targetBuilding);

            // 根据行动结果设置不同的冷却时间
            this.behaviorControl.actionCooldown = actionResult ? 5000 : 8000; // 成功5秒，失败8秒
            this.behaviorControl.lastActionTime = Date.now();

            return actionResult;

        } catch (error) {
            console.error(`代理 ${this.id} 处理紧急需求失败:`, error);
            
            // 记录失败
            this.recordAction({
                action: need.type,
                target: null,
                reason: need.reason
            }, 'failed', {
                error: error.message,
                errorType: error.name,
                errorStack: error.stack
            });

            // 设置较长的冷却时间
            this.behaviorControl.lastActionTime = Date.now();
            this.behaviorControl.actionCooldown = 15000; // 15秒
            
            return null;
        } finally {
            // 确保状态被重置
            this.resetBehaviorState();
        }
    }

    findBuildingForNeed(need) {
        console.log(`正在为需求 ${need.type} 查找建筑物...`);
        
        // 根据需求类型和时间段查合适的建筑物
        const buildingTypes = {
            rest: ['residential'],  // 住宅区永远可用于休息
            eat: {
                day: ['restaurant', 'cafeteria', 'cafe'],
                night: ['residential']  // 夜间在住所吃东西
            },
            socialize: {
                day: ['commercial', 'recreation', 'park', 'restaurant', 'cafe', 'plaza', 'community_center'],
                night: ['residential', 'recreation']  // 夜间可以在住所或娱乐场所社交
            },
            work: ['office', 'commercial'],
            relax: {
                day: ['park', 'recreation', 'entertainment'],
                night: ['residential', 'recreation']  // 夜间在住所或娱乐场所放松
            }
        };

        // 使用游戏时间而不是系统时间
        const currentHour = this.timeTracking.gameTime.getHours();
        const isNightTime = currentHour < 6 || currentHour >= 22;
        
        // 获取当前时段可用的建筑类型
        let suitableTypes;
        if (typeof buildingTypes[need.type] === 'object') {
            suitableTypes = buildingTypes[need.type][isNightTime ? 'night' : 'day'];
        } else {
            suitableTypes = buildingTypes[need.type] || [];
        }

        console.log(`当前游戏时间: ${currentHour}:00, ${isNightTime ? '夜间' : '日间'}`);
        console.log(`可用建筑类型: ${suitableTypes.join(', ')}`);

        // 获取所有可用建筑
        const availableBuildings = Array.from(this.city.buildings.values())
            .filter(building => {
                const isTypeMatch = suitableTypes.includes(building.type) || 
                                  suitableTypes.includes(building.subType);
                const isOpen = building.status?.isOpen !== false;
                const hasCapacity = !building.atCapacity;

                console.log(`检查建筑 ${building.name || building.id}:`, {
                    类型匹配: isTypeMatch,
                    开放状态: isOpen,
                    容量状态: hasCapacity,
                    建筑类型: building.type,
                    子类型: building.subType,
                    游戏时间: `${currentHour}:00`
                });

                return (isTypeMatch && isOpen && hasCapacity);
            });

        if (availableBuildings.length === 0) {
            console.log(`未找到满需求 ${need.type} 的建筑物`);
            return null;
        }

        // 按距离排序，选择最近的建筑
        const sortedBuildings = availableBuildings.sort((a, b) => {
            const distA = this.calculateDistance(this.position, a.position);
            const distB = this.calculateDistance(this.position, b.position);
            return distA - distB;
        });

        const selectedBuilding = sortedBuildings[0];
        console.log(`选择建筑物: ${selectedBuilding.name || selectedBuilding.id}`, {
            类型: selectedBuilding.type,
            距离: this.calculateDistance(this.position, selectedBuilding.position),
            游戏时间: `${currentHour}:00`
        });

        return selectedBuilding;
    }

    async executeNeedAction(need, building) {
        if (!building) {
            throw new Error('无效的建筑物');
        }

        try {
            // 创建完整的行为对象
            const action = {
                action: need.type,
                target: building.id,
                reason: need.reason,
                location: building.name,
                startTime: Date.now(),
                duration: this.getActionDuration(need.type)
            };

            // 执行行动
            const actionResult = await this.performAction(action);

            if (actionResult) {
                // 更新建筑物使用状态
                building.currentOccupancy = (building.currentOccupancy || 0) + 1;
            }

            return actionResult;

        } catch (error) {
            console.error(`代理 ${this.id} 执行需求行动失败:`, error);
            return null;
        }
    }

    updateStateAfterAction(actionType) {
        const stateChanges = {
            socialize: {
                social: { socialNeeds: -30 },
                emotional: { happiness: +10, stress: -10 }
            },
            rest: {
                physical: { energy: +30 },
                emotional: { stress: -20 }
            },
            eat: {
                physical: { hunger: -50, energy: +10 },
                emotional: { happiness: +5 }
            },
            relax: {
                emotional: { stress: -30, happiness: +15 },
                physical: { energy: +10 }
            }
        }[actionType] || {};

        // 应用状态变化
        Object.entries(stateChanges).forEach(([category, changes]) => {
            Object.entries(changes).forEach(([stat, change]) => {
                if (this.state[category] && typeof this.state[category][stat] === 'number') {
                    this.state[category][stat] = Math.max(0, Math.min(100, 
                        this.state[category][stat] + change));
                }
            });
        });
    }

    canExecuteActivity(activity) {
        // 检查活动是否可以执行
        if (!activity) return false;

        // 检查位置是否存在
        if (activity.location) {
            const targetBuilding = this.city.buildings.get(activity.location);
            if (!targetBuilding) return false;
        }

        // 检查时间限制
        const currentHour = new Date().getHours();
        if (activity.timeRestriction) {
            if (currentHour < activity.timeRestriction.start || 
                currentHour >= activity.timeRestriction.end) {
                return false;
            }
        }

        // 检查体力是否足够
        if (activity.energyCost && this.state.physical.energy < activity.energyCost) {
            return false;
        }

        // 检查建筑物否开放
        if (activity.location) {
            const building = this.city.buildings.get(activity.location);
            if (building && building.status && !building.status.isOpen) {
                return false;
            }
        }

        // 检查特殊条件
        switch (activity.action) {
            case 'work':
                // 检查是否在工作时间
                if (currentHour < 9 || currentHour >= 18) return false;
                // 检查是否在工作地点
                if (activity.location !== this.workplace?.id) return false;
                break;
            
            case 'rest':
                // 检查是否在住所
                if (activity.location !== this.residence?.id) return false;
                break;
            
            case 'eat':
                // 检查是否饥饿
                if (this.state.physical.hunger < 50) return false;
                break;
            
            case 'socialize':
                // 检查是否有社交需求
                if (this.state.social.socialNeeds < 50) return false;
                break;
        }

        return true;
    }

    getScheduledActivity(hour) {
        // 获取当前时段的计划活动
        const timeSlot = this.getTimeSlot(hour);
        const schedule = this.behavior.dailySchedule[timeSlot];
        
        if (schedule && schedule.length > 0) {
            const activity = schedule.find(act => this.canExecuteActivity(act));
            if (activity) {
                return {
                    action: activity.action,
                    target: activity.location,
                    reason: `按照日程安排进${activity.action}`,
                    energyCost: 10,
                    stressImpact: 0
                };
            }
        }
        return null;
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    validateDecision(decision) {
        if (!decision) return false;

        // 检查决策的基本结构
        const requiredFields = ['action', 'target', 'reason', 'energyCost', 'stressImpact'];
        if (!requiredFields.every(field => decision.hasOwnProperty(field))) {
            console.log(`决策缺少必要字段:`, decision);
            return false;
        }

        // 检查行动类型是否有效
        const validActions = ['work', 'rest', 'eat', 'socialize', 'entertainment'];
        if (!validActions.includes(decision.action)) {
            console.log(`无效的行动类型: ${decision.action}`);
            return false;
        }

        // 检查目标位置是否存在
        if (decision.target) {
            // 如果目标是通用位置（如 'public_space'），查找对应类型的建筑
            if (typeof decision.target === 'string' && !this.city.buildings.has(decision.target)) {
                const targetBuilding = this.findBuildingByType(decision.target);
                if (!targetBuilding) {
                    console.log(`找不到类型为 ${decision.target} 的建筑物`);
                    return false;
                }
                // 修改决策中的目标为具体建筑物ID
                decision.target = targetBuilding.id;
            }
        }

        // 检查能量消耗是否合理
        if (decision.energyCost < 0 || decision.energyCost > 50) {
            console.log(`能量消耗不合理: ${decision.energyCost}`);
            return false;
        }

        return true;
    }

    findBuildingByType(type) {
        // 查找指定类型的建筑物
        for (const building of this.city.buildings.values()) {
            if (building.type.toLowerCase() === type.toLowerCase() ||
                building.subType?.toLowerCase() === type.toLowerCase()) {
                return building;
            }
        }
        return null;
    }

    getDefaultAction() {
        return {
            action: 'rest',
            target: this.residence?.id || null,
            reason: '无法做出有效决策，选择休息',
            energyCost: 0,
            stressImpact: -5
        };
    }

    getRandomLeisureActivity() {
        const activities = [
            {
                type: 'wander',
                duration: 5000,  // 5秒
                range: 100      // 随机漫步的范围
            },
            {
                type: 'rest',
                duration: 8000,  // 8秒
                location: 'current' // 在当前位置休息
            },
            {
                type: 'observe',
                duration: 3000,  // 3秒
                location: 'current' // 在当前位置观察
            }
        ];

        const activity = activities[Math.floor(Math.random() * activities.length)];

        switch (activity.type) {
            case 'wander':
                return {
                    action: 'wander',
                    target: this.getRandomNearbyPosition(activity.range),
                    reason: '随意漫步',
                    energyCost: 2,
                    stressImpact: -2,
                    duration: activity.duration
                };

            case 'rest':
                return {
                    action: 'rest',
                    target: null,
                    reason: '短暂休息',
                    energyCost: -5,
                    stressImpact: -5,
                    duration: activity.duration
                };

            case 'observe':
                return {
                    action: 'observe',
                    target: null,
                    reason: '观察周围',
                    energyCost: 1,
                    stressImpact: -1,
                    duration: activity.duration
                };
        }
    }

    getRandomNearbyPosition(range) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * range;
        
        const newX = this.position.x + Math.cos(angle) * distance;
        const newZ = this.position.z + Math.sin(angle) * distance;

        // 确保新位置在地图范围内
        return {
            x: Math.max(0, Math.min(newX, this.city.gridSize * 50)),
            y: 0,
            z: Math.max(0, Math.min(newZ, this.city.gridSize * 50))
        };
    }

    updateGameTime() {
        const now = Date.now();
        const realTimePassed = (now - this.timeTracking.lastUpdateTime) / 1000; // 秒
        const gameTimePassed = realTimePassed * BehaviorSystem.TIME_SCALE.SECONDS_RATIO;
        
        this.timeTracking.gameTime = new Date(
            this.timeTracking.gameTime.getTime() + (gameTimePassed * 1000)
        );
        this.timeTracking.lastUpdateTime = now;

        return this.timeTracking.gameTime;
    }

    getCurrentGameHour() {
        return this.timeTracking.gameTime.getHours();
    }

    addThought(content, reason = '') {
        const thought = {
            type: 'thought',
            content: content,
            reason: reason,
            time: new Date(),
            location: this.getCurrentLocationName()
        };

        // 添加到短期记忆
        this.memory.shortTerm.push(thought);

        // 如果短期记忆太长，移除最旧的记忆
        if (this.memory.shortTerm.length > 10) {
            this.memory.shortTerm.shift();
        }

        // 如果是重要的思考，也添加到经历中
        if (reason && (reason.includes('紧急') || reason.includes('重要'))) {
            this.memory.experiences.push(thought);
        }

        console.log(`代理 ${this.id} 的思考:`, {
            内容: content,
            原因: reason,
            时间: new Date().toLocaleTimeString(),
            位置: this.getCurrentLocationName()
        });
    }

    checkAndResetStuckState() {
        const now = Date.now();
        
        // 检查移动超时
        if (this.behaviorControl.isMoving && 
            this.behaviorControl.actionStartTime &&
            (now - this.behaviorControl.actionStartTime > this.behaviorControl.movementTimeout)) {
            console.log(`代理 ${this.id} 移动超时，重置状态`);
            this.resetBehaviorState();
            return true;
        }

        // 检查行动超时
        if (this.behaviorControl.isActing && 
            this.behaviorControl.actionStartTime &&
            (now - this.behaviorControl.actionStartTime > this.behaviorControl.actionTimeout)) {
            console.log(`代理 ${this.id} 行动超时，重置状态`);
            this.resetBehaviorState();
            return true;
        }

        return false;
    }

    getActionProgress() {
        if (!this.behaviorControl.actionStartTime || !this.behaviorControl.actionDuration) {
            return 0;
        }

        const elapsed = Date.now() - this.behaviorControl.actionStartTime;
        return Math.min(100, (elapsed / this.behaviorControl.actionDuration) * 100);
    }

    recordAction(action, status = 'completed', details = {}) {
        // 确保action参数存在且有基本结构
        const safeAction = action || {
            action: 'unknown',
            target: null,
            reason: '未知原因'
        };

        // 创建完整的记录
        const record = {
            type: safeAction.action,
            target: safeAction.target || '无目标',
            location: safeAction.location || this.getCurrentLocationName(),
            startTime: safeAction.startTime || Date.now(),
            endTime: Date.now(),
            gameTime: new Date(this.timeTracking.gameTime),
            status: status,
            reason: safeAction.reason || '无原因',
            impact: {
                energy: details.energyChange || 0,
                stress: details.stressChange || 0,
                happiness: details.happinessChange || 0,
                social: details.socialChange || 0
            }
        };

        // 根据状态记录到不同的历史记录中
        if (status === 'completed') {
            this.actionHistory.completed.push(record);
            // 限制历史记录长度
            if (this.actionHistory.completed.length > 20) {
                this.actionHistory.completed.shift();
            }
        } else if (status === 'failed') {
            // 为失败的行为添加错误信息
            record.error = details.error || '未知错误';
            this.actionHistory.failed.push(record);
            if (this.actionHistory.failed.length > 10) {
                this.actionHistory.failed.shift();
            }
        }

        // 添加详细的日志输出
        console.log(`代理 ${this.id} 行为记录:`, {
            行为类型: record.type,
            目标: record.target,
            地点: record.location,
            状态: status,
            原因: record.reason,
            影响: record.impact,
            游戏时间: record.gameTime.toLocaleTimeString()
        });
    }

    // 添加行为锁定方法
    lockAction(reason, duration) {
        this.actionLock = {
            isLocked: true,
            lockReason: reason,
            lockTime: Date.now(),
            lockDuration: duration
        };
    }

    // 检查并解除锁定
    checkAndUnlockAction() {
        if (!this.actionLock.isLocked) return true;
        
        const now = Date.now();
        if (now - this.actionLock.lockTime >= this.actionLock.lockDuration) {
            this.actionLock = {
                isLocked: false,
                lockReason: null,
                lockTime: null,
                lockDuration: null
            };
            return true;
        }
        return false;
    }
} 