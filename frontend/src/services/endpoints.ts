import api from './api';

/**
 * Authentication Service
 * Handles user identity: login, registration, and JWT token management.
 */
export const authService = {
    /** Logs in a user and returns JWT tokens (access & refresh). */
    async login(email: string, password: string) {
        const response = await api.post('/token/', { email, password });
        return response.data;
    },

    /** Creates a new account in the system. */
    async register(username: string, email: string, password: string) {
        const response = await api.post('/register/', { username, email, password });
        return response.data;
    },

    /** Uses the refresh token to obtain a new access token. */
    async refreshToken(refresh: string) {
        const response = await api.post('/token/refresh/', { refresh });
        return response.data;
    }
};

/**
 * Strategy Service
 * Manages trading plans, AI checklist generation, and backtesting.
 */
export const strategyService = {
    /** Creates a new strategy and triggers the AI checklist generation on the backend. */
    async create(name: string, description: string) {
        const response = await api.post('/strategies/strategies/', {
            name,
            description
        });
        return response.data;
    },

    /** Fetches all strategies belonging to the current user. */
    async list() {
        const response = await api.get('/strategies/strategies/');
        return response.data;
    },

    /** Permantently removes a strategy. */
    async delete(id: number) {
        await api.delete(`/strategies/strategies/${id}/`);
    },

    /** Updates strategy metadata or checklist items. */
    async update(id: number, data: { name?: string, checklist_items?: string[], is_public?: boolean }) {
        const response = await api.patch(`/strategies/strategies/${id}/`, data);
        return response.data;
    },

    /** Triggers the AI historical backtest engine for a specific strategy. */
    async backtest(id: number) {
        const response = await api.post(`/strategies/strategies/${id}/backtest/`);
        return response.data;
    },

    /** Adds a visual pattern/protocol rule to a strategy. */
    async createCustomRule(formData: FormData) {
        const response = await api.post('/strategies/custom-rules/', formData);
        return response.data;
    },

    /** Uploads up to 3 chart screenshots for visual reference in Execution mode. */
    async uploadChartImages(strategyId: number, images: File[]) {
        const formData = new FormData();
        images.forEach((img, idx) => {
            if (idx < 3) {
                formData.append(`chart_image_${idx + 1}`, img);
            }
        });
        const response = await api.patch(`/strategies/strategies/${strategyId}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

/**
 * Journal Service
 * Manages trade logging, performance analytics, and behavior AI.
 */
export const journalService = {
    /** Opens a new trade record. 'followedPlan' is based on the checklist completion. */
    async openTrade(strategyId: number, followedPlan: boolean) {
        const response = await api.post('/journal/trades/', {
            strategy: strategyId,
            status: 'OPEN',
            followed_plan: followedPlan
        });
        return response.data;
    },

    /** Closes an open trade and records the outcome (PnL, notes, and screenshots). */
    async closeTrade(
        tradeId: number,
        result: 'WIN' | 'LOSS' | 'BREAKEVEN',
        pnl: number,
        notes: string,
        images?: { before?: File | null, after?: File | null, live?: File | null }
    ) {
        const formData = new FormData();
        formData.append('status', 'CLOSED');
        formData.append('result', result);
        formData.append('pnl', pnl.toString());
        formData.append('notes', notes);

        if (images?.before) formData.append('image_before', images.before);
        if (images?.after) formData.append('image_after', images.after);
        if (images?.live) formData.append('image_live', images.live);

        const response = await api.patch(`/journal/trades/${tradeId}/`, formData);
        return response.data;
    },

    /** Lists trade history for the user, with optional filtering by strategy. */
    async listTrades(strategyId?: number) {
        const url = strategyId ? `/journal/trades/?strategy=${strategyId}` : '/journal/trades/';
        const response = await api.get(url);
        return response.data;
    },

    /** Fetches high-level stats (Win Rate, PnL) for the dashboard. */
    async getStats(strategyId?: number) {
        const url = strategyId ? `/journal/trades/stats/?strategy=${strategyId}` : '/journal/trades/stats/';
        const response = await api.get(url);
        return response.data;
    },

    /** Fetches time-series data for equity and discipline charts. */
    async getAnalytics() {
        const response = await api.get('/journal/trades/analytics/');
        return response.data;
    },

    /** Triggers the AI behavioral analysis engine on the backend. */
    async getInsights() {
        const response = await api.get('/journal/trades/insights/');
        return response.data;
    },

    /** Populates the account with fake trade history for demonstration. */
    async populateDemo() {
        const response = await api.post('/journal/trades/populate-demo/');
        return response.data;
    },

    /** Resets the entire account history. DANGER: irreversible. */
    async fullReset() {
        const response = await api.post('/journal/trades/full-reset/');
        return response.data;
    }
};

/**
 * Risk Service
 * Manages the user's risk profile and terminal locking status.
 */
export const riskService = {
    /** Fetches the current risk limits and terminal lock status. */
    async getProfile() {
        const response = await api.get('/risk/risk-profile/current/');
        return response.data;
    },

    /** Updates the user's risk limits (daily loss, max trades). */
    async updateProfile(data: { max_daily_loss?: number, max_trades_per_day?: number }) {
        const response = await api.patch('/risk/risk-profile/current/', data);
        return response.data;
    }
};

/**
 * Broker Service
 * Handles connections to external exchanges (Binance, MT5, etc.).
 */
export const brokerService = {
    /** Lists all connected broker accounts. */
    async list() {
        const response = await api.get('/core/broker-connections/');
        return response.data;
    },

    /** Connects a new broker using API credentials. */
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

    /** Removes a broker connection. Credentials remain valid on the broker side. */
    async delete(id: number) {
        await api.delete(`/core/broker-connections/${id}/`);
    },

    /** Validates that the provided credentials can reach the broker server. */
    async testConnection(id: number) {
        const response = await api.post(`/core/broker-connections/${id}/test/`);
        return response.data;
    },

    /** Fetches real-time account balance from the broker. */
    async getBalance(id: number) {
        const response = await api.get(`/core/broker-connections/${id}/balance/`);
        return response.data;
    },

    /** Fetches any open positions currently held at the broker. */
    async getPositions(id: number) {
        const response = await api.get(`/core/broker-connections/${id}/positions/`);
        return response.data;
    },

    /** Fetches trade history directly from the broker. */
    async getTrades(id: number, symbol?: string) {
        const url = symbol
            ? `/core/broker-connections/${id}/trades/?symbol=${symbol}`
            : `/core/broker-connections/${id}/trades/`;
        const response = await api.get(url);
        return response.data;
    },

    /** Force a manual synchronization of broker trades to the Guard AI journal. */
    async syncTrades(id: number) {
        const response = await api.post(`/core/broker-connections/${id}/sync/`);
        return response.data;
    }
};

/**
 * Price Service
 * Fetches real-time price feeds for the dashboard.
 */
export const priceService = {
    /** Fetches current market prices for tracked assets. */
    async getPrices() {
        const response = await api.get('/core/prices/');
        return response.data;
    }
};

/**
 * Public Service
 * Handles anonymous access to shared profiles and strategies.
 */
export const publicService = {
    /** Fetches a user's public profile, including stats and shared strategies. */
    async getProfile(username: string) {
        const response = await api.get(`/public/profile/${username}/`);
        return response.data;
    }
};
