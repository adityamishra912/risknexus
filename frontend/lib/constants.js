export const ORG_INFO = {
  name: 'Enterprise Security Platform',
  environment: 'Production',
  lastUpdated: '2 minutes ago',
  currency: '₹',
};

export const INITIAL_METRICS = {
  eal: 16000000, // ₹1.60 Cr
  p90: 32000000, // ₹3.20 Cr
  p95: 41000000, // ₹4.10 Cr
  p99: 58000000, // ₹5.80 Cr
  trendPercent: -12.4,
  budget: 10000000, // ₹1.00 Cr
};

export const TOP_RISK_DRIVERS = [
  { id: 'RD-01', name: 'Payment API', amount: 4200000, assetId: 'PAY-API-01', type: 'Asset', criticality: '10/10' },
  { id: 'RD-02', name: 'Customer Database', amount: 3100000, assetId: 'CUST-DB-02', type: 'Asset', criticality: '10/10' },
  { id: 'RD-03', name: 'Credential Compromise', amount: 2700000, assetId: 'AUTH-ID-01', type: 'Threat Vector', criticality: '9/10' },
  { id: 'RD-04', name: 'Ransomware Exposure', amount: 2100000, assetId: 'WEB-FE-03', type: 'Threat Vector', criticality: '8.5/10' },
  { id: 'RD-05', name: 'Cloud Account Takeover', amount: 1600000, assetId: 'AWS-CLOUD-01', type: 'Threat Vector', criticality: '8/10' },
];

export const BUSINESS_UNITS_RISK = [
  { name: 'Digital Banking', eal: 5400000, percent: 33.7, assets: 45 },
  { name: 'Payments', eal: 4800000, percent: 30.0, assets: 32 },
  { name: 'Finance & Treasury', eal: 2800000, percent: 17.5, assets: 24 },
  { name: 'HR & Operations', eal: 1800000, percent: 11.3, assets: 28 },
  { name: 'Customer Support', eal: 1200000, percent: 7.5, assets: 21 },
];

export const RISK_TREND_30DAYS = [
  { day: 'Day 1', date: 'Aug 04', eal: 14200000, event: null },
  { day: 'Day 5', date: 'Aug 08', eal: 14600000, event: null },
  { day: 'Day 10', date: 'Aug 13', eal: 15100000, event: 'New critical vulnerability CVE-2024-3094 detected' },
  { day: 'Day 15', date: 'Aug 18', eal: 17200000, event: 'Threat activity surge on Payment API' },
  { day: 'Day 20', date: 'Aug 23', eal: 16800000, event: 'MFA deployment phase 1 completed' },
  { day: 'Day 25', date: 'Aug 28', eal: 16300000, event: 'Patching completed on Core DB' },
  { day: 'Day 30', date: 'Sep 03', eal: 16000000, event: 'Continuous re-quantification baseline' },
];

export const RISK_DISTRIBUTION_CURVE = [
  { loss: 500000, lossLabel: '₹5L', probability: 0.95 },
  { loss: 2000000, lossLabel: '₹20L', probability: 0.82 },
  { loss: 5000000, lossLabel: '₹50L', probability: 0.65 },
  { loss: 10000000, lossLabel: '₹1 Cr', probability: 0.45 },
  { loss: 16000000, lossLabel: '₹1.6 Cr (EAL)', probability: 0.32, isEAL: true },
  { loss: 25000000, lossLabel: '₹2.5 Cr', probability: 0.18 },
  { loss: 32000000, lossLabel: '₹3.2 Cr (P90)', probability: 0.10, isP90: true },
  { loss: 41000000, lossLabel: '₹4.1 Cr (P95)', probability: 0.05, isP95: true },
  { loss: 58000000, lossLabel: '₹5.8 Cr (P99)', probability: 0.01, isP99: true },
  { loss: 80000000, lossLabel: '₹8.0 Cr', probability: 0.002 },
];

export const RISK_REDUCTION_OPPORTUNITIES = [
  {
    id: 'INIT-01',
    name: 'Critical Patching',
    cost: 1000000, // ₹10L
    reduction: 2500000, // ₹25L
    time: '14 days',
    rosi: 2.50,
    effectiveness: 80,
    selected: true,
    description: 'Remediate top 5 zero-day and known exploited vulnerabilities across Payment API & Cloud gateway.',
  },
  {
    id: 'INIT-02',
    name: 'MFA Enforcement',
    cost: 1500000, // ₹15L
    reduction: 1400000, // ₹14L
    time: '30 days',
    rosi: 0.93,
    effectiveness: 70,
    selected: true,
    description: 'Enforce hardware FIDO2 MFA across all privileged identity servers and API management consoles.',
  },
  {
    id: 'INIT-03',
    name: 'EDR Deployment',
    cost: 3000000, // ₹30L
    reduction: 3000000, // ₹30L
    time: '45 days',
    rosi: 1.00,
    effectiveness: 60,
    selected: true,
    description: 'Deploy advanced Endpoint Detection & Response agent to 1,250 production servers and endpoints.',
  },
  {
    id: 'INIT-04',
    name: 'Backup Hardening',
    cost: 2000000, // ₹20L
    reduction: 2200000, // ₹22L
    time: '14 days',
    rosi: 1.10,
    effectiveness: 75,
    selected: true,
    description: 'Implement immutable WORM storage and air-gapped recovery vault for Customer DB backups.',
  },
  {
    id: 'INIT-05',
    name: 'Network Segmentation',
    cost: 5000000, // ₹50L
    reduction: 4000000, // ₹40L
    time: '90 days',
    rosi: 0.80,
    effectiveness: 65,
    selected: false,
    description: 'Micro-segment Payment API environment from internal HR and testing networks.',
  },
];

export const ATTACK_NODES = [
  { id: 'node-1', label: 'Internet / Attacker', type: 'entry', criticality: 'N/A', vulns: 0, status: 'Exposed', exposure: 0 },
  { id: 'node-2', label: 'Web Server (WEB-FE-03)', type: 'web', criticality: '8/10', vulns: 5, status: 'WAF Partial', exposure: 1400000 },
  { id: 'node-3', label: 'Payment API (PAY-API-01)', type: 'api', criticality: '10/10', vulns: 4, status: 'No MFA', exposure: 4200000, isTarget: true },
  { id: 'node-4', label: 'Identity Server (AUTH-ID-01)', type: 'iam', criticality: '9/10', vulns: 3, status: 'EDR Active', exposure: 2700000 },
  { id: 'node-5', label: 'Customer Database (CUST-DB-02)', type: 'database', criticality: '10/10', vulns: 2, status: 'Encrypted', exposure: 3100000, isCrownJewel: true },
  { id: 'node-6', label: 'Online Banking Portal', type: 'service', criticality: '10/10', vulns: 1, status: 'Protected', exposure: 5400000 },
];

export const ATTACK_EDGES = [
  { from: 'node-1', to: 'node-2', label: 'HTTPS Exploit (CVE-2023-4863)', risk: 'High', method: 'Remote Code Execution' },
  { from: 'node-2', to: 'node-3', label: 'Internal API Calls', risk: 'Critical', method: 'Broken Object Level Auth' },
  { from: 'node-3', to: 'node-4', label: 'Stolen JWT Credentials', risk: 'Critical', method: 'Credential Dumping' },
  { from: 'node-4', to: 'node-5', label: 'DB Connection Token', risk: 'Critical', method: 'Privilege Escalation' },
  { from: 'node-5', to: 'node-6', label: 'Core Banking Service Data', risk: 'High', method: 'Data Exfiltration' },
];

export const ASSET_LIST = [
  {
    id: 'PAY-API-01',
    name: 'Payment Gateway API',
    type: 'REST API Service',
    businessService: 'Digital Banking',
    criticality: '10/10',
    criticalityVal: 10,
    internetExposed: true,
    vulnerabilitiesCount: 4,
    controls: 'WAF (Partial), MFA (Disabled)',
    exposure: 4200000,
    riskStatus: 'Critical',
    owner: 'Payments Engineering',
    ip: '192.168.10.45',
  },
  {
    id: 'CUST-DB-02',
    name: 'Customer DB Cluster',
    type: 'PostgreSQL Database',
    businessService: 'Finance & Treasury',
    criticality: '10/10',
    criticalityVal: 10,
    internetExposed: false,
    vulnerabilitiesCount: 2,
    controls: 'Encrypted, Air-gapped Backup',
    exposure: 3100000,
    riskStatus: 'Critical',
    owner: 'DBA Team',
    ip: '10.0.4.12',
  },
  {
    id: 'AUTH-ID-01',
    name: 'Identity & Auth Server',
    type: 'Active Directory / IAM',
    businessService: 'IT Operations',
    criticality: '9/10',
    criticalityVal: 9,
    internetExposed: false,
    vulnerabilitiesCount: 3,
    controls: 'EDR Active, Audit Logging',
    exposure: 2700000,
    riskStatus: 'High',
    owner: 'IAM Security',
    ip: '10.0.1.5',
  },
  {
    id: 'WEB-FE-03',
    name: 'Customer Web Portal',
    type: 'Web Application',
    businessService: 'Digital Banking',
    criticality: '8/10',
    criticalityVal: 8,
    internetExposed: true,
    vulnerabilitiesCount: 5,
    controls: 'WAF Enabled, DDoS Protection',
    exposure: 2100000,
    riskStatus: 'High',
    owner: 'Web Platform Team',
    ip: '198.51.100.24',
  },
  {
    id: 'AWS-CLOUD-01',
    name: 'Production K8s Cluster',
    type: 'Cloud Infrastructure',
    businessService: 'Digital Banking',
    criticality: '8.5/10',
    criticalityVal: 8.5,
    internetExposed: true,
    vulnerabilitiesCount: 3,
    controls: 'CSPM Monitored, Container Guard',
    exposure: 1600000,
    riskStatus: 'Medium',
    owner: 'DevOps / Cloud Ops',
    ip: 'aws-prod-k8s.indobank.in',
  },
  {
    id: 'HR-PORTAL-01',
    name: 'HR Management Suite',
    type: 'Internal SaaS App',
    businessService: 'HR & Operations',
    criticality: '6/10',
    criticalityVal: 6,
    internetExposed: false,
    vulnerabilitiesCount: 1,
    controls: 'SSO Enabled',
    exposure: 800000,
    riskStatus: 'Low',
    owner: 'HR Tech',
    ip: '10.2.14.88',
  },
];

export const VULNERABILITY_LIST = [
  {
    cve: 'CVE-2024-3094',
    assetId: 'PAY-API-01',
    assetName: 'Payment Gateway API',
    cvss: 10.0,
    knownExploited: true,
    assetCriticality: '10/10',
    attackPath: 'Internet → Payment API → Customer DB',
    exposure: 4200000,
    action: 'Apply Emergency Patch & Enforce API Gateways',
    daysOpen: 4,
    reason: 'Affected API is internet-facing, holds core transaction authority, and forms the starting node for direct access to Customer Database.',
  },
  {
    cve: 'CVE-2024-21626',
    assetId: 'AWS-CLOUD-01',
    assetName: 'Production K8s Cluster',
    cvss: 8.8,
    knownExploited: true,
    assetCriticality: '8.5/10',
    attackPath: 'K8s Pod → Node Escape → IAM Admin Token',
    exposure: 1800000,
    action: 'Upgrade runc runtime binary across all worker nodes',
    daysOpen: 12,
    reason: 'Container escape vulnerability allows escalation from non-privileged worker pods to node-level cloud IAM credentials.',
  },
  {
    cve: 'CVE-2023-4863',
    assetId: 'WEB-FE-03',
    assetName: 'Customer Web Portal',
    cvss: 8.8,
    knownExploited: false,
    assetCriticality: '8/10',
    attackPath: 'Browser Session → Memory Corruption',
    exposure: 1400000,
    action: 'Update libwebp library in deployment container image',
    daysOpen: 21,
    reason: 'Heap buffer overflow in image processing service. Lower priority than CVE-2024-3094 because it lacks direct automated lateral movement path.',
  },
  {
    cve: 'CVE-2023-38606',
    assetId: 'CUST-DB-02',
    assetName: 'Customer DB Cluster',
    cvss: 7.8,
    knownExploited: true,
    assetCriticality: '10/10',
    attackPath: 'Local DB Host → Kernel Priv Escalation',
    exposure: 1200000,
    action: 'Apply DB OS Kernel Patch & Restrict DB SSH Users',
    daysOpen: 30,
    reason: 'Known exploited kernel vulnerability. Prioritized high due to target asset being the core financial records repository.',
  },
];

export const CONTROLS_POSTURE = [
  {
    name: 'Multi-Factor Authentication (MFA)',
    coverage: 62,
    maturity: '3.2 / 5',
    potentialReduction: 1400000,
    cost: 1500000,
    implementationTime: '30 days',
    maintenanceCost: '₹2.5L / yr',
    applicableThreats: 'Credential Dumping, Phishing, Account Takeover',
    status: 'In Progress',
  },
  {
    name: 'Endpoint Detection & Response (EDR)',
    coverage: 71,
    maturity: '3.6 / 5',
    potentialReduction: 3000000,
    cost: 3000000,
    implementationTime: '45 days',
    maintenanceCost: '₹5.0L / yr',
    applicableThreats: 'Ransomware, Lateral Movement, Malware Execution',
    status: 'Optimal',
  },
  {
    name: 'Network Micro-Segmentation',
    coverage: 40,
    maturity: '2.4 / 5',
    potentialReduction: 4000000,
    cost: 5000000,
    implementationTime: '90 days',
    maintenanceCost: '₹4.0L / yr',
    applicableThreats: 'Lateral Movement, Unauthenticated East-West Traffic',
    status: 'Needs Investment',
  },
  {
    name: 'Immutable Backup Hardening',
    coverage: 83,
    maturity: '4.1 / 5',
    potentialReduction: 2200000,
    cost: 2000000,
    implementationTime: '14 days',
    maintenanceCost: '₹1.8L / yr',
    applicableThreats: 'Ransomware Data Destruction, Backup Wiping',
    status: 'Optimal',
  },
];

export const COMPLIANCE_FRAMEWORKS = [
  {
    id: 'NIST-CSF',
    name: 'NIST Cybersecurity Framework v2.0',
    coverage: 82,
    implemented: 45,
    partial: 12,
    gap: 5,
    description: 'National Institute of Standards and Technology Framework for Cyber Risk Management.',
  },
  {
    id: 'ISO-27001',
    name: 'ISO/IEC 27001:2022',
    coverage: 76,
    implemented: 72,
    partial: 18,
    gap: 10,
    description: 'International standard for Information Security Management Systems (ISMS).',
  },
  {
    id: 'CIS-CONTROLS',
    name: 'CIS Controls v8',
    coverage: 88,
    implemented: 135,
    partial: 15,
    gap: 3,
    description: 'Center for Internet Security prioritized cyber defense controls.',
  },
  {
    id: 'RBI-CSF',
    name: 'RBI Cyber Security Framework for Banks',
    coverage: 79,
    implemented: 38,
    partial: 9,
    gap: 3,
    description: 'Reserve Bank of India mandatory security controls for financial institutions.',
  },
  {
    id: 'SEBI-CSCRF',
    name: 'SEBI CSCRF Guidelines',
    coverage: 81,
    implemented: 42,
    partial: 8,
    gap: 2,
    description: 'Securities and Exchange Board of India Cyber Security & Resilience Framework.',
  },
];

export const DATA_SOURCES = [
  { id: 'DS-01', name: 'Qualys / Tenable VM', type: 'Vulnerability Management', status: 'Connected', lastSync: '5 mins ago', records: 1420, freshness: '100% Live' },
  { id: 'DS-02', name: 'Splunk / Microsoft Sentinel', type: 'SIEM Log Stream', status: 'Connected', lastSync: '2 mins ago', records: '45,000 / sec', freshness: 'Realtime' },
  { id: 'DS-03', name: 'Okta Identity Provider', type: 'IAM & Directory', status: 'Connected', lastSync: '10 mins ago', records: 4200, freshness: 'High' },
  { id: 'DS-04', name: 'CrowdStrike Falcon EDR', type: 'Endpoint Security', status: 'Connected', lastSync: '1 min ago', records: 1250, freshness: 'Realtime' },
  { id: 'DS-05', name: 'Wiz Cloud Security', type: 'CSPM / Cloud posture', status: 'Connected', lastSync: '15 mins ago', records: 340, freshness: 'High' },
  { id: 'DS-06', name: 'ServiceNow CMDB', type: 'Asset Inventory', status: 'Connected', lastSync: '1 hour ago', records: 150, freshness: 'Normal' },
];

export const CONTINUOUS_ACTIVITY_TIMELINE = [
  {
    id: 'ACT-101',
    time: '10:42 AM Today',
    type: 'Critical Finding',
    event: 'New critical vulnerability CVE-2024-3094 detected on Payment Gateway API',
    previousEal: 14200000,
    newEal: 16000000,
    increase: 1800000,
    action: 'Recalculate Investments',
    severity: 'critical',
  },
  {
    id: 'ACT-102',
    time: '10:38 AM Today',
    type: 'Control Update',
    event: 'MFA coverage increased from 62% to 68% across privileged API endpoints',
    previousEal: 16400000,
    newEal: 16000000,
    increase: -400000,
    action: 'View Control Posture',
    severity: 'success',
  },
  {
    id: 'ACT-103',
    time: '09:55 AM Today',
    type: 'Threat Feed',
    event: 'Threat intelligence feed elevated exploit probability for runc container escape',
    previousEal: 15800000,
    newEal: 16400000,
    increase: 600000,
    action: 'Simulate Patching',
    severity: 'warning',
  },
  {
    id: 'ACT-104',
    time: '09:20 AM Today',
    type: 'Remediation',
    event: 'Payment API security patch deployment completed on secondary node',
    previousEal: 16200000,
    newEal: 15800000,
    increase: -400000,
    action: 'Inspect Asset',
    severity: 'success',
  },
];
