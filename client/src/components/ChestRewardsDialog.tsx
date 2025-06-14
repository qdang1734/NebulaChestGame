import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface RewardItem {
  id: number;
  name: string;
  image: string;
  earnPerDay: number;
  rate: number;
}

interface ChestRewardsDialogProps {
  open: boolean;
  onClose: () => void;
  chestName: string;
  rewards: RewardItem[];
}

const ChestRewardsDialog: React.FC<ChestRewardsDialogProps> = ({ open, onClose, chestName, rewards }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs w-[90vw] bg-[#332966] border-none p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-bold text-[#b5aaff]">{chestName} Rewards</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 px-3 pb-3">
          {rewards.map((item, idx) => (
            <div
              key={item.id}
              className={`bg-[#241c44] rounded-lg border border-transparent flex flex-col items-center p-1.5 relative`}
            >

              <img src={item.image} alt={item.name} className="w-5 h-5 mb-1" />
              <div className="font-bold text-white text-[11px] mb-0.5 text-center">{item.name}</div>
              <div className="flex items-center justify-center text-blue-200 text-[10px] mb-0.5">
                {item.earnPerDay} <span className="ml-0.5">💎/day</span>
              </div>
              <div className="bg-yellow-400 text-black text-[10px] font-bold rounded px-1 py-0.5 mt-0.5">Rate {item.rate.toFixed(2)}%</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChestRewardsDialog;
