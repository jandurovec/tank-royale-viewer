import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as logoStorage from './logoStorage'

const STORAGE_KEY = 'tank-royale-viewer-logo'
const SAMPLE_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='

beforeEach(() => {
  localStorage.clear()
  logoStorage.__resetForTests()
})

describe('save / get / clear', () => {
  it('returns null when no logo is stored', () => {
    expect(logoStorage.getLogo()).toBeNull()
  })

  it('saveLogo persists data and getLogo returns it', () => {
    const ok = logoStorage.saveLogo(SAMPLE_LOGO)
    expect(ok).toBe(true)
    expect(logoStorage.getLogo()).toBe(SAMPLE_LOGO)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(SAMPLE_LOGO)
  })

  it('getLogo populates the cache from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, SAMPLE_LOGO)
    expect(logoStorage.getLogo()).toBe(SAMPLE_LOGO)
  })

  it('clearLogo removes data from both cache and localStorage', () => {
    logoStorage.saveLogo(SAMPLE_LOGO)
    logoStorage.clearLogo()
    expect(logoStorage.getLogo()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('saveLogo returns false when localStorage throws (quota exceeded)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(logoStorage.saveLogo(SAMPLE_LOGO)).toBe(false)
    spy.mockRestore()
  })
})

describe('onLogoChange callbacks', () => {
  it('fires on save with the new logo data', () => {
    const cb = vi.fn()
    logoStorage.onLogoChange(cb)
    logoStorage.saveLogo(SAMPLE_LOGO)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(SAMPLE_LOGO)
  })

  it('fires on clear with null', () => {
    const cb = vi.fn()
    logoStorage.saveLogo(SAMPLE_LOGO)
    logoStorage.onLogoChange(cb)
    logoStorage.clearLogo()
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(null)
  })

  it('fires every registered callback', () => {
    const a = vi.fn()
    const b = vi.fn()
    logoStorage.onLogoChange(a)
    logoStorage.onLogoChange(b)
    logoStorage.saveLogo(SAMPLE_LOGO)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('does not fire on getLogo (read is not a change)', () => {
    const cb = vi.fn()
    logoStorage.saveLogo(SAMPLE_LOGO)
    logoStorage.onLogoChange(cb)
    logoStorage.getLogo()
    logoStorage.getLogo()
    expect(cb).not.toHaveBeenCalled()
  })
})
