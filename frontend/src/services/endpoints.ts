import api from './api';

export const authService = {
    async login(email: string, password: string) {
        // Django SimpleJWT default endpoint
        const response = await api.post('/token/', { email, password });
        return response.data;
    },

    async register(email: string, password: string) {
        // We haven't built a register view yet, assume /core/register if we did.
        // For now, we will rely on creating user in backend or adding that view.
        // Let's implement Login first.
        throw new Error("Registration API not linked yet");
    }
};

export const strategyService = {
    async create(name: string, description: string) {
        const response = await api.post('/strategies/strategies/', {
            name,
            description
        });
        return response.data;
    },

    async list() {
        const response = await api.get('/strategies/strategies/');
        return response.data;
    },

    async delete(id: number) {
        await api.delete(`/strategies/strategies/${id}/`);
    }
};

export const journalService = {
    async logTrade(strategyId: number, result: 'WIN' | 'LOSS', pnl: number, notes: string, followedPlan: boolean) {
        const response = await api.post('/journal/trades/', {
            strategy: strategyId,
            result,
            pnl,
            notes,
            followed_plan: followedPlan
        });
        return response.data;
    },

    async listTrades(strategyId?: number) {
        const url = strategyId ? `/journal/trades/?strategy=${strategyId}` : '/journal/trades/';
        const response = await api.get(url);
        return response.data;
    },

    async getStats(strategyId?: number) {
        const url = strategyId ? `/journal/trades/stats/?strategy=${strategyId}` : '/journal/trades/stats/';
        const response = await api.get(url);
        return response.data;
    }
};

export const riskService = {
    async getProfile() {
        const response = await api.get('/risk/risk-profile/current/'); // Correct path from router
        return response.data;
    }
};
