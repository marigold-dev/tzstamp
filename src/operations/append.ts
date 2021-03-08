import { stringify, parse } from '../util/hex'
import { Operation } from '../operation'

/**
 * Data append operation
 */
export class Append implements Operation {

  static ID = 'append'

  private data: Uint8Array

  constructor (data: string) {
    if (!data)
      throw new Error('Append operation has no data')
    this.data = parse(data)
  }

  public toString () {
    const hex = stringify(this.data)
    return `Append ${hex}`
  }

  public toJSON () {
    const hex = stringify(this.data)
    return [ Append.ID, hex ]
  }

  public commit (input: Uint8Array) {
    return Promise.resolve(
      new Uint8Array([ ...input, ...this.data ])
    )
  }
}