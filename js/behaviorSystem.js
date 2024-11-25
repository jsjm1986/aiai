class BehaviorSystem {
    static TIME_SCALE = {
        REAL_HOURS: 4,      // 现实时间4小时
        GAME_HOURS: 24,     // 游戏时间24小时
        // 计算每现实秒对应的游戏秒数
        SECONDS_RATIO: (24 * 3600) / (4 * 3600) // = 6（每现实秒等于6游戏秒）
    };

    static ACTIONS = {
        WORK: {
            type: 'work',
            energyCost: 10,
            stressImpact: 5,
            duration: 8 * 3600,  // 8小时 = 28800游戏秒
            timeRestriction: {
                start: 9,
                end: 18
            }
        },
        REST: {
            type: 'rest',
            energyCost: -20,
            stressImpact: -10,
            duration: 1 * 3600   // 1小时 = 3600游戏秒
        },
        EAT: {
            type: 'eat',
            energyCost: 2,
            stressImpact: -5,
            duration: 30 * 60    // 30分钟 = 1800游戏秒
        },
        SOCIALIZE: {
            type: 'socialize',
            energyCost: 5,
            stressImpact: -15,
            duration: 2 * 3600   // 2小时 = 7200游戏秒
        },
        ENTERTAINMENT: {
            type: 'entertainment',
            energyCost: 3,
            stressImpact: -20,
            duration: 3 * 3600   // 3小时 = 10800游戏秒
        }
    };

    static async processAIDecision(agent, aiDecision) {
        console.log(`处理AI决策 - 代理${agent.id}:`, aiDecision);

        // 处理社交需求
        if (aiDecision.action === 'socialize') {
            return await this.handleSocialAction(agent, aiDecision);
        }

        // 验证并执行其他行动
        if (!this.validateAIDecision(aiDecision)) {
            console.warn('AI决策格式无效:', aiDecision);
            return false;
        }

        return await this.executeAction(agent, aiDecision);
    }

    static async handleSocialAction(agent, decision) {
        // 1. 寻找合适的社交场所
        const socialLocation = await this.findSocialLocation(agent);
        if (!socialLocation) {
            console.log('未找到合适的社交场所');
            return false;
        }

        // 2. 寻找可能的社交对象
        const potentialPartners = await this.findSocialPartners(agent);
        if (potentialPartners.length === 0) {
            console.log('未找到合适的社交对象');
            return false;
        }

        // 3. 移动到社交场所
        const moveResult = await this.moveToLocation(agent, socialLocation.position);
        if (!moveResult) {
            console.log('无法到达社交场所');
            return false;
        }

        // 4. 执行社交互动
        return await this.executeSocialInteraction(agent, potentialPartners[0], socialLocation);
    }

    static async findSocialLocation(agent) {
        const socialLocations = this.ACTIONS.SOCIALIZE.locations;
        const availableLocations = [];

        // 遍历所有建筑物
        for (const building of agent.city.buildings.values()) {
            if (socialLocations.includes(building.type.toLowerCase())) {
                const distance = this.calculateDistance(agent.position, building.position);
                availableLocations.push({
                    building,
                    distance
                });
            }
        }

        // 按距离排序
        availableLocations.sort((a, b) => a.distance - b.distance);
        return availableLocations[0]?.building || null;
    }

    static async findSocialPartners(agent) {
        const nearbyAgents = [];
        const MAX_SOCIAL_DISTANCE = 100; // 最大社交距离

        // 遍历所有代理
        for (const otherAgent of agent.city.agents.values()) {
            if (otherAgent.id === agent.id) continue;

            const distance = this.calculateDistance(agent.position, otherAgent.position);
            if (distance <= MAX_SOCIAL_DISTANCE) {
                // 检查社交兼容性
                const compatibility = this.checkSocialCompatibility(agent, otherAgent);
                if (compatibility > 0.5) { // 兼容性阈值
                    nearbyAgents.push({
                        agent: otherAgent,
                        distance,
                        compatibility
                    });
                }
            }
        }

        // 按兼容性和距离排序
        return nearbyAgents
            .sort((a, b) => (b.compatibility - a.compatibility) || (a.distance - b.distance))
            .map(item => item.agent);
    }

    static checkSocialCompatibility(agent1, agent2) {
        let compatibility = 0;

        // 检查职业兼容性
        if (agent1.occupation === agent2.occupation) {
            compatibility += 0.3;
        }

        // 检查性格兼容性
        const commonTraits = agent1.personality.traits.filter(
            trait => agent2.personality.traits.includes(trait)
        );
        compatibility += commonTraits.length * 0.1;

        // 检查兴趣兼容性
        const commonInterests = agent1.personality.interests.filter(
            interest => agent2.personality.interests.includes(interest)
        );
        compatibility += commonInterests.length * 0.1;

        // 检查现有关系
        const relationship = agent1.memory.relationships.get(agent2.id);
        if (relationship) {
            compatibility += relationship.level * 0.2;
        }

        return Math.min(1, compatibility);
    }

    static async executeSocialInteraction(agent1, agent2, location) {
        try {
            // 1. 检查社交条件
            if (!this.checkSocialConditions(agent1, agent2, location)) {
                console.log('社交条件不满足');
                return false;
            }

            // 2. 生成互动内容
            const interaction = await AIService.getInteraction({
                agent1: {
                    id: agent1.id,
                    occupation: agent1.occupation,
                    personality: agent1.personality,
                    currentState: agent1.state,
                    relationshipHistory: agent1.memory.relationships.get(agent2.id)
                },
                agent2: {
                    id: agent2.id,
                    occupation: agent2.occupation,
                    personality: agent2.personality,
                    currentState: agent2.state,
                    relationshipHistory: agent2.memory.relationships.get(agent1.id)
                },
                environment: {
                    location: location.name,
                    time: new Date(),
                    type: location.type,
                    atmosphere: this.getLocationAtmosphere(location)
                }
            });

            // 3. 执行互动效果
            await this.applySocialEffects(agent1, agent2, interaction);

            // 4. 更新关系网络
            this.updateRelationships(agent1, agent2, interaction);

            // 5. 记录互动历史
            this.recordInteraction(agent1, agent2, interaction, location);

            return true;

        } catch (error) {
            console.error('社交互动执行失败:', error);
            return false;
        }
    }

    static checkSocialConditions(agent1, agent2, location) {
        // 检查双方是否都有社交意愿
        if (agent1.state.social.socialNeeds < 30 || agent2.state.social.socialNeeds < 30) {
            return false;
        }

        // 检查地点是否适合社交
        if (!location.functions?.includes('socialize')) {
            return false;
        }

        // 检查双方的情绪状态
        if (agent1.state.emotional.stress > 80 || agent2.state.emotional.stress > 80) {
            return false;
        }

        // 检查社交时间是否合适
        const currentHour = new Date().getHours();
        if (currentHour < 6 || currentHour > 22) {
            return false;
        }

        return true;
    }

    static async applySocialEffects(agent1, agent2, interaction) {
        // 计算社交影响
        const impact = this.calculateSocialImpact(interaction);

        // 更新双方状态
        for (const agent of [agent1, agent2]) {
            // 更新社交需求
            agent.state.social.socialNeeds = Math.max(0, 
                agent.state.social.socialNeeds - impact.socialNeedReduction);

            // 更新情绪状态
            agent.state.emotional.happiness += impact.happinessChange;
            agent.state.emotional.stress += impact.stressChange;

            // 确保状态值在有效范围内
            agent.state.emotional.happiness = Math.min(100, 
                Math.max(0, agent.state.emotional.happiness));
            agent.state.emotional.stress = Math.min(100, 
                Math.max(0, agent.state.emotional.stress));

            // 添加社交经验
            agent.addToMemory({
                type: 'social_experience',
                partnerId: agent === agent1 ? agent2.id : agent1.id,
                content: interaction.content,
                impact: impact,
                time: Date.now()
            });
        }
    }

    static updateRelationships(agent1, agent2, interaction) {
        // 获取当前关系值
        const getRelationship = (a1, a2) => {
            if (!a1.memory.relationships.has(a2.id)) {
                a1.memory.relationships.set(a2.id, {
                    level: 0,
                    interactions: 0,
                    lastInteraction: null,
                    history: []
                });
            }
            return a1.memory.relationships.get(a2.id);
        };

        // 更新双方关系
        const rel1 = getRelationship(agent1, agent2);
        const rel2 = getRelationship(agent2, agent1);

        // 计算关系变化
        const relationshipChange = this.calculateRelationshipChange(interaction);

        // 更新关系值
        for (const rel of [rel1, rel2]) {
            rel.level = Math.max(-1, Math.min(1, rel.level + relationshipChange));
            rel.interactions++;
            rel.lastInteraction = Date.now();
            rel.history.push({
                time: Date.now(),
                type: interaction.type,
                impact: relationshipChange,
                mood: interaction.mood
            });

            // 限制历史记录长度
            if (rel.history.length > 20) {
                rel.history.shift();
            }
        }
    }

    static calculateRelationshipChange(interaction) {
        let change = 0;

        // 基于互动类型的基础变化
        const baseChange = {
            friendly: 0.1,
            neutral: 0.05,
            awkward: -0.05,
            negative: -0.1
        }[interaction.mood] || 0;

        // 根据互动质量调整
        change += baseChange * (interaction.quality || 1);

        // 根据共同话题调整
        if (interaction.commonTopics) {
            change += 0.05 * interaction.commonTopics.length;
        }

        // 限制单次变化范围
        return Math.max(-0.2, Math.min(0.2, change));
    }

    static recordInteraction(agent1, agent2, interaction, location) {
        const record = {
            type: 'interaction',
            participants: [agent1.id, agent2.id],
            location: location.name,
            time: Date.now(),
            content: interaction.content,
            mood: interaction.mood,
            impact: interaction.impact,
            relationshipChange: this.calculateRelationshipChange(interaction)
        };

        // 记录到双方的记忆中
        agent1.addToMemory(record);
        agent2.addToMemory(record);

        // 记录到建筑物的历史中
        if (location.history) {
            location.history.push({
                type: 'social_interaction',
                agents: [agent1.id, agent2.id],
                time: Date.now()
            });
        }
    }

    static getLocationAtmosphere(location) {
        // 根据地点类型和当前状态计算氛围
        const baseAtmosphere = {
            cafe: 'relaxed',
            restaurant: 'lively',
            park: 'peaceful',
            plaza: 'bustling',
            library: 'quiet',
            bar: 'energetic'
        }[location.type] || 'neutral';

        // 考虑时间因素
        const hour = new Date().getHours();
        let timeModifier = 'normal';
        if (hour < 6) timeModifier = 'quiet';
        else if (hour < 10) timeModifier = 'morning';
        else if (hour < 14) timeModifier = 'busy';
        else if (hour < 18) timeModifier = 'relaxed';
        else if (hour < 22) timeModifier = 'evening';
        else timeModifier = 'night';

        // 考虑拥挤程度
        const crowdedness = location.currentOccupancy / location.capacity;
        let crowdModifier = 'moderate';
        if (crowdedness < 0.3) crowdModifier = 'empty';
        else if (crowdedness < 0.6) crowdModifier = 'comfortable';
        else if (crowdedness < 0.9) crowdModifier = 'crowded';
        else crowdModifier = 'packed';

        return {
            base: baseAtmosphere,
            time: timeModifier,
            crowd: crowdModifier
        };
    }

    static validateAIDecision(decision) {
        const requiredFields = ['action', 'target', 'reason', 'energyCost', 'stressImpact'];
        return requiredFields.every(field => decision.hasOwnProperty(field));
    }

    static canExecuteAction(agent, decision) {
        const actionConfig = this.ACTIONS[decision.action.toUpperCase()];
        if (!actionConfig) return false;

        // 检查时间限制
        if (actionConfig.timeRestriction) {
            const currentHour = new Date().getHours();
            if (currentHour < actionConfig.timeRestriction.start || 
                currentHour >= actionConfig.timeRestriction.end) {
                return false;
            }
        }

        // 检查能量是否足够
        if (agent.state.physical.energy < actionConfig.energyCost) {
            return false;
        }

        // 检查目标位置是否存在且可达
        if (decision.target) {
            const targetBuilding = agent.city.buildings.get(decision.target);
            if (!targetBuilding) return false;
        }

        return true;
    }

    static async executeAction(agent, action) {
        try {
            // 设置当前行为的详细信息
            agent.behaviorControl = {
                type: action.action,
                target: action.target || this.getDefaultTarget(action.action),
                location: action.location || agent.getCurrentLocationName(),
                reason: action.reason || this.getActionReason(agent, action),
                startTime: Date.now(),
                duration: this.ACTIONS[action.action.toUpperCase()]?.duration || 3600,
                status: 'active'
            };

            // 记录行为开始
            agent.recordAction(agent.behaviorControl, 'started');

            // 执行具体行为
            const result = await this.performAction(agent, action);

            if (result) {
                agent.recordActionSuccess(agent.behaviorControl);
            } else {
                agent.recordActionFailure(agent.behaviorControl, '行为执行失败');
            }

            return result;
        } catch (error) {
            console.error(`执行行为失败:`, error);
            agent.recordActionFailure(agent.behaviorControl, error.message);
            return false;
        }
    }

    static getActionReason(agent, action) {
        // 根据代理状态和行为类型生成原因
        const state = agent.state;
        const reasons = {
            work: () => {
                if (agent.schedule?.current?.type === 'work') {
                    return '按照工作计划工作';
                }
                return `工作需求 (工作进度: ${Math.round(state.work?.progress || 0)}%)`;
            },
            rest: () => `体力不足 (当前体力: ${Math.round(state.physical.energy)}%)`,
            eat: () => `需要进食 (饥饿度: ${Math.round(state.physical.hunger)}%)`,
            socialize: () => `社交需求 (社交需求度: ${Math.round(state.social.socialNeeds)}%)`,
            entertainment: () => `需要放松 (压力值: ${Math.round(state.emotional.stress)}%)`,
            move: () => '前往目标位置',
            default: () => `执行${action.action}行为`
        };

        return (reasons[action.action] || reasons.default)();
    }

    static getDefaultTarget(actionType) {
        const targets = {
            work: '工作场所',
            rest: '休息区',
            eat: '餐厅',
            socialize: '社交场所',
            entertainment: '娱乐设施',
            move: '目标位置',
            default: '未指定位置'
        };

        return targets[actionType] || targets.default;
    }

    static async performAction(agent, action) {
        const actionHandler = {
            work: () => this.handleWork(agent),
            rest: () => this.handleRest(agent),
            eat: () => this.handleEat(agent),
            socialize: () => this.handleSocialize(agent),
            entertainment: () => this.handleEntertainment(agent),
            move: () => this.handleMove(agent, action.target)
        }[action.action];

        if (!actionHandler) {
            console.warn(`未知的行为类型: ${action.action}`);
            return false;
        }

        return await actionHandler();
    }

    static async moveToTarget(agent, targetPosition) {
        if (!targetPosition) return false;

        try {
            // 标记开始移动
            agent.behaviorControl.isMoving = true;
            console.log(`代理 ${agent.id} 开始移动到:`, targetPosition);

            // 获取路径
            const path = agent.city.pathFinder.findPath(agent.position, targetPosition);
            if (!path || path.length === 0) {
                console.warn('无法找到路径');
                return false;
            }

            // 遍历路径点
            for (const point of path) {
                if (!agent.behaviorControl.isMoving) break; // 检查是否被中断

                // 移动到下一个点
                const moved = await this.moveStep(agent, point);
                if (!moved) break;

                // 更新城市渲染
                agent.city.needsUpdate = true;
                
                // 等待一小段时间
                await new Promise(resolve => setTimeout(resolve, 16));
            }

            // 确保到达最终位置
            agent.position = {
                x: targetPosition.x,
                y: 0,
                z: targetPosition.z
            };

            return true;
        } catch (error) {
            console.error(`代理 ${agent.id} 移动失败:`, error);
            return false;
        } finally {
            // 移动结束
            agent.behaviorControl.isMoving = false;
        }
    }

    static async moveStep(agent, targetPoint) {
        try {
            const dx = targetPoint.x - agent.position.x;
            const dz = targetPoint.z - agent.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            // 如果已经很接近目标点，直接到达
            if (distance <= agent.behavior.movementSpeed) {
                agent.position = {
                    x: targetPoint.x,
                    y: 0,
                    z: targetPoint.z
                };
                return true;
            }

            // 计算移动方向
            const dirX = dx / distance;
            const dirZ = dz / distance;

            // 更新位置
            agent.position.x += dirX * agent.behavior.movementSpeed;
            agent.position.z += dirZ * agent.behavior.movementSpeed;

            // 轻微消耗能量
            agent.state.physical.energy = Math.max(0, 
                agent.state.physical.energy - 0.1);

            return true;
        } catch (error) {
            console.error(`移动步骤失败:`, error);
            return false;
        }
    }

    static async waitForActionCompletion(agent, decision) {
        const actionConfig = this.ACTIONS[decision.action.toUpperCase()];
        const gameDuration = decision.duration || actionConfig.duration;
        // 将游戏时间转换为现实时间
        const realDuration = gameDuration / this.TIME_SCALE.SECONDS_RATIO;
        await new Promise(resolve => setTimeout(resolve, realDuration * 1000));
    }

    static updateAgentState(agent, actionResult) {
        // 更新物理状态
        agent.state.physical.energy += actionResult.energyChange;
        agent.state.physical.energy = Math.max(0, Math.min(100, agent.state.physical.energy));

        // 更新情绪状态
        agent.state.emotional.stress += actionResult.stressChange;
        agent.state.emotional.stress = Math.max(0, Math.min(100, agent.state.emotional.stress));

        // 根据行动结果更新其他状态
        if (actionResult.success) {
            agent.state.emotional.satisfaction += 5;
        }
    }

    static async recordActionResult(agent, decision, result) {
        // 记录到代理的记忆中
        agent.addToMemory({
            type: 'action',
            action: decision.action,
            target: decision.target,
            reason: decision.reason,
            result: result,
            time: new Date()
        });

        // 保存更新后的状态
        await AIService.saveAgentData(agent);
    }

    static calculatePath(agent, targetPosition) {
        if (agent.city && agent.city.pathFinder) {
            return agent.city.pathFinder.findPath(agent.position, targetPosition);
        }
        return [{x: targetPosition.x, y: 0, z: targetPosition.z}];
    }

    constructor(agent) {
        this.agent = agent;
        this.currentPath = [];
        this.targetPosition = null;
        this.isMoving = false;
        this.moveSpeed = 2;
        this.lastMoveTime = 0;
        this.moveInterval = 16; // 约60fps
        
        // 添加行为队列
        this.actionQueue = [];
        this.maxQueueSize = 5;

        // 添加行为状态管理
        this.actionState = {
            current: null,
            queue: [],
            history: [],
            timeout: null,
            maxQueueSize: 5,
            maxRetries: 3
        };

        // 添加行为超时配置
        this.timeoutConfig = {
            default: 30000,    // 默认30秒
            move: 20000,       // 移动20秒
            socialize: 40000,  // 社交40秒
            work: 60000        // 工作60秒
        };
    }

    // 添加行为到队列
    queueAction(action) {
        if (this.actionQueue.length >= this.maxQueueSize) {
            console.log('行为队列已满，丢弃新行为');
            return false;
        }
        this.actionQueue.push(action);
        return true;
    }

    // 处理行为队列
    async processActionQueue() {
        // 如果当前有行为在执行，不处理队列
        if (this.actionState.current) return;

        // 如果队列为空，不处理
        if (this.actionState.queue.length === 0) return;

        // 获取下一个行为
        const nextAction = this.actionState.queue[0];

        try {
            // 设置行为超时
            const timeout = this.timeoutConfig[nextAction.type] || this.timeoutConfig.default;
            this.setActionTimeout(nextAction, timeout);

            // 执行行为
            this.actionState.current = nextAction;
            const result = await this.agent.executeAction(nextAction);

            if (result) {
                // 行为成功，从队列中移除
                this.actionState.queue.shift();
                this.actionState.history.push({
                    ...nextAction,
                    status: 'completed',
                    completedTime: Date.now()
                });
            } else {
                // 行为失败，处理重试
                if (nextAction.retries < this.actionState.maxRetries) {
                    nextAction.retries++;
                    console.log(`代理 ${this.agent.id} 行为失败，重试第 ${nextAction.retries} 次`);
                } else {
                    // 超过最大重试次数，移除行为
                    this.actionState.queue.shift();
                    this.actionState.history.push({
                        ...nextAction,
                        status: 'failed',
                        failedTime: Date.now(),
                        reason: 'exceeded max retries'
                    });
                }
            }
        } catch (error) {
            console.error(`代理 ${this.agent.id} 处理行为失败:`, error);
        } finally {
            // 清理当前行为状态
            this.actionState.current = null;
            this.clearActionTimeout();
        }
    }

    // 设置行为超时
    setActionTimeout(action, duration) {
        this.clearActionTimeout();
        this.actionState.timeout = setTimeout(() => {
            console.log(`代理 ${this.agent.id} 行为超时:`, action);
            this.handleActionTimeout(action);
        }, duration);
    }

    // 清理超时定时器
    clearActionTimeout() {
        if (this.actionState.timeout) {
            clearTimeout(this.actionState.timeout);
            this.actionState.timeout = null;
        }
    }

    // 处理行为超时
    handleActionTimeout(action) {
        // 记录超时
        this.actionState.history.push({
            ...action,
            status: 'timeout',
            timeoutTime: Date.now()
        });

        // 重置代理状态
        this.agent.resetBehaviorState();

        // 从队列中移除超时的行为
        if (this.actionState.queue.length > 0 && 
            this.actionState.queue[0].addedTime === action.addedTime) {
            this.actionState.queue.shift();
        }

        // 清理当前行为状态
        this.actionState.current = null;
    }

    async moveToPosition(targetPosition) {
        try {
            if (!targetPosition) {
                console.warn(`代理 ${this.agent.id} 移动目标位置无效`);
                return false;
            }

            this.targetPosition = targetPosition;
            
            // 使用A*算法计算路径
            const path = await this.calculatePath(this.agent.position, targetPosition);
            if (!path || path.length === 0) {
                console.warn(`代理 ${this.agent.id} 无法找到到目标位置的路径`);
                return false;
            }

            this.currentPath = path;
            this.isMoving = true;

            // 开始移动
            console.log(`代理 ${this.agent.id} 开始移动到:`, targetPosition);

            // 沿路径移动
            for (let i = 0; i < path.length; i++) {
                if (!this.isMoving) break; // 检查是否被中断

                const nextPoint = path[i];
                await this.moveToPoint(nextPoint);

                // 更新代理位置
                this.agent.position = {...nextPoint};
                
                // 标记需要更新渲染
                if (this.agent.city) {
                    this.agent.city.needsUpdate = true;
                }

                // 等待下一帧
                await this.waitNextFrame();
            }

            // 确保到达最终位置
            this.agent.position = {
                x: targetPosition.x,
                y: 0,
                z: targetPosition.z
            };

            this.isMoving = false;
            this.currentPath = [];
            return true;

        } catch (error) {
            console.error(`代理 ${this.agent.id} 移动过程出错:`, error);
            this.isMoving = false;
            this.currentPath = [];
            return false;
        }
    }

    async moveToPoint(point) {
        const startPos = {...this.agent.position};
        const endPos = point;
        const distance = this.calculateDistance(startPos, endPos);
        const steps = Math.ceil(distance / this.movementSpeed);

        for (let i = 0; i < steps; i++) {
            const progress = i / steps;
            
            // 使用线性插值计算当前位置
            this.agent.position = {
                x: startPos.x + (endPos.x - startPos.x) * progress,
                y: 0,
                z: startPos.z + (endPos.z - startPos.z) * progress
            };

            // 标记需要更新渲染
            if (this.agent.city) {
                this.agent.city.needsUpdate = true;
            }

            // 等待下一帧
            await this.waitNextFrame();
        }
    }

    async calculatePath(start, end) {
        // 如果有城市的寻路系统，使用它
        if (this.agent.city && this.agent.city.pathFinder) {
            return this.agent.city.pathFinder.findPath(start, end);
        }

        // 否则使用简单的直线路径
        const path = [];
        const distance = this.calculateDistance(start, end);
        const steps = Math.ceil(distance / 50); // 每50个单位一个路径点

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            path.push({
                x: start.x + (end.x - start.x) * progress,
                y: 0,
                z: start.z + (end.z - start.z) * progress
            });
        }

        return path;
    }

    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    waitNextFrame() {
        return new Promise(resolve => {
            const now = Date.now();
            const timeSinceLastMove = now - this.lastMoveTime;
            
            if (timeSinceLastMove >= this.moveInterval) {
                this.lastMoveTime = now;
                resolve();
            } else {
                setTimeout(resolve, this.moveInterval - timeSinceLastMove);
            }
        });
    }

    checkCollision(position) {
        // 检查是否与其他代理或建筑物碰撞
        if (!this.agent.city) return false;

        // 检查与其他代理的碰撞
        for (const otherAgent of this.agent.city.agents.values()) {
            if (otherAgent.id === this.agent.id) continue;
            
            const distance = this.calculateDistance(position, otherAgent.position);
            if (distance < 10) { // 假设代理的碰撞半径是10个单位
                return true;
            }
        }

        // 检查与建筑物的碰撞
        for (const building of this.agent.city.buildings.values()) {
            // 简单的矩形碰撞检测
            const buildingBounds = {
                minX: building.position.x - building.size * 10,
                maxX: building.position.x + building.size * 10,
                minZ: building.position.z - building.size * 10,
                maxZ: building.position.z + building.size * 10
            };

            if (position.x >= buildingBounds.minX && position.x <= buildingBounds.maxX &&
                position.z >= buildingBounds.minZ && position.z <= buildingBounds.maxZ) {
                return true;
            }
        }

        return false;
    }
} 