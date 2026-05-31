import { Router } from 'express';
import { getDashboard, getRevenueTrend } from '../controllers/analytics.controller.js';

export const analyticsRouter = Router();
analyticsRouter.get('/dashboard', getDashboard);
analyticsRouter.get('/revenue', getRevenueTrend);
