class PathFinder {
    constructor(city) {
        this.city = city;
        this.gridSize = city.gridSize;
        this.pathCache = new Map(); // 保留缓存机制
    }

    findPath(start, end) {
        // 1. 检查缓存
        const cacheKey = `${Math.round(start.x)},${Math.round(start.z)}_${Math.round(end.x)},${Math.round(end.z)}`;
        const cachedPath = this.pathCache.get(cacheKey);
        if (cachedPath) {
            return cachedPath;
        }

        // 2. 计算直线距离
        const distance = this.calculateDistance(start, end);
        
        // 3. 如果距离很近（比如小于100单位），直接返回直线路径
        if (distance < 100) {
            const directPath = [
                { x: start.x, y: 0, z: start.z },
                { x: end.x, y: 0, z: end.z }
            ];
            this.pathCache.set(cacheKey, directPath);
            return directPath;
        }

        // 4. 对于较远距离，使用三点路径（起点-中间点-终点）
        const midPoint = this.findMidPoint(start, end);
        const path = [
            { x: start.x, y: 0, z: start.z },
            { x: midPoint.x, y: 0, z: midPoint.z },
            { x: end.x, y: 0, z: end.z }
        ];

        // 5. 缓存并返回路径
        this.pathCache.set(cacheKey, path);
        return path;
    }

    findMidPoint(start, end) {
        // 找到一个合适的中间点，避开建筑物
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;

        // 检查中间点是否可行走
        const gridX = Math.floor(midX / this.gridSize);
        const gridZ = Math.floor(midZ / this.gridSize);
        
        // 如果中间点不可行走，尝试周围的点
        if (!this.isWalkable(gridX, gridZ)) {
            // 简单的搜索周围8个方向
            const offsets = [
                {x: -1, z: -1}, {x: 0, z: -1}, {x: 1, z: -1},
                {x: -1, z: 0},                  {x: 1, z: 0},
                {x: -1, z: 1},  {x: 0, z: 1},  {x: 1, z: 1}
            ];

            for (const offset of offsets) {
                const newX = gridX + offset.x;
                const newZ = gridZ + offset.z;
                if (this.isWalkable(newX, newZ)) {
                    return {
                        x: newX * this.gridSize,
                        z: newZ * this.gridSize
                    };
                }
            }
        }

        return { x: midX, z: midZ };
    }

    isWalkable(x, z) {
        const cell = this.city.gridData.get(`${x},${z}`);
        return !cell || cell.type === 'road' || cell.type === 'public_space';
    }

    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
} 