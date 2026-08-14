import Router, {type Request, type Response} from 'express';

const router = Router();

router.post("/login", (req, res) => {
    console.log('LOGIN API')

    return res.status(200).json({
        message: "Login route is working",
    });
});

export default router;