import { stringify, parse } from '../util/hex'
import { Operation } from '../operation'

/**
 * Data prepend operation
 */
export class Prepend implements Operation {

  static ID = 'prepend'

  private data: Uint8Array

  constructor (data: string) {
    if (!data)
      throw new Error('Prepend operation has no data')
    this.data = parse(data)
  }

  public toString () {
    const hex = stringify(this.data)
    return `Prepend ${hex}`
  }

  public toJSON () {
    const hex = stringify(this.data)
    return [ Prepend.ID, hex ]
  }

  public commit (input: Uint8Array) {
    return Promise.resolve(
      new Uint8Array([ ...this.data, ...input ])
    )
  }
}