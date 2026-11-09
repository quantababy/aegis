import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Scan endpoints
export const getStatus = () => api.get('/status')
export const getTargets = () => api.get('/targets')
export const startScan = (config) => api.post('/scan/start', config, { timeout: 120000 })
export const getScanResults = () => api.get('/scan/results')

// Vulnerability & Blockchain endpoints
export const getVulnerabilities = () => api.get('/vulnerabilities')
export const getBlockchainStatus = () => api.get('/blockchain/status')
export const switchBlockchainNetwork = (network) => api.post('/blockchain/switch-network', { network })

// Defense endpoints
export const getDefenseStats = () => api.get('/defense/stats')
export const getDefenseLogs = () => api.get('/defense/logs')
export const createChatCompletion = (payload) => api.post('/v1/chat/completions', payload, { timeout: 120000 })

// Lineage endpoints
export const getAttackGraph = () => api.get('/lineage/graph')

// Settings endpoints
export const getSettings = () => api.get('/settings')
export const saveSettings = (payload) => api.post('/settings', payload)

// Scheduler endpoints
export const getSchedulerStatus = () => api.get('/scheduler/status')
export const triggerSchedulerAudit = (target = 'mock') => api.post(`/scheduler/trigger?target=${encodeURIComponent(target)}`)

export default api
