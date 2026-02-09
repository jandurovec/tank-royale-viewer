import { describe, it, expect, beforeEach } from 'vitest'
import { recalculateTierThresholds, getTierForRating, invalidateTierCache } from './tiers'

describe('tier calculation', () => {
  beforeEach(() => {
    invalidateTierCache()
  })

  describe('0 bots - empty input', () => {
    it('returns Rookie as default when no ranked bots exist', () => {
      recalculateTierThresholds([])
      expect(getTierForRating(1000)).toBe('Rookie')
    })
  })

  describe('1 bot - everyone is Rookie', () => {
    beforeEach(() => {
      recalculateTierThresholds([1000])
    })

    it('bot at threshold is Rookie', () => {
      expect(getTierForRating(1000)).toBe('Rookie')
    })

    it('bot below threshold is Rookie', () => {
      expect(getTierForRating(500)).toBe('Rookie')
    })

    it('bot above threshold is Rookie', () => {
      expect(getTierForRating(1500)).toBe('Rookie')
    })
  })

  describe('2 bots - Veteran threshold at 60%', () => {
    // Ratings [800, 1200], range = 400
    // Veteran threshold = 800 + 0.60 * 400 = 1040

    beforeEach(() => {
      recalculateTierThresholds([800, 1200])
    })

    it('lower bot is Rookie', () => {
      expect(getTierForRating(800)).toBe('Rookie')
    })

    it('higher bot is Veteran', () => {
      expect(getTierForRating(1200)).toBe('Veteran')
    })
  })

  describe('3 bots - adds Elite at 80%', () => {
    // Ratings [600, 900, 1200], range = 600
    // Veteran = 600 + 0.60 * 600 = 960
    // Elite = 600 + 0.80 * 600 = 1080

    beforeEach(() => {
      recalculateTierThresholds([600, 900, 1200])
    })

    it('lowest is Rookie', () => {
      expect(getTierForRating(600)).toBe('Rookie')
    })

    it('at 60% is Veteran', () => {
      expect(getTierForRating(960)).toBe('Veteran')
    })

    it('highest is Elite', () => {
      expect(getTierForRating(1200)).toBe('Elite')
    })
  })

  describe('4 bots - adds Scrap below 20%', () => {
    // Ratings [785, 944, 1173, 1436], range = 651
    // Rookie = 785 + 0.20 * 651 = 915.2
    // Veteran = 785 + 0.60 * 651 = 1175.6
    // Elite = 785 + 0.80 * 651 = 1305.8

    beforeEach(() => {
      recalculateTierThresholds([785, 944, 1173, 1436])
    })

    it('lowest bot is Scrap', () => {
      expect(getTierForRating(785)).toBe('Scrap')
    })

    it('above 20% is Rookie', () => {
      expect(getTierForRating(944)).toBe('Rookie')
    })

    it('highest is Elite', () => {
      expect(getTierForRating(1436)).toBe('Elite')
    })
  })

  describe('5+ bots - adds Legend at 95%', () => {
    // Ratings [500, 700, 900, 1100, 1500], range = 1000
    // Rookie = 500 + 0.20 * 1000 = 700
    // Veteran = 500 + 0.60 * 1000 = 1100
    // Elite = 500 + 0.80 * 1000 = 1300
    // Legend = 500 + 0.95 * 1000 = 1450

    beforeEach(() => {
      recalculateTierThresholds([500, 700, 900, 1100, 1500])
    })

    it('lowest is Scrap', () => {
      expect(getTierForRating(500)).toBe('Scrap')
    })

    it('at 20% is Rookie', () => {
      expect(getTierForRating(700)).toBe('Rookie')
    })

    it('at 60% is Veteran', () => {
      expect(getTierForRating(1100)).toBe('Veteran')
    })

    it('at 80% is Elite', () => {
      expect(getTierForRating(1300)).toBe('Elite')
    })

    it('at 95% is Legend', () => {
      expect(getTierForRating(1450)).toBe('Legend')
    })
  })

  describe('value-based percentiles (not rank-based)', () => {
    it('uses rating value distribution, not array positions', () => {
      // Ratings clustered low: [0, 100, 200, 300, 1000]
      // Range = 1000, so 20% threshold = 200
      // Bots at 0, 100 are below 20% of VALUE range -> Scrap
      recalculateTierThresholds([0, 100, 200, 300, 1000])

      expect(getTierForRating(0)).toBe('Scrap')
      expect(getTierForRating(100)).toBe('Scrap')
      expect(getTierForRating(200)).toBe('Rookie')
    })
  })

  describe('boundary tests - exact threshold scores', () => {
    // Ratings [100, 350, 600, 850, 1100], range = 1000, min = 100
    // Rookie = 100 + 0.20 * 1000 = 300
    // Veteran = 100 + 0.60 * 1000 = 700
    // Elite = 100 + 0.80 * 1000 = 900
    // Legend = 100 + 0.95 * 1000 = 1050

    beforeEach(() => {
      recalculateTierThresholds([100, 350, 600, 850, 1100])
    })

    // Below the entire range (can happen for provisional bots)
    it('score below range minimum is Scrap', () => {
      expect(getTierForRating(50)).toBe('Scrap')
    })

    it('score far below range is Scrap', () => {
      expect(getTierForRating(-500)).toBe('Scrap')
    })

    // At and around Rookie threshold (300)
    it('exactly at Rookie threshold (300) is Rookie', () => {
      expect(getTierForRating(300)).toBe('Rookie')
    })

    it('one point below Rookie threshold (299) is Scrap', () => {
      expect(getTierForRating(299)).toBe('Scrap')
    })

    // At and around Veteran threshold (700)
    it('exactly at Veteran threshold (700) is Veteran', () => {
      expect(getTierForRating(700)).toBe('Veteran')
    })

    it('one point below Veteran threshold (699) is Rookie', () => {
      expect(getTierForRating(699)).toBe('Rookie')
    })

    // At and around Elite threshold (900)
    it('exactly at Elite threshold (900) is Elite', () => {
      expect(getTierForRating(900)).toBe('Elite')
    })

    it('one point below Elite threshold (899) is Veteran', () => {
      expect(getTierForRating(899)).toBe('Veteran')
    })

    // At and around Legend threshold (1050)
    it('exactly at Legend threshold (1050) is Legend', () => {
      expect(getTierForRating(1050)).toBe('Legend')
    })

    it('one point below Legend threshold (1049) is Elite', () => {
      expect(getTierForRating(1049)).toBe('Elite')
    })

    // Above the entire range
    it('score above range maximum is Legend', () => {
      expect(getTierForRating(1500)).toBe('Legend')
    })
  })
})
