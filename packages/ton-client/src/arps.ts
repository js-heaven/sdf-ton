import config from './config';
import { sfc32 } from './utils/deterministic-rg';

const rand = sfc32(12399910,23,339,4);

interface Trigger {
  slot: number, 
  length: number
}

class ArpeggioPattern {

  public triggers: Trigger[] = []

  constructor(
    public slotsPerBar: number,  
    public attack: number,  // of a slot
    public sustain: number, 
    public decay: number, // of a slot
    density: number
  ) {
    this.fillRandom(density) 
  }

  fillRandom(density: number) {
    let nextSlotWithANote = undefined

    // generate triggers in reverse order
    while(this.triggers.length == 0) {
      let i = this.slotsPerBar
      while(i > 0) {
        i -= 1
        if(rand() < density) {
          let noteLength = 0
          if(nextSlotWithANote) {
            noteLength = Math.round(
              rand() * (nextSlotWithANote - i)
            ) // 
          }
          nextSlotWithANote = i
          this.triggers.push({
            slot: i, 
            length: noteLength
          })
        }
      }
    }
    const lastTrigger = this.triggers[0]

    // !!! trigger order gets reversed here
    this.triggers.reverse()

    lastTrigger.length = rand() * (this.slotsPerBar + this.triggers[0].slot - lastTrigger.slot)
  }
}

const arps: ArpeggioPattern[] = []

for(let i = 0; i < config.numberOfArps; i++) {
  arps.push(new ArpeggioPattern(
    2 * (2 + Math.trunc(rand() * 5)), 
    rand() * 0.1 + 0.01,
    rand() * 0.5,
    Math.trunc(rand() * 3) / 4, 
    rand() * 0.5 + 0.25
  ))
}

export default arps
