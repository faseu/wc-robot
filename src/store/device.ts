import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CleanMode,
  CommandAck,
  ConnectionStatus,
  DeviceError,
  DeviceInfo,
  MqttConfig,
  TaskResult,
  TaskType,
  WorkStatus,
} from '@/mqtt'

const createMockDevices = (): DeviceInfo[] => {
  const now = Date.now()
  return [
    {
      deviceId: 'RB-001',
      name: 'Service Bot A1',
      battery: 86,
      water: 64,
      online: true,
      workStatus: 'idle',
      lastUpdate: now,
    },
    {
      deviceId: 'RB-002',
      name: 'Guardian Unit B7',
      battery: 42,
      water: 28,
      online: true,
      workStatus: 'working',
      lastUpdate: now,
    },
    {
      deviceId: 'RB-003',
      name: 'Inspector C3',
      battery: 15,
      online: false,
      workStatus: 'offline',
      lastUpdate: now,
    },
  ]
}

const statusTextMap: Record<WorkStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  charging: 'Charging',
  error: 'Error',
  offline: 'Offline',
}

export const useDeviceStore = defineStore('device', () => {
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const devices = ref<DeviceInfo[]>(createMockDevices())
  const currentDeviceId = ref('')
  const commandAcks = ref<CommandAck[]>([])
  const taskResults = ref<TaskResult[]>([])
  const errors = ref<DeviceError[]>([])
  const mqttConfig = ref<MqttConfig | null>(null)

  const onlineCount = computed(() => devices.value.filter(item => item.online).length)
  const workingCount = computed(() => devices.value.filter(item => item.workStatus === 'working').length)

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  async function connect(config?: MqttConfig) {
    if (connectionStatus.value === 'connected' || connectionStatus.value === 'connecting')
      return

    if (config)
      mqttConfig.value = config

    connectionStatus.value = 'connecting'
    await delay(300)
    connectionStatus.value = 'connected'

    const now = Date.now()
    devices.value = devices.value.map(device => ({ ...device, lastUpdate: now }))
  }

  async function disconnect() {
    connectionStatus.value = 'disconnected'
  }

  function setCurrentDevice(deviceId: string) {
    currentDeviceId.value = deviceId
  }

  function getWorkStatusText(status: WorkStatus) {
    return statusTextMap[status] ?? 'Offline'
  }

  async function sendCommand(deviceId: string, cmd: string, mode?: CleanMode) {
    const device = devices.value.find(item => item.deviceId === deviceId)
    if (!device) {
      const err = { errorCode: 'DEVICE_NOT_FOUND', message: 'Device not found', time: Date.now() }
      errors.value.unshift(err)
      throw new Error(err.message)
    }
    if (!device.online) {
      const err = { errorCode: 'DEVICE_OFFLINE', message: 'Device offline', time: Date.now() }
      errors.value.unshift(err)
      throw new Error(err.message)
    }

    await delay(200)

    if (cmd === 'start' || cmd === 'resume')
      device.workStatus = 'working'
    if (cmd === 'stop' || cmd === 'pause')
      device.workStatus = 'idle'
    if (cmd === 'charge' || cmd === 'home')
      device.workStatus = 'charging'

    device.lastUpdate = Date.now()

    const cmdLabel = mode ? `${cmd}:${mode}` : cmd
    commandAcks.value.unshift({ cmd: cmdLabel, accepted: true, time: Date.now() })
  }

  async function sendTask(deviceId: string, taskType: TaskType) {
    const device = devices.value.find(item => item.deviceId === deviceId)
    if (!device) {
      const err = { errorCode: 'DEVICE_NOT_FOUND', message: 'Device not found', time: Date.now() }
      errors.value.unshift(err)
      throw new Error(err.message)
    }
    if (!device.online) {
      const err = { errorCode: 'DEVICE_OFFLINE', message: 'Device offline', time: Date.now() }
      errors.value.unshift(err)
      throw new Error(err.message)
    }

    await delay(200)

    taskResults.value.unshift({
      taskType,
      status: 'success',
      endTime: Date.now(),
    })

    if (taskType === 'charge')
      device.workStatus = 'charging'
    else
      device.workStatus = 'working'

    device.lastUpdate = Date.now()
  }

  return {
    connectionStatus,
    devices,
    currentDeviceId,
    commandAcks,
    taskResults,
    errors,
    mqttConfig,
    onlineCount,
    workingCount,
    connect,
    disconnect,
    setCurrentDevice,
    getWorkStatusText,
    sendCommand,
    sendTask,
  }
})
