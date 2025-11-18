// 数据处理算法模块
// 处理概念图数据的转换、分析和处理

/**
 * 验证层级关系是否有效（只允许从高层到低层的相邻层连接）
 * @param {string} layerRelation - 层级关系标记（如L1-L2、L2-L3等）
 * @returns {boolean} 是否有效
 */
function validateLayerRelation(layerRelation) {
    if (!layerRelation || layerRelation.trim() === '') {
        console.log('⚠️ 缺少层级信息，拒绝该三元组');
        return false; // 如果没有层级信息，拒绝该三元组
    }
    
    // 只允许从高层到低层的连接：L1→L2、L2→L3、L3→L4
    const validRelations = ['L1-L2', 'L2-L3', 'L3-L4'];
    const isValid = validRelations.includes(layerRelation.trim());
    
    if (!isValid) {
        console.log('⚠️ 无效的层级关系:', layerRelation, '只允许从高到低:', validRelations);
        console.log('   拒绝反向连接（L2→L1、L3→L2、L4→L3）');
        console.log('   拒绝跨层连接（L1→L3、L1→L4、L2→L4）');
        console.log('   拒绝同层连接（L2→L2、L3→L3、L4→L4）');
    }
    
    return isValid;
}

/**
 * 确保第一层只有一个节点，内容与焦点问题相关
 * @param {Object} conceptData - 概念图数据
 * @returns {Object} 处理后的概念图数据
 */
function ensureSingleFirstLayer(conceptData) {
    console.log('确保第一层只有一个节点...');
    
    if (!conceptData || !conceptData.nodes || conceptData.nodes.length === 0) {
        return conceptData;
    }
    
    const nodes = [...conceptData.nodes];
    const links = [...conceptData.links];
    
    // 获取当前焦点问题（从全局变量或元数据中）
    let currentKeyword = '';
    if (window.focusQuestion) {
        // 从焦点问题中提取关键词
        const match = window.focusQuestion.match(/焦点问题：(.*?)(是什么|\?|\.\.\.)/);
        if (match) {
            currentKeyword = match[1].trim();
        }
    }
    
    // 如果没有找到焦点问题，尝试从元数据中获取
    if (!currentKeyword && conceptData.metadata && conceptData.metadata.keyword) {
        currentKeyword = conceptData.metadata.keyword;
    }
    
    // 如果仍然没有焦点问题，使用第一个节点作为焦点问题
    if (!currentKeyword && nodes.length > 0) {
        currentKeyword = nodes[0].label;
    }
    
    console.log('当前焦点问题:', currentKeyword);
    
    // 找到与焦点问题最相关的节点作为第一层节点
    let firstLayerNode = null;
    let bestMatchScore = 0;
    
    nodes.forEach(node => {
        const matchScore = calculateKeywordMatchScore(node.label, currentKeyword);
        if (matchScore > bestMatchScore) {
            bestMatchScore = matchScore;
            firstLayerNode = node;
        }
    });
    
    // ⚠️ 确保第一层节点有layer=1属性
    if (firstLayerNode) {
        firstLayerNode.layer = 1;
        console.log(`设置第一层节点"${firstLayerNode.label}"的layer=1`);
    }
    
    // 如果没有找到合适的节点，创建一个新的第一层节点
    if (!firstLayerNode) {
        firstLayerNode = {
            id: 'first-layer',
            label: currentKeyword || '核心概念',
            type: 'main',
            description: '第一层核心节点',
            importance: 10,
            layer: 1 // ⚠️ 第一层节点必须有layer=1属性
        };
        nodes.unshift(firstLayerNode);
    }
    
    // 确保第一层节点在数组的第一位
    if (firstLayerNode.id !== nodes[0].id) {
        const firstLayerIndex = nodes.findIndex(n => n.id === firstLayerNode.id);
        if (firstLayerIndex > 0) {
            nodes.splice(firstLayerIndex, 1);
            nodes.unshift(firstLayerNode);
        }
    }
    
    // 保持原有的连线，不自动添加额外连线
    const newLinks = [...links];
    
    // 只调整连线的方向，确保第一层节点作为源节点
    const firstLayerId = firstLayerNode.id;
    newLinks.forEach(link => {
        // 如果连线涉及第一层节点，确保第一层节点是源节点
        if (link.target === firstLayerId) {
            // 交换源和目标
            const temp = link.source;
            link.source = link.target;
            link.target = temp;
        }
    });
    
    console.log('第一层节点处理完成:', firstLayerNode.label);
    console.log('节点数量:', nodes.length);
    console.log('连线数量:', newLinks.length);
    console.log('连线详情:', newLinks.map(link => ({
        source: nodes.find(n => n.id === link.source)?.label,
        target: nodes.find(n => n.id === link.target)?.label,
        label: link.label
    })));
    
    return {
        nodes: nodes,
        links: newLinks,
        metadata: conceptData.metadata || {}
    };
}

/**
 * 计算焦点问题匹配度
 * @param {string} nodeLabel - 节点标签
 * @param {string} keyword - 焦点问题关键词
 * @returns {number} 匹配度得分
 */
function calculateKeywordMatchScore(nodeLabel, keyword) {
    if (!keyword || !nodeLabel) return 0;
    
    const keywordLower = keyword.toLowerCase();
    const nodeLabelLower = nodeLabel.toLowerCase();
    
    // 完全匹配得分最高
    if (nodeLabelLower === keywordLower) return 100;
    
    // 包含关键词得分较高
    if (nodeLabelLower.includes(keywordLower)) return 80;
    
    // 关键词包含节点标签得分中等
    if (keywordLower.includes(nodeLabelLower)) return 60;
    
    // 部分匹配得分较低
    const keywordWords = keywordLower.split(/[\s,，。！？；：""''（）()]+/);
    const nodeWords = nodeLabelLower.split(/[\s,，。！？；：""''（）()]+/);
    
    let matchCount = 0;
    keywordWords.forEach(word => {
        if (word.length > 1 && nodeWords.some(nodeWord => nodeWord.includes(word))) {
            matchCount++;
        }
    });
    
    return matchCount * 20;
}

/**
 * 转换API数据为D3.js格式
 * @param {Object} conceptData - 概念图数据
 * @returns {Object} D3.js格式的图形数据
 */
function convertToD3Format(conceptData) {
    // 确保第一层只有一个节点，内容与关键词相关
    const processedData = ensureSingleFirstLayer(conceptData);
    
    const nodes = processedData.nodes.map((node, index) => ({
        id: node.id,
        label: node.label,
        x: 0, // 初始位置设为0，由智能布局算法确定
        y: 0,
        type: node.type,
        description: node.description,
        importance: node.importance || 5,
        layer: node.layer // ⚠️ 保留layer属性，供Sugiyama布局算法使用
    }));

    const links = processedData.links.map((link, index) => ({
        id: link.id || `link-${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        label: link.label,
        type: link.type,
        strength: link.strength || 5,
        // 确保不包含贝塞尔曲线属性，统一使用直线连接
        isCurved: false
    }));

    const graphData = {
        nodes: nodes,
        links: links,
        metadata: processedData.metadata || {}
    };

    // 应用智能布局算法
    return applyIntelligentLayout(graphData);
}

/**
 * 解析AI响应中的三元组（支持层次信息）
 * @param {string} response - AI响应文本
 * @returns {Array} 三元组数组
 */
function parseTriplesFromResponse(response) {
    console.log('parseTriplesFromResponse 被调用，响应:', response);
    console.log('响应内容（前500字符）:', response.substring(0, 500));
    
    const triples = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
        let trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // 移除可能的序号前缀（如："1. "、"1、"、"- "等）
        trimmedLine = trimmedLine.replace(/^[\d\-\*•]+[\.、\s]+/, '');
        
        // 尝试匹配新格式：(概念1, 关系, 概念2, 层级关系)
        let match = trimmedLine.match(/^\((.*?),\s*(.*?),\s*(.*?),\s*(L\d+-L\d+)\)$/);
        
        // 如果没有层级信息，尝试匹配旧格式
        if (!match) {
            // 1. 标准英文括号格式: (概念1, 关系, 概念2)
            match = trimmedLine.match(/^\((.*?),\s*(.*?),\s*(.*?)\)$/);
            if (match) {
                match.push(''); // 添加空的层级信息
            }
        }
        
        // 2. 中文括号格式: （概念1, 关系, 概念2, 层级关系）
        if (!match) {
            match = trimmedLine.match(/^（(.*?),\s*(.*?),\s*(.*?),?\s*(L\d+-L\d+)?\s*）$/);
        }
        
        // 3. 中文逗号格式: (概念1，关系，概念2，层级关系)
        if (!match) {
            match = trimmedLine.match(/^\((.*?)，\s*(.*?)，\s*(.*?)，?\s*(L\d+-L\d+)?\s*\)$/);
        }
        
        // 4. 混合格式: （概念1，关系，概念2，层级关系）
        if (!match) {
            match = trimmedLine.match(/^（(.*?)，\s*(.*?)，\s*(.*?)，?\s*(L\d+-L\d+)?\s*）$/);
        }
        
        // 5. 宽松格式：只要包含括号和逗号
        if (!match) {
            match = trimmedLine.match(/[（\(](.*?)[,，]\s*(.*?)[,，]\s*(.*?)(?:[,，]\s*(L\d+-L\d+))?\s*[）\)]/);
        }
        
        // 6. 箭头格式：概念1 -> 关系 -> 概念2
        if (!match) {
            const arrowMatch = trimmedLine.match(/(.*?)\s*[-=]>?\s*(.*?)\s*[-=]>?\s*(.*?)$/);
            if (arrowMatch) {
                match = ['', arrowMatch[1], arrowMatch[2], arrowMatch[3], ''];
            }
        }
        
        if (match && match.length >= 4) {
            const concept1 = match[1].trim();
            const relation = match[2].trim();
            const concept2 = match[3].trim();
            const layerRelation = match[4] ? match[4].trim() : '';
            
            // 验证提取的内容不为空且合理（长度不超过50个字符）
            if (concept1 && relation && concept2 && 
                concept1.length > 0 && concept1.length <= 50 &&
                relation.length > 0 && relation.length <= 20 &&
                concept2.length > 0 && concept2.length <= 50) {
                
                // 验证层级关系是否有效
                const isValidLayerRelation = validateLayerRelation(layerRelation);
                if (!isValidLayerRelation) {
                    console.log('× 层级关系无效，跳过:', { 
                        concept1, 
                        relation, 
                        concept2, 
                        layerRelation,
                        reason: '层级关系不符合相邻层规则'
                    });
                    continue; // 跳过这个三元组
                }
                
                triples.push({
                    source: concept1,
                    relation: relation,
                    target: concept2,
                    layer: layerRelation // 保持layer字段名以兼容现有代码
                });
                console.log('✓ 解析到三元组:', { 
                    source: concept1, 
                    relation: relation, 
                    target: concept2,
                    layer_relation: layerRelation || '未指定'
                });
            } else {
                console.log('× 三元组格式不合理:', { concept1, relation, concept2, layerRelation });
            }
        } else {
            console.log('× 无法解析的行:', trimmedLine);
        }
    }
    
    console.log(`总共解析出三元组数量: ${triples.length}/${lines.length} 行`);
    return triples;
}

/**
 * 将三元组转换为概念图数据（支持三层结构）
 * @param {Array} triples - 三元组数组
 * @returns {Object} 概念图数据
 */
function convertTriplesToConceptData(triples) {
    console.log('convertTriplesToConceptData 被调用，三元组:', triples);
    
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    let nodeId = 1;
    
    // 获取当前焦点问题
    let currentKeyword = '';
    if (window.focusQuestion) {
        const match = window.focusQuestion.match(/焦点问题：(.*?)(是什么|\?|\.\.\.)/);
        if (match) {
            currentKeyword = match[1].trim();
        }
    }
    
    // 分析三元组中的层次信息，确定各层节点
    // 🔴🔴🔴 关键改进：使用"首次确定"策略，确保同一个节点内容只能在一个层级
    // 第一次遇到节点时就确定其层级，后续遇到相同节点时强制使用该层级
    const nodeLayerMap = new Map(); // nodeName -> final layer number (首次确定后不再改变)
    const nodeLayerConflicts = []; // 记录冲突的三元组信息，用于调试
    
    triples.forEach((triple, index) => {
        const { source, target, layer } = triple;
        
        // 根据层级关系，确定源节点和目标节点的层级
        let sourceLayer = null;
        let targetLayer = null;
        
        // ⚠️ 只接受正向连接（从高层到低层：L1→L2、L2→L3、L3→L4）
        if (layer === 'L1-L2') {
            sourceLayer = 1;
            targetLayer = 2;
        } else if (layer === 'L2-L3') {
            sourceLayer = 2;
            targetLayer = 3;
        } else if (layer === 'L3-L4') {
            sourceLayer = 3;
            targetLayer = 4;
        } else if (layer === 'L2-L1' || layer === 'L3-L2' || layer === 'L4-L3' || 
                   layer === 'L3-L1' || layer === 'L4-L1' || layer === 'L4-L2') {
            // ❌ 拒绝所有反向连接和跨层反向连接
            console.warn(`❌ 拒绝反向连接三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            console.warn(`   反向连接违反了层次结构规则，已跳过此三元组`);
            return; // 跳过此三元组
        } else if (layer === 'L1-L1' || layer === 'L2-L2' || layer === 'L3-L3' || layer === 'L4-L4') {
            // ❌ 拒绝所有同层连接
            console.warn(`❌ 拒绝同层连接三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            console.warn(`   同层连接违反了层次结构规则，已跳过此三元组`);
            return; // 跳过此三元组
        } else if (layer === 'L1-L3' || layer === 'L1-L4' || layer === 'L2-L4') {
            // ❌ 拒绝所有跨层连接
            console.warn(`❌ 拒绝跨层连接三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            console.warn(`   跨层连接违反了层次结构规则，已跳过此三元组`);
            return; // 跳过此三元组
        } else {
            // 未知的层级标记
            console.warn(`⚠️ 未知的层级标记"${layer}"，跳过三元组: (${source}, ${triple.relation}, ${target})`);
            return; // 跳过此三元组
        }
        
        // 🔴🔴🔴 首次确定策略：如果节点还没有层级，就确定它；如果已有层级但不同，记录冲突并使用首次确定的层级
        if (!nodeLayerMap.has(source)) {
            // 源节点首次出现，确定其层级
            nodeLayerMap.set(source, sourceLayer);
        } else {
            // 源节点已存在，检查层级是否一致
            const existingLayer = nodeLayerMap.get(source);
            if (existingLayer !== sourceLayer) {
                // 层级冲突！使用首次确定的层级，记录冲突信息
                nodeLayerConflicts.push({
                    node: source,
                    existingLayer: existingLayer,
                    newLayer: sourceLayer,
                    tripleIndex: index,
                    triple: triple
                });
                console.warn(`⚠️ 节点"${source}"层级冲突：已确定为L${existingLayer}，但三元组#${index}要求L${sourceLayer}，保持L${existingLayer}（首次确定原则）`);
                console.warn(`   三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            }
            // 保持首次确定的层级，不改变
        }
        
        if (!nodeLayerMap.has(target)) {
            // 目标节点首次出现，确定其层级
            nodeLayerMap.set(target, targetLayer);
        } else {
            // 目标节点已存在，检查层级是否一致
            const existingLayer = nodeLayerMap.get(target);
            if (existingLayer !== targetLayer) {
                // 层级冲突！使用首次确定的层级，记录冲突信息
                nodeLayerConflicts.push({
                    node: target,
                    existingLayer: existingLayer,
                    newLayer: targetLayer,
                    tripleIndex: index,
                    triple: triple
                });
                console.warn(`⚠️ 节点"${target}"层级冲突：已确定为L${existingLayer}，但三元组#${index}要求L${targetLayer}，保持L${existingLayer}（首次确定原则）`);
                console.warn(`   三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            }
            // 保持首次确定的层级，不改变
        }
    });
    
    // 输出冲突统计
    if (nodeLayerConflicts.length > 0) {
        console.warn(`\n⚠️⚠️⚠️ 共发现 ${nodeLayerConflicts.length} 个节点层级冲突！`);
        console.warn(`   这说明AI生成的三元组中，同一个概念被标记为不同的层级。`);
        console.warn(`   系统已采用"首次确定"策略，使用每个节点首次出现的层级。`);
        console.warn(`   建议检查AI生成的结果，确保同一个概念在整个三元组列表中始终使用相同的层级标记。\n`);
    }
    
    // 处理没有层级的节点（理论上不应该发生，因为所有有效三元组都会确定层级）
    const allNodes = new Set();
    triples.forEach(triple => {
        allNodes.add(triple.source);
        allNodes.add(triple.target);
    });
    allNodes.forEach(nodeName => {
        if (!nodeLayerMap.has(nodeName)) {
            console.warn(`⚠️ 节点"${nodeName}"没有明确的层级，默认分配到L4`);
            nodeLayerMap.set(nodeName, 4);
        }
    });
    
    // 创建最终的层级集合（用于日志输出和兼容性）
    const layer1Nodes = new Set();
    const layer2Nodes = new Set();
    const layer3Nodes = new Set();
    const layer4Nodes = new Set();
    
    nodeLayerMap.forEach((layer, nodeName) => {
        if (layer === 1) layer1Nodes.add(nodeName);
        else if (layer === 2) layer2Nodes.add(nodeName);
        else if (layer === 3) layer3Nodes.add(nodeName);
        else if (layer === 4) layer4Nodes.add(nodeName);
    });
    
    // 如果没有明确的层次信息，尝试从三元组中推断
    if (layer1Nodes.size === 0 && currentKeyword) {
        layer1Nodes.add(currentKeyword);
    }
    
    // 如果还是没有第一层节点，从出现频率最高的概念中选择
    if (layer1Nodes.size === 0 && triples.length > 0) {
        const conceptCount = new Map();
        triples.forEach(triple => {
            conceptCount.set(triple.source, (conceptCount.get(triple.source) || 0) + 1);
            conceptCount.set(triple.target, (conceptCount.get(triple.target) || 0) + 1);
        });
        
        let maxCount = 0;
        let topConcept = '';
        conceptCount.forEach((count, concept) => {
            if (count > maxCount) {
                maxCount = count;
                topConcept = concept;
            }
        });
        
        if (topConcept) {
            layer1Nodes.add(topConcept);
            currentKeyword = topConcept;
        }
    }
    
    console.log('层次分配结果:');
    console.log('  第一层节点:', Array.from(layer1Nodes));
    console.log('  第二层节点:', Array.from(layer2Nodes));
    console.log('  第三层节点:', Array.from(layer3Nodes));
    console.log('  第四层节点:', Array.from(layer4Nodes));
    
    // ⚠️ 验证并限制每层节点数量（L2、L3、L4层必须是4、5或6个节点中的一个，且三层之间不能重复）
    const MIN_NODES_PER_LAYER = 4; // 每层最少4个节点
    const MAX_NODES_PER_LAYER = 6; // 每层最多6个节点
    
    // ⚠️⚠️⚠️ 强制确保第一层只有1个节点（最重要！）
    if (layer1Nodes.size > 1) {
        console.warn(`⚠️⚠️⚠️ 第一层节点数量超过限制！当前: ${layer1Nodes.size}个，限制: 1个`);
        console.warn('   L1层必须只有1个节点（焦点问题核心概念），现在强制只保留第1个节点');
        
        // 只保留第一个节点，其他的降级到L2
        const nodesToKeep = Array.from(layer1Nodes).slice(0, 1);
        const nodesToDemote = Array.from(layer1Nodes).slice(1);
        
        nodesToDemote.forEach(node => {
            layer1Nodes.delete(node);
            // 将多余的L1节点降级到L2
            layer2Nodes.add(node);
            nodeLayerMap.set(node, 2); // 改为L2
            console.warn(`   × L1节点"${node}"降级为L2节点`);
        });
        
        console.warn(`   ✓ L1层现在只有 ${layer1Nodes.size} 个节点: ${Array.from(layer1Nodes).join(', ')}`);
    } else if (layer1Nodes.size === 0) {
        console.error(`❌ 第一层没有节点！这是严重错误！`);
        // 如果L1层没有节点，从焦点问题或L2中提升一个
        if (currentKeyword) {
            layer1Nodes.add(currentKeyword);
            nodeLayerMap.set(currentKeyword, 1);
            console.warn(`   ✓ 使用焦点问题作为L1节点: ${currentKeyword}`);
        }
    }
    
    // 🔴🔴🔴 检查是否有任何一层的节点数量超过6，如果有，应用新规则重新分配
    const layer2Count = layer2Nodes.size;
    const layer3Count = layer3Nodes.size;
    const layer4Count = layer4Nodes.size;
    const hasLayerExceeding6 = layer2Count > MAX_NODES_PER_LAYER || layer3Count > MAX_NODES_PER_LAYER || layer4Count > MAX_NODES_PER_LAYER;
    
    if (hasLayerExceeding6) {
        console.warn(`⚠️ 检测到有层级节点数量超过6个，应用新规则重新分配:`);
        console.warn(`   当前分布: L2=${layer2Count}个, L3=${layer3Count}个, L4=${layer4Count}个`);
        
        // 🔴🔴🔴 新规则：当节点数量超过6时，按照以下规则分配：
        // 1. 第一层：1个节点（不变）
        // 2. 第二层：从{4, 5, 6}中随机挑选一个
        // 3. 第三层：从剩下的两个数中选一个
        // 4. 第四层：使用最后一个数字
        const availableNumbers = [4, 5, 6];
        
        // 随机打乱数组
        const shuffled = [...availableNumbers].sort(() => Math.random() - 0.5);
        
        // 第二层：从{4, 5, 6}中随机挑选一个
        const targetL2 = shuffled[0];
        const remainingForL3 = shuffled.slice(1); // 剩下的两个数
        
        // 第三层：从剩下的两个数中随机选一个
        const targetL3 = remainingForL3[Math.floor(Math.random() * remainingForL3.length)];
        
        // 第四层：使用最后一个数字
        const targetL4 = remainingForL3.find(num => num !== targetL3);
        
        console.warn(`   新分配: L2=${targetL2}个, L3=${targetL3}个, L4=${targetL4}个`);
        
        // 应用新规则：裁剪各层节点到目标数量
        const layer2Array = Array.from(layer2Nodes);
        const layer3Array = Array.from(layer3Nodes);
        const layer4Array = Array.from(layer4Nodes);
        
        // 裁剪L2层
        if (layer2Array.length > targetL2) {
            const nodesToRemove = layer2Array.slice(targetL2);
            nodesToRemove.forEach(node => {
                layer2Nodes.delete(node);
                nodeLayerMap.delete(node);
                console.warn(`   × 移除L2节点: ${node}`);
            });
        }
        
        // 裁剪L3层
        if (layer3Array.length > targetL3) {
            const nodesToRemove = layer3Array.slice(targetL3);
            nodesToRemove.forEach(node => {
                layer3Nodes.delete(node);
                nodeLayerMap.delete(node);
                console.warn(`   × 移除L3节点: ${node}`);
            });
        }
        
        // 裁剪L4层
        if (layer4Array.length > targetL4) {
            const nodesToRemove = layer4Array.slice(targetL4);
            nodesToRemove.forEach(node => {
                layer4Nodes.delete(node);
                nodeLayerMap.delete(node);
                console.warn(`   × 移除L4节点: ${node}`);
            });
        }
        
        console.warn(`   ✅ 重新分配完成: L2=${layer2Nodes.size}个, L3=${layer3Nodes.size}个, L4=${layer4Nodes.size}个`);
    } else {
        // 如果没有超过6，只进行常规检查和警告
        // 检查并限制第二层节点数量（必须是4、5或6个节点）
        if (layer2Count < MIN_NODES_PER_LAYER) {
            console.warn(`⚠️ 第二层节点数量不足！当前: ${layer2Count}个，要求: 至少${MIN_NODES_PER_LAYER}个`);
        } else if (layer2Count !== 4 && layer2Count !== 5 && layer2Count !== 6) {
            console.warn(`⚠️ 第二层节点数量不符合要求！当前: ${layer2Count}个，要求: 严格等于4、5或6个`);
        }
        
        // 检查并限制第三层节点数量（必须是4、5或6个节点）
        if (layer3Count < MIN_NODES_PER_LAYER) {
            console.warn(`⚠️ 第三层节点数量不足！当前: ${layer3Count}个，要求: 至少${MIN_NODES_PER_LAYER}个`);
        } else if (layer3Count !== 4 && layer3Count !== 5 && layer3Count !== 6) {
            console.warn(`⚠️ 第三层节点数量不符合要求！当前: ${layer3Count}个，要求: 严格等于4、5或6个`);
        }
        
        // 检查并限制第四层节点数量（必须是4、5或6个节点）
        if (layer4Count < MIN_NODES_PER_LAYER) {
            console.warn(`⚠️ 第四层节点数量不足！当前: ${layer4Count}个，要求: 至少${MIN_NODES_PER_LAYER}个`);
        } else if (layer4Count !== 4 && layer4Count !== 5 && layer4Count !== 6) {
            console.warn(`⚠️ 第四层节点数量不符合要求！当前: ${layer4Count}个，要求: 严格等于4、5或6个`);
        }
        
        // 检查L2、L3、L4三层之间节点数量是否重复（理想情况下应该不重复）
        const layerCounts = [layer2Count, layer3Count, layer4Count];
        const uniqueCounts = new Set(layerCounts);
        if (uniqueCounts.size < 3 && layer2Count >= MIN_NODES_PER_LAYER && layer2Count <= MAX_NODES_PER_LAYER &&
            layer3Count >= MIN_NODES_PER_LAYER && layer3Count <= MAX_NODES_PER_LAYER &&
            layer4Count >= MIN_NODES_PER_LAYER && layer4Count <= MAX_NODES_PER_LAYER) {
            console.warn(`⚠️ L2、L3、L4三层节点数量有重复: L2=${layer2Count}, L3=${layer3Count}, L4=${layer4Count}（理想情况下应该不重复）`);
        }
    }
    
    console.log('节点数量限制验证完成:');
    console.log(`  L1层: ${layer1Nodes.size}个 (要求: 严格等于1)`);
    console.log(`  L2层: ${layer2Nodes.size}个 (要求: 严格等于4、5或6)`);
    console.log(`  L3层: ${layer3Nodes.size}个 (要求: 严格等于4、5或6)`);
    console.log(`  L4层: ${layer4Nodes.size}个 (要求: 严格等于4、5或6)`);
    
    // 辅助函数：获取节点的最终层级（简化版，直接使用nodeLayerMap）
    const getNodeLayer = (nodeName) => {
        // 直接从nodeLayerMap获取已确定的层级
        if (nodeLayerMap.has(nodeName)) {
            return nodeLayerMap.get(nodeName);
        }
        
        // 如果节点不在映射中，说明它不在任何三元组中，默认分配到L4
        console.warn(`⚠️ 节点"${nodeName}"不在层级映射中，默认分配到L4`);
        return 4;
    };
    
    // 过滤掉包含被移除节点的三元组
    const validTriples = triples.filter(triple => {
        const { source, target } = triple;
        // 检查两个节点是否都在有效的节点映射中
        const sourceValid = nodeLayerMap.has(source);
        const targetValid = nodeLayerMap.has(target);
        
        if (!sourceValid || !targetValid) {
            console.warn(`× 跳过三元组（节点已被移除）: (${source}, ${triple.relation}, ${target})`);
            return false;
        }
        return true;
    });
    
    console.log(`过滤后的三元组数量: ${validTriples.length}/${triples.length}`);
    
    // 处理所有有效三元组
    validTriples.forEach((triple, index) => {
        const { source, relation, target, layer } = triple;
        
        // 添加源节点
        if (!nodeMap.has(source)) {
            const sourceLayer = getNodeLayer(source);
            nodeMap.set(source, nodeId.toString());
            nodeLayerMap.set(source, sourceLayer);
            
            nodes.push({
                id: nodeId.toString(),
                label: source,
                type: sourceLayer === 1 ? 'main' : (sourceLayer === 2 ? 'core' : 'detail'),
                description: `从文本中提取的概念: ${source}`,
                importance: sourceLayer === 1 ? 10 : (sourceLayer === 2 ? 8 : 6),
                layer: sourceLayer
            });
            nodeId++;
        }
        
        // 添加目标节点
        if (!nodeMap.has(target)) {
            const targetLayer = getNodeLayer(target);
            nodeMap.set(target, nodeId.toString());
            nodeLayerMap.set(target, targetLayer);
            
            nodes.push({
                id: nodeId.toString(),
                label: target,
                type: targetLayer === 1 ? 'main' : (targetLayer === 2 ? 'core' : 'detail'),
                description: `从文本中提取的概念: ${target}`,
                importance: targetLayer === 1 ? 10 : (targetLayer === 2 ? 8 : 6),
                layer: targetLayer
            });
            nodeId++;
        }
        
        // 添加关系连线
        const newLink = {
            id: `link-${index}`,
            source: nodeMap.get(source),
            target: nodeMap.get(target),
            label: relation,
            type: 'relation',
            strength: 6,
            layer: layer || ''
        };
        links.push(newLink);
        console.log(`添加连线 #${index}:`, {
            source: source,
            target: target,
            relation: relation,
            layer: layer,
            sourceId: newLink.source,
            targetId: newLink.target
        });
    });
    
    // 按层次排序节点：第一层 -> 第二层 -> 第三层
    nodes.sort((a, b) => {
        if (a.layer !== b.layer) {
            return a.layer - b.layer;
        }
        return a.importance - b.importance;
    });
    
    // ⚠️ 严格限制节点数量：最少13个，最多19个（1+6+6+6=19，考虑随机4、5、6的组合）
    // L1层：1个节点
    // L2、L3、L4层：每层必须是4、5、6中的一个，且三层之间不能重复
    const MAX_NODES = 19;
    const MIN_NODES = 13;
    const MIN_LAYER_NODES = 4; // 每层最少4个节点
    const MAX_LAYER_NODES = 6; // 每层最多6个节点
    
    if (nodes.length > MAX_NODES) {
        console.warn(`⚠️ 节点数量超标: ${nodes.length}个 > ${MAX_NODES}个，将进行裁剪`);
        
        // 保留第一层（L1）的所有节点
        const layer1NodesArray = nodes.filter(n => n.layer === 1);
        const layer2NodesArray = nodes.filter(n => n.layer === 2);
        const layer3NodesArray = nodes.filter(n => n.layer === 3);
        const layer4NodesArray = nodes.filter(n => n.layer === 4);
        
        console.log(`  原始分布: L1=${layer1NodesArray.length}, L2=${layer2NodesArray.length}, L3=${layer3NodesArray.length}, L4=${layer4NodesArray.length}`);
        
        // 🔴🔴🔴 新规则：当节点数量超过限制时，按照以下规则分配：
        // 1. 第一层：1个节点（不变）
        // 2. 第二层：从{4, 5, 6}中随机挑选一个
        // 3. 第三层：从剩下的两个数中选一个
        // 4. 第四层：使用最后一个数字
        const availableNumbers = [4, 5, 6];
        
        // 随机打乱数组
        const shuffled = [...availableNumbers].sort(() => Math.random() - 0.5);
        
        // 第二层：从{4, 5, 6}中随机挑选一个
        const targetL2 = shuffled[0];
        const remainingForL3 = shuffled.slice(1); // 剩下的两个数
        
        // 第三层：从剩下的两个数中随机选一个
        const targetL3 = remainingForL3[Math.floor(Math.random() * remainingForL3.length)];
        
        // 第四层：使用最后一个数字
        const targetL4 = remainingForL3.find(num => num !== targetL3);
        
        console.log(`  🔴 应用新规则分配节点数量:`);
        console.log(`    L1层: ${layer1NodesArray.length}个（保持不变）`);
        console.log(`    L2层: ${targetL2}个（从{4, 5, 6}中随机选择）`);
        console.log(`    L3层: ${targetL3}个（从剩余{${remainingForL3.join(', ')}}中选择）`);
        console.log(`    L4层: ${targetL4}个（使用最后一个数字）`);
        console.log(`    总计: ${layer1NodesArray.length + targetL2 + targetL3 + targetL4}个节点`);
        
        // 验证分配结果
        if (targetL2 === targetL3 || targetL2 === targetL4 || targetL3 === targetL4) {
            console.error(`❌ 节点数量分配错误！L2=${targetL2}, L3=${targetL3}, L4=${targetL4}，存在重复！`);
        }
        if (targetL2 < 4 || targetL2 > 6 || targetL3 < 4 || targetL3 > 6 || targetL4 < 4 || targetL4 > 6) {
            console.error(`❌ 节点数量分配错误！所有层必须在4-6之间！`);
        }
        
        // 裁剪节点（保留重要度高的）
        const selectedL2 = layer2NodesArray.slice(0, targetL2);
        const selectedL3 = layer3NodesArray.slice(0, targetL3);
        const selectedL4 = layer4NodesArray.slice(0, targetL4);
        
        // 记录被移除的节点ID
        const removedNodeIds = new Set();
        nodes.forEach(node => {
            if (node.layer === 2 && !selectedL2.includes(node)) {
                removedNodeIds.add(node.id);
            }
            if (node.layer === 3 && !selectedL3.includes(node)) {
                removedNodeIds.add(node.id);
            }
            if (node.layer === 4 && !selectedL4.includes(node)) {
                removedNodeIds.add(node.id);
            }
        });
        
        // 更新节点列表
        nodes.length = 0;
        nodes.push(...layer1NodesArray, ...selectedL2, ...selectedL3, ...selectedL4);
        
        // 移除与被删除节点相关的连线
        const filteredLinks = links.filter(link => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            return sourceNode && targetNode;
        });
        links.length = 0;
        links.push(...filteredLinks);
        
        console.log(`✅ 裁剪完成: L1=${layer1NodesArray.length}, L2=${selectedL2.length}, L3=${selectedL3.length}, L4=${selectedL4.length}, 总计=${nodes.length}个节点`);
        console.log(`   移除了${removedNodeIds.size}个节点, ${links.length}条连线保留`);
        
        // 检查每层节点数是否符合要求（必须是4、5或6个，不能是其他数字）
        if (selectedL2.length !== 4 && selectedL2.length !== 5 && selectedL2.length !== 6) {
            console.warn(`⚠️ L2层节点数不符合要求: ${selectedL2.length}个（要求严格等于4、5或6个）`);
        }
        if (selectedL3.length !== 4 && selectedL3.length !== 5 && selectedL3.length !== 6) {
            console.warn(`⚠️ L3层节点数不符合要求: ${selectedL3.length}个（要求严格等于4、5或6个）`);
        }
        if (selectedL4.length !== 4 && selectedL4.length !== 5 && selectedL4.length !== 6) {
            console.warn(`⚠️ L4层节点数不符合要求: ${selectedL4.length}个（要求严格等于4、5或6个）`);
        }
        
        // 检查三层之间是否有重复（理想情况下应该不重复）
        const layerCounts = [selectedL2.length, selectedL3.length, selectedL4.length];
        const uniqueCounts = new Set(layerCounts);
        if (uniqueCounts.size < 3) {
            console.warn(`⚠️ L2、L3、L4三层节点数量有重复: L2=${selectedL2.length}, L3=${selectedL3.length}, L4=${selectedL4.length}（理想情况下应该不重复）`);
        }
    } else if (nodes.length < MIN_NODES) {
        console.warn(`⚠️ 节点数量不足: ${nodes.length}个 < ${MIN_NODES}个`);
        
        // 检查各层节点数
        const layer1Count = nodes.filter(n => n.layer === 1).length;
        const layer2Count = nodes.filter(n => n.layer === 2).length;
        const layer3Count = nodes.filter(n => n.layer === 3).length;
        const layer4Count = nodes.filter(n => n.layer === 4).length;
        
        console.log(`  当前分布: L1=${layer1Count}, L2=${layer2Count}, L3=${layer3Count}, L4=${layer4Count}`);
        
        if (layer2Count < MIN_LAYER_NODES) {
            console.warn(`  ⚠️ L2层节点不足: ${layer2Count}个 < ${MIN_LAYER_NODES}个`);
        }
        if (layer3Count < MIN_LAYER_NODES) {
            console.warn(`  ⚠️ L3层节点不足: ${layer3Count}个 < ${MIN_LAYER_NODES}个`);
        }
        if (layer4Count < MIN_LAYER_NODES) {
            console.warn(`  ⚠️ L4层节点不足: ${layer4Count}个 < ${MIN_LAYER_NODES}个`);
        }
    } else {
        console.log(`✅ 节点数量合格: ${nodes.length}个节点（13-19个范围内）`);
        
        // 检查各层节点数
        const layer1Count = nodes.filter(n => n.layer === 1).length;
        const layer2Count = nodes.filter(n => n.layer === 2).length;
        const layer3Count = nodes.filter(n => n.layer === 3).length;
        const layer4Count = nodes.filter(n => n.layer === 4).length;
        
        console.log(`  各层分布: L1=${layer1Count}, L2=${layer2Count}, L3=${layer3Count}, L4=${layer4Count}`);
        
        // 验证每层节点数是否符合要求（必须是4、5或6个，不能是其他数字）
        if (layer2Count !== 4 && layer2Count !== 5 && layer2Count !== 6) {
            console.warn(`  ⚠️ L2层节点数不符合要求: ${layer2Count}个（要求严格等于4、5或6个）`);
        } else {
            console.log(`  ✅ L2层节点数合格: ${layer2Count}个`);
        }
        
        if (layer3Count !== 4 && layer3Count !== 5 && layer3Count !== 6) {
            console.warn(`  ⚠️ L3层节点数不符合要求: ${layer3Count}个（要求严格等于4、5或6个）`);
        } else {
            console.log(`  ✅ L3层节点数合格: ${layer3Count}个`);
        }
        
        if (layer4Count !== 4 && layer4Count !== 5 && layer4Count !== 6) {
            console.warn(`  ⚠️ L4层节点数不符合要求: ${layer4Count}个（要求严格等于4、5或6个）`);
        } else {
            console.log(`  ✅ L4层节点数合格: ${layer4Count}个`);
        }
        
        // 检查三层之间是否有重复（理想情况下应该不重复）
        const layerCounts = [layer2Count, layer3Count, layer4Count];
        const uniqueCounts = new Set(layerCounts);
        if (uniqueCounts.size < 3) {
            console.warn(`  ⚠️ L2、L3、L4三层节点数量有重复: L2=${layer2Count}, L3=${layer3Count}, L4=${layer4Count}（理想情况下应该不重复）`);
        } else {
            console.log(`  ✅ L2、L3、L4三层节点数量不重复: L2=${layer2Count}, L3=${layer3Count}, L4=${layer4Count}`);
        }
    }
    
    // 重新分配节点ID，确保第一层节点的ID最小
    const oldToNewIdMap = new Map();
    nodes.forEach((node, index) => {
        const oldId = node.id;
        const newId = (index + 1).toString();
        node.id = newId;
        oldToNewIdMap.set(oldId, newId);
    });
    
    // 更新连线中的节点ID引用
    links.forEach(link => {
        link.source = oldToNewIdMap.get(link.source) || link.source;
        link.target = oldToNewIdMap.get(link.target) || link.target;
    });
    
    const conceptData = {
        nodes: nodes,
        links: links,
        metadata: {
            summary: `基于AI介绍内容提取的 ${triples.length} 个三元组构建的三层概念图`,
            domain: 'AI介绍分析',
            source: 'AI介绍内容',
            tripleCount: triples.length,
            keyword: currentKeyword,
            layerInfo: {
                layer1Count: layer1Nodes.size,
                layer2Count: layer2Nodes.size,
                layer3Count: layer3Nodes.size,
                layer4Count: layer4Nodes.size
            }
        }
    };
    
    console.log('转换完成的概念图数据:', conceptData);
    console.log('  第一层节点数:', layer1Nodes.size);
    console.log('  第二层节点数:', layer2Nodes.size);
    console.log('  第三层节点数:', layer3Nodes.size);
    console.log('  第四层节点数:', layer4Nodes.size);
    
    // 打印每个节点的layer属性，用于调试
    console.log('节点layer属性详情:');
    nodes.forEach(node => {
        console.log(`  - ${node.label}: layer=${node.layer}`);
    });
    
    return conceptData;
}

/**
 * 判断两个节点之间是否为层次连接
 * @param {Object} source - 源节点
 * @param {Object} target - 目标节点
 * @param {Array} allNodes - 所有节点
 * @param {Array} allLinks - 所有连线
 * @returns {boolean} 是否为层次连接
 */
function isHierarchicalConnection(source, target, allNodes, allLinks) {
    // 计算节点的层次级别（基于y坐标）
    const sourceLevel = Math.round(source.y / 100); // 每100像素为一个层次
    const targetLevel = Math.round(target.y / 100);
    
    // 如果层次不同，则为层次连接
    if (sourceLevel !== targetLevel) {
        return true;
    }
    
    // 检查是否存在间接的层次关系
    // 通过BFS查找是否存在从source到target的层次路径
    const visited = new Set();
    const queue = [{ node: source, level: sourceLevel }];
    
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.node.id)) continue;
        visited.add(current.node.id);
        
        // 查找当前节点的所有连接
        allLinks.forEach(link => {
            if (link.source === current.node.id) {
                const nextNode = allNodes.find(n => n.id === link.target);
                if (nextNode) {
                    const nextLevel = Math.round(nextNode.y / 100);
                    if (nextLevel !== current.level) {
                        // 找到层次变化，说明存在层次关系
                        if (nextNode.id === target.id) {
                            return true; // 找到层次连接
                        }
                        queue.push({ node: nextNode, level: nextLevel });
                    }
                }
            }
        });
    }
    
    // 默认情况下，如果y坐标差异较大，认为是层次连接
    const yDiff = Math.abs(target.y - source.y);
    return yDiff > 80; // 如果y坐标差异大于80像素，认为是层次连接
}

/**
 * 计算文字实际尺寸的函数
 * @param {string} text - 文字内容
 * @param {string} fontSize - 字体大小
 * @param {string} fontFamily - 字体族
 * @returns {Object} 文字尺寸
 */
function calculateTextDimensions(text, fontSize = '16', fontFamily = 'Arial, sans-serif') {
    // 创建临时SVG元素来测量文字尺寸
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    
    tempText.setAttribute('font-size', fontSize);
    tempText.setAttribute('font-family', fontFamily);
    tempText.setAttribute('font-weight', '500');
    tempText.textContent = text;
    
    tempSvg.appendChild(tempText);
    document.body.appendChild(tempSvg);
    
    // 获取文字的实际尺寸
    const bbox = tempText.getBBox();
    const width = bbox.width;
    const height = bbox.height;
    
    // 清理临时元素
    document.body.removeChild(tempSvg);
    
    return { width, height };
}

/**
 * 计算节点最佳尺寸的函数
 * @param {string} nodeLabel - 节点标签
 * @param {number} minWidth - 最小宽度
 * @param {number} minHeight - 最小高度
 * @param {number} padding - 内边距
 * @returns {Object} 节点尺寸
 */
function calculateNodeDimensions(nodeLabel, minWidth = 80, minHeight = 40, padding = 15) {
    if (!nodeLabel || nodeLabel.trim() === '') {
        return { width: minWidth, height: minHeight };
    }
    
    // 计算文字尺寸（缩小字体）
    const textDimensions = calculateTextDimensions(nodeLabel, '12', 'Arial, sans-serif');
    
    // 计算节点尺寸（文字尺寸 + 内边距）
    const nodeWidth = Math.max(minWidth, textDimensions.width + padding);
    const nodeHeight = Math.max(minHeight, textDimensions.height + padding);
    
    return { width: nodeWidth, height: nodeHeight };
}

// 导出函数供外部使用
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        ensureSingleFirstLayer,
        calculateKeywordMatchScore,
        convertToD3Format,
        parseTriplesFromResponse,
        convertTriplesToConceptData,
        isHierarchicalConnection,
        calculateTextDimensions,
        calculateNodeDimensions
    };
} else if (typeof window !== 'undefined') {
    // 浏览器环境 - 显式地将函数添加到 window 对象，确保全局可访问
    window.ensureSingleFirstLayer = ensureSingleFirstLayer;
    window.calculateKeywordMatchScore = calculateKeywordMatchScore;
    window.convertToD3Format = convertToD3Format;
    window.parseTriplesFromResponse = parseTriplesFromResponse;
    window.convertTriplesToConceptData = convertTriplesToConceptData;
    window.isHierarchicalConnection = isHierarchicalConnection;
    window.calculateTextDimensions = calculateTextDimensions;
    window.calculateNodeDimensions = calculateNodeDimensions;
    
    console.log('✅ data-processing.js 已加载，所有函数已添加到全局作用域');
}
