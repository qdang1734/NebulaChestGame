import React from 'react';

export interface InviteRewardItem {
  chest_value: number;
  opened_at: string;
  inviter_reward: number;
  invitee_id: string;
}

interface Props {
  history: InviteRewardItem[];
  loading: boolean;
}

const InviteRewardHistory: React.FC<Props> = ({ history, loading }) => {
  return null;
};

export default InviteRewardHistory;
