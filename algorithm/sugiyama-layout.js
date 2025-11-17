// Sugiyama层次布局算法模块
// 包含完整的Sugiyama算法实现，用于绘制层次结构的概念图

/**
 * Sugiyama算法步骤1: 层次分配
 * @param {Array} nodes - 节点数组
 * @param {Array} links - 连线数组
 * @returns {Map} 层次Map，键为层次编号，值为该层的节点数组
 */
function assignLayers(nodes, links) {
    console.log('开始层次分配...');
    
    // 创建节点Map以便快速查找
    const nodeMap = new Map();
    nodes.forEach(node => {
        nodeMap.set(node.id, node);
    });
    
    // 检查是否所有节点都已经有layer属性
    const nodesWithLayer = nodes.filter(node => node.layer !== undefined && node.layer >= 1);
    const useExistingLayers = nodesWithLayer.length > 0;
    
    if (useExistingLayers) {
        console.log(`检测到${nodesWithLayer.length}个节点已有layer属性，使用现有层级信息`);
        console.log('节点layer详情:');
        nodes.forEach(node => {
            console.log(`  - ${node.label}: layer=${node.layer}, id=${node.id}`);
        });
        
        // ⚠️ 重要：冻结节点的layer属性，防止被意外修改
        // 使用节点已有的layer属性进行分配，绝不调整层级
        const levels = new Map();
        
        nodes.forEach(node => {
            // 严格保持节点原有的 layer 值，不做任何调整
            const nodeLayer = node.layer;
            
            // 验证 layer 值的有效性
            if (nodeLayer === undefined || nodeLayer < 1 || nodeLayer > 4) {
                console.error(`❌ 节点"${node.label}"的layer值无效: ${nodeLayer}，强制设为1`);
                node.layer = 1;
            }
            
            // 转换为从0开始的层级（layer=1变为level=0，layer=2变为level=1，以此类推）
            const level = node.layer - 1;
            
            if (!levels.has(level)) {
                levels.set(level, []);
            }
            levels.get(level).push(node);
            
            // ⚠️ 关键：这里不再重新赋值 node.layer，避免任何可能的修改
            // node.layer 保持其原始值不变
        });
        
        console.log(`使用现有层级分配完成，共${levels.size}层`);
        console.log(`总节点数: ${nodes.length}`);
        levels.forEach((levelNodes, level) => {
            console.log(`第${level}层(layer=${level + 1}，节点数=${levelNodes.length}): ${levelNodes.map(n => `${n.label}(id=${n.id})`).join(', ')}`);
        });
        
        // 验证：检查是否所有节点都被分配到某一层
        const totalNodesInLevels = Array.from(levels.values()).reduce((sum, arr) => sum + arr.length, 0);
        if (totalNodesInLevels !== nodes.length) {
            console.error(`❌ 节点分配错误！总节点数=${nodes.length}，分配到层级的节点数=${totalNodesInLevels}`);
        }
        
        // 验证每个节点的layer属性是否正确
        console.log('验证节点layer属性:');
        nodes.forEach(node => {
            const expectedLevel = node.layer - 1;
            const actualLevel = Array.from(levels.entries()).find(([level, levelNodes]) => 
                levelNodes.some(n => n.id === node.id)
            )?.[0];
            if (expectedLevel !== actualLevel) {
                console.error(`❌ 节点"${node.label}"层级不匹配！期望level=${expectedLevel}(layer=${node.layer})，实际level=${actualLevel}`);
            }
        });
        
        return levels;
    }
    
    console.log('节点没有layer属性，使用BFS算法分配层级');
    
    // 初始化所有节点的层次为-1（未分配）
    nodes.forEach(node => {
        node.layer = -1;
    });
    
    // 找到所有入度为0的节点（根节点）
    const inDegree = new Map();
    nodes.forEach(node => {
        inDegree.set(node.id, 0);
    });
    
    links.forEach(link => {
        const targetId = link.target;
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    });
    
    const rootNodes = nodes.filter(node => inDegree.get(node.id) === 0);
    console.log(`找到${rootNodes.length}个根节点:`, rootNodes.map(n => n.label));
    
    // 从根节点开始进行BFS层次分配
    const levels = new Map();
    let currentLevel = 0;
    let currentLevelNodes = [...rootNodes];
    
    while (currentLevelNodes.length > 0) {
        console.log(`分配第${currentLevel}层，节点数: ${currentLevelNodes.length}`);
        
        // 将当前层的节点标记层次（使用1-based的layer值）
        currentLevelNodes.forEach(node => {
            node.layer = currentLevel + 1; // layer从1开始
        });
        
        // 存储当前层（level从0开始）
        levels.set(currentLevel, currentLevelNodes);
        
        // 找到下一层的节点
        const nextLevelNodes = [];
        currentLevelNodes.forEach(node => {
            links.forEach(link => {
                if (link.source === node.id) {
                    const targetNode = nodeMap.get(link.target);
                    if (targetNode && targetNode.layer === -1) {
                        // 检查是否已经在下一层候选列表中
                        if (!nextLevelNodes.find(n => n.id === targetNode.id)) {
                            nextLevelNodes.push(targetNode);
                        }
                    }
                }
            });
        });
        
        currentLevelNodes = nextLevelNodes;
        currentLevel++;
    }
    
    // 处理孤立的节点（没有连线的节点）
    const isolatedNodes = nodes.filter(node => node.layer === -1);
    if (isolatedNodes.length > 0) {
        console.log(`发现${isolatedNodes.length}个孤立节点，分配到第${currentLevel}层`);
        isolatedNodes.forEach(node => {
            node.layer = currentLevel + 1; // layer从1开始
        });
        levels.set(currentLevel, isolatedNodes);
    }
    
    console.log(`层次分配完成，共${levels.size}层`);
    levels.forEach((levelNodes, level) => {
        console.log(`第${level}层(layer=${level + 1}): ${levelNodes.map(n => n.label).join(', ')}`);
    });
    
    // 不应用每层节点数量限制，保持原有层级结构
    return levels;
}

/**
 * Sugiyama算法步骤2: 节点排序 - 减少连线交叉
 * @param {Array} nodes - 节点数组
 * @param {Array} links - 连线数组
 * @param {Map} levels - 层次Map
 * @returns {Map} 排序后的层次Map
 */
function orderNodesInLayers(nodes, links, levels) {
    console.log('开始节点排序，减少连线交叉...');
    
    // 创建节点Map
    const nodeMap = new Map();
    nodes.forEach(node => {
        nodeMap.set(node.id, node);
    });
    
    const orderedLevels = new Map();
    
    // 对每一层进行排序
    levels.forEach((levelNodes, level) => {
        console.log(`排序第${level}层，节点数: ${levelNodes.length}`);
        
        if (levelNodes.length <= 1) {
            // 如果只有0个或1个节点，直接使用
            orderedLevels.set(level, levelNodes);
            return;
        }
        
        // 使用重心排序算法
        const sortedNodes = sortNodesByBarycenter(levelNodes, links, nodeMap, level);
        
        // 禁用节点顺序优化，直接返回排序后的节点
        orderedLevels.set(level, sortedNodes);
        
        console.log(`第${level}层排序完成:`, sortedNodes.map(n => n.label));
    });
    
    console.log('节点排序完成');
    return orderedLevels;
}

/**
 * 按重心排序节点
 * @param {Array} levelNodes - 层次中的节点数组
 * @param {Array} links - 连线数组
 * @param {Map} nodeMap - 节点Map
 * @param {number} level - 层次编号（0-based）
 * @returns {Array} 排序后的节点数组
 */
function sortNodesByBarycenter(levelNodes, links, nodeMap, level) {
    console.log(`对第${level}层进行重心排序...`);
    
    // 如果层中只有一个或零个节点，直接返回
    if (levelNodes.length <= 1) {
        return levelNodes;
    }
    
    // 获取当前层的 layer 值（1-based）- 验证所有节点的layer是否一致
    const currentLayer = levelNodes[0].layer; // 假设同一层的节点 layer 值相同
    const allSameLayer = levelNodes.every(n => n.layer === currentLayer);
    if (!allSameLayer) {
        console.error(`❌ 第${level}层节点layer不一致！`);
        levelNodes.forEach(n => {
            console.error(`  - ${n.label}: layer=${n.layer}`);
        });
    }
    console.log(`  当前层layer值: ${currentLayer}，预期layer值: ${level + 1}`);
    
    // 计算每个节点的重心
    const nodeBarycenters = new Map();
    
    levelNodes.forEach(node => {
        let totalWeight = 0;
        let weightedSum = 0;
        
        // 计算连接到上层和下层节点的平均位置
        links.forEach(link => {
            if (link.source === node.id) {
                const targetNode = nodeMap.get(link.target);
                if (targetNode && targetNode.layer > currentLayer) {
                    // 连接到下层
                    const targetIndex = Array.from(nodeMap.values())
                        .filter(n => n.layer === targetNode.layer)
                        .sort((a, b) => a.x - b.x)
                        .findIndex(n => n.id === targetNode.id);
                    
                    if (targetIndex !== -1) {
                        weightedSum += targetIndex;
                        totalWeight += 1;
                    }
                }
            } else if (link.target === node.id) {
                const sourceNode = nodeMap.get(link.source);
                if (sourceNode && sourceNode.layer < currentLayer) {
                    // 连接到上层
                    const sourceIndex = Array.from(nodeMap.values())
                        .filter(n => n.layer === sourceNode.layer)
                        .sort((a, b) => a.x - b.x)
                        .findIndex(n => n.id === sourceNode.id);
                    
                    if (sourceIndex !== -1) {
                        weightedSum += sourceIndex;
                        totalWeight += 1;
                    }
                }
            }
        });
        
        const barycenter = totalWeight > 0 ? weightedSum / totalWeight : 0;
        nodeBarycenters.set(node.id, barycenter);
    });
    
    // 按重心排序
    const sortedNodes = [...levelNodes].sort((a, b) => {
        const barycenterA = nodeBarycenters.get(a.id) || 0;
        const barycenterB = nodeBarycenters.get(b.id) || 0;
        return barycenterA - barycenterB;
    });
    
    console.log(`第${level}层重心排序完成`);
    return sortedNodes;
}

/**
 * Sugiyama算法步骤3: 坐标分配 - 支持多层布局，层间距相同，居中显示，四周间距相同
 * @param {Array} nodes - 节点数组
 * @param {Map} orderedLevels - 排序后的层次Map
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 */
function assignCoordinates(nodes, orderedLevels, width, height) {
    console.log('开始坐标分配...');
    
    // 计算布局参数
    const horizontalMargin = 150; // 左右边距
    const focusToLayer1Spacing = 80; // 焦点问题到第一层的间距
    const uniformSpacing = 150; // 各层之间的统一间距（150px层间距）
    
    // 计算总层数和内容总高度
    const levelCount = orderedLevels.size;
    const focusQuestionHeight = 60; // 焦点问题框的估计高度
    
    // 总内容高度 = 焦点问题高度 + 焦点到第一层间距 + (层数-1) * 层间距
    // 注意：level是从0开始的，所以最后一层的偏移是 (levelCount-1) * uniformSpacing
    const totalContentHeight = focusQuestionHeight + focusToLayer1Spacing + ((levelCount - 1) * uniformSpacing);
    
    // 计算上下边距 - 上方空隙减半
    const totalVerticalMargin = Math.max(100, height - totalContentHeight);
    const topMargin = Math.max(25, totalVerticalMargin / 4); // 上边距为总边距的1/4（原来的一半）
    const bottomMargin = totalVerticalMargin - topMargin; // 下边距占剩余空间
    
    // 计算焦点问题和第一层的Y坐标
    const focusQuestionY = topMargin; // 焦点问题的Y坐标，使用减半的上边距
    const layer1Y = focusQuestionY + focusQuestionHeight + focusToLayer1Spacing; // 第一层的Y坐标
    
    console.log(`布局参数: 上边距=${topMargin.toFixed(1)}, 下边距=${bottomMargin.toFixed(1)}, 焦点到第一层间距=${focusToLayer1Spacing}, 层间距=${uniformSpacing}`);
    console.log(`焦点问题Y坐标: ${focusQuestionY.toFixed(1)}, 第一层Y坐标: ${layer1Y.toFixed(1)}`);
    console.log(`总层数: ${levelCount}, 总内容高度: ${totalContentHeight.toFixed(1)}, 画布高度: ${height}`);
    
    // 保存焦点问题的Y坐标到全局，供displayFocusQuestion使用
    window.focusQuestionY = focusQuestionY;
    window.focusQuestionHeight = focusQuestionHeight;
    
    // 遍历每一层，分配坐标
    orderedLevels.forEach((levelNodes, level) => {
        // 严格按照level值计算Y坐标
        // level 0 (L1) → y = layer1Y 
        // level 1 (L2) → y = layer1Y + uniformSpacing
        // level 2 (L3) → y = layer1Y + 2 * uniformSpacing
        // level 3 (L4) → y = layer1Y + 3 * uniformSpacing
        const y = layer1Y + (level * uniformSpacing);
        
        console.log(`==== 第${level}层(layer=${level + 1}) Y坐标: ${y} ====`);
        console.log(`  节点列表: ${levelNodes.map(n => n.label).join(', ')}`);
        console.log(`  节点layer属性: ${levelNodes.map(n => `${n.label}(${n.layer})`).join(', ')}`);
        
        // 计算当前层的可用宽度
        const availableWidth = width - 2 * horizontalMargin;
        
        // 计算节点间距
        let nodeSpacing;
        if (levelNodes.length === 1) {
            // 只有一个节点时，居中显示
            nodeSpacing = 0;
        } else {
            // 多个节点时，均匀分布
            nodeSpacing = availableWidth / (levelNodes.length - 1);
        }
        
        // 计算起始X坐标（居中显示）
        const startX = horizontalMargin;
        
        // 为每个节点分配坐标
        levelNodes.forEach((node, index) => {
            let x;
            if (levelNodes.length === 1) {
                // 单个节点居中
                x = width / 2;
            } else {
                // 多个节点均匀分布
                x = startX + index * nodeSpacing;
            }
            
            node.x = x;
            node.y = y;
            
            // 验证：节点的Y坐标应该对应其layer属性
            const expectedY = layer1Y + ((node.layer - 1) * uniformSpacing);
            if (Math.abs(y - expectedY) > 1) {
                console.error(`❌ 节点"${node.label}"Y坐标错误！layer=${node.layer}，期望Y=${expectedY}，实际Y=${y}`);
            }
            
            console.log(`  节点 "${node.label}" (layer=${node.layer}) 坐标: (${x.toFixed(1)}, ${y})`);
        });
        
        console.log(`第${level}层坐标分配完成，节点数: ${levelNodes.length}`);
    });
    
    console.log('坐标分配完成');
}

/**
 * 调整SVG的viewBox，确保所有节点都在可视范围内
 * @param {Array} nodes - 节点数组
 * @param {number} baseWidth - 基础宽度
 * @param {number} baseHeight - 基础高度
 */
function adjustViewBox(nodes, baseWidth, baseHeight) {
    console.log('调整viewBox...');
    
    if (!nodes || nodes.length === 0) {
        console.log('没有节点，跳过viewBox调整');
        return;
    }
    
    // 计算所有节点的边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // 如果有焦点问题框，将其纳入边界计算
    if (window.focusQuestionY !== undefined && window.focusQuestionHeight !== undefined) {
        minY = Math.min(minY, window.focusQuestionY);
        maxY = Math.max(maxY, window.focusQuestionY + window.focusQuestionHeight);
        console.log('将焦点问题框纳入边界计算:', {
            focusY: window.focusQuestionY,
            focusHeight: window.focusQuestionHeight
        });
    }
    
    nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        }
    });
    
    // 添加边距（保持一致性）
    const horizontalMargin = 50;
    const verticalMargin = 10; // 减小上下边距，因为焦点问题框已在边界计算中
    
    minX = Math.max(0, minX - horizontalMargin);
    minY = Math.max(0, minY - verticalMargin); // 使用统一的垂直边距
    maxX = Math.min(baseWidth, maxX + horizontalMargin);
    maxY = Math.min(baseHeight, maxY + verticalMargin); // 使用统一的垂直边距
    
    // 计算新的viewBox - 关键修改：始终从Y=0开始，确保焦点问题框可见
    const viewBoxStartY = 0; // 始终从顶部开始
    const viewBoxStartX = 0; // 始终从左侧开始
    
    // 计算需要的高度：从0到maxY
    const finalHeight = Math.max(baseHeight, maxY);
    const finalWidth = baseWidth; // 宽度固定为画布宽度
    
    // 更新SVG的viewBox
    const svg = document.querySelector('.concept-graph');
    if (svg) {
        svg.setAttribute('viewBox', `${viewBoxStartX} ${viewBoxStartY} ${finalWidth} ${finalHeight}`);
        console.log(`ViewBox已调整: ${viewBoxStartX} ${viewBoxStartY} ${finalWidth} ${finalHeight}`);
        console.log(`节点边界: (${minX}, ${minY}) - (${maxX}, ${maxY})`);
        console.log(`画布尺寸: ${baseWidth} x ${baseHeight}`);
    }
}

/**
 * 应用Sugiyama布局算法 - 统一入口函数
 * @param {Object} graphData - 图形数据（包含nodes和links）
 * @returns {Object} 应用布局后的图形数据
 */
function applySugiyamaLayout(graphData) {
    console.log('开始应用Sugiyama层次布局算法...');
    
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
        console.warn('图形数据为空，跳过布局');
        return graphData;
    }
    
    const nodes = [...graphData.nodes];
    const links = [...graphData.links];
    
    // 动态获取SVG容器的实际宽度
    const svg = document.querySelector('.concept-graph');
    let containerWidth = 1600;
    let containerHeight = 700; // 统一为700，与HTML和CSS保持一致
    
    if (svg) {
        const svgRect = svg.getBoundingClientRect();
        containerWidth = svgRect.width || 1600;
        containerHeight = svgRect.height || 700; // 统一为700
        console.log(`SVG容器实际尺寸: ${containerWidth} x ${containerHeight}`);
    }
    
    // 使用容器的实际宽度和固定高度
    const width = Math.floor(containerWidth);
    const height = 700; // 固定使用700，与HTML和CSS保持一致
    
    console.log(`画布尺寸: ${width} x ${height}`);
    
    // Sugiyama算法三步骤
    // 步骤1: 层次分配
    const levels = assignLayers(nodes, links);
    
    // 步骤2: 节点排序（减少交叉）
    const orderedLevels = orderNodesInLayers(nodes, links, levels);
    
    // 步骤3: 坐标分配
    assignCoordinates(nodes, orderedLevels, width, height);
    
    // 调整viewBox，确保所有元素都在可视范围内
    adjustViewBox(nodes, width, height);
    
    // 重新显示焦点问题，确保位置正确
    if (typeof window.displayFocusQuestion === 'function') {
        window.displayFocusQuestion();
    }
    
    console.log('Sugiyama布局算法应用完成');
    
    return {
        nodes: nodes,
        links: links,
        metadata: graphData.metadata || {}
    };
}

// 导出函数供外部使用
if (typeof window !== 'undefined') {
    window.applySugiyamaLayout = applySugiyamaLayout;
    console.log('✅ Sugiyama布局算法已注册到全局作用域');
}
