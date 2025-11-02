import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Необходимо авторизоваться для выполнения этого действия"
        });
    }
    next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    // Позволяет продолжить независимо от статуса авторизации
    next();
}
