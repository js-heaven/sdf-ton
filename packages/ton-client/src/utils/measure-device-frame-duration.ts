export default async function measureFrameDuration(n = 50) {
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
  const frameDuration = timePassed / n
  return frameDuration
}
