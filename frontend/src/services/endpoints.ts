import api from './api';

export const authService = {
    async login(email: string, password: string) {
        // Django SimpleJWT default endpoint
        const response = await api.post('/token/', { email, password });
        return response.data;
    },

    async register(username: string, email: string, password: string) {
        const response = await api.post('/register/', { username, email, password });
        return response.data;
    },

    async refreshToken(refresh: string) {
        const response = await api.post('/token/refresh/', { refresh });
        return response.data;
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
    },

    async update(id: number, data: { name?: string, checklist_items?: string[] }) {
        const response = await api.patch(`/strategies/strategies/${id}/`, data);
        return response.data;
    },

    async backtest(id: number) {
        const response = await api.post(`/strategies/strategies/${id}/backtest/`);
        return response.data;
    }
};

export const journalService = {
    async openTrade(strategyId: number, followedPlan: boolean) {
        const response = await api.post('/journal/trades/', {
            strategy: strategyId,
            status: 'OPEN',
            followed_plan: followedPlan
        });
        return response.data;
    },

    async closeTrade(tradeId: number, result: 'WIN' | 'LOSS' | 'BREAKEVEN', pnl: number, notes: string) {
        const response = await api.patch(`/journal/trades/${tradeId}/`, {
            status: 'CLOSED',
            result,
            pnl,
            notes
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
    },

    async getAnalytics() {
        const response = await api.get('/journal/trades/analytics/');
        return response.data;
    },

    async populateDemo() {
        const response = await api.post('/journal/trades/populate-demo/');
        return response.data;
    },

    async fullReset() {
        const response = await api.post('/journal/trades/full-reset/');
        return response.data;
    }
};

export const riskService = {
    async getProfile() {
        const response = await api.get('/risk/risk-profile/current/');
        return response.data;
    },

    async updateProfile(data: { max_daily_loss?: number, max_trades_per_day?: number }) {
        const response = await api.patch('/risk/risk-profile/current/', data);
        return response.data;
    }
};

export const brokerService = {
    async list() {
        const response = await api.get('/core/broker-connections/');
        return response.data;
    },

    async create(data: {
        broker_type: string;
        nickname?: string;
        api_key: string;
        api_secret: string;
        mt_server?: string;
        mt_login?: string;
    }) {
        const response = await api.post('/core/broker-connections/', data);
        return response.data;
    },

    async delete(id: number) {
        await api.delete(`/core/broker-connections/${id}/`);
    },

    async testConnection(id: number) {
        const response = await api.post(`/core/broker-connections/${id}/test/`);
        return response.data;
    },

    async getBalance(id: number) {
        const response = await api.get(`/core/broker-connections/${id}/balance/`);
        return response.data;
    },

    async getPositions(id: number) {
        const response = await api.get(`/core/broker-connections/${id}/positions/`);
        return response.data;
    },

    async getTrades(id: number, symbol?: string) {
        const url = symbol
            ? `/core/broker-connections/${id}/trades/?symbol=${symbol}`
            : `/core/broker-connections/${id}/trades/`;
        const response = await api.get(url);
        return response.data;
    },

    async syncTrades(id: number) {
        const response = await api.post(`/core/broker-connections/${id}/sync/`);
        return response.data;
    }
};

export const priceService = {
    async getPrices() {
        const response = await api.get('/core/prices/');
        return response.data;
    }
};
