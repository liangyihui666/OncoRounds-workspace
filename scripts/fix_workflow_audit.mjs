import fs from 'node:fs';

const [preprocessPath, productionPath] = process.argv.slice(2);

if (!preprocessPath || !productionPath) {
  throw new Error('Usage: node fix_workflow_audit.mjs <preprocess.json> <production.json>');
}

function readWorkflow(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function findNode(workflow, nodeId, expectedName) {
  const node = workflow.nodes.find((item) => item.nodeId === nodeId);
  if (!node) throw new Error(`Missing node: ${nodeId}`);
  if (expectedName && node.name !== expectedName) {
    throw new Error(`Node ${nodeId} expected ${expectedName}, got ${node.name}`);
  }
  return node;
}

function findInput(node, key) {
  const input = node.inputs.find((item) => item.key === key);
  if (!input) throw new Error(`Missing input ${key} on ${node.name} (${node.nodeId})`);
  return input;
}

function assertOutput(node, outputId) {
  if (!node.outputs.some((item) => item.id === outputId)) {
    throw new Error(`Missing output ${outputId} on ${node.name} (${node.nodeId})`);
  }
}

const preprocess = readWorkflow(preprocessPath);
const cleaner = findNode(preprocess, 'glGeIMqOVaSRs5jF', 'HTML正文清洗');
const validator = findNode(preprocess, 'vGj0G2uZjSwZphZQ', '提取结果独立校验');
const mapper = findNode(preprocess, 'ogy1PAMdD268kXeo', '代码运行');
const productionModule = findNode(preprocess, 'q1SCQSfCFVL34kaX', '肿瘤大查房小工具');

assertOutput(cleaner, 'answerText');
for (const outputId of ['nxo1wc', 'xYOEDr', 'geFy5d', 'tFoCUR', 'hmHZ1X']) {
  assertOutput(mapper, outputId);
}

const validatorPrompt = findInput(validator, 'systemPrompt');
const oldCleanTextRef = '{{$d4esByk5Pccmn1gH.qLUQfhG0ILRX$}}';
const newCleanTextRef = '{{$glGeIMqOVaSRs5jF.answerText$}}';

if (!validatorPrompt.value.includes(oldCleanTextRef)) {
  throw new Error('Validator prompt no longer contains the expected stale clean-text reference');
}
validatorPrompt.value = validatorPrompt.value.replace(oldCleanTextRef, newCleanTextRef);

const candidateInput = findInput(validator, 'userChatInput');
if (JSON.stringify(candidateInput.value) !== JSON.stringify(['d4esByk5Pccmn1gH', 'qLUQfhG0ILRX'])) {
  throw new Error('Validator candidate JSON input is not the expected repaired_json reference');
}

const moduleBindings = {
  qIBOhWU5: ['ogy1PAMdD268kXeo', 'nxo1wc'],
  dEe0na4W: ['ogy1PAMdD268kXeo', 'xYOEDr'],
  gTw1bH5A: ['ogy1PAMdD268kXeo', 'geFy5d'],
  tjZeuUQb: ['ogy1PAMdD268kXeo', 'tFoCUR'],
  budXueGl: ['ogy1PAMdD268kXeo', 'hmHZ1X']
};

for (const [inputKey, reference] of Object.entries(moduleBindings)) {
  findInput(productionModule, inputKey).value = reference;
}

fs.writeFileSync(preprocessPath, `${JSON.stringify(preprocess, null, 2)}\n`, 'utf8');

const production = readWorkflow(productionPath);
const loop = findNode(production, 'qzZHJt8rLW8WI31P', '循环节点');
const loopStart = findNode(production, 'enu0ki7SkD3dbGE1', '循环开始');

if (findInput(loop, 'loopRunMode').value !== 'conditional') {
  throw new Error('Parent loop is not conditional; refusing to infer a loop-mode change');
}
findInput(loopStart, 'loopRunMode').value = 'conditional';

const retrievalNodeIds = [
  'rfC50X90Ce6cGaIB',
  'k2eB90ICRuNwnMYm',
  'cmjDyjb1ro4mMLZq',
  'tVs35q6nFPGaT2Zu',
  'sB1igq1zFijP0xqL'
];

for (const nodeId of retrievalNodeIds) {
  const node = findNode(production, nodeId);
  const queryInput = findInput(node, 'query');
  if (queryInput.valueType !== 'string') {
    throw new Error(`Retrieval query on ${node.name} is no longer a string; review parallel-search behavior`);
  }
  findInput(node, 'enableParallelSearch').value = false;

  const multiplier = findInput(node, 'rerankTokensMultiplier');
  const numericValue = Number(multiplier.value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid rerankTokensMultiplier on ${node.name}: ${multiplier.value}`);
  }
  multiplier.value = numericValue;
}

fs.writeFileSync(productionPath, `${JSON.stringify(production, null, 2)}\n`, 'utf8');
