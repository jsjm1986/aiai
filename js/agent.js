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
            current: position // ���前位置
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
                happiness: -0.1,   // 每��钟降低0.1%的心情
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

        // 添加状态管理器
        this.stateManager = new StateManager(this);

        // 1. 完善决策缓存机制
        this.decisionCache = {
            cache: new Map(),
            maxSize: 100,
            ttl: 30000, // 缓存有效期30秒
            
            // 添加缓存
            set(key, decision) {
                if (this.cache.size >= this.maxSize) {
                    this.cleanup();
                }
                this.cache.set(key, {
                    decision,
                    timestamp: Date.now()
                });
            },
            
            // 获取缓存
            get(key) {
                const cached = this.cache.get(key);
                if (!cached) return null;
                
                if (Date.now() - cached.timestamp > this.ttl) {
                    this.cache.delete(key);
                    return null;
                }
                
                return cached.decision;
            },
            
            // 清理过期缓存
            cleanup() {
                const now = Date.now();
                for (const [key, value] of this.cache.entries()) {
                    if (now - value.timestamp > this.ttl) {
                        this.cache.delete(key);
                    }
                }
            },
            
            // 生成缓存键
            generateKey(context) {
                return JSON.stringify({
                    location: context.currentLocation,
                    timeOfDay: context.timeOfDay,
                    physicalState: {
                        energy: Math.round(this.state.physical.energy / 10) * 10,
                        hunger: Math.round(this.state.physical.hunger / 10) * 10
                    },
                    emotionalState: {
                        stress: Math.round(this.state.emotional.stress / 10) * 10,
                        happiness: Math.round(this.state.emotional.happiness / 10) * 10
                    },
                    socialState: {
                        socialNeeds: Math.round(this.state.social.socialNeeds / 10) * 10
                    }
                });
            }
        };

        // 2. 添加决策优先级系统
        this.decisionPriority = {
            // 定义优先级规则
            rules: {
                urgent: {
                    energy: (value) => value < 20 ? 5 : 0,
                    hunger: (value) => value > 80 ? 4 : 0,
                    stress: (value) => value > 80 ? 3 : 0,
                    socialNeeds: (value) => value > 80 ? 2 : 0
                },
                scheduled: {
                    work: 4,
                    eat: 3,
                    rest: 2,
                    socialize: 1
                },
                opportunity: {
                    socializing: 2,
                    entertainment: 1
                }
            },

            // 计算决策优先级
            calculate(decision, state) {
                let priority = 0;
                
                // 检查紧急需求
                priority += this.rules.urgent.energy(state.physical.energy);
                priority += this.rules.urgent.hunger(state.physical.hunger);
                priority += this.rules.urgent.stress(state.emotional.stress);
                priority += this.rules.urgent.socialNeeds(state.social.socialNeeds);
                
                // 检查计划活���
                if (decision.isScheduled) {
                    priority += this.rules.scheduled[decision.action] || 0;
                }
                
                // 检查机会性活动
                if (decision.isOpportunity) {
                    priority += this.rules.opportunity[decision.action] || 0;
                }
                
                return priority;
            },

            // 比较两个决策的优先级
            compare(decision1, decision2, state) {
                const priority1 = this.calculate(decision1, state);
                const priority2 = this.calculate(decision2, state);
                return priority2 - priority1;
            }
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

        // 更新个化性
        Object.assign(this.personality, personality);

        // 生成日常作息安��
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
        try {
            // 检查紧急需求
            const urgentNeed = this.checkUrgentNeeds();
            if (urgentNeed) {
                // 记录思考过程
                this.addToMemory({
                    type: 'thought',
                    content: `发现紧急需求: ${urgentNeed.type}`,
                    reason: `${urgentNeed.reason}, 优先级: ${urgentNeed.priority}`,
                    time: Date.now()
                });

                // 直接处理紧急需求
                return this.handleUrgentNeed(urgentNeed);
            }

            // 获取决策
            const context = {
                agent: {
                    id: this.id,
                    occupation: this.occupation,
                    personality: this.personality,
                    currentState: this.state,
                    currentLocation: this.getCurrentLocationName()
                },
                environment: {
                    nearbyBuildings: this.getNearbyBuildings(),
                    nearbyAgents: this.getNearbyAgents(),
                    timeOfDay: this.timeTracking.gameTime.getHours()
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
                    time: Date.now()
                });
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
        // 使用状态管理器切换状态
        const success = await this.stateManager.changeState({
            type: 'acting',
            action: action.action,
            startTime: Date.now(),
            duration: this.getActionDuration(action.action)
        });

        if (!success) {
            return false;
        }

        const now = Date.now();
        try {
            // 2. 规范化行为对象
            const normalizedAction = this.normalizeAction(action);
            
            // 3. 设置行动状态前先重置
            this.resetBehaviorState();
            
            // 4. 设置新的行动状态
            this.setActionState(normalizedAction);

            // 5. 执行行动
            const result = await this.performAction(normalizedAction);

            // 6. 记录结果
            if (result) {
                this.recordActionSuccess(normalizedAction);
            } else {
                this.recordActionFailure(normalizedAction, '行动执行失败');
            }

            return result;

        } catch (error) {
            this.handleActionError(action, error);
            return false;
        } finally {
            // 7. 清理状态并设置冷却时间
            this.cleanupActionState();
            this.behaviorControl.lastActionTime = now;
            this.behaviorControl.actionCooldown = 5000; // 5秒冷却���间
        }
    }

    canExecuteAction() {
        // 检查否可以执行新行动
        if (this.behaviorControl.isActing || this.behaviorControl.isMoving) {
            return false;
        }

        // 检查冷却时间
        const now = Date.now();
        if (now - this.behaviorControl.lastActionTime < this.behaviorControl.actionCooldown) {
            return false;
        }

        // 检查行为锁定
        if (this.actionLock.isLocked) {
            return false;
        }

        return true;
    }

    getBlockingReason() {
        if (this.behaviorControl.isActing) {
            return `正在执行${this.behaviorControl.currentAction}`;
        }
        if (this.behaviorControl.isMoving) {
            return '正在移动';
        }
        if (this.actionLock.isLocked) {
            return this.actionLock.lockReason;
        }
        return '未知原因';
    }

    normalizeAction(action) {
        return {
            action: action.action || 'unknown',
            target: action.target || null,
            reason: action.reason || '无原因',
            location: action.location || this.getCurrentLocationName(),
            startTime: Date.now(),
            duration: this.getActionDuration(action.action)
        };
    }

    setActionState(action) {
        // 确保所有字段都有值
        const safeAction = {
            type: action.action || 'unknown',
            target: action.target || null,
            reason: action.reason || '无原因',
            startTime: Date.now(),
            location: action.location || this.getCurrentLocationName(),
            duration: this.getActionDuration(action.action)
        };

        // 设置行为控制状态
        this.behaviorControl.isActing = true;
        this.behaviorControl.currentAction = safeAction.type;
        this.behaviorControl.actionStartTime = safeAction.startTime;
        this.behaviorControl.actionDuration = safeAction.duration;

        // 设置当前行为记录
        this.actionHistory.current = safeAction;

        console.log(`代理 ${this.id} 开始新行为:`, {
            类型: safeAction.type,
            目标: safeAction.target,
            原因: safeAction.reason,
            位置: safeAction.location,
            持续时间: safeAction.duration
        });
    }

    cleanupActionState() {
        // 记录之前的状态
        const previousState = {
            isActing: this.behaviorControl.isActing,
            currentAction: this.behaviorControl.currentAction,
            actionStartTime: this.behaviorControl.actionStartTime
        };

        // 完全重置状态
        this.behaviorControl.isActing = false;
        this.behaviorControl.currentAction = null;
        this.behaviorControl.actionStartTime = null;
        this.behaviorControl.actionDuration = null;

        // 清除当前行为记录
        this.actionHistory.current = null;

        console.log(`代理 ${this.id} 状态已重置:`, {
            之前: previousState,
            现在: {
                isActing: false,
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
            eat: 60000,        // 1分钟 - 代表一顿饭的时
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
        // 根据代理���前状态调���行为持续时间
        const energyFactor = this.state.physical.energy / 100;  // 体力越低，行动越慢
        const stressFactor = 1 - (this.state.emotional.stress / 200); // 压力越大，行动越慢
        
        // 综考虑各种因素
        return (energyFactor + stressFactor) / 2;
    }

    async performAction(action) {
        try {
            // 1. 首先验证action对象
            if (!action || !action.action) {
                throw new Error('无效的行动对象');
            }

            // 2. 检查当前状态，允许同类型行为继续执行
            if (this.behaviorControl.isActing && 
                this.behaviorControl.currentAction !== action.action) {
                throw new Error(`正在执行${this.behaviorControl.currentAction || 'unknown'}`);
            }

            // 3. 执行具体行动
            let result = false;
            switch (action.action) {
                case 'work':
                    result = await this.performWork(action);
                    break;
                case 'rest':
                    result = await this.performRest(action);
                    break;
                case 'socialize':
                    result = await this.performSocialize(action);
                    break;
                case 'entertainment':
                    result = await this.performEntertainment(action);
                    break;
                case 'relax':
                    result = await this.performRelax(action);
                    break;
                default:
                    // 默认行为等待指定时间
                    await new Promise(r => setTimeout(r, Math.min(action.duration || 30000, 30000)));
                    result = true;
            }

            // 4. 如果行动成功，更新状态
            if (result) {
                this.updateStateAfterAction(action.action);
            }

            return result;

        } catch (error) {
            console.error(`代理 ${this.id} 执行行动失败:`, error);
            return false;
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
        console.log(`代 ${this.id} ���始休�������，���������计持续 ${duration/1000} 秒`);
        await new Promise(resolve => setTimeout(resolve, duration));
        this.state.physical.energy += 30;
        this.state.emotional.stress -= 15;
    }

    async performSocialize(action) {
        try {
            // 1. 先重置状态，确保没有其他行为在执行
            this.resetBehaviorState();

            // 2. 检查当前位置是否适合社交
            const currentLocation = this.getCurrentLocationName();
            const building = this.city.buildings.get(action.target);
            
            if (!building || !building.functions?.includes('socialize')) {
                console.log(`代理 ${this.id} 当前位置不适合社交:`, currentLocation);
                return false;
            }

            // 3. 寻找附近的代理
            const nearbyAgents = await BehaviorSystem.findSocialPartners(this);
            if (nearbyAgents.length === 0) {
                console.log(`代理 ${this.id} 未找到可交互的代理`);
                return false;
            }

            // 4. 选择一个社交对象
            const targetAgent = nearbyAgents[0];
            console.log(`代理 ${this.id} 选与代理 ${targetAgent.id} 进行社交`);

            // 5. 设置社交状态
            this.behaviorControl.isActing = true;
            this.behaviorControl.currentAction = 'socialize';
            this.behaviorControl.actionStartTime = Date.now();
            this.behaviorControl.actionDuration = this.getActionDuration('socialize');

            // 6. 生成并执行社交互动
            const interaction = await BehaviorSystem.executeSocialInteraction(
                this, 
                targetAgent,
                building
            );

            // 7. 记录社交结果
            if (interaction) {
                // 更新社交需求
                this.state.social.socialNeeds = Math.max(0, 
                    this.state.social.socialNeeds - 30);
                
                // 更新情绪状态
                this.state.emotional.happiness += 10;
                this.state.emotional.stress -= 5;

                // 记录成功的社交
                this.recordAction({
                    action: 'socialize',
                    target: targetAgent.id,
                    location: currentLocation,
                    reason: '社交需求',
                    impact: {
                        socialNeeds: -30,
                        happiness: +10,
                        stress: -5
                    }
                }, 'completed');

                return true;
            }

            return false;

        } catch (error) {
            console.error(`代理 ${this.id} 社交行为执行失败:`, error);
            return false;
        } finally {
            // 8. 清理状态
            this.resetBehaviorState();
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
        try {
            // 1. 先重置状态
            this.resetBehaviorState();
            
            // 2. 设置移动状态
            this.behaviorControl.isMoving = true;
            this.behaviorControl.currentAction = 'move';
            this.behaviorControl.actionStartTime = Date.now();
            
            console.log(`代理 ${this.id} 开始移动到`, targetPosition);

            // 3. 计算路径并移动
            const result = await this.behavior.moveToPosition(targetPosition);

            // 4. 记录移动结果
            if (result) {
                this.recordAction({
                    action: 'move',
                    target: targetPosition,
                    reason: '前往目标位置'
                }, 'completed');
            } else {
                this.recordAction({
                    action: 'move',
                    target: targetPosition,
                    reason: '前往目标位置'
                }, 'failed', {
                    error: '移动失败',
                    errorType: 'MovementFailed'
                });
            }

            return result;

        } catch (error) {
            console.error(`代理 ${this.id} 移动失败:`, error);
            this.recordAction({
                action: 'move',
                target: targetPosition,
                reason: '前往目标位置'
            }, 'failed', {
                error: error.message,
                errorType: error.name,
                errorStack: error.stack
            });
            return false;
        } finally {
            // 5. 清理移动状态
            this.resetBehaviorState();
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
        // 这个方法应该由城市系统调用来获取附近的其他代理
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

    getRelevantMemories(context) {
        const relevantMemories = {
            recent: [],      // 最近的相关记忆
            important: [],   // 重要的相关记忆
            emotional: [],   // 情感相关的记忆
            location: [],    // 地点相关的记忆
            social: []       // 社交相关的记忆
        };

        const now = Date.now();
        const locationName = this.getCurrentLocationName();

        // 搜索所有记忆
        [...this.memory.shortTerm, ...this.memory.experiences].forEach(memory => {
            // 计算记忆的相关性分数
            const relevanceScore = this.calculateMemoryRelevance(memory, context);
            
            if (relevanceScore > 0.5) { // 相关性阈值
                // 根据记忆类型分类
                if (now - memory.time < 3600000) { // 1小时内
                    relevantMemories.recent.push({...memory, relevance: relevanceScore});
                }
                if (memory.importance > 0.7) {
                    relevantMemories.important.push({...memory, relevance: relevanceScore});
                }
                if (memory.type === 'emotional' || memory.emotionalImpact > 0.5) {
                    relevantMemories.emotional.push({...memory, relevance: relevanceScore});
                }
                if (memory.location === locationName) {
                    relevantMemories.location.push({...memory, relevance: relevanceScore});
                }
                if (memory.type === 'social' || memory.type === 'interaction') {
                    relevantMemories.social.push({...memory, relevance: relevanceScore});
                }
            }
        });

        // 对每个类别的记忆按相关性排序并限制数量
        Object.keys(relevantMemories).forEach(key => {
            relevantMemories[key] = relevantMemories[key]
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 5);
        });

        return relevantMemories;
    }

    calculateMemoryRelevance(memory, context) {
        let relevance = 0;

        // 时间相关性（最近的记忆更相关）
        const ageInHours = (Date.now() - memory.time) / (60 * 60 * 1000);
        const timeRelevance = Math.max(0, 1 - (ageInHours / 24)); // 24小时内的记忆最相关
        relevance += timeRelevance * 0.3;

        // 位置相关性
        if (memory.location === context.currentLocation) {
            relevance += 0.3;
        }

        // 情感状态相关性
        if (memory.emotionalImpact) {
            const emotionalStateMatch = 
                (memory.emotionalImpact > 0 && this.state.emotional.happiness > 70) ||
                (memory.emotionalImpact < 0 && this.state.emotional.stress > 70);
            if (emotionalStateMatch) {
                relevance += 0.2;
            }
        }

        // 社交相关性
        if (memory.type === 'social' && context.socialContext) {
            if (memory.partnerId === context.socialContext.partnerId) {
                relevance += 0.4;
            }
        }

        // 活动相关性
        if (memory.action === context.currentAction) {
            relevance += 0.2;
        }

        return Math.max(0, Math.min(1, relevance));
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
                `力: ${Math.round(this.state.physical.energy)}%, ` +
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
        // 确记忆系统已初始化
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
            // 1. 验证求的紧急程度
            const urgencyLevel = this.validateUrgency(need);
            if (urgencyLevel < 3) { // 紧急程度不够
                return this.handleNonUrgentNeed(need);
            }

            // 2. 检查当前状态
            if (!this.canHandleNewNeed(need)) {
                return null;
            }

            // 3. 寻找满足需求的建筑物
            const buildings = await this.findSuitableBuildings(need);
            if (buildings.length === 0) {
                return this.handleNoSuitableBuilding(need);
            }

            // 4. 评估每个建筑物的适合度
            const evaluatedBuildings = buildings.map(building => ({
                building,
                score: this.evaluateBuildingSuitability(building, need)
            })).sort((a, b) => b.score - a.score);

            // 5. 选择最佳建筑物
            const targetBuilding = evaluatedBuildings[0].building;

            // 6. 执行需求行动
            return await this.executeNeedAction(need, targetBuilding);

        } catch (error) {
            console.error(`处理紧急需求失败:`, error);
            return this.handleUrgentNeedFailure(need, error);
        }
    }

    validateUrgency(need) {
        const thresholds = {
            energy: { critical: 20, urgent: 30, normal: 50 },
            hunger: { critical: 80, urgent: 70, normal: 60 },
            stress: { critical: 80, urgent: 70, normal: 60 },
            socialNeeds: { critical: 80, urgent: 70, normal: 60 }
        };

        const state = this.state;
        let urgencyLevel = 0;

        switch (need.type) {
            case 'rest':
                if (state.physical.energy < thresholds.energy.critical) urgencyLevel = 5;
                else if (state.physical.energy < thresholds.energy.urgent) urgencyLevel = 4;
                else if (state.physical.energy < thresholds.energy.normal) urgencyLevel = 3;
                break;
            case 'eat':
                if (state.physical.hunger > thresholds.hunger.critical) urgencyLevel = 5;
                else if (state.physical.hunger > thresholds.hunger.urgent) urgencyLevel = 4;
                else if (state.physical.hunger > thresholds.hunger.normal) urgencyLevel = 3;
                break;
            // ... 其他需求类型的判断
        }

        return urgencyLevel;
    }

    canHandleNewNeed(need) {
        // 检查是否有更紧急的需求
        const currentUrgentNeed = this.checkUrgentNeeds();
        if (currentUrgentNeed && currentUrgentNeed.priority > need.priority) {
            return false;
        }

        // 检查当前行为是否可以中断
        if (this.behaviorControl.isActing) {
            const currentAction = this.behaviorControl.currentAction;
            const currentPriority = this.decisionPriority.calculate(
                { action: currentAction },
                this.state
            );
            if (currentPriority >= need.priority) {
                return false;
            }
        }

        return true;
    }

    async findSuitableBuildings(need) {
        // 获取所有可的建筑物
        const buildings = Array.from(this.city.buildings.values())
            .filter(building => {
                // 基本条件检查
                if (!building.status?.isOpen) return false;
                if (building.currentOccupancy >= building.capacity) return false;

                // 检查建筑物是否提供所需服务
                const services = this.city.getBuildingServices(building);
                return services.includes(need.type);
            });

        // 按距离和适合度排序
        return buildings.sort((a, b) => {
            const distA = this.calculateDistance(this.position, a.position);
            const distB = this.calculateDistance(this.position, b.position);
            const suitabilityA = this.evaluateBuildingSuitability(a, need);
            const suitabilityB = this.evaluateBuildingSuitability(b, need);
            
            // 综合考虑距离和适合度
            return (distA * 0.4 + suitabilityA * 0.6) - 
                   (distB * 0.4 + suitabilityB * 0.6);
        });
    }

    evaluateBuildingSuitability(building, need) {
        let score = 100;

        // 根据建筑物当前状态调整分数
        score *= (building.status.condition / 100);

        // 根据拥挤程度调整分数
        const occupancyRate = building.currentOccupancy / building.capacity;
        if (occupancyRate > 0.8) {
            score *= (1 - (occupancyRate - 0.8));
        }

        // 根据建筑物服务质量调整分数
        if (building.status.services?.[need.type]) {
            score *= (building.status.services[need.type].quality / 100);
        }

        // 根据历史经验调整分数
        const history = this.memory.shortTerm.filter(m => 
            m.type === 'action' && 
            m.location === building.id &&
            m.action === need.type
        );
        
        if (history.length > 0) {
            const successRate = history.filter(h => h.status === 'completed').length / 
                              history.length;
            score *= (0.8 + successRate * 0.2);
        }

        return score;
    }

    handleUrgentNeedFailure(need, error) {
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

        // 尝试替代方案
        return this.findAlternativeSolution(need);
    }

    async findAlternativeSolution(need) {
        // 根据需求类型查找替代方案
        const alternatives = {
            rest: ['relax', 'socialize'],
            eat: ['rest', 'socialize'],
            socialize: ['entertainment', 'rest'],
            work: ['study', 'socialize']
        };

        const alternativeActions = alternatives[need.type] || [];
        
        // 尝试每个替代方案
        for (const action of alternativeActions) {
            const decision = await this.getDecisionForAction(action);
            if (decision) {
                return this.executeAction(decision);
            }
        }

        return null;
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

        // 检查力是否足够
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
        try {
            // 确保action参数存在且有基本结构
            const safeAction = {
                type: action.action || action.type || 'unknown',
                target: this.getActionTargetName(action.target),
                location: action.location || this.getCurrentLocationName(),
                startTime: action.startTime || Date.now(),
                gameTime: new Date(this.timeTracking.gameTime),
                // 改进原因的获取逻辑
                reason: this.getActionReason(action)
            };

            // 创建完整的记录
            const record = {
                type: safeAction.type,
                target: safeAction.target,
                location: safeAction.location,
                startTime: safeAction.startTime,
                endTime: Date.now(),
                gameTime: safeAction.gameTime,
                status: status,
                reason: safeAction.reason,
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
                if (this.actionHistory.completed.length > 20) {
                    this.actionHistory.completed.shift();
                }
            } else if (status === 'failed') {
                record.error = details.error || '未知错误';
                this.actionHistory.failed.push(record);
                if (this.actionHistory.failed.length > 10) {
                    this.actionHistory.failed.shift();
                }
            }

            console.log(`代理 ${this.id} 行为记录:`, {
                行为类型: record.type,
                目标: record.target,
                地点: record.location,
                状态: status,
                原因: record.reason,
                影响: record.impact,
                游戏时间: record.gameTime.toLocaleTimeString()
            });

        } catch (error) {
            console.error(`记录行为失败:`, error);
        }
    }

    getActionReason(action) {
        // 如果直接提供了原因，使用提供的原因
        if (action.reason) {
            return action.reason;
        }

        // 根据行为类型和状态生成默认原因
        const defaultReasons = {
            rest: () => `体力值低(${Math.round(this.state.physical.energy)}%)，需要休息`,
            eat: () => `饥饿度高(${Math.round(this.state.physical.hunger)}%)，需要进食`,
            work: () => '按照工作计划工作',
            socialize: () => `社交需求(${Math.round(this.state.social.socialNeeds)}%)，需要互动`,
            entertainment: () => `压力较大(${Math.round(this.state.emotional.stress)}%)，需要放松`,
            move: () => '前往目标位置',
            relax: () => `压力值高(${Math.round(this.state.emotional.stress)}%)，需要放松`
        };

        // 获取对应行为类型的原因生成函数
        const reasonGenerator = defaultReasons[action.action || action.type];
        if (reasonGenerator) {
            return reasonGenerator();
        }

        // 如果是紧急需求导致的行为
        if (action.isUrgent) {
            return `紧急需求：${action.type}`;
        }

        // 如果是计划行为
        if (action.isScheduled) {
            return '按照日程安排执行';
        }

        // 如果都没有，返回基于当前状态的通用原因
        return this.generateActionReason(action);
    }

    generateActionReason(action) {
        // 检查各种状态，生成合理的原因
        if (this.state.physical.energy < 30) {
            return '体力不足，需要休息';
        }
        if (this.state.emotional.stress > 70) {
            return '压力过大，需要放松';
        }
        if (this.state.social.socialNeeds > 70) {
            return '社交需求强烈，需要互动';
        }
        if (this.state.physical.hunger > 70) {
            return '感到饥饿，需要进食';
        }

        // 如果没有特别的原因，返回基于行为类型的基础原因
        return `执行${action.action || action.type}行为`;
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

    recordActionSuccess(action) {
        this.recordAction(action, 'completed', {
            energyChange: -10,
            stressChange: -5,
            happinessChange: 10,
            socialChange: action.action === 'socialize' ? -30 : 5
        });
    }

    recordActionFailure(action, reason) {
        this.recordAction(action, 'failed', {
            error: reason,
            errorType: 'ActionFailed',
            errorTime: Date.now()
        });
    }

    handleActionError(action, error) {
        console.error(`代理 ${this.id} 执行行动失败:`, error);
        this.recordAction(action, 'failed', {
            error: error.message,
            errorType: error.name,
            errorStack: error.stack
        });
    }

    resetBehaviorState() {
        // 使用状态管理器清理状态
        return this.stateManager.cleanupState();
    }

    // 1. 善记忆清理机制
    cleanupMemory() {
        try {
            const now = Date.now();
            
            // 短期记忆清理（保留最近24小时）
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            this.memory.shortTerm = this.memory.shortTerm.filter(memory => {
                // 检查是否是重要记忆
                if (this.isImportantMemory(memory)) {
                    // 将重要记忆转移到长期记忆
                    this.memory.experiences.push({
                        ...memory,
                        transferredAt: now,
                        importance: this.calculateMemoryImportance(memory)
                    });
                    return false; // 从短期记忆中移除
                }
                return memory.time > oneDayAgo;
            });

            // 长期记忆清理（保留最重要的100条）
            this.memory.experiences = this.memory.experiences
                .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                .slice(0, 100);

            // 关系记忆清理（移除过期的关系）
            for (const [partnerId, relationship] of this.memory.relationships) {
                if (!relationship.lastInteraction || 
                    now - relationship.lastInteraction > 30 * 24 * 60 * 60 * 1000) { // 30天
                    this.memory.relationships.delete(partnerId);
                }
            }

            console.log(`代理 ${this.id} 记忆清理完成:`, {
                短期记忆: this.memory.shortTerm.length,
                长期记忆: this.memory.experiences.length,
                关系数量: this.memory.relationships.size
            });

        } catch (error) {
            console.error(`代理 ${this.id} 记忆清理失败:`, error);
        }
    }

    // 2. 改进记忆影响决策的机制
    async getRelevantMemories(context) {
        const relevantMemories = {
            recent: [],      // 最近的相关记忆
            important: [],   // 重要的相关记忆
            emotional: [],   // 情感相关的记忆
            location: [],    // 地点相关的记忆
            social: []       // 社交相关的记忆
        };

        const now = Date.now();
        const locationName = this.getCurrentLocationName();

        // 搜索所有记忆
        [...this.memory.shortTerm, ...this.memory.experiences].forEach(memory => {
            // 计算记忆的相关性分数
            const relevanceScore = this.calculateMemoryRelevance(memory, context);
            
            if (relevanceScore > 0.5) { // 相关性阈值
                // 根据记忆类型分类
                if (now - memory.time < 3600000) { // 1小时内
                    relevantMemories.recent.push({...memory, relevance: relevanceScore});
                }
                if (memory.importance > 0.7) {
                    relevantMemories.important.push({...memory, relevance: relevanceScore});
                }
                if (memory.type === 'emotional' || memory.emotionalImpact > 0.5) {
                    relevantMemories.emotional.push({...memory, relevance: relevanceScore});
                }
                if (memory.location === locationName) {
                    relevantMemories.location.push({...memory, relevance: relevanceScore});
                }
                if (memory.type === 'social' || memory.type === 'interaction') {
                    relevantMemories.social.push({...memory, relevance: relevanceScore});
                }
            }
        });

        // 对每个类别的记忆按相关性排序并限制数量
        Object.keys(relevantMemories).forEach(key => {
            relevantMemories[key] = relevantMemories[key]
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 5);
        });

        return relevantMemories;
    }

    // 3. 添加记忆优先级系统
    calculateMemoryImportance(memory) {
        let importance = 0;

        // 基于记忆类型的基础重要性
        const baseImportance = {
            emotional: 0.6,    // 情感相关
            social: 0.7,       // 社交相关
            achievement: 0.8,  // 成就相关
            failure: 0.6,      // 失败经历
            decision: 0.5,     // 决策记录
            routine: 0.3       // 日常行为
        }[memory.type] || 0.4;

        importance += baseImportance;

        // 基于情感影响
        if (memory.emotionalImpact) {
            importance += Math.abs(memory.emotionalImpact) * 0.3;
        }

        // 基于社交关系
        if (memory.type === 'social' && memory.partnerId) {
            const relationship = this.memory.relationships.get(memory.partnerId);
            if (relationship) {
                importance += Math.abs(relationship.level) * 0.2;
            }
        }

        // 基于重复度（重复出现的记忆可能更重要）
        const similarMemories = this.findSimilarMemories(memory);
        importance += Math.min(0.3, similarMemories.length * 0.1);

        // 基于时间衰减
        const ageInHours = (Date.now() - memory.time) / (60 * 60 * 1000);
        const timeDecay = Math.max(0, 1 - (ageInHours / (24 * 30))); // 30天完全衰减
        importance *= timeDecay;

        // 确保最终重要性在0-1之间
        return Math.max(0, Math.min(1, importance));
    }

    findSimilarMemories(targetMemory) {
        return [...this.memory.shortTerm, ...this.memory.experiences].filter(memory => {
            if (memory === targetMemory) return false;
            
            // 检查是否是相似的记忆
            return (
                memory.type === targetMemory.type &&
                memory.location === targetMemory.location &&
                (memory.action === targetMemory.action || 
                 memory.partnerId === targetMemory.partnerId)
            );
        });
    }

    calculateMemoryRelevance(memory, context) {
        let relevance = 0;

        // 时间相关性（最近的记忆更相关）
        const ageInHours = (Date.now() - memory.time) / (60 * 60 * 1000);
        const timeRelevance = Math.max(0, 1 - (ageInHours / 24)); // 24小时内的记忆最相关
        relevance += timeRelevance * 0.3;

        // 位置相关性
        if (memory.location === context.currentLocation) {
            relevance += 0.3;
        }

        // 情感状态相关性
        if (memory.emotionalImpact) {
            const emotionalStateMatch = 
                (memory.emotionalImpact > 0 && this.state.emotional.happiness > 70) ||
                (memory.emotionalImpact < 0 && this.state.emotional.stress > 70);
            if (emotionalStateMatch) {
                relevance += 0.2;
            }
        }

        // 社交相关性
        if (memory.type === 'social' && context.socialContext) {
            if (memory.partnerId === context.socialContext.partnerId) {
                relevance += 0.4;
            }
        }

        // 活动相关性
        if (memory.action === context.currentAction) {
            relevance += 0.2;
        }

        return Math.max(0, Math.min(1, relevance));
    }

    isImportantMemory(memory) {
        // 计算记忆的重要性
        const importance = this.calculateMemoryImportance(memory);
        
        // 重要性超过阈值的记忆被认为是重要的
        return importance > 0.7;
    }

    async handleNonUrgentNeed(need) {
        try {
            console.log(`代理 ${this.id} 处理非紧急需求:`, need);

            // 1. 检查当前状态是否适合处理该需求
            if (!this.canHandleNeed(need)) {
                console.log(`代理 ${this.id} 当前状态不适合处理需求`);
                return null;
            }

            // 2. 寻找合适的建筑物
            const buildings = await this.findSuitableBuildings(need);
            if (buildings.length === 0) {
                console.log(`代理 ${this.id} 未找到合适的建筑物`);
                return this.findAlternativeSolution(need);
            }

            // 3. 评估每个建筑物的适合度
            const evaluatedBuildings = buildings.map(building => ({
                building,
                score: this.evaluateBuildingSuitability(building, need)
            })).sort((a, b) => b.score - a.score);

            // 4. 选择最佳建筑物
            const targetBuilding = evaluatedBuildings[0].building;

            // 5. 生成行动决策
            const decision = {
                action: need.type,
                target: targetBuilding.id,
                reason: need.reason,
                priority: need.priority,
                energyCost: this.calculateEnergyCost(need.type),
                stressImpact: this.calculateStressImpact(need.type)
            };

            console.log(`代理 ${this.id} 生成非紧急需求决策:`, decision);
            return decision;

        } catch (error) {
            console.error(`处理非紧急需求失败:`, error);
            return this.getDefaultDecision();
        }
    }

    canHandleNeed(need) {
        // 检查体力是否足够
        if (this.state.physical.energy < 20) {
            return false;
        }

        // 检查压力是否过高
        if (this.state.emotional.stress > 80) {
            return false;
        }

        // 检查是否在执行其他重要行动
        if (this.behaviorControl.isActing) {
            const currentAction = this.behaviorControl.currentAction;
            const currentPriority = this.getCurrentActionPriority();
            if (currentPriority >= need.priority) {
                return false;
            }
        }

        return true;
    }

    getCurrentActionPriority() {
        const priorityMap = {
            work: 3,
            rest: 4,
            eat: 4,
            socialize: 2,
            entertainment: 1
        };

        return priorityMap[this.behaviorControl.currentAction] || 0;
    }

    calculateEnergyCost(actionType) {
        const energyCosts = {
            work: 20,
            rest: -30,
            eat: -10,
            socialize: 10,
            entertainment: 15
        };

        return energyCosts[actionType] || 10;
    }

    calculateStressImpact(actionType) {
        const stressImpacts = {
            work: 15,
            rest: -20,
            eat: -5,
            socialize: -10,
            entertainment: -15
        };

        return stressImpacts[actionType] || 0;
    }

    getDefaultDecision() {
        return {
            action: 'rest',
            target: this.residence?.id,
            reason: '默认休息行为',
            priority: 1,
            energyCost: 5,
            stressImpact: -5
        };
    }

    async getDecisionForAction(actionType) {
        try {
            // 1. 创建决策上下文
            const context = {
                agent: {
                    id: this.id,
                    occupation: this.occupation,
                    personality: this.personality,
                    currentState: this.state,
                    currentLocation: this.getCurrentLocationName()
                },
                environment: {
                    nearbyBuildings: this.getNearbyBuildings(),
                    nearbyAgents: this.getNearbyAgents(),
                    timeOfDay: this.timeTracking.gameTime.getHours(),
                    weather: this.city.getCurrentWeather()
                },
                action: {
                    type: actionType,
                    isForced: true
                }
            };

            // 2. 根据行动类型找到合适的建筑物
            const targetBuilding = this.city.findBuildingForAction(actionType, this);
            if (!targetBuilding) {
                console.log(`未找到适合 ${actionType} 的建筑物`);
                return null;
            }

            // 3. 生成决策对象
            const decision = {
                action: actionType,
                target: targetBuilding.id,
                reason: `执行${actionType}行为`,
                priority: this.getActionPriority(actionType),
                energyCost: this.calculateEnergyCost(actionType),
                stressImpact: this.calculateStressImpact(actionType),
                location: targetBuilding.name
            };

            // 4. 验证决策
            if (!this.validateDecision(decision)) {
                console.log('决策验证失败:', decision);
                return null;
            }

            return decision;

        } catch (error) {
            console.error(`为行动 ${actionType} 生成决策失败:`, error);
            return null;
        }
    }

    getActionPriority(actionType) {
        // 定义不同行动类型的基础优先级
        const basePriorities = {
            rest: 4,      // 休息优先级最高
            eat: 4,       // 进食优先级同样高
            work: 3,      // 工作次之
            socialize: 2, // 社交再次之
            entertainment: 1  // 娱乐优先级最低
        };

        // 获取基础优先级，如果未定义则返回1
        let priority = basePriorities[actionType] || 1;

        // 根据当前状态调整优先级
        switch (actionType) {
            case 'rest':
                if (this.state.physical.energy < 30) priority += 2;
                break;
            case 'eat':
                if (this.state.physical.hunger > 70) priority += 2;
                break;
            case 'socialize':
                if (this.state.social.socialNeeds > 70) priority += 1;
                break;
            case 'work':
                // 在工作时间提高工作优先级
                const hour = this.timeTracking.gameTime.getHours();
                if (hour >= 9 && hour <= 17) priority += 1;
                break;
        }

        return Math.min(5, priority); // 确保优先级不超过5
    }

    validateDecision(decision) {
        // 检查决策对象是否包含所有必要字段
        const requiredFields = [
            'action',
            'target',
            'reason',
            'priority',
            'energyCost',
            'stressImpact'
        ];

        const hasAllFields = requiredFields.every(field => 
            decision.hasOwnProperty(field) && decision[field] !== undefined
        );

        if (!hasAllFields) {
            console.log('决策缺少必要字段:', decision);
            return false;
        }

        // 检查数值是否在合理范围内
        if (decision.priority < 1 || decision.priority > 5) {
            console.log('决策优先级超出范围:', decision.priority);
            return false;
        }

        if (decision.energyCost < -50 || decision.energyCost > 50) {
            console.log('能量消耗超出范围:', decision.energyCost);
            return false;
        }

        if (decision.stressImpact < -50 || decision.stressImpact > 50) {
            console.log('压力影响超出范围:', decision.stressImpact);
            return false;
        }

        // 检查目标建筑物是否存在
        if (decision.target && !this.city.buildings.has(decision.target)) {
            console.log('目标建筑物不存在:', decision.target);
            return false;
        }

        return true;
    }

    // 新增：获取行为目标的名称
    getActionTargetName(targetId) {
        if (!targetId) return '未指定目标';

        // 如果目标是建筑物
        const building = this.city?.buildings.get(targetId);
        if (building) {
            return building.name;
        }

        // 如果目标是其他代理
        const targetAgent = this.city?.agents.get(targetId);
        if (targetAgent) {
            return `代理${targetAgent.id}`;
        }

        // 如果是位置坐标
        if (typeof targetId === 'object' && 'x' in targetId && 'z' in targetId) {
            return `位置(${Math.round(targetId.x)}, ${Math.round(targetId.z)})`;
        }

        // 如果是特定行为的默认目标
        const defaultTargets = {
            'rest': '休息区',
            'work': '工作区',
            'eat': '餐饮区',
            'socialize': '社交区',
            'entertainment': '娱乐区'
        };

        if (this.behaviorControl?.currentAction) {
            return defaultTargets[this.behaviorControl.currentAction] || targetId.toString();
        }

        return targetId.toString();
    }
}

// 添加 StateManager 类定义
class StateManager {
    constructor(agent) {
        this.agent = agent;
        this.state = {
            type: 'idle',
            isActing: false,
            isMoving: false,
            currentAction: null,
            actionStartTime: null,
            actionDuration: null,
            lastActionTime: Date.now(),
            actionCooldown: 5000
        };
        this.stateHistory = [];
        this.stateValidators = new Map();
        this.initializeValidators();
    }

    initializeValidators() {
        // 修改验证规则，使其更加灵活
        this.stateValidators.set('moving', (state) => {
            return state.hasOwnProperty('isMoving') && 
                   state.hasOwnProperty('startTime');
        });

        this.stateValidators.set('acting', (state) => {
            // 修改验证逻辑，不再强制要求action字段
            return state.hasOwnProperty('isActing') && 
                   state.hasOwnProperty('startTime');
        });

        this.stateValidators.set('idle', (state) => {
            return state.hasOwnProperty('isActing') && 
                   state.hasOwnProperty('isMoving');
        });
    }

    async changeState(newState) {
        try {
            // 确保newState包含必要的字段，并设置默认值
            const validState = {
                type: newState.type || 'idle',
                isActing: newState.isActing !== undefined ? newState.isActing : false,
                isMoving: newState.type === 'moving',
                currentAction: newState.action || null,  // 允许action为null
                startTime: newState.startTime || Date.now(),
                duration: newState.duration || 0,
                lastActionTime: Date.now()
            };

            // 验证新状态
            if (!this.validateState(validState)) {
                console.error('无效的状态数据:', validState);
                throw new Error('无效的状态数据');
            }

            // 保存之前的状态
            this.previousState = {...this.state};

            // 执行状态退出逻辑
            if (this.state) {
                await this.exitState(this.state);
            }

            // 更新状态
            this.state = validState;
            this.lastStateChange = Date.now();

            // 记录状态历史
            this.stateHistory.push({
                from: this.previousState,
                to: this.state,
                timestamp: this.lastStateChange
            });

            // 限制历史记录长度
            if (this.stateHistory.length > 20) {
                this.stateHistory.shift();
            }

            // 执行状态进入逻辑
            await this.enterState(validState);

            console.log(`代理 ${this.agent.id} 状态变更:`, {
                从: this.previousState?.type || 'none',
                到: this.state.type,
                时间: new Date(this.lastStateChange).toLocaleTimeString(),
                详细: validState
            });

            return true;

        } catch (error) {
            console.error(`代理 ${this.agent.id} 状态切换失败:`, error);
            return false;
        }
    }

    validateState(state) {
        // 基础验证
        if (!state || typeof state !== 'object') {
            console.error('状态对象无效');
            return false;
        }

        // 检查必要字段
        const requiredFields = ['type', 'isActing', 'isMoving', 'startTime'];
        const hasAllFields = requiredFields.every(field => {
            const hasField = state.hasOwnProperty(field);
            if (!hasField) {
                console.error(`缺少必要字段: ${field}`);
            }
            return hasField;
        });

        if (!hasAllFields) {
            return false;
        }

        // 检查字段类型
        if (typeof state.isActing !== 'boolean' || 
            typeof state.isMoving !== 'boolean' || 
            typeof state.startTime !== 'number') {
            console.error('字段类型错误');
            return false;
        }

        // 获取对应的验证器
        const validator = this.stateValidators.get(state.type);
        if (!validator) {
            // 如果没有找到对应的验证器，使用默认验证
            return this.defaultValidator(state);
        }

        // 执行验证
        return validator(state);
    }

    defaultValidator(state) {
        // 默认验证器，确保基本字段的类型正确
        return typeof state.isActing === 'boolean' &&
               typeof state.isMoving === 'boolean' &&
               typeof state.startTime === 'number';
    }

    async enterState(state) {
        // 根据状态类型执行不同的进入逻辑
        switch (state.type) {
            case 'moving':
                this.agent.behaviorControl.isMoving = true;
                break;
            case 'acting':
                this.agent.behaviorControl.isActing = true;
                this.agent.behaviorControl.currentAction = state.action;
                this.agent.behaviorControl.actionStartTime = state.startTime;
                this.agent.behaviorControl.actionDuration = state.duration;
                break;
            case 'idle':
                // 重置所有活动标志
                this.agent.behaviorControl.isActing = false;
                this.agent.behaviorControl.isMoving = false;
                this.agent.behaviorControl.currentAction = null;
                break;
        }
    }

    async exitState(state) {
        // 根据状态类型执行不同的退出逻辑
        switch (state.type) {
            case 'moving':
                this.agent.behaviorControl.isMoving = false;
                break;
            case 'acting':
                this.agent.behaviorControl.isActing = false;
                this.agent.behaviorControl.currentAction = null;
                this.agent.behaviorControl.actionStartTime = null;
                this.agent.behaviorControl.actionDuration = null;
                break;
        }
    }

    async cleanupState() {
        try {
            // 记录清理前的状态
            const cleanupRecord = {
                time: Date.now(),
                previousState: {...this.state},
                reason: 'manual_cleanup'
            };

            // 执行状态退出逻辑
            if (this.state) {
                await this.exitState(this.state);
            }

            // 重置所有状态
            this.state = {
                isActing: false,
                isMoving: false,
                currentAction: null,
                actionStartTime: null,
                actionDuration: null,
                lastActionTime: Date.now(),
                actionCooldown: 5000
            };

            // 清除当前行为记录
            this.agent.actionHistory.current = null;

            // 记录清理操作
            this.stateHistory.push(cleanupRecord);

            console.log(`代理 ${this.agent.id} 状态已清理:`, cleanupRecord);

            return true;

        } catch (error) {
            console.error(`代理 ${this.agent.id} 状态清理失:`, error);
            return false;
        }
    }

    getStateInfo() {
        return {
            current: this.state,
            previous: this.previousState,
            lastChange: this.lastStateChange,
            history: this.stateHistory.slice(-5)
        };
    }
} 