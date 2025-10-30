import React from "react";

interface HighlightInfoProps {
    username?: string | null;
    updatedAt: Date;
}

export function HighlightInfo({ username, updatedAt }: HighlightInfoProps) {
    const formattedDate = new Date(updatedAt).toLocaleString("ru-RU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="text-xs text-muted-foreground mt-1">
            {username ? (
                <span>Отредактировано {username} в {formattedDate}</span>
            ) : (
                <span>Отредактировано в {formattedDate}</span>
            )}
        </div>
    );
}