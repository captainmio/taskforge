import Router, {type Request, type Response} from 'express';
import { register } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema } from '../validations/auth.validation.js';

const router = Router();

router.post("/login", (req, res) => {
    console.log('LOGIN API')

    return res.status(200).json({
        message: "Login route is working",
    });
});

router.post("/register", validate(registerSchema) , register);

export default router;