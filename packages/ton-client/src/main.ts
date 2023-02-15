import measureDeviceFrameDuration from './utils/measure-device-frame-duration'

import Loop from './loop'

window.addEventListener('load', async () => {
  new Loop(await measureDeviceFrameDuration()).loop()
})

