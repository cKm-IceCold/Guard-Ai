
interface HeatmapProps {
    data: { date: string, value: number, count: number }[];
}

const ContributionHeatmap = ({ data }: HeatmapProps) => {
    // Generate last 80 days (20 cols x 4 rows)
    const today = new Date();
    const days = [];
    for (let i = 0; i < 80; i++) {
        const d = new Date();
        d.setDate(today.getDate() - (79 - i));
        days.push(d.toISOString().split('T')[0]);
    }

    // Map data for fast lookup
    const dataMap = new Map(data.map(d => [d.date, d]));

    const getColor = (date: string) => {
        const entry = dataMap.get(date);
        if (!entry) return 'bg-[#18181b]'; // Gray (Empty)

        if (entry.value > 0) {
            if (entry.value > 500) return 'bg-success';
            if (entry.value > 200) return 'bg-success/80';
            return 'bg-success/40';
        } else if (entry.value < 0) {
            if (entry.value < -500) return 'bg-danger';
            if (entry.value < -200) return 'bg-danger/80';
            return 'bg-danger/40';
        }
        return 'bg-yellow-500/50'; // Breakeven
    };

    return (
        <div className="bg-surface border border-[#27272a] p-4 rounded-2xl shadow-xl">
            <div className="mb-3 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">calendar_apps</span>
                        Consistency Matrix
                    </h3>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Last 80 Days</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase">
                    <span>Loss</span>
                    <div className="flex gap-0.5">
                        <div className="size-2 bg-danger rounded-sm"></div>
                        <div className="size-2 bg-[#18181b] rounded-sm"></div>
                        <div className="size-2 bg-success rounded-sm"></div>
                    </div>
                    <span>Win</span>
                </div>
            </div>

            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(20, 1fr)' }}>
                {days.map(date => (
                    <div
                        key={date}
                        className={`aspect-square rounded-[3px] hover:scale-150 transition-transform cursor-pointer ${getColor(date)}`}
                        title={`${date}: ${dataMap.get(date)?.value ? '$' + dataMap.get(date)?.value : 'No Trades'}`}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default ContributionHeatmap;
