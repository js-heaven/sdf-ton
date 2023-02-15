export default async function measureDeviceFramerate(n = 50) {
  function fiftyFrames(n: number) {
    return new Promise<void>((resolve) => {
      let counter = 0
      const r = () => {
        if(counter < n) {
          counter += 1
          requestAnimationFrame(r)
        } else {
          resolve()
        }
      }
      r()
    })
  }
  const before = Date.now()
  await fiftyFrames(n)
  const timePassed = (Date.now() - before) * 0.001
  const deviceFrameRate = 50 / timePassed
  return deviceFrameRate 
}
