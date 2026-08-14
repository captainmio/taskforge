import type { Request, Response } from "express";

const getProducts = (req: Request, res: Response) => {
    res.status(200).send('calling product route from controller');
}

export{
    getProducts
};