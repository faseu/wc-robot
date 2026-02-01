export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type WorkStatus = 'idle' | 'working' | 'charging' | 'error' | 'offline'
export type CleanMode = 'steam' | 'blower' | 'suction_water' | 'vacuum'
export type TaskType = 'clean' | 'patrol' | 'charge'

export interface MqttConfig {
  broker: string
  wsPort: number
  username: string
  password: string
}

export interface DeviceInfo {
  deviceId: string
  name: string
  battery: number
  water?: number
  online: boolean
  workStatus: WorkStatus
  lastUpdate: number
}

export interface CommandAck {
  cmd: string
  accepted: boolean
  time: number
}

export interface TaskResult {
  taskType: TaskType
  status: 'success' | 'failed' | 'running'
  endTime: number
}

export interface DeviceError {
  errorCode: string
  message: string
  time: number
}
