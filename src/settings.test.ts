import { describe, it, expect, beforeEach } from 'vitest'
import * as settings from './settings'

const STORAGE_KEY = 'tank-royale-viewer-settings'

beforeEach(() => {
  localStorage.clear()
  settings.__resetForTests()
})

describe('getDefaults', () => {
  it('returns a fresh copy on every call', () => {
    const a = settings.getDefaults()
    const b = settings.getDefaults()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('mutating the returned object does not affect future loads', () => {
    const d = settings.getDefaults()
    d.url = 'ws://hacked'
    settings.load()
    expect(settings.get().url).not.toBe('ws://hacked')
  })
})

describe('save / load round-trip', () => {
  it('persists changes to localStorage', () => {
    settings.save({ url: 'ws://example:1234', debug: true, scanOpacity: 17 })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.url).toBe('ws://example:1234')
    expect(parsed.debug).toBe(true)
    expect(parsed.scanOpacity).toBe(17)
  })

  it('load() restores previously saved settings', () => {
    settings.save({ url: 'ws://persisted', logoSize: 42 })
    settings.__resetForTests()
    settings.load()
    expect(settings.get().url).toBe('ws://persisted')
    expect(settings.get().logoSize).toBe(42)
  })

  it('save() merges partial updates without clobbering other fields', () => {
    settings.save({ url: 'ws://first', debug: true })
    settings.save({ scanOpacity: 99 })
    const s = settings.get()
    expect(s.url).toBe('ws://first')
    expect(s.debug).toBe(true)
    expect(s.scanOpacity).toBe(99)
  })
})

describe('load() with invalid storage', () => {
  it('falls back to defaults when localStorage contains non-JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{ not: valid json')
    const result = settings.load()
    expect(result).toEqual(settings.getDefaults())
  })

  it('falls back to defaults when localStorage is empty', () => {
    expect(settings.load()).toEqual(settings.getDefaults())
  })
})

describe('per-key type validation', () => {
  it('drops keys with the wrong type and keeps the rest', () => {
    const defaults = settings.getDefaults()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: 'ws://kept',          // correct type (string)
        scanOpacity: 'bogus',       // wrong type (should be number) → dropped
        debug: 'not-a-bool',        // wrong type (should be boolean) → dropped
        logoSize: 33,               // correct type (number)
      })
    )
    const loaded = settings.load()
    expect(loaded.url).toBe('ws://kept')
    expect(loaded.logoSize).toBe(33)
    // Bad values should fall back to defaults rather than poison the type.
    expect(loaded.scanOpacity).toBe(defaults.scanOpacity)
    expect(loaded.debug).toBe(defaults.debug)
  })

  it('ignores unknown keys in stored payload', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: 'ws://known', unknownKey: 'nope' })
    )
    const loaded = settings.load()
    expect(loaded.url).toBe('ws://known')
    const asRecord = loaded as unknown as Record<string, unknown>
    expect(asRecord.unknownKey).toBeUndefined()
  })
})
