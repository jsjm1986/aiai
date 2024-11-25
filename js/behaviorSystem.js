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
            // 生成互动内容
            const interaction = await AIService.getInteraction({
                agent1: {
                    id: agent1.id,
                    occupation: agent1.occupation,
                    personality: agent1.personality,
                    currentState: agent1.state
                },
                agent2: {
                    id: agent2.id,
                    occupation: agent2.occupation,
                    personality: agent2.personality,
                    currentState: agent2.state
                },
                location: location.name
            });

            // 更新双方状态
            this.updateAgentAfterSocializing(agent1, interaction);
            this.updateAgentAfterSocializing(agent2, interaction);

            // 更新关系
            this.updateRelationship(agent1, agent2, interaction);

            // 重要：标记社交需求已满足
            agent1.state.social.socialNeeds = Math.max(0, agent1.state.social.socialNeeds - 50);
            agent2.state.social.socialNeeds = Math.max(0, agent2.state.social.socialNeeds - 50);

            // 重要：重置行为状态
            agent1.behaviorControl.isActing = false;
            agent1.behaviorControl.currentAction = null;
            agent2.behaviorControl.isActing = false;
            agent2.behaviorControl.currentAction = null;

            // 添加休息时间
            agent1.behaviorControl.lastActionTime = Date.now();
            agent2.behaviorControl.lastActionTime = Date.now();

            // 记录经历
            const interactionMemory = {
                type: 'social_interaction',
                partner: agent2.id,
                location: location.id,
                time: new Date(),
                content: interaction,
                impact: {
                    socialNeedsReduction: 50,
                    relationshipChange: interaction.impact || 0
                }
            };
            agent1.addToMemory(interactionMemory);

            // 保存更新后的状态
            await AIService.saveAgentData(agent1);
            await AIService.saveAgentData(agent2);

            console.log(`社交互���完成 - ${agent1.id} 与 ${agent2.id}:`, {
                地点: location.name,
                社交需求变化: -50,
                关系影响: interaction.impact
            });

            return true;
        } catch (error) {
            console.error('社交互动执行失败:', error);
            return false;
        }
    }

    static updateAgentAfterSocializing(agent, interaction) {
        // 更新社交需求
        agent.state.social.socialNeeds = Math.max(0, 
            agent.state.social.socialNeeds - 30);

        // 更新情绪状态
        agent.state.emotional.happiness += 10;
        agent.state.emotional.stress -= 5;

        // 消耗能量
        agent.state.physical.energy -= 5;

        // 记录经历
        agent.addToMemory({
            type: 'social_interaction',
            content: interaction,
            time: new Date(),
            location: agent.getCurrentLocationName()
        });
    }

    static updateRelationship(agent1, agent2, interaction) {
        const relationshipChange = interaction.impact || 0;

        // 更新双方关系
        this.updateSingleRelationship(agent1, agent2, relationshipChange);
        this.updateSingleRelationship(agent2, agent1, relationshipChange);
    }

    static updateSingleRelationship(agent1, agent2, change) {
        const relationship = agent1.memory.relationships.get(agent2.id) || {
            level: 0,
            interactions: []
        };

        relationship.level = Math.max(-1, Math.min(1, relationship.level + change));
        relationship.interactions.push({
            time: new Date(),
            impact: change
        });

        agent1.memory.relationships.set(agent2.id, relationship);
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

    static async executeAction(agent, decision) {
        const actionConfig = this.ACTIONS[decision.action.toUpperCase()];
        
        // 如果需要移动到目标位置
        if (decision.target) {
            const targetBuilding = agent.city.buildings.get(decision.target);
            if (targetBuilding) {
                await this.moveToTarget(agent, targetBuilding.position);
            }
        }

        // 执行具体行动
        return {
            success: true,
            energyChange: -actionConfig.energyCost,
            stressChange: actionConfig.stressImpact,
            experience: `完成了${decision.action}行动，原因是${decision.reason}`,
            location: decision.target
        };
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
        if (this.actionQueue.length === 0) return;
        if (this.agent.behaviorControl.isActing) return;

        const nextAction = this.actionQueue[0];
        const result = await this.agent.executeAction(nextAction);
        
        if (result) {
            this.actionQueue.shift(); // 移除已完成的行为
        } else {
            // 如果行为失败，可以选择重试或移除
            const failedAction = this.actionQueue.shift();
            console.log('行为执行失败:', failedAction);
        }
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