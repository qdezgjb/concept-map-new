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
    // 使用Map记录每个节点可能的层级（支持冲突检测）
    const nodeLayerCandidates = new Map(); // nodeName -> Set of layer numbers
    
    triples.forEach(triple => {
        const { source, target, layer } = triple;
        
        // 初始化节点的候选层级集合
        if (!nodeLayerCandidates.has(source)) {
            nodeLayerCandidates.set(source, new Set());
        }
        if (!nodeLayerCandidates.has(target)) {
            nodeLayerCandidates.set(target, new Set());
        }
        
        // 根据层级关系，将节点添加到候选层级
        // ⚠️ 只接受正向连接（从高层到低层：L1→L2、L2→L3、L3→L4）
        if (layer === 'L1-L2') {
            nodeLayerCandidates.get(source).add(1);
            nodeLayerCandidates.get(target).add(2);
        } else if (layer === 'L2-L3') {
            nodeLayerCandidates.get(source).add(2);
            nodeLayerCandidates.get(target).add(3);
        } else if (layer === 'L3-L4') {
            nodeLayerCandidates.get(source).add(3);
            nodeLayerCandidates.get(target).add(4);
        } else if (layer === 'L2-L1' || layer === 'L3-L2' || layer === 'L4-L3' || 
                   layer === 'L3-L1' || layer === 'L4-L1' || layer === 'L4-L2') {
            // ❌ 拒绝所有反向连接和跨层反向连接
            console.warn(`❌ 拒绝反向连接三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            console.warn(`   反向连接违反了层次结构规则，已跳过此三元组`);
        } else if (layer === 'L1-L1' || layer === 'L2-L2' || layer === 'L3-L3' || layer === 'L4-L4') {
            // ❌ 拒绝所有同层连接
            console.warn(`❌ 拒绝同层连接三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            console.warn(`   同层连接违反了层次结构规则，已跳过此三元组`);
        } else if (layer === 'L1-L3' || layer === 'L1-L4' || layer === 'L2-L4') {
            // ❌ 拒绝所有跨层连接
            console.warn(`❌ 拒绝跨层连接三元组: (${source}, ${triple.relation}, ${target}, ${layer})`);
            console.warn(`   跨层连接违反了层次结构规则，已跳过此三元组`);
        } else {
            // 未知的层级标记
            console.warn(`⚠️ 未知的层级标记"${layer}"，跳过三元组: (${source}, ${triple.relation}, ${target})`);
        }
    });
    
    // 解决冲突：如果节点有多个候选层级，使用更具体的层级（层级数值最大）
    const nodeLayerMap = new Map(); // nodeName -> final layer number
    
    nodeLayerCandidates.forEach((candidateLayers, nodeName) => {
        if (candidateLayers.size === 0) {
            console.log(`⚠️ 节点"${nodeName}"没有明确的层级，默认分配到L4`);
            nodeLayerMap.set(nodeName, 4);
        } else if (candidateLayers.size === 1) {
            // 只有一个候选层级，直接使用
            const finalLayer = Array.from(candidateLayers)[0];
            nodeLayerMap.set(nodeName, finalLayer);
        } else {
            // 多个候选层级（冲突），选择更具体的层级（数值最大，因为L4比L1更具体）
            // 注意：现在已经拒绝了所有反向、同层和跨层连接，理论上不应该再有冲突
            const finalLayer = Math.max(...Array.from(candidateLayers));
            console.warn(`⚠️ 节点"${nodeName}"存在层级冲突（这不应该发生！），候选层级: [${Array.from(candidateLayers).sort().join(', ')}]，采用更具体的L${finalLayer}`);
            console.warn(`   如果看到这条警告，说明三元组数据有问题，请检查AI生成的结果`);
            nodeLayerMap.set(nodeName, finalLayer);
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
    
    // ⚠️ 验证并限制每层节点数量（每层最多5个）
    const MAX_NODES_PER_LAYER = 5;
    
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
    
    // 检查并限制第二层节点数量
    if (layer2Nodes.size > MAX_NODES_PER_LAYER) {
        console.warn(`⚠️ 第二层节点数量超过限制！当前: ${layer2Nodes.size}个，限制: ${MAX_NODES_PER_LAYER}个`);
        console.warn('   将只保留前5个节点，超出的节点将被移除');
        const nodesToKeep = Array.from(layer2Nodes).slice(0, MAX_NODES_PER_LAYER);
        const nodesToRemove = Array.from(layer2Nodes).slice(MAX_NODES_PER_LAYER);
        nodesToRemove.forEach(node => {
            layer2Nodes.delete(node);
            nodeLayerMap.delete(node);
            console.warn(`   × 移除L2节点: ${node}`);
        });
    }
    
    // 检查并限制第三层节点数量
    if (layer3Nodes.size > MAX_NODES_PER_LAYER) {
        console.warn(`⚠️ 第三层节点数量超过限制！当前: ${layer3Nodes.size}个，限制: ${MAX_NODES_PER_LAYER}个`);
        console.warn('   将只保留前5个节点，超出的节点将被移除');
        const nodesToKeep = Array.from(layer3Nodes).slice(0, MAX_NODES_PER_LAYER);
        const nodesToRemove = Array.from(layer3Nodes).slice(MAX_NODES_PER_LAYER);
        nodesToRemove.forEach(node => {
            layer3Nodes.delete(node);
            nodeLayerMap.delete(node);
            console.warn(`   × 移除L3节点: ${node}`);
        });
    }
    
    // 检查并限制第四层节点数量
    if (layer4Nodes.size > MAX_NODES_PER_LAYER) {
        console.warn(`⚠️ 第四层节点数量超过限制！当前: ${layer4Nodes.size}个，限制: ${MAX_NODES_PER_LAYER}个`);
        console.warn('   将只保留前5个节点，超出的节点将被移除');
        const nodesToKeep = Array.from(layer4Nodes).slice(0, MAX_NODES_PER_LAYER);
        const nodesToRemove = Array.from(layer4Nodes).slice(MAX_NODES_PER_LAYER);
        nodesToRemove.forEach(node => {
            layer4Nodes.delete(node);
            nodeLayerMap.delete(node);
            console.warn(`   × 移除L4节点: ${node}`);
        });
    }
    
    console.log('节点数量限制验证完成:');
    console.log(`  L1层: ${layer1Nodes.size}个 (上限: 1)`);
    console.log(`  L2层: ${layer2Nodes.size}个 (上限: ${MAX_NODES_PER_LAYER})`);
    console.log(`  L3层: ${layer3Nodes.size}个 (上限: ${MAX_NODES_PER_LAYER})`);
    console.log(`  L4层: ${layer4Nodes.size}个 (上限: ${MAX_NODES_PER_LAYER})`);
    
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
    
    // ⚠️ 严格限制节点数量：最少13个，最多17个（1+5+5+5=16，留1个缓冲）
    const MAX_NODES = 17;
    const MIN_NODES = 13;
    const MIN_LAYER_NODES = 4; // 每层最少4个节点
    const MAX_LAYER_NODES = 5; // 每层最多5个节点
    
    if (nodes.length > MAX_NODES) {
        console.warn(`⚠️ 节点数量超标: ${nodes.length}个 > ${MAX_NODES}个，将进行裁剪`);
        
        // 保留第一层（L1）的所有节点
        const layer1NodesArray = nodes.filter(n => n.layer === 1);
        const layer2NodesArray = nodes.filter(n => n.layer === 2);
        const layer3NodesArray = nodes.filter(n => n.layer === 3);
        const layer4NodesArray = nodes.filter(n => n.layer === 4);
        
        console.log(`  原始分布: L1=${layer1NodesArray.length}, L2=${layer2NodesArray.length}, L3=${layer3NodesArray.length}, L4=${layer4NodesArray.length}`);
        
        // 计算可用的节点配额（总共17个 - L1的数量）
        const availableSlots = MAX_NODES - layer1NodesArray.length;
        
        // 每层节点数限制在4-5个之间
        // 优先保证每层至少4个节点，然后尽量达到5个
        let targetL2 = Math.max(MIN_LAYER_NODES, Math.min(MAX_LAYER_NODES, layer2NodesArray.length));
        let targetL3 = Math.max(MIN_LAYER_NODES, Math.min(MAX_LAYER_NODES, layer3NodesArray.length));
        let targetL4 = Math.max(MIN_LAYER_NODES, Math.min(MAX_LAYER_NODES, layer4NodesArray.length));
        
        // 调整以确保总数不超过availableSlots，但每层至少保留4个节点
        while (targetL2 + targetL3 + targetL4 > availableSlots) {
            // 优先减少节点数为5的层，而不是已经是4的层
            if (targetL4 > MIN_LAYER_NODES) {
                targetL4--;
            } else if (targetL3 > MIN_LAYER_NODES) {
                targetL3--;
            } else if (targetL2 > MIN_LAYER_NODES) {
                targetL2--;
            } else {
                // 如果所有层都已经是4个节点，无法再裁剪，打破循环
                console.warn('⚠️ 无法进一步裁剪，所有层已达到最小节点数（4个）');
                break;
            }
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
        
        // 检查每层节点数是否符合要求（4-5个）
        if (selectedL2.length < MIN_LAYER_NODES || selectedL2.length > MAX_LAYER_NODES) {
            console.warn(`⚠️ L2层节点数不符合要求: ${selectedL2.length}个（要求4-5个）`);
        }
        if (selectedL3.length < MIN_LAYER_NODES || selectedL3.length > MAX_LAYER_NODES) {
            console.warn(`⚠️ L3层节点数不符合要求: ${selectedL3.length}个（要求4-5个）`);
        }
        if (selectedL4.length < MIN_LAYER_NODES || selectedL4.length > MAX_LAYER_NODES) {
            console.warn(`⚠️ L4层节点数不符合要求: ${selectedL4.length}个（要求4-5个）`);
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
        console.log(`✅ 节点数量合格: ${nodes.length}个节点（13-17个范围内）`);
        
        // 检查各层节点数
        const layer1Count = nodes.filter(n => n.layer === 1).length;
        const layer2Count = nodes.filter(n => n.layer === 2).length;
        const layer3Count = nodes.filter(n => n.layer === 3).length;
        const layer4Count = nodes.filter(n => n.layer === 4).length;
        
        console.log(`  各层分布: L1=${layer1Count}, L2=${layer2Count}, L3=${layer3Count}, L4=${layer4Count}`);
        
        // 验证每层节点数是否符合要求
        if (layer2Count < MIN_LAYER_NODES || layer2Count > MAX_LAYER_NODES) {
            console.warn(`  ⚠️ L2层节点数不符合要求: ${layer2Count}个（要求4-5个）`);
        } else {
            console.log(`  ✅ L2层节点数合格: ${layer2Count}个`);
        }
        
        if (layer3Count < MIN_LAYER_NODES || layer3Count > MAX_LAYER_NODES) {
            console.warn(`  ⚠️ L3层节点数不符合要求: ${layer3Count}个（要求4-5个）`);
        } else {
            console.log(`  ✅ L3层节点数合格: ${layer3Count}个`);
        }
        
        if (layer4Count < MIN_LAYER_NODES || layer4Count > MAX_LAYER_NODES) {
            console.warn(`  ⚠️ L4层节点数不符合要求: ${layer4Count}个（要求4-5个）`);
        } else {
            console.log(`  ✅ L4层节点数合格: ${layer4Count}个`);
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
