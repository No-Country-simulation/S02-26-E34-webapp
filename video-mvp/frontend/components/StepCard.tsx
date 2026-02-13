import { CloudUpload, Frame, FileDown } from 'lucide-react';

const iconMap = {
  upload: CloudUpload,
  frame: Frame,
  export: FileDown,
};

type StepCardProps = {
  num: string;
  icon: keyof typeof iconMap;
  title: string;
  desc: string;
};

const StepCard = ({ num, icon, title, desc }: StepCardProps) => {
  const Icon = iconMap[icon] ?? CloudUpload;

  return (
    <div className="relative p-8 rounded-2xl bg-[#121022] border border-white/5 hover:border-[#3b2bee]/30 transition-all group overflow-hidden">
      <div className="w-16 h-16 rounded-2xl bg-[#3b2bee]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="text-[#3b2bee]" />
      </div>
      <div className="absolute top-8 right-8 text-6xl font-black text-[#3b2bee]/55">{num}</div>
      <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
};

export default StepCard;
