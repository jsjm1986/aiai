class City {
    constructor() {
        // 初始化基本属性
        this.canvas = document.getElementById('city-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.cityScale = 1;
        
        // 初始化颜色方案
        this.colors = {
            background: '#f5f5f5',
            grid: '#e0e0e0',
            residential: '#A8D5BA',
            commercial: '#95B8D1',
            industrial: '#F2D4CC',
            education: '#DCD6F7',
            park: '#B8E0D2',
            road: '#d4d4d4'
        };

        // 初始化数据存储
        this.agents = new Map();
        this.buildings = new Map();
        this.roads = new Map();
        this.populationData = null;
        this.cityPlanData = null;
        this.timeScale = 1;
        this.paused = false;
        this.gridData = new Map();
        
        // 初始化职业颜色映射
        this.occupationColors = new Map();
        this.colorPalette = [
            '#4CAF50', '#2196F3', '#9C27B0', 
            '#FF9800', '#E91E63', '#00BCD4',
            '#3F51B5', '#009688', '#FFC107',
            '#795548', '#607D8B', '#F44336'
        ];

        // 初始化视图控制
        this.view = {
            offsetX: 0,
            offsetY: 0,
            scale: 1,
            isDragging: false,
            lastX: 0,
            lastY: 0,
            minScale: 0.2,
            maxScale: 5,
            isPinching: false,
            pinchDistance: 0
        };
        
        // 初始化路径查找器
        this.pathFinder = new PathFinder(this);

        // 只设置事件监听，不进行渲染
        this.setupInteractions();
        
        console.log('城市实例已创建');

        // 添加更新标志
        this.needsUpdate = true;

        this.ui = null;

        // 初始化游戏时间为早上8:00
        this.gameTime = new Date();
        this.gameTime.setHours(8, 0, 0, 0);
        
        // 改进时间系统配置
        this.timeConfig = {
            startHour: 8,    // 游戏开始时间
            timeScale: 1,    // 时间流速倍率
            lastUpdate: Date.now(),
            // 添加时间转换配置
            REAL_MINUTE_TO_GAME_HOURS: 1,  // 1现实分钟 = 1游戏小时
            MIN_TIME_SCALE: 0.5,           // 最小时间流速
            MAX_TIME_SCALE: 10,            // 最大时间流速
            UPDATE_INTERVAL: 1000          // 时间更新间隔（毫秒）
        };

        console.log('城市实例已创建，初始时间:', this.gameTime.toLocaleTimeString());

        // 添加暂停相关状态
        this.paused = false;
        this.previousTimeScale = 1;
        this.updateLoopId = null;
        this.animationFrameId = null;
    }

    setupInteractions() {
        console.log('设置交互事件');
        
        // 添加鼠标事件监听
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

        // 添加触摸事件支持
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // 设置始光标样式
        this.canvas.style.cursor = 'grab';
    }

    handleMouseDown(event) {
        this.view.isDragging = true;
        this.view.lastX = event.clientX;
        this.view.lastY = event.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(event) {
        if (!this.view.isDragging) return;

        const deltaX = event.clientX - this.view.lastX;
        const deltaY = event.clientY - this.view.lastY;

        this.view.offsetX += deltaX;
        this.view.offsetY += deltaY;

        this.view.lastX = event.clientX;
        this.view.lastY = event.clientY;

        // 视图变化时标记需要更新
        this.needsUpdate = true;
    }

    handleMouseUp() {
        this.view.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    handleWheel(event) {
        event.preventDefault();

        // 获取鼠标在画布上的位置
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // 计算鼠标在世界坐标中的位置
        const worldX = (mouseX - this.view.offsetX) / this.view.scale;
        const worldY = (mouseY - this.view.offsetY) / this.view.scale;

        // 计算新的缩放比例
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(
            this.view.minScale,
            Math.min(this.view.maxScale, this.view.scale * delta)
        );

        // 更新缩放比例
        this.view.scale = newScale;

        // 调整偏移量保持鼠标位置不变
        this.view.offsetX = mouseX - worldX * this.view.scale;
        this.view.offsetY = mouseY - worldY * this.view.scale;

        // 缩放变化时标记需要更新
        this.needsUpdate = true;
    }

    handleTouchStart(event) {
        if (event.touches.length === 1) {
            // 单指拖动
            const touch = event.touches[0];
            this.view.isDragging = true;
            this.view.lastX = touch.clientX;
            this.view.lastY = touch.clientY;
        } else if (event.touches.length === 2) {
            // 双指缩放
            this.view.isPinching = true;
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.view.pinchDistance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            );
        }
    }

    handleTouchMove(event) {
        event.preventDefault();

        if (this.view.isDragging && event.touches.length === 1) {
            // 单指拖动
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.view.lastX;
            const deltaY = touch.clientY - this.view.lastY;

            this.view.offsetX += deltaX;
            this.view.offsetY += deltaY;

            this.view.lastX = touch.clientX;
            this.view.lastY = touch.clientY;

            this.render();
        } else if (this.view.isPinching && event.touches.length === 2) {
            // 双指缩放
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const newDistance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            );

            // 计算缩放比例
            const delta = newDistance / this.view.pinchDistance;
            const newScale = Math.max(
                this.view.minScale,
                Math.min(this.view.maxScale, this.view.scale * delta)
            );

            // 计算缩放中心
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;

            // 更新缩放
            this.view.scale = newScale;
            this.view.pinchDistance = newDistance;

            this.render();
        }
    }

    handleTouchEnd() {
        this.view.isDragging = false;
        this.view.isPinching = false;
    }

    async initialize() {
        try {
            console.log('开始初始化城市...');
            this.loadingManager = new LoadingManager();

            // 1. 初始UI管器（如果还没有初始化）
            if (!this.ui) {
                this.ui = new UIManager(this);
            }

            // 2. 生成人口数据
            this.loadingManager.updateProgress(1, '生成人口数据', '正在生成城市居民...');
            const populationData = await AIService.generatePopulation(CONFIG.CITY_SETTINGS.INITIAL_POPULATION);
            
            // 验证人口数据
            if (!AIService.validatePopulationData(populationData)) {
                throw new Error('人口数据生成不完整或格式错误');
            }
            
            this.populationData = populationData;
            console.log('人口数据:', this.populationData);

            // 3. 根据人口数据生成城市规划
            this.loadingManager.updateProgress(3, '生成城市规划', '根据人口需求规划城市...');
            const cityPlanData = await AIService.generateCityBasedOnNeeds(this.populationData);
            
            // 验证城市规划数据
            if (!AIService.validateCityPlan(cityPlanData)) {
                throw new Error('城市成不完整或格式错误');
            }
            
            this.cityPlanData = cityPlanData;
            console.log('城市规划数据:', this.cityPlanData);

            // 4. 设置城市场景
            this.loadingManager.updateProgress(4, '创建城市场景', '正在构建可视化场景...');
            await this.setupCity(this.cityPlanData);

            // 5. 初始化画布（移到这里）
            this.setupCanvas();

            // 6. 初始化AI代理
            this.loadingManager.updateProgress(5, '初始化AI代理', '正在创建智能居民...');
            await this.initializeAgents();

            // 7. 启动模拟
            this.startSimulation();
            this.loadingManager.complete();

            console.log('城市初始化完成');

            // 更新UI
            this.ui.updateDemographics(this.populationData);
            this.ui.updateBuildingInfo(this.cityPlanData);
        } catch (error) {
            console.error('城市初始化失败:', error);
            this.loadingManager.showError(error.message);
            throw error;
        }
    }

    setupCanvas() {
        console.log('设置画布');
        
        // 设置画布大小为窗口大小
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            if (this.gridData && this.gridData.size > 0) {
                this.render(); // 只在有数据时渲染
            }
        };

        // 初始设置
        resizeCanvas();

        // 监听窗口大小变化
        window.addEventListener('resize', resizeCanvas);

        // 设置画布样式
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '-1';

        // 设置画布背景色
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        console.log('画布设置完成');
    }

    render() {
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 应用视图变换
        this.ctx.save();
        this.ctx.translate(this.view.offsetX, this.view.offsetY);
        this.ctx.scale(this.view.scale, this.view.scale);

        // 绘制背景
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        this.drawGrid();

        // 绘制道路
        this.drawRoads();

        // 绘制建筑物
        this.drawBuildings();

        // 绘制AI代理
        this.drawAgents();

        this.ctx.restore();

        // 标记渲染完成
        this.needsUpdate = false;
    }

    drawGrid() {
        const gridSize = this.gridSize;
        const width = this.canvas.width / this.view.scale;
        const height = this.canvas.height / this.view.scale;

        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;

        // 绘制垂直线
        for (let x = 0; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        // 绘制水平线
        for (let y = 0; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    drawBuildings() {
        this.buildings.forEach(building => {
            const screenX = (building.position.x / this.gridSize) * this.gridSize;
            const screenY = (building.position.z / this.gridSize) * this.gridSize;
            
            // 根据建筑物类型和大小计算实际尺寸
            const baseSize = (building.size || 1) * this.gridSize;
            const size = {
                width: baseSize * (building.type === 'commercial' ? 1.5 : 1),
                height: baseSize * (building.type === 'commercial' ? 1.2 : 1)
            };
            
            // 绘制建筑物阴影
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.fillRect(
                screenX - size.width/2 + 4, 
                screenY - size.height/2 + 4,
                size.width,
                size.height
            );
            
            // 根据建筑类型选择颜色和样式
            const style = this.getBuildingStyle(building);
            
            // 绘制建筑物主体
            this.ctx.fillStyle = style.fillColor;
            this.ctx.strokeStyle = style.strokeColor;
            this.ctx.lineWidth = style.lineWidth;
            
            // 绘制建筑物形状
            if (style.shape === 'rectangle') {
                // 标准矩形建筑
                this.ctx.fillRect(
                    screenX - size.width/2,
                    screenY - size.height/2,
                    size.width,
                    size.height
                );
                this.ctx.strokeRect(
                    screenX - size.width/2,
                    screenY - size.height/2,
                    size.width,
                    size.height
                );
            } else if (style.shape === 'complex') {
                // 复杂形状建筑（如商业建筑）
                this.drawComplexBuilding(screenX, screenY, size, style);
            }
            
            // 添加建筑物细节
            this.drawBuildingDetails(screenX, screenY, size, building, style);
            
            // 绘制建筑物名称
            this.drawBuildingLabel(screenX, screenY, size, building);
        });
    }

    getBuildingStyle(building) {
        const styles = {
            residential: {
                fillColor: '#A8D5BA',
                strokeColor: '#7FB59C',
                lineWidth: 1,
                shape: 'rectangle',
                details: 'windows',
                windows: {
                    rows: 3,
                    cols: 4,
                    color: '#FFFFFF'
                }
            },
            commercial: {
                fillColor: '#95B8D1',
                strokeColor: '#6A8CA3',
                lineWidth: 2,
                shape: 'complex',
                details: 'modern',
                windows: {
                    rows: 5,
                    cols: 6,
                    color: '#E8F4F8'
                }
            },
            education: {
                fillColor: '#DCD6F7',
                strokeColor: '#B1ABD9',
                lineWidth: 1,
                shape: 'rectangle',
                details: 'academic',
                windows: {
                    rows: 4,
                    cols: 5,
                    color: '#FFFFFF'
                }
            },
            healthcare: {
                fillColor: '#F2D4CC',
                strokeColor: '#D4B6AE',
                lineWidth: 1,
                shape: 'complex',
                details: 'medical',
                windows: {
                    rows: 4,
                    cols: 4,
                    color: '#FFFFFF'
                }
            },
            park: {
                fillColor: '#B8E0D2',
                strokeColor: '#8AB5A7',
                lineWidth: 1,
                shape: 'organic',
                details: 'nature'
            }
        };

        return styles[building.type] || styles.residential;
    }

    drawComplexBuilding(x, y, size, style) {
        this.ctx.beginPath();
        
        // 绘制主体
        this.ctx.moveTo(x - size.width/2, y + size.height/2);
        this.ctx.lineTo(x - size.width/2, y - size.height/2);
        this.ctx.lineTo(x + size.width/2, y - size.height/2);
        this.ctx.lineTo(x + size.width/2, y + size.height/2);
        
        // 添加顶部细节
        this.ctx.moveTo(x - size.width/2, y - size.height/2);
        this.ctx.lineTo(x, y - size.height/2 - size.height/4);
        this.ctx.lineTo(x + size.width/2, y - size.height/2);
        
        this.ctx.fillStyle = style.fillColor;
        this.ctx.fill();
        this.ctx.strokeStyle = style.strokeColor;
        this.ctx.stroke();
    }

    drawBuildingDetails(x, y, size, building, style) {
        if (style.details === 'windows') {
            // 窗户
            const windowWidth = size.width / (style.windows.cols + 1);
            const windowHeight = size.height / (style.windows.rows + 1);
            
            this.ctx.fillStyle = style.windows.color;
            
            for (let row = 1; row <= style.windows.rows; row++) {
                for (let col = 1; col <= style.windows.cols; col++) {
                    this.ctx.fillRect(
                        x - size.width/2 + col * windowWidth - windowWidth/2,
                        y - size.height/2 + row * windowHeight - windowHeight/2,
                        windowWidth * 0.8,
                        windowHeight * 0.8
                    );
                }
            }
        } else if (style.details === 'modern') {
            // 现代建筑细节
            this.ctx.strokeStyle = style.strokeColor;
            this.ctx.setLineDash([2, 2]);
            
            // 绘制玻璃幕墙效果
            for (let i = 1; i < style.windows.cols; i++) {
                const xPos = x - size.width/2 + (size.width / style.windows.cols) * i;
                this.ctx.beginPath();
                this.ctx.moveTo(xPos, y - size.height/2);
                this.ctx.lineTo(xPos, y + size.height/2);
                this.ctx.stroke();
            }
            
            this.ctx.setLineDash([]);
        }
    }

    drawBuildingLabel(x, y, size, building) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 将建筑物名称分行示
        const lines = this.wrapText(building.name, size.width - 4);
        lines.forEach((line, index) => {
            this.ctx.fillText(
                line,
                x,
                y - size.height/4 + (index * 14)
            );
        });
    }

    drawRoads() {
        this.roads.forEach(road => {
            if (!road.points || road.points.length < 2) return;
            
            // 绘制路基
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#808080';
            this.ctx.lineWidth = (road.width || 1) * 3;
            
            const startX = (road.points[0].x / this.gridSize) * this.gridSize;
            const startY = (road.points[0].z / this.gridSize) * this.gridSize;
            this.ctx.moveTo(startX, startY);
            
            for (let i = 1; i < road.points.length; i++) {
                const x = (road.points[i].x / this.gridSize) * this.gridSize;
                const y = (road.points[i].z / this.gridSize) * this.gridSize;
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.stroke();
            
            // 绘路面
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#A0A0A0';
            this.ctx.lineWidth = (road.width || 1) * 2.5;
            
            this.ctx.moveTo(startX, startY);
            for (let i = 1; i < road.points.length; i++) {
                const x = (road.points[i].x / this.gridSize) * this.gridSize;
                const y = (road.points[i].z / this.gridSize) * this.gridSize;
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.stroke();
            
            // 绘制道路标线
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([10, 10]);
            
            this.ctx.moveTo(startX, startY);
            for (let i = 1; i < road.points.length; i++) {
                const x = (road.points[i].x / this.gridSize) * this.gridSize;
                const y = (road.points[i].z / this.gridSize) * this.gridSize;
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });
    }

    wrapText(text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const width = this.ctx.measureText(currentLine + words[i]).width;
            if (width < maxWidth) {
                currentLine += words[i];
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);
        return lines;
    }

    drawAgents() {
        this.agents.forEach(agent => {
            const screenX = (agent.position.x / this.gridSize) * this.gridSize;
            const screenY = (agent.position.z / this.gridSize) * this.gridSize;
            
            // 绘制代理主体
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
            
            // 根据职设置颜色
            const color = this.getAgentColor(agent.occupation);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            
            // 绘制移动轨迹
            if (agent.behavior.path && agent.behavior.path.length > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, screenY);
                
                agent.behavior.path.forEach(point => {
                    const pathX = (point.x / this.gridSize) * this.gridSize;
                    const pathY = (point.z / this.gridSize) * this.gridSize;
                    this.ctx.lineTo(pathX, pathY);
                });
                
                this.ctx.strokeStyle = `${color}80`; // 半透明
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // 绘制状态指示器
            if (agent.behaviorControl.isActing) {
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // 绘制代理信息
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(
                agent.occupation,
                screenX,
                screenY - 10
            );
        });
    }

    getAgentColor(occupation) {
        const colors = {
            teacher: '#2196F3',
            doctor: '#F44336',
            engineer: '#9C27B0',
            student: '#FF9800',
            worker: '#795548',
            default: '#4CAF50'
        };
        return colors[occupation.toLowerCase()] || colors.default;
    }

    drawInteractionLine(agent1, agent2) {
        const x1 = (agent1.position.x / this.gridSize) * this.gridSize;
        const y1 = (agent1.position.z / this.gridSize) * this.gridSize;
        const x2 = (agent2.position.x / this.gridSize) * this.gridSize;
        const y2 = (agent2.position.z / this.gridSize) * this.gridSize;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    async initializeAgents() {
        console.log('开始初始化AI代理...');
        
        if (!this.populationData || !this.populationData.people) {
            throw new Error('缺少人口数据');
        }

        // 获取所有可行走的位置
        const walkablePositions = this.getWalkablePositions();
        if (walkablePositions.length === 0) {
            throw new Error('没有找到可行走的位置');
        }

        for (const person of this.populationData.people) {
            try {
                // 获取性化特征
                const personalityData = await AIService.getPersonality(person);
                
                // 获取工作地点和住所
                const workplace = this.findWorkplace(person.occupation);
                const residence = this.findResidence(person);

                // 选择生成位置（优先选择住所附近的位置）
                let spawnPosition;
                if (residence) {
                    spawnPosition = this.findNearbyWalkablePosition(residence.position, walkablePositions);
                } else if (workplace) {
                    spawnPosition = this.findNearbyWalkablePosition(workplace.position, walkablePositions);
                } else {
                    // 如果没有找到住所和工作地点，随机选择一个可行走的位置
                    const randomIndex = Math.floor(Math.random() * walkablePositions.length);
                    spawnPosition = walkablePositions[randomIndex];
                }

                // 创建AI代理
                const agent = new AIAgent(
                    person.id,
                    spawnPosition,
                    person.occupation,
                    person.needs,
                    person.traits
                );

                // 设置代理的工作和居住地点
                agent.workplace = workplace;
                agent.residence = residence;

                // 设置个性化特征
                agent.personality = personalityData.personality;
                agent.schedule = personalityData.schedule;

                // 置城市引用和移动速度
                agent.city = this;
                agent.behavior.movementSpeed = 2;

                // 保存代理初始数据
                await AIService.saveAgentData({
                    id: agent.id,
                    name: person.name,
                    occupation: agent.occupation,
                    personality: agent.personality,
                    state: agent.state,
                    memory: {
                        shortTerm: [],
                        relationships: [],
                        experiences: []
                    },
                    behavior: {
                        currentAction: null,
                        schedule: agent.schedule,
                        location: spawnPosition
                    },
                    workplace: workplace ? {
                        id: workplace.id,
                        name: workplace.name,
                        type: workplace.type
                    } : null,
                    residence: residence ? {
                        id: residence.id,
                        name: residence.name,
                        type: residence.type
                    } : null
                });

                // 添加到代理集合
                this.agents.set(agent.id, agent);
                
                console.log(`成功初始化代理: ${agent.id}, 位置:`, spawnPosition);
            } catch (error) {
                console.error(`初始化代理 ${person.id} 失败:`, error);
                throw error;
            }
        }

        console.log(`成功初始化 ${this.agents.size} 个AI代理`);
    }

    getWalkablePositions() {
        const walkablePositions = [];
        const gridSize = this.gridSize;

        // 遍历网格数据
        this.gridData.forEach((cell, key) => {
            const [x, y] = key.split(',').map(Number);
            // 检查是否是可行走的位置（道路或公共空间）
            if (cell.type === 'road' || cell.type === 'public_space') {
                walkablePositions.push({
                    x: x * gridSize + gridSize / 2,
                    y: 0,
                    z: y * gridSize + gridSize / 2
                });
            }
        });

        return walkablePositions;
    }

    findNearbyWalkablePosition(targetPosition, walkablePositions) {
        // 按照到目标位置的距离排序可行走位置
        const sortedPositions = walkablePositions.sort((a, b) => {
            const distA = this.calculateDistance(targetPosition, a);
            const distB = this.calculateDistance(targetPosition, b);
            return distA - distB;
        });

        // 返回最近的可行走位置
        return sortedPositions[0] || walkablePositions[0];
    }

    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    findWorkplace(occupation) {
        // 根据职业类型查找合适的工作场所
        const workplaceTypes = {
            softwareEngineer: ['commercial', 'office'],
            teacher: ['education'],
            doctor: ['healthcare'],
            marketingManager: ['commercial'],
            chef: ['restaurant'],
            retailWorker: ['commercial'],
            artist: ['studio', 'commercial'],
            scientist: ['research', 'education'],
            lawyer: ['office', 'commercial'],
            accountant: ['office', 'commercial']
        };

        // 获取该职业可以工作的建筑类型
        const suitableTypes = workplaceTypes[occupation] || ['commercial'];

        // 查找合适的建筑物
        const workplace = Array.from(this.buildings.values()).find(building => {
            return (
                // 检查建筑类型是否匹配
                (suitableTypes.includes(building.type) || suitableTypes.includes(building.subType)) &&
                // 检查建筑物是否开放
                building.status?.isOpen &&
                // 检查是否还有容量
                (!building.capacity || building.currentOccupancy < building.capacity)
            );
        });

        if (!workplace) {
            console.log(`未找到适合 ${occupation} 的工作场所`);
        } else {
            console.log(`为 ${occupation} 找到工作场所:`, workplace.name);
        }

        return workplace;
    }

    findResidence(person) {
        // 根据人物特征决定住房类型
        const housingPreference = this.determineHousingType(person);
        
        // 查找合适的住所
        const residence = Array.from(this.buildings.values()).find(building => {
            return (
                // 必须是住宅类型
                building.type === 'residential' &&
                // 子类型匹配（如果有）
                (!housingPreference.subType || building.subType === housingPreference.subType) &&
                // 价格等级匹配
                (!housingPreference.priceLevel || building.priceLevel === housingPreference.priceLevel) &&
                // 还有空房
                (!building.capacity || building.currentOccupancy < building.capacity)
            );
        });

        if (!residence) {
            console.log(`未找到适合的住所，使用默认住宅`);
            // 返回任意一个未满的住宅
            return Array.from(this.buildings.values()).find(b => 
                b.type === 'residential' && 
                (!b.capacity || b.currentOccupancy < b.capacity)
            );
        }

        return residence;
    }

    determineHousingType(person) {
        // 根据职业和收入水平决定住房偏好
        const housingPreferences = {
            softwareEngineer: { subType: 'apartment', priceLevel: 'high' },
            doctor: { subType: 'apartment', priceLevel: 'high' },
            lawyer: { subType: 'apartment', priceLevel: 'high' },
            teacher: { subType: 'apartment', priceLevel: 'medium' },
            marketingManager: { subType: 'apartment', priceLevel: 'medium' },
            accountant: { subType: 'apartment', priceLevel: 'medium' },
            retailWorker: { subType: 'apartment', priceLevel: 'basic' },
            chef: { subType: 'apartment', priceLevel: 'basic' }
        };

        // 获取职业对应的住房偏好，如果没有则使用默认值
        return housingPreferences[person.occupation] || {
            subType: 'apartment',
            priceLevel: 'basic'
        };
    }

    startSimulation() {
        console.log('启动城市模拟...');
        
        // 确保时间从早上8点开始
        this.gameTime.setHours(8, 0, 0, 0);
        this.timeConfig.lastUpdate = Date.now();
        
        // 初始建筑物状态
        this.updateBuildings();
        
        // 每分钟更新一次建筑物状态
        setInterval(() => {
            this.updateBuildings();
        }, 60000);
        
        // 开始更新循环
        this.updateLoop();
        
        // 开始渲染循环
        this.animate();

        console.log('模拟开始，当前游戏时间:', this.gameTime.toLocaleTimeString());
    }

    updateLoop() {
        if (this.paused) {
            if (this.updateLoopId) {
                clearTimeout(this.updateLoopId);
                this.updateLoopId = null;
            }
            return;
        }

        // 更新游戏时间
        this.updateGameTime();

        // 检查计划活动
        this.checkScheduledActivities();

        // 更新建筑物状态
        this.updateBuildings();

        // 更新代理状态
        if (!this.paused) {
            this.updateAgents();
        }

        // 更新城市状态
        this.updateCityState();

        // 更新UI
        if (this.ui) {
            this.ui.updateCityStats();
        }

        // 继续下一帧更新
        this.updateLoopId = setTimeout(() => this.updateLoop(), 
            this.timeConfig.UPDATE_INTERVAL);
    }

    animate() {
        if (this.paused) {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            return;
        }

        // 存储动画帧ID以便能够停止
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // 只在需要时重新渲染
        if (this.needsUpdate) {
            this.render();
            this.needsUpdate = false;
        }
    }

    cleanup() {
        // 停止更新循环
        if (this.updateLoopId) {
            clearTimeout(this.updateLoopId);
            this.updateLoopId = null;
        }

        // 停止动画循环
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // 清理所有代理
        this.agents.clear();

        // 清理所有建筑物
        this.buildings.clear();

        // 重置状态
        this.paused = false;
        this.timeScale = 1;
        this.needsUpdate = false;

        console.log('城市系统已清理');
    }

    updateAgents() {
        let hasAgentsMoved = false;
        
        for (const agent of this.agents.values()) {
            try {
                // 获取代理的决策
                const decision = agent.think();
                
                // 如果有决策，行行动
                if (decision) {
                    // 如果需要移动到目标位置
                    if (decision.target) {
                        const targetBuilding = this.buildings.get(decision.target);
                        if (targetBuilding) {
                            // 移动到目标建筑物
                            const moved = agent.moveTo(targetBuilding.position);
                            if (moved) {
                                hasAgentsMoved = true;
                                console.log(`代理 ${agent.id} 正在移动到 ${decision.target}`);
                            }
                        }
                    }
                    
                    // 执行其他行动
                    agent.executeAction(decision);
                }
            } catch (error) {
                console.error(`更新代理 ${agent?.id || 'unknown'} 失败:`, error);
            }
        }

        // 只有当代理移动时才标记需要更新
        if (hasAgentsMoved) {
            this.needsUpdate = true;
        }
    }

    updateCityState() {
        // 更新时
        this.currentTime = new Date();

        // 更新天气
        this.updateWeather();

        // 更新建筑状态
        this.updateBuildings();

        // 更新交通状态
        this.updateTraffic();
    }

    updateWeather() {
        // 简单的天气系
        if (Math.random() < 0.001) { // 0.1%的概率改变天气
            const weathers = ['sunny', 'cloudy', 'rainy', 'stormy'];
            this.weather = weathers[Math.floor(Math.random() * weathers.length)];
        }
    }

    updateBuildings() {
        // 使用游戏时间而不是系统时间
        const currentHour = this.gameTime.getHours();
        
        this.buildings.forEach(building => {
            // 1. 更新建筑物基础状态
            this.updateBuildingBaseStatus(building, currentHour);
            
            // 2. 更新容量状态
            this.updateBuildingCapacity(building);
            
            // 3. 更新服务状态
            this.updateBuildingServices(building);
            
            // 4. 记录状态变化
            this.logBuildingStatus(building);
        });
    }

    updateBuildingBaseStatus(building, currentHour) {
        // 获取建筑物的详细时间表
        const schedule = this.getBuildingSchedule(building);
        
        // 检查是否在营业时间
        building.status = building.status || {};
        building.status.isOpen = this.checkBuildingOpenStatus(schedule, currentHour);
        
        // 更新建筑物状态
        building.status.condition = this.calculateBuildingCondition(building);
        building.status.lastUpdate = this.gameTime;
    }

    updateBuildingCapacity(building) {
        // 初始化容量相关状态
        building.status.capacity = building.status.capacity || {
            total: building.capacity || 100,
            current: 0,
            reserved: 0,
            available: building.capacity || 100,
            sections: new Map()  // 不同区域的容量
        };

        // 更新当前人数
        const currentOccupants = this.getAgentsInBuilding(building.id);
        building.status.capacity.current = currentOccupants.length;
        
        // 检查容量限制
        if (building.status.capacity.current >= building.status.capacity.total * 0.8) {
            // 发出容量预警
            this.emitBuildingAlert(building, 'CAPACITY_WARNING');
        }

        // 更新可用容量
        building.status.capacity.available = 
            building.status.capacity.total - 
            building.status.capacity.current - 
            building.status.capacity.reserved;
    }

    updateBuildingServices(building) {
        // 初始化服务状态
        building.status.services = building.status.services || {};
        
        // 获取建筑物提供的服务列表
        const services = this.getBuildingServices(building);
        
        services.forEach(service => {
            // 更新每个服务的状态
            building.status.services[service] = {
                available: building.status.isOpen,
                quality: this.calculateServiceQuality(building, service),
                capacity: this.getServiceCapacity(building, service),
                currentLoad: this.getServiceCurrentLoad(building, service),
                lastUpdate: this.gameTime
            };
        });
    }

    getBuildingSchedule(building) {
        // 根据建筑类型返回详细的营业时间表
        const defaultSchedules = {
            residential: { 
                default: { open: 0, close: 24 }  // 24小时
            },
            commercial: {
                weekday: { open: 9, close: 21 },
                weekend: { open: 10, close: 22 }
            },
            restaurant: {
                lunch: { open: 11, close: 14 },
                dinner: { open: 17, close: 22 }
            },
            cafe: {
                default: { open: 7, close: 23 }
            },
            park: {
                default: { open: 0, close: 24 }
            },
            plaza: {
                default: { open: 0, close: 24 }
            },
            recreation: {
                default: { open: 9, close: 22 }
            }
        };

        return building.schedule || 
               defaultSchedules[building.type]?.default || 
               { open: 9, close: 18 };
    }

    checkBuildingOpenStatus(schedule, currentHour, currentMinute) {
        // 处理24小时营业的情况
        if (schedule.open === 0 && schedule.close === 24) {
            return true;
        }

        // 处理跨日营业的情况
        if (schedule.close < schedule.open) {
            return currentHour >= schedule.open || currentHour < schedule.close;
        }

        // 处理特殊时段
        if (schedule.lunch || schedule.dinner) {
            return (currentHour >= schedule.lunch?.open && currentHour < schedule.lunch?.close) ||
                   (currentHour >= schedule.dinner?.open && currentHour < schedule.dinner?.close);
        }

        // 常规营业时间判断
        return currentHour >= schedule.open && currentHour < schedule.close;
    }

    calculateBuildingCondition(building) {
        // 计算建筑物状态（0-100）
        let condition = 100;
        
        // 根据使用间减少状态值
        const hoursOpen = this.getHoursOpen(building);
        condition -= hoursOpen * 0.1;
        
        // 根据使用人数减少状态值
        const totalVisitors = building.status.capacity?.current || 0;
        condition -= totalVisitors * 0.01;
        
        // 确保状态值在有效范围内
        return Math.max(0, Math.min(100, condition));
    }

    getAgentsInBuilding(buildingId) {
        // 获取当前在建筑物内的所有代理
        return Array.from(this.agents.values()).filter(agent => 
            agent.currentLocation?.id === buildingId
        );
    }

    calculateServiceQuality(building, service) {
        // 计算服务质量（0-100）
        let quality = 100;
        
        // 根据建筑物状态调整
        quality *= (building.status.condition / 100);
        
        // 根据拥挤程度调整
        const capacity = this.getServiceCapacity(building, service);
        const currentLoad = this.getServiceCurrentLoad(building, service);
        const occupancyRate = capacity > 0 ? currentLoad / capacity : 1;
        
        if (occupancyRate > 0.8) {
            quality *= (1 - (occupancyRate - 0.8));
        }
        
        // 根据服务类型特殊调整
        const serviceFactors = {
            socialize: 1.2,  // 社交服务质量提升
            rest: 0.9,      // 休息服务质量略低
            work: 1.0       // 工作服务保持不变
        };
        
        quality *= (serviceFactors[service] || 1);
        
        return Math.max(0, Math.min(100, quality));
    }

    logBuildingStatus(building) {
        console.log(`更新建筑物状态: ${building.name}`, {
            类型: building.type,
            当前时间: this.gameTime.toLocaleTimeString(),
            营业状态: building.status.isOpen ? '营业中' : '已关闭',
            当前人数: building.status.capacity.current,
            最大容量: building.status.capacity.total,
            建筑状况: building.status.condition,
            服务状态: building.status.services
        });
    }

    updateTraffic() {
        // 简化道路更新逻辑
        for (const road of this.roads.values()) {
            if (!road.status) {
                road.status = {
                    congestion: 0,
                    maxCongestion: 100
                };
            }

            // 模拟简单的交通流量变化
            const hour = new Date().getHours();
            if (hour >= 7 && hour <= 9) { // 早高峰
                road.status.congestion = Math.min(100, road.status.congestion + 5);
            } else if (hour >= 17 && hour <= 19) { // 晚高峰
                road.status.congestion = Math.min(100, road.status.congestion + 5);
            } else {
                road.status.congestion = Math.max(0, road.status.congestion - 2);
            }
        }
    }

    getStats() {
        return {
            population: this.agents.size,
            buildings: this.buildings.size,
            districts: this.cityPlanData?.districts?.length || 0,
            demographics: this.populationData?.demographics,
            time: this.currentTime,
            weather: this.weather
        };
    }

    async setupCity(cityPlan) {
        console.log('设置城市场景:', cityPlan);

        try {
            // 1. 首先创建网格数据
            this.createGrid();

            // 2. 初始化基础建筑
            const baseBuildings = [
                {
                    id: 'residential_1',
                    name: '住宅区1',
                    type: 'residential',
                    size: 2,
                    capacity: 100,
                    schedule: { open: 0, close: 24 }
                },
                {
                    id: 'commercial_1',
                    name: '商业中心',
                    type: 'commercial',
                    size: 3,
                    capacity: 200,
                    schedule: { open: 8, close: 22 }
                },
                {
                    id: 'park_1',
                    name: '中央公园',
                    type: 'park',
                    size: 4,
                    capacity: 300,
                    schedule: { open: 0, close: 24 }
                },
                {
                    id: 'community_1',
                    name: '社区中心',
                    type: 'recreation',
                    size: 2,
                    capacity: 150,
                    schedule: { open: 8, close: 22 }
                },
                {
                    id: 'plaza_1',
                    name: '城市广场',
                    type: 'plaza',
                    size: 3,
                    capacity: 200,
                    schedule: { open: 0, close: 24 }
                },
                {
                    id: 'cafe_1',
                    name: '咖啡馆',
                    type: 'cafe',
                    size: 1,
                    capacity: 50,
                    schedule: { open: 7, close: 23 }
                }
            ];

            // 3. 获取AI生成的建筑配置
            const { buildingTypes, essentialBuildings } = await AIService.generateBuildingsForNeeds(cityPlan.needs);
            
            // 4. 将essential buildings转换为建筑物数组
            const aiGeneratedBuildings = Object.entries(essentialBuildings).map(([id, building]) => ({
                id: `${building.type}_${id}`,
                name: building.name,
                type: building.type,
                subType: building.subType,
                size: 2,
                capacity: 100,
                schedule: building.schedule,
                services: building.services
            }));

            // 5. 合并所有建筑物
            const allBuildings = [...baseBuildings, ...aiGeneratedBuildings];

            // 6. 为每个建筑物分配位置和功能
            const processedBuildings = allBuildings.map(building => {
                const position = this.getRandomPosition();
                // 在网格中标记建筑物位置
                this.markBuildingArea(position, building.size);
                
                return {
                    ...building,
                    position,
                    functions: this.getBuildingFunctions(building.type),
                    status: {
                        isOpen: this.checkIfOpen(building.schedule || { open: 8, close: 22 }),
                        currentOccupancy: 0,
                        maxOccupancy: building.capacity || 50,
                        services: {}
                    }
                };
            });

            // 7. 创建道路网络连接建筑物
            this.createRoadNetwork(processedBuildings);

            // 8. 将建筑物添加到城市中
            processedBuildings.forEach(building => {
                this.buildings.set(building.id, building);
                console.log(`添加建筑物: ${building.name}`, {
                    类型: building.type,
                    位置: building.position,
                    功能: building.functions,
                    状态: building.status
                });
            });

            console.log('城市场景设置完成，建筑物总数:', this.buildings.size);
            console.log('可用于社交的建筑:', 
                Array.from(this.buildings.values())
                    .filter(b => b.functions.includes('socialize'))
                    .map(b => b.name)
            );

        } catch (error) {
            console.error('置城市场景失败:', error);
            throw error;
        }
    }

    createGrid() {
        // 创建网格数据
        this.gridSize = 20; // 每个网格单元的大小
        this.gridData = new Map();
        
        // 初始化所有网格为可行走区域
        for (let x = 0; x < this.canvas.width / this.gridSize; x++) {
            for (let z = 0; z < this.canvas.height / this.gridSize; z++) {
                this.gridData.set(`${x},${z}`, {
                    type: 'walkable',
                    occupied: false
                });
            }
        }
    }

    markBuildingArea(position, size) {
        // 将建筑物占用的网格标记为不可行走
        const gridX = Math.floor(position.x / this.gridSize);
        const gridZ = Math.floor(position.z / this.gridSize);
        const buildingSize = Math.ceil(size * 2); // 建筑物大小转换为网格单位

        for (let x = gridX - buildingSize; x <= gridX + buildingSize; x++) {
            for (let z = gridZ - buildingSize; z <= gridZ + buildingSize; z++) {
                const key = `${x},${z}`;
                if (this.gridData.has(key)) {
                    this.gridData.set(key, {
                        type: 'building',
                        occupied: true
                    });
                }
            }
        }
    }

    createRoadNetwork(buildings) {
        // 在建筑物之间创建道路网络
        buildings.forEach((building, index) => {
            if (index === 0) return;
            
            const prevBuilding = buildings[index - 1];
            const roadPath = this.findRoadPath(prevBuilding.position, building.position);
            
            roadPath.forEach(point => {
                const gridX = Math.floor(point.x / this.gridSize);
                const gridZ = Math.floor(point.z / this.gridSize);
                const key = `${gridX},${gridZ}`;
                
                if (this.gridData.has(key)) {
                    this.gridData.set(key, {
                        type: 'road',
                        occupied: false
                    });
                }
            });
        });
    }

    findRoadPath(start, end) {
        // 简单的直线路径
        const points = [];
        const steps = Math.max(
            Math.abs(end.x - start.x),
            Math.abs(end.z - start.z)
        ) / this.gridSize;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            points.push({
                x: start.x + (end.x - start.x) * t,
                z: start.z + (end.z - start.z) * t
            });
        }

        return points;
    }

    checkIfOpen(schedule) {
        const currentHour = this.gameTime.getHours();
        
        // 24小时营业的建筑物
        if (schedule.open === 0 && schedule.close === 24) {
            return true;
        }
        
        // 处理跨日营业的情况（如餐厅22:00-次日2:00）
        if (schedule.close < schedule.open) {
            return currentHour >= schedule.open || currentHour < schedule.close;
        }
        
        // 普通营业时间判断
        return currentHour >= schedule.open && currentHour < schedule.close;
    }

    isOpenNow(schedule) {
        const currentHour = new Date().getHours();
        return currentHour >= schedule.open && currentHour < schedule.close;
    }

    // 检查建筑物是否可以满足特定需求
    canSatisfyNeed(buildingId, need) {
        const building = this.buildings.get(buildingId);
        if (!building) return false;

        return (
            building.functions.includes(need) &&
            building.status.isOpen &&
            building.currentOccupancy < building.capacity &&
            building.status.services[need]?.available
        );
    }

    // 获取可以满足特定需求的建筑列表
    getBuildingsForNeed(need) {
        return Array.from(this.buildings.values())
            .filter(building => this.canSatisfyNeed(building.id, need))
            .sort((a, b) => {
                // 按服务质量和当前占用率排序
                const qualityA = a.status.services[need]?.quality || 0;
                const qualityB = b.status.services[need]?.quality || 0;
                const occupancyRateA = a.currentOccupancy / a.capacity;
                const occupancyRateB = b.currentOccupancy / b.capacity;
                return (qualityB - qualityA) || (occupancyRateA - occupancyRateB);
            });
    }

    createGridFromCityPlan(cityPlan) {
        console.log('开始创建网格数据');
        const gridData = new Map();
        
        if (!cityPlan || !cityPlan.buildings || !Array.isArray(cityPlan.buildings)) {
            console.error('无效的城市规划数据:', cityPlan);
            return gridData;
        }

        // 处理建筑物
        cityPlan.buildings.forEach(building => {
            const gridX = Math.floor(building.position.x / this.gridSize);
            const gridY = Math.floor(building.position.z / this.gridSize);
            
            gridData.set(`${gridX},${gridY}`, {
                type: building.type,
                data: building
            });
        });

        // 处理道路
        if (cityPlan.infrastructure && cityPlan.infrastructure.roads) {
            cityPlan.infrastructure.roads.forEach(road => {
                if (road.points && road.points.length >= 2) {
                    for (let i = 0; i < road.points.length - 1; i++) {
                        const start = road.points[i];
                        const end = road.points[i + 1];
                        this.drawRoadSegment(gridData, start, end, road.width || 1);
                    }
                }
            });
        }

        console.log('生成的网格数据大小:', gridData.size);
        return gridData;
    }

    drawRoadSegment(gridData, start, end, width) {
        const points = this.getLinePoints(
            Math.floor(start.x / this.gridSize),
            Math.floor(start.z / this.gridSize),
            Math.floor(end.x / this.gridSize),
            Math.floor(end.z / this.gridSize)
        );

        points.forEach(point => {
            const key = `${point.x},${point.y}`;
            if (!gridData.has(key)) {
                gridData.set(key, {
                    type: 'road',
                    data: {
                        width: width,
                        roadType: '道路'
                    }
                });
            }
        });
    }

    getLinePoints(x0, y0, x1, y1) {
        const points = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            points.push({x: x0, y: y0});
            
            if (x0 === x1 && y0 === y1) {
                break;
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return points;
    }

    updateGameTime() {
        if (this.paused) return this.gameTime;

        const now = Date.now();
        const realTimePassed = (now - this.timeConfig.lastUpdate) / 1000; // 转换为秒
        const gameTimePassed = realTimePassed * this.timeScale * 
            (3600 / (60 / this.timeConfig.REAL_MINUTE_TO_GAME_HOURS)); // 转换为游戏时间

        // 更新游戏时间
        this.gameTime = new Date(this.gameTime.getTime() + (gameTimePassed * 1000));
        this.timeConfig.lastUpdate = now;

        // 更新所有代理的游戏时间
        this.agents.forEach(agent => {
            if (agent.timeTracking) {
                agent.timeTracking.gameTime = new Date(this.gameTime);
            }
        });

        // 检查并更新建筑物状态
        this.updateBuildingsForNewHour();

        // 更新UI显示
        if (this.ui) {
            this.ui.updateGameTime(this.gameTime.toLocaleTimeString());
        }

        return this.gameTime;
    }

    // 转换真实时间到游戏时间
    realTimeToGameTime(realMilliseconds) {
        return realMilliseconds * this.timeScale * 
            (this.timeConfig.REAL_MINUTE_TO_GAME_HOURS / 60);
    }

    // 转换游戏时间到真实时间
    gameTimeToRealTime(gameMilliseconds) {
        return gameMilliseconds / this.timeScale / 
            (this.timeConfig.REAL_MINUTE_TO_GAME_HOURS / 60);
    }

    togglePause() {
        this.paused = !this.paused;
        
        if (this.paused) {
            // 保存当前时间流速并暂停
            this.previousTimeScale = this.timeScale;
            this.timeScale = 0;
            
            // 停止更新循环
            if (this.updateLoopId) {
                clearTimeout(this.updateLoopId);
                this.updateLoopId = null;
            }
            
            // 停止动画循环
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            // 暂停所有代理的行动
            this.agents.forEach(agent => {
                if (agent.behaviorControl) {
                    agent.behaviorControl.isActing = false;
                    agent.behaviorControl.isMoving = false;
                    // 保存代理的当前状态
                    agent.pausedState = {
                        action: agent.behaviorControl.currentAction,
                        position: {...agent.position},
                        time: Date.now()
                    };
                }
            });

            // 暂停建筑物更新
            if (this.buildingUpdateInterval) {
                clearInterval(this.buildingUpdateInterval);
                this.buildingUpdateInterval = null;
            }

            console.log('模拟已暂停，当前游戏时间:', this.gameTime.toLocaleTimeString());
            
            // 更新UI显示
            if (this.ui) {
                this.ui.updateSystemStatus('系统已暂停');
                this.ui.addSystemEvent('系统已暂停');
                // 禁用时间流速按钮
                this.ui.updateSpeedButtons();
            }
        } else {
            // 恢复之前的时间流速
            this.timeScale = this.previousTimeScale;
            
            // 更新最后更新时间，避免时间跳跃
            this.timeConfig.lastUpdate = Date.now();
            
            // 恢复代理状态
            this.agents.forEach(agent => {
                if (agent.pausedState) {
                    // 恢复代理的状态
                    agent.behaviorControl.currentAction = agent.pausedState.action;
                    agent.position = {...agent.pausedState.position};
                    delete agent.pausedState;
                }
            });

            // 重新启动更新循环
            this.updateLoop();
            
            // 重新启动动画循环
            this.animate();

            // 重新启动建筑物更新
            this.buildingUpdateInterval = setInterval(() => {
                this.updateBuildings();
            }, 60000);

            console.log('模拟已恢复，当前游戏时间:', this.gameTime.toLocaleTimeString());
            
            // 更新UI显示
            if (this.ui) {
                this.ui.updateSystemStatus('系统运行正常');
                this.ui.addSystemEvent('系统已恢复运行');
                // 启用时间流速按钮
                this.ui.updateSpeedButtons();
            }
        }
    }

    setTimeScale(scale) {
        if (!this.paused) {
            this.timeScale = scale;
            console.log(`时间流速已设置为 ${scale}x`);
            
            // 更新UI显示
            if (this.ui) {
                this.ui.addSystemEvent(`时间流速已调整为 ${scale}x`);
            }
        }
    }

    getRandomPosition() {
        // 确保建筑物不会重叠和超出边界
        const margin = 50; // 建筑物之间的最小距离
        const maxAttempts = 50; // 最大尝试次数
        
        for (let i = 0; i < maxAttempts; i++) {
            const position = {
                x: margin + Math.random() * (this.canvas.width - margin * 2),
                y: 0,
                z: margin + Math.random() * (this.canvas.height - margin * 2)
            };

            // 检查是否与现有建筑物重叠
            const isOverlapping = Array.from(this.buildings.values()).some(building => {
                const distance = this.calculateDistance(position, building.position);
                return distance < margin;
            });

            if (!isOverlapping) {
                return position;
            }
        }

        // 如果找不到合适的位置，返回网格位置
        const gridX = Math.floor(this.buildings.size / 5) * 100;
        const gridZ = (this.buildings.size % 5) * 100;
        return { x: gridX, y: 0, z: gridZ };
    }

    getBuildingFunctions(buildingType) {
        // 定义建筑物类型对应的功能
        const functionMap = {
            residential: ['rest', 'shelter', 'socialize'],
            commercial: ['work', 'shopping', 'socialize'],
            recreation: ['entertainment', 'socialize', 'relax'],
            park: ['recreation', 'socialize', 'exercise'],
            plaza: ['socialize', 'relax', 'entertainment'],
            cafe: ['eat', 'socialize', 'work'],
            restaurant: ['eat', 'socialize'],
            education: ['education', 'socialize'],
            healthcare: ['healthcare'],
            office: ['work', 'socialize'],
            entertainment: ['entertainment', 'socialize', 'relax']
        };

        // 获取建筑物类型的功能列表，如果没有定义则返回空数组
        const functions = functionMap[buildingType] || [];
        
        console.log(`获取建筑物 ${buildingType} 的功能:`, functions);
        
        return functions;
    }

    // 改进建筑物查找方法
    findBuildingForAction(action, agent) {
        const buildingTypes = {
            socialize: ['plaza', 'community_center', 'cafe', 'park'],
            work: ['office', 'commercial'],
            rest: ['residential', 'hotel'],
            eat: ['restaurant', 'cafe'],
            entertainment: ['entertainment', 'recreation']
        };

        const suitableTypes = buildingTypes[action] || [];
        const currentHour = this.gameTime.getHours();

        // 获取所有可用的建筑物
        const availableBuildings = Array.from(this.buildings.values())
            .filter(building => {
                const isTypeMatch = suitableTypes.includes(building.type) || 
                                  suitableTypes.includes(building.subType);
                const isOpen = this.checkIfOpen(building.schedule);
                const hasCapacity = building.currentOccupancy < building.capacity;
                const isInRange = this.calculateDistance(agent.position, building.position) <= 500;

                return isTypeMatch && isOpen && hasCapacity && isInRange;
            });

        // 按照距离和适合度排序
        return availableBuildings.sort((a, b) => {
            const distA = this.calculateDistance(agent.position, a.position);
            const distB = this.calculateDistance(agent.position, b.position);
            const suitabilityA = this.calculateBuildingSuitability(a, action, agent);
            const suitabilityB = this.calculateBuildingSuitability(b, action, agent);
            
            // 综合考虑距离和适合度
            return (distA * 0.4 + suitabilityA * 0.6) - (distB * 0.4 + suitabilityB * 0.6);
        })[0];
    }

    calculateBuildingSuitability(building, action, agent) {
        // 计算建筑物的适度
        let score = 0;
        
        // 检查建筑物当前的拥挤程度
        score += (1 - building.currentOccupancy / building.capacity) * 30;
        
        // 检查建筑物的服务质量
        if (building.services && building.services[action]) {
            score += building.services[action].quality || 0;
        }

        // 考虑代理的历史偏好
        const history = agent.memory.shortTerm.filter(m => 
            m.type === 'action' && m.location === building.id
        );
        if (history.length > 0) {
            score += 10; // 熟悉的地方加分
        }

        return score;
    }

    updateBuildingsForNewHour() {
        const currentHour = this.gameTime.getHours();
        const currentMinute = this.gameTime.getMinutes();

        this.buildings.forEach(building => {
            // 获取建筑物的详细时间表
            const schedule = this.getBuildingSchedule(building);
            
            // 检查是否需要更新状态
            const newOpenStatus = this.checkBuildingOpenStatus(schedule, currentHour, currentMinute);
            
            if (building.status?.isOpen !== newOpenStatus) {
                // 状态发生变化
                building.status = building.status || {};
                building.status.isOpen = newOpenStatus;
                building.status.lastStatusChange = this.gameTime;

                // 处理营业状态变化
                if (newOpenStatus) {
                    this.handleBuildingOpening(building);
                } else {
                    this.handleBuildingClosing(building);
                }

                // 记录状态变化
                console.log(`建筑物 ${building.name} 状态变化:`, {
                    时间: this.gameTime.toLocaleTimeString(),
                    状态: newOpenStatus ? '开始营业' : '停止营业',
                    时间表: schedule
                });
            }
        });
    }

    handleBuildingOpening(building) {
        // 重置建筑物状态
        building.currentOccupancy = 0;
        building.status.services = this.initializeBuildingServices(building);
        
        // 通知相关代理
        this.notifyNearbyAgents(building, 'building_open');
    }

    handleBuildingClosing(building) {
        // 请求所有在建筑物内的代理离开
        const occupants = this.getAgentsInBuilding(building.id);
        occupants.forEach(agent => {
            agent.handleBuildingClosing(building);
        });
        
        // 清理建筑物状态
        building.currentOccupancy = 0;
        building.status.services = {};
        
        // 通知相关代理
        this.notifyNearbyAgents(building, 'building_close');
    }

    checkScheduledActivities() {
        const currentHour = this.gameTime.getHours();
        const currentMinute = this.gameTime.getMinutes();

        this.agents.forEach(agent => {
            // 获取当前时段的计划活动
            const timeSlot = this.getTimeSlot(currentHour);
            const schedule = agent.behavior?.dailySchedule?.[timeSlot];

            if (schedule) {
                schedule.forEach(activity => {
                    const [activityHour, activityMinute] = activity.time.split(':').map(Number);
                    
                    // 检查是否到达活动时间
                    if (currentHour === activityHour && 
                        Math.abs(currentMinute - activityMinute) <= 5) {
                        
                        // 通知代理执行计划活动
                        agent.handleScheduledActivity(activity);
                    }
                });
            }
        });
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    getHoursOpen(building) {
        // 如果建筑物24小时营业
        if (building.schedule?.open === 0 && building.schedule?.close === 24) {
            return 24;
        }

        // 获取当前游戏时间的小时数
        const currentHour = this.gameTime.getHours();
        
        // 获取建筑物的营业时间表
        const schedule = building.schedule || { open: 9, close: 18 };
        
        // 如果建筑物跨日营业（例如22:00-次日6:00）
        if (schedule.close < schedule.open) {
            if (currentHour >= schedule.open) {
                return currentHour - schedule.open;
            } else {
                return (24 - schedule.open) + currentHour;
            }
        } else {
            // 普通营业时间（例如9:00-18:00）
            if (currentHour >= schedule.open && currentHour < schedule.close) {
                return currentHour - schedule.open;
            }
        }

        // 如果当前是休息时间
        return 0;
    }

    getBuildingServices(building) {
        // 根据建筑类型返回可用服务列表
        const serviceMap = {
            residential: ['rest', 'shelter'],
            commercial: {
                restaurant: ['food', 'socialize'],
                cafe: ['food', 'socialize', 'work'],
                shop: ['shopping'],
                office: ['work']
            },
            park: ['recreation', 'socialize', 'exercise'],
            plaza: ['socialize', 'relax'],
            recreation: ['entertainment', 'socialize', 'relax'],
            education: ['education', 'socialize'],
            healthcare: ['healthcare'],
            entertainment: ['entertainment', 'socialize']
        };

        // 获取基础服务
        let services = serviceMap[building.type] || [];

        // 如果是商业建筑，检查子类型
        if (building.type === 'commercial' && building.subType) {
            services = serviceMap.commercial[building.subType] || services;
        }

        // 如果建筑物有自定义服务，使用自定义服务
        if (building.services && Array.isArray(building.services)) {
            services = building.services;
        }

        // 确保返回数组
        return Array.isArray(services) ? services : [];
    }

    getServiceCapacity(building, service) {
        // 根据服务类型返回容量
        const baseCapacity = building.capacity || 100;
        
        const serviceCapacityRatio = {
            rest: 1.0,        // 休息设施使用全部容量
            food: 0.8,        // 餐饮设施使用80%容量
            socialize: 0.6,   // 社交空间使用60%容量
            work: 0.7,        // 工作空间使用70%容量
            exercise: 0.5,    // 运动设施使用50%容量
            entertainment: 0.6 // 娱乐设施使用60%容量
        };

        return Math.floor(baseCapacity * (serviceCapacityRatio[service] || 0.5));
    }

    getServiceCurrentLoad(building, service) {
        // 获取当前服务的使用人数
        const agents = this.getAgentsInBuilding(building.id);
        return agents.filter(agent => 
            agent.behaviorControl?.currentAction === service
        ).length;
    }
} 