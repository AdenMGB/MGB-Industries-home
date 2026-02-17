export type ConversionAchievementIcon =
  | 'trophy'
  | 'bolt'
  | 'heart'
  | 'clock'
  | 'star'

export const CONVERSION_TRAINER_ACHIEVEMENTS: Record<
  string,
  { name: string; description: string; icon: ConversionAchievementIcon }
> = {
  first_5: { name: 'First 5', description: '5 correct in a row', icon: 'trophy' },
  speed_demon: { name: 'Speed Demon', description: '20+ in Speed Round', icon: 'bolt' },
  survivor: { name: 'Survivor', description: '50+ in Survival', icon: 'heart' },
  nibble_master: { name: 'Nibble Master', description: '15+ in Nibble Sprint', icon: 'clock' },
  perfect_10: { name: 'Perfect 10', description: '10/10 in any session', icon: 'star' },
}
