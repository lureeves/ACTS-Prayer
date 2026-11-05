import { PrayerData } from '../types/prayer';
import starterJson from './starterPrayerData.json';

export const DEFAULT_PRAYER_DATA: PrayerData = (starterJson as unknown) as PrayerData;
