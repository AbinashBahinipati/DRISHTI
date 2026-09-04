import React from 'react';
import type { CitizenNotification } from '../../utils/citizenNotifications';

interface CitizenNotificationBannerProps {
  notification?: CitizenNotification | null;
  onDismiss?: () => void;
}

export const CitizenNotificationBanner: React.FC<CitizenNotificationBannerProps> = () => {
  return null;
};
