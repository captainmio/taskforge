import Router from 'express';
import auth from './auth.routes.js';
import workspace from './workspace.routes.js';

const router = Router();

router.use("/auth", auth);
router.use("/workspaces", workspace);

export default router;
