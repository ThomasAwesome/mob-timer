const { remote: { dialog }, ipcRenderer: ipc } = require('electron')

const { ClientEvents, ServiceEvents } = require('../../common/constants')

const mobbersEl = document.getElementById('mobbers')
const minutesEl = document.getElementById('minutes')
const addEl = document.getElementById('add')
const addMobberForm = document.getElementById('addMobberForm')
const fullscreenSecondsEl = document.getElementById('fullscreen-seconds')
const snapToEdgesCheckbox = document.getElementById('snap-to-edges')
const alertAudioCheckbox = document.getElementById('alertAudio')
const replayAudioContainer = document.getElementById('replayAudioContainer')
const replayAlertAudioCheckbox = document.getElementById('replayAlertAudio')
const replayAudioAfterSeconds = document.getElementById('replayAudioAfterSeconds')
const useCustomSoundCheckbox = document.getElementById('useCustomSound')
const customSoundEl = document.getElementById('customSound')
const timerAlwaysOnTopCheckbox = document.getElementById('timerAlwaysOnTop')

function createMobberEl(mobber) {
  const el = document.createElement('div')
  el.classList.add('mobber')
  if (mobber.disabled) {
    el.classList.add('disabled')
  }

  const imgEl = document.createElement('img')
  imgEl.src = mobber.image
  imgEl.classList.add('image')
  el.appendChild(imgEl)

  const nameEl = document.createElement('div')
  nameEl.innerHTML = mobber.name
  nameEl.classList.add('name')
  el.appendChild(nameEl)

  const disableBtn = document.createElement('button')
  disableBtn.classList.add('btn')
  disableBtn.innerHTML = mobber.disabled ? 'Enable' : 'Disable'
  el.appendChild(disableBtn)

  const rmBtn = document.createElement('button')
  rmBtn.classList.add('btn')
  rmBtn.innerHTML = 'Remove'
  el.appendChild(rmBtn)

  imgEl.addEventListener('click', () => selectImage(mobber))
  disableBtn.addEventListener('click', () => toggleMobberDisabled(mobber))
  rmBtn.addEventListener('click', () => ipc.send(ClientEvents.RemoveMobber, mobber.id))

  return el
}

function selectImage(mobber) {
  const image = dialog.showOpenDialog({
    title: 'Select image',
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
    ],
    properties: ['openFile']
  })

  if (image) {
    mobber.image = image[0]
    ipc.send(ClientEvents.UpdateMobber, mobber)
  }
}

function toggleMobberDisabled(mobber) {
  mobber.disabled = !mobber.disabled
  ipc.send(ClientEvents.UpdateMobber, mobber)
}

ipc.on(ServiceEvents.StateUpdated, (event, data) => {
  minutesEl.value = Math.ceil(data.secondsPerTurn / 60)
  mobbersEl.innerHTML = ''
  const frag = document.createDocumentFragment()
  data.mobbers.map(mobber => {
    frag.appendChild(createMobberEl(mobber))
  })
  mobbersEl.appendChild(frag)
  fullscreenSecondsEl.value = data.secondsUntilFullscreen
  snapToEdgesCheckbox.checked = data.snapThreshold > 0

  alertAudioCheckbox.checked = data.alertSoundTimes.length > 0
  replayAlertAudioCheckbox.checked = data.alertSoundTimes.length > 1
  replayAudioAfterSeconds.value = data.alertSoundTimes.length > 1 ? data.alertSoundTimes[1] : 30
  updateAlertControls()

  useCustomSoundCheckbox.checked = !!data.alertSound
  customSoundEl.value = data.alertSound

  timerAlwaysOnTopCheckbox.checked = data.timerAlwaysOnTop
})

minutesEl.addEventListener('change', () => {
  ipc.send(ClientEvents.SetSecondsPerTurn, minutesEl.value * 60)
})

addMobberForm.addEventListener('submit', event => {
  event.preventDefault()
  const value = addEl.value.trim()
  if (!value) {
    return
  }
  ipc.send(ClientEvents.AddMobber, { name: value })
  addEl.value = ''
})

fullscreenSecondsEl.addEventListener('change', () => {
  ipc.send(ClientEvents.SetSecondsUntilFullscreen, fullscreenSecondsEl.value * 1)
})

ipc.send(ClientEvents.ConfigWindowReady)

snapToEdgesCheckbox.addEventListener('change', () => {
  ipc.send(ClientEvents.SetSnapThreshold, snapToEdgesCheckbox.checked ? 25 : 0)
})

alertAudioCheckbox.addEventListener('change', () => updateAlertTimes())
replayAlertAudioCheckbox.addEventListener('change', () => updateAlertTimes())
replayAudioAfterSeconds.addEventListener('change', () => updateAlertTimes())

function updateAlertTimes() {
  updateAlertControls()

  const alertSeconds = []
  if (alertAudioCheckbox.checked) {
    alertSeconds.push(0)
    if (replayAlertAudioCheckbox.checked) {
      alertSeconds.push(replayAudioAfterSeconds.value * 1)
    }
  }

  ipc.send(ClientEvents.SetAlertSoundTimes, alertSeconds)
}

function updateAlertControls() {
  const isAlertAudioDisabled = !alertAudioCheckbox.checked
  replayAlertAudioCheckbox.disabled = isAlertAudioDisabled

  if (isAlertAudioDisabled) {
    replayAlertAudioCheckbox.checked = false
    replayAudioContainer.classList.add('disabled')
  } else {
    replayAudioContainer.classList.remove('disabled')
  }

  replayAudioAfterSeconds.disabled = !replayAlertAudioCheckbox.checked
}

useCustomSoundCheckbox.addEventListener('change', () => {
  let mp3 = null

  if (useCustomSoundCheckbox.checked) {
    const selectedMp3 = dialog.showOpenDialog({
      title: 'Select alert sound',
      filters: [
        { name: 'MP3', extensions: ['mp3'] }
      ],
      properties: ['openFile']
    })

    if (selectedMp3) {
      mp3 = selectedMp3[0]
    } else {
      useCustomSoundCheckbox.checked = false
    }
  }

  ipc.send(ClientEvents.SetAlertSound, mp3)
})

timerAlwaysOnTopCheckbox.addEventListener('change', () => {
  ipc.send(ClientEvents.SetTimerAlwaysOnTop, timerAlwaysOnTopCheckbox.checked)
})
