import { Toaster, toast } from 'sonner';

export const NotificationProvider = () => {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    background: '#0a0a0c',
                    border: '1px solid #27272a',
                    color: '#f8fafc',
                    fontFamily: 'Inter, sans-serif',
                },
                className: 'branded-toast',
            }}
        />
    );
};

export const notify = {
    success: (msg: string) => toast.success(msg, {
        icon: <span className="material-symbols-outlined text-success">check_circle</span>,
    }),
    error: (msg: string) => toast.error(msg, {
        icon: <span className="material-symbols-outlined text-danger">report</span>,
    }),
    info: (msg: string) => toast.info(msg, {
        icon: <span className="material-symbols-outlined text-primary">info</span>,
    }),
    warning: (msg: string) => toast.warning(msg, {
        icon: <span className="material-symbols-outlined text-yellow-500">warning</span>,
    }),
};
