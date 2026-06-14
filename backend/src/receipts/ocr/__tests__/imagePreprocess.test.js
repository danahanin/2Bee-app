const sharp = require('sharp')
const { preprocess, isHeic } = require('../imagePreprocess')

function ftypBuffer(brand) {
  const head = Buffer.alloc(12)
  head.write('ftyp', 4, 'ascii')
  head.write(brand, 8, 'ascii')
  return head
}

function solidImage(format) {
  return sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    [format]()
    .toBuffer()
}

async function pngMetadata(buffer) {
  return sharp(buffer).metadata()
}

describe('preprocess', () => {
  it('returns a Buffer', async () => {
    const input = await solidImage('png')
    const result = await preprocess(input)
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('normalizes a JPEG into a grayscale PNG', async () => {
    const input = await solidImage('jpeg')
    const result = await preprocess(input)
    const meta = await pngMetadata(result)
    expect(meta.format).toBe('png')
  })

  it('normalizes a WEBP into a PNG', async () => {
    const input = await solidImage('webp')
    const result = await preprocess(input)
    const meta = await pngMetadata(result)
    expect(meta.format).toBe('png')
  })

  it('throws a 415 UNSUPPORTED_IMAGE error for undecodable bytes', async () => {
    const garbage = Buffer.from([1, 2, 3, 4])
    await expect(preprocess(garbage)).rejects.toMatchObject({
      statusCode: 415,
      code: 'UNSUPPORTED_IMAGE',
    })
  })
})

describe('isHeic', () => {
  it('detects HEIC ftyp brands', () => {
    expect(isHeic(ftypBuffer('heic'))).toBe(true)
    expect(isHeic(ftypBuffer('mif1'))).toBe(true)
  })

  it('rejects non-HEIC buffers', () => {
    expect(isHeic(ftypBuffer('avif'))).toBe(false)
    expect(isHeic(Buffer.from([1, 2, 3, 4]))).toBe(false)
    expect(isHeic('not a buffer')).toBe(false)
  })
})
